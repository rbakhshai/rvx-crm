"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, rawLeadDispositions, rawLeads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { addressKey, parseLeadsCsv } from "@/lib/raw-leads-csv";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export type UploadResult = {
  ok: boolean;
  error?: string;
  batchId?: string;
  inserted: number;
  skipped: number;
  dupes: number;
  unmappedHeaders: string[];
};

/**
 * Upload + parse + dedup-aware insert of a CSV of raw leads.
 *
 * Dedup strategy (per your spec): match on physical address — the canonical
 * key is lowercased(street + city + state). Rows whose key already exists
 * in raw_leads are counted as `dupes` and silently skipped, NOT inserted.
 * Rows missing enough address info to form a key are inserted (we can't
 * detect duplicates on them and shouldn't drop them).
 *
 * uploadBatchId stamps every row from this CSV so admins can mass-undo a
 * bad batch later via deleteUploadBatchAction.
 */
export async function uploadLeadsCsvAction(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Pick a CSV file first", inserted: 0, skipped: 0, dupes: 0, unmappedHeaders: [] };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Couldn't read that file", inserted: 0, skipped: 0, dupes: 0, unmappedHeaders: [] };
  }

  const parsed = parseLeadsCsv(text);
  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error: "No valid rows found. Make sure the CSV has at least park name OR address columns.",
      inserted: 0,
      skipped: parsed.skipped,
      dupes: 0,
      unmappedHeaders: parsed.unmappedHeaders,
    };
  }

  // Pull every existing address-key in one query so we don't N+1 dedup.
  // Filtering to non-deleted only: a row tombstoned by an admin shouldn't
  // collide with a re-upload of the same lead.
  const existing = await db
    .select({ street: rawLeads.street, city: rawLeads.city, state: rawLeads.state })
    .from(rawLeads)
    .where(isNull(rawLeads.deletedAt));
  const existingKeys = new Set(
    existing
      .map((r) => addressKey(r.street, r.city, r.state))
      .filter((k): k is string => !!k),
  );

  // Also collide-check within THIS batch (CSV might have its own dupes).
  const seenInBatch = new Set<string>();

  const batchId = crypto.randomUUID();
  const inserts: Array<typeof rawLeads.$inferInsert> = [];
  let dupes = 0;
  for (const r of parsed.rows) {
    const key = addressKey(r.street, r.city, r.state);
    if (key && (existingKeys.has(key) || seenInBatch.has(key))) {
      dupes++;
      continue;
    }
    if (key) seenInBatch.add(key);

    inserts.push({
      parkName: r.parkName,
      street: r.street,
      city: r.city,
      state: r.state,
      zipCode: r.zipCode,
      ownerName: r.ownerName,
      ownerPhone: r.ownerPhone,
      ownerEmail: r.ownerEmail,
      pads: r.pads,
      listingStatus: r.listingStatus,
      source: r.source,
      importedNotes: r.importedNotes,
      rawData: r.rawData,
      uploadedById: user.id,
      uploadBatchId: batchId,
    });
  }

  // Postgres chokes on extremely large INSERTs as one statement (~64k
  // parameters). Chunk at 500 rows per insert; plenty of headroom.
  const CHUNK = 500;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK);
    if (chunk.length > 0) await db.insert(rawLeads).values(chunk);
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/upload");

  return {
    ok: true,
    batchId,
    inserted: inserts.length,
    skipped: parsed.skipped,
    dupes,
    unmappedHeaders: parsed.unmappedHeaders,
  };
}

/**
 * Mass-undo a CSV upload. Soft-deletes every lead in the batch that
 * hasn't been touched (no call attempts, not claimed, not converted).
 * Returns the count actually removed so the admin can see what stuck.
 */
export async function deleteUploadBatchAction(batchId: string): Promise<{ ok: boolean; removed: number }> {
  const user = await requireUser();
  const result = await db
    .update(rawLeads)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(
      and(
        eq(rawLeads.uploadBatchId, batchId),
        isNull(rawLeads.deletedAt),
        eq(rawLeads.status, "pool"),
        eq(rawLeads.callAttempts, 0),
      ),
    )
    .returning({ id: rawLeads.id });
  revalidatePath("/admin/leads");
  return { ok: true, removed: result.length };
}

/** Hard-delete by id list — used by the admin pool view's bulk delete. */
export async function softDeleteLeadsAction(ids: string[]): Promise<void> {
  const user = await requireUser();
  if (ids.length === 0) return;
  await db
    .update(rawLeads)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(and(inArray(rawLeads.id, ids), isNull(rawLeads.deletedAt)));
  revalidatePath("/admin/leads");
}

// ============================================================================
// BD lead-work flow — claim + disposition
// ============================================================================

type ClaimResult = {
  ok: boolean;
  leadId: string | null;
  /** True only when the pool was empty for this mode (no error, just nothing to work). */
  poolEmpty?: boolean;
  error?: string;
};

export type ClaimMode = "fresh" | "followup";

/**
 * Atomically claim the next available lead for the current BD.
 *
 * Race-safe pattern: a single UPDATE that targets the row picked by a
 * sub-SELECT with FOR UPDATE SKIP LOCKED. Two concurrent claimers each
 * lock + claim DIFFERENT rows; neither blocks the other.
 *
 * Mode behavior:
 *
 *   "fresh"     — Pool leads the calling BD has NEVER dispositioned.
 *                  Ordered by lowest call-attempt count, then oldest
 *                  createdAt (FIFO within tie). New conversation.
 *
 *   "followup"  — Pool leads where the calling BD has at least one
 *                  prior connected_* disposition (interested / thinking /
 *                  not_selling). Ordered by oldest last_call_at — most
 *                  overdue callbacks bubble to the top. Continuing a
 *                  conversation.
 *
 * Connected outcomes recycle the lead back to the pool (it doesn't stay
 * "claimed" forever) so the BD can grab it again via Follow-up mode on a
 * later day. See dispositionLeadAction's KEEP_OUTCOMES handling.
 */
export async function claimNextLeadAction(mode: ClaimMode = "fresh"): Promise<ClaimResult> {
  const user = await requireUser();

  // Two distinct sub-SELECTs — same UPDATE shape.
  const selector =
    mode === "fresh"
      ? sql`
          SELECT id FROM raw_leads rl
          WHERE rl.status = 'pool' AND rl.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM raw_lead_dispositions d
              WHERE d.raw_lead_id = rl.id AND d.by_user_id = ${user.id}
            )
          ORDER BY rl.call_attempts ASC, rl.created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      : sql`
          SELECT id FROM raw_leads rl
          WHERE rl.status = 'pool' AND rl.deleted_at IS NULL
            AND EXISTS (
              SELECT 1 FROM raw_lead_dispositions d
              WHERE d.raw_lead_id = rl.id
                AND d.by_user_id = ${user.id}
                AND d.outcome IN ('connected_interested', 'connected_thinking', 'connected_not_selling')
            )
          ORDER BY rl.last_call_at ASC NULLS LAST, rl.updated_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

  const result = await db.execute(sql`
    UPDATE raw_leads
    SET
      status = 'claimed',
      claimed_by_id = ${user.id},
      claimed_at = NOW(),
      updated_at = NOW()
    WHERE id = (${selector})
    RETURNING id
  `);

  const rows = (result as unknown as { rows?: Array<{ id: string }> }).rows
    ?? (result as unknown as Array<{ id: string }>);
  const claimedId = rows?.[0]?.id ?? null;

  if (!claimedId) {
    return { ok: true, leadId: null, poolEmpty: true };
  }

  revalidatePath("/bd-triage");
  return { ok: true, leadId: claimedId };
}

/**
 * Counts of fresh + follow-up leads available to the calling BD. Used to
 * power the toggle's badges so they can see what's worth working before
 * they switch modes.
 */
export async function getQueueCountsForUser(): Promise<{ fresh: number; followup: number }> {
  const user = await requireUser();

  const fresh = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM raw_leads rl
    WHERE rl.status = 'pool' AND rl.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM raw_lead_dispositions d
        WHERE d.raw_lead_id = rl.id AND d.by_user_id = ${user.id}
      )
  `);
  const followup = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM raw_leads rl
    WHERE rl.status = 'pool' AND rl.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM raw_lead_dispositions d
        WHERE d.raw_lead_id = rl.id
          AND d.by_user_id = ${user.id}
          AND d.outcome IN ('connected_interested', 'connected_thinking', 'connected_not_selling')
      )
  `);

  const freshRows = (fresh as unknown as { rows?: Array<{ c: number }> }).rows
    ?? (fresh as unknown as Array<{ c: number }>);
  const followupRows = (followup as unknown as { rows?: Array<{ c: number }> }).rows
    ?? (followup as unknown as Array<{ c: number }>);

  return {
    fresh: freshRows?.[0]?.c ?? 0,
    followup: followupRows?.[0]?.c ?? 0,
  };
}

/**
 * Release a claimed lead back to the pool without logging a disposition.
 * Used when the BD wants to skip the current lead and grab a different one
 * (e.g. they recognize the park as theirs personally).
 */
export async function releaseLeadAction(leadId: string): Promise<void> {
  const user = await requireUser();
  await db
    .update(rawLeads)
    .set({ status: "pool", claimedById: null, claimedAt: null, updatedAt: new Date() })
    .where(and(eq(rawLeads.id, leadId), eq(rawLeads.claimedById, user.id)));
  revalidatePath("/bd-triage");
}

type DispositionInput = {
  leadId: string;
  outcome:
    | "no_answer"
    | "voicemail"
    | "busy"
    | "wrong_number"
    | "connected_interested"
    | "connected_not_selling"
    | "connected_thinking"
    | "qualified"
    | "do_not_call";
  notes?: string;
};

type DispositionResult = {
  ok: boolean;
  /** What happened to the lead — drives the UI's next move. */
  next: "recycled" | "converted" | "dead";
  /** When converted, the new deal id so the BD can be linked over. */
  newDealId?: string;
  error?: string;
};

// All non-terminal outcomes recycle the lead back to the pool. The BD's
// history is preserved via raw_lead_dispositions, so follow-up mode can
// re-surface leads where this BD had a connected_* conversation.
const RECYCLE_OUTCOMES = new Set([
  "no_answer",
  "voicemail",
  "busy",
  "wrong_number",
  "connected_interested",
  "connected_not_selling",
  "connected_thinking",
]);

/**
 * Record a call attempt + transition the lead's status based on outcome.
 *
 * Outcome → transition:
 *   no_answer | voicemail | busy | wrong_number  → back to pool (recycle)
 *   connected_*                                  → stay claimed (BD continues)
 *   qualified                                    → create deal, mark converted
 *   do_not_call                                  → mark dead
 *
 * Always:
 *   - inserts a raw_lead_dispositions row (audit log of every attempt)
 *   - bumps callAttempts++ on the lead
 *   - stamps lastCallAt + lastCallById
 */
export async function dispositionLeadAction(input: DispositionInput): Promise<DispositionResult> {
  const user = await requireUser();
  const { leadId, outcome, notes } = input;

  // Verify the lead exists + the current user is its claimant. We don't
  // want one BD dispositioning another BD's claimed lead.
  const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, leadId)).limit(1);
  if (!lead) return { ok: false, next: "recycled", error: "Lead not found" };
  if (lead.claimedById !== user.id) {
    return { ok: false, next: "recycled", error: "This lead isn't claimed by you" };
  }

  const now = new Date();

  // Log the attempt no matter what — single source of truth for "what's
  // happened on this lead historically".
  await db.insert(rawLeadDispositions).values({
    rawLeadId: leadId,
    byUserId: user.id,
    outcome,
    notes: notes?.trim() || null,
  });

  // Common updates: bump attempts + stamp last call.
  const baseUpdate = {
    callAttempts: sql`${rawLeads.callAttempts} + 1`,
    lastCallAt: now,
    lastCallById: user.id,
    updatedAt: now,
  };

  if (RECYCLE_OUTCOMES.has(outcome)) {
    await db
      .update(rawLeads)
      .set({
        ...baseUpdate,
        status: "pool",
        claimedById: null,
        claimedAt: null,
      })
      .where(eq(rawLeads.id, leadId));
    revalidatePath("/bd-triage");
    return { ok: true, next: "recycled" };
  }

  if (outcome === "do_not_call") {
    await db
      .update(rawLeads)
      .set({
        ...baseUpdate,
        status: "dead",
        claimedById: null,
        claimedAt: null,
      })
      .where(eq(rawLeads.id, leadId));
    revalidatePath("/bd-triage");
    return { ok: true, next: "dead" };
  }

  // outcome === "qualified" — promote to a real deal.
  // Build the deal record from the lead. We deliberately keep the deal's
  // own owner blank — the closer assignment happens in triage.
  const fullAddress = [lead.street, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ");
  const [newDeal] = await db
    .insert(deals)
    .values({
      name: lead.parkName ?? lead.street ?? "Lead from BD",
      parkAddress: fullAddress || null,
      parkCity: lead.city,
      parkState: lead.state,
      padsCount: lead.pads,
      // First-stage closer status. This puts it in the triage cockpit
      // queue so a closer picks it up next.
      statusCode: "new_lead_received",
      // Capture the BD identity for credit / leaderboard later.
      birdDogFirstName: lead.ownerName ?? null,
      // Note: leaving birdDogId unset for now; we'll link bird_dogs in
      // a later phase once BD selection on intake exists.
    })
    .returning({ id: deals.id });

  await db
    .update(rawLeads)
    .set({
      ...baseUpdate,
      status: "converted",
      convertedDealId: newDeal?.id ?? null,
      convertedAt: now,
      claimedById: null,
      claimedAt: null,
    })
    .where(eq(rawLeads.id, leadId));

  revalidatePath("/bd-triage");
  revalidatePath("/triage");
  revalidatePath("/deals");
  return { ok: true, next: "converted", newDealId: newDeal?.id };
}
