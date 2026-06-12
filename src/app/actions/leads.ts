"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, rawLeadDispositions, rawLeads, rawLeadSkips } from "@/db/schema";
import { auth } from "@/lib/auth";
import { addressKey, parseLeadsCsv } from "@/lib/raw-leads-csv";
import {
  DEFAULT_FOLLOW_UP_DAYS,
  FOLLOW_UP_DAYS_OPTIONS,
  FOLLOW_UP_OUTCOMES,
  isFollowUpOutcome,
} from "@/lib/follow-up";
import { requirePermission } from "@/lib/has-permission";
import { getOpsBlocks } from "@/lib/ops-content";

/**
 * Build a SQL literal like `ARRAY['connected_interested', …]` from the
 * central FOLLOW_UP_OUTCOMES list (connected_* + email_follow_up). Used
 * inside raw `sql` templates via sql.raw so we don't have to re-thread
 * the list every time we add a new sub-status. Drives Follow-up mode:
 * any of these outcomes keeps the lead in the BD's callback pipeline.
 */
function followUpOutcomesArrayLiteral(): string {
  return `ARRAY[${FOLLOW_UP_OUTCOMES.map((o) => `'${o}'`).join(", ")}]`;
}

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
  // /admin/leads is gated on manage_users — enforce the same here so a
  // BD can't pump arbitrary rows into the pool via a raw POST.
  await requirePermission(user, "manage_users");
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
  await requirePermission(user, "manage_users");
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
  await requirePermission(user, "manage_users");
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

  // Self-healing reapers — run on every claim so the pool heals itself
  // without a cron. History (dispositions, notes) is never touched.
  //
  // 1. Stranded claims: any lead claimed >24h ago goes back to the pool.
  //    A BD who claims a lead and walks away would otherwise strand it.
  await db.execute(sql`
    UPDATE raw_leads
    SET status = 'pool', claimed_by_id = NULL, claimed_at = NULL, updated_at = NOW()
    WHERE status = 'claimed' AND claimed_at < NOW() - INTERVAL '24 hours'
  `);

  // 2. Missed follow-ups (spec Phase 9): a scheduled callback ignored
  //    for 14 days past its date loses its owner — the schedule clears
  //    and the park returns to general fresh distribution. The original
  //    BD's notes stay attached for whoever picks it up next.
  await db.execute(sql`
    UPDATE raw_leads
    SET next_follow_up_at = NULL, follow_up_cadence_days = NULL,
        follow_up_set_by_id = NULL, updated_at = NOW()
    WHERE status = 'pool'
      AND next_follow_up_at < NOW() - INTERVAL '14 days'
  `);

  // 3. Inactive BDs (spec Phase 12): a BD with zero dial activity for
  //    21 consecutive days releases their whole follow-up pipeline back
  //    to the pool, automatically. (Keyed on dispositions rather than
  //    submissions so an active caller in a dry spell keeps their
  //    pipeline; leadership sees the no-submissions drought on /bd-team.)
  await db.execute(sql`
    UPDATE raw_leads
    SET next_follow_up_at = NULL, follow_up_cadence_days = NULL,
        follow_up_set_by_id = NULL, updated_at = NOW()
    WHERE status = 'pool'
      AND next_follow_up_at IS NOT NULL
      AND last_call_by_id IN (
        SELECT u.id FROM "user" u
        WHERE u.role IN ('bd_level_1', 'bd_level_2', 'bd_level_3')
          AND NOT EXISTS (
            SELECT 1 FROM raw_lead_dispositions d
            WHERE d.by_user_id = u.id
              AND d.created_at >= NOW() - INTERVAL '21 days'
          )
      )
  `);

  // Two distinct sub-SELECTs — same UPDATE shape.
  const selector =
    mode === "fresh"
      ? sql`
          SELECT id FROM raw_leads rl
          WHERE rl.status = 'pool' AND rl.deleted_at IS NULL
            -- Phase 9 exclusivity: a park with a live follow-up schedule
            -- belongs to the BD who set it — fresh mode skips it until
            -- the 14-day reaper releases it.
            AND rl.next_follow_up_at IS NULL
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
                AND d.outcome::text = ANY(${sql.raw(followUpOutcomesArrayLiteral())})
            )
          -- Order: scheduled-overdue first (next_follow_up_at <= NOW),
          -- then the oldest scheduled date, then unscheduled. Falls back
          -- to last_call_at for ties so behavior stays stable when no
          -- one has set follow-up dates yet.
          ORDER BY
            (rl.next_follow_up_at IS NOT NULL AND rl.next_follow_up_at <= NOW()) DESC,
            rl.next_follow_up_at ASC NULLS LAST,
            rl.last_call_at ASC NULLS LAST
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

  revalidatePath("/lead-work");
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
      AND rl.next_follow_up_at IS NULL
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
          AND d.outcome::text = ANY(${sql.raw(followUpOutcomesArrayLiteral())})
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
 * Release a claimed lead back to the pool without logging a disposition
 * (a "skip"). The spec requires a reason on every skip — it's the
 * anti-cherry-picking pressure valve — and the reason is logged to
 * raw_lead_skips for leadership eyes only (surfaced on /bd-team).
 * Skips are NOT dispositions, so they never count as calls or points.
 */
export async function releaseLeadAction(
  leadId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "A skip reason is required." };
  }

  const result = await db
    .update(rawLeads)
    .set({ status: "pool", claimedById: null, claimedAt: null, updatedAt: new Date() })
    .where(and(eq(rawLeads.id, leadId), eq(rawLeads.claimedById, user.id)))
    .returning({ id: rawLeads.id });
  // Only log when the release actually happened (the WHERE guards
  // against skipping a lead someone else holds).
  if (result.length > 0) {
    await db.insert(rawLeadSkips).values({
      rawLeadId: leadId,
      byUserId: user.id,
      reason: trimmed.slice(0, 500),
    });
  }
  revalidatePath("/lead-work");
  return { ok: true };
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
    | "connected_selling_to_family"
    | "connected_future_maybe"
    | "connected_manager_only"
    | "qualified"
    | "do_not_call"
    | "bad_contact_info"
    | "email_follow_up";
  notes?: string;
  /**
   * Optional explicit follow-up cadence in days. Honored only when the
   * outcome schedules a follow-up (connected_* / email_follow_up).
   * If omitted, we fall back to the DEFAULT_FOLLOW_UP_DAYS map.
   */
  followUpDays?: number;
  /**
   * Required true when outcome === "qualified". The client collects the
   * three spec-mandated confirmations (spoke with decision-maker,
   * $150k+ NOI verbally confirmed, willing to discuss a sale); this
   * flag asserts all three were checked. Server rejects without it so
   * a raw POST can't shortcut the gate.
   */
  qualifiedConfirmed?: boolean;
};

type DispositionResult = {
  ok: boolean;
  /** What happened to the lead — drives the UI's next move. */
  next: "recycled" | "converted" | "dead";
  /** When converted, the new deal id so the BD can be linked over. */
  newDealId?: string;
  /** Milestones crossed by THIS disposition — the client toasts each
   *  one so the celebration lands at the moment of the behavior. */
  celebrations?: string[];
  error?: string;
};

/**
 * Did this disposition cross a milestone? One indexed aggregate over
 * the BD's own history — cheap enough to run on every dial. Exact
 * equality against thresholds means each fires exactly once (the
 * 100th call, not every call after).
 */
async function computeCelebrations(userId: string, outcome: string): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE outcome::text LIKE 'connected_%')::int AS connects,
        COUNT(*) FILTER (WHERE outcome = 'qualified')::int AS qualified,
        COUNT(*) FILTER (WHERE created_at >= (NOW() AT TIME ZONE 'UTC')::date)::int AS today
      FROM raw_lead_dispositions
      WHERE by_user_id = ${userId}
    `);
    const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows
      ?? (result as unknown as Array<Record<string, unknown>>)) ?? [];
    const r = rows[0] ?? {};
    const total = Number(r.total) || 0;
    const connects = Number(r.connects) || 0;
    const qualified = Number(r.qualified) || 0;
    const today = Number(r.today) || 0;

    const isConnected = outcome.startsWith("connected_");
    const out: string[] = [];
    if (total === 1) out.push("🏅 First call logged — you're on the board!");
    if (total === 100) out.push("💯 100 career calls — badge unlocked!");
    if (total === 1000) out.push("🚀 1,000 career calls. Legend.");
    if (isConnected && connects === 1) out.push("🗣️ First owner connect — badge unlocked!");
    if (outcome === "qualified" && qualified === 1) out.push("✅ First qualified lead — badge unlocked!");

    // Daily goal crossing — fires on the exact dial that hits it.
    const blocks = await getOpsBlocks("bd.");
    const goalRaw = parseInt(blocks.get("bd.daily_call_goal") ?? "", 10);
    const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : 40;
    if (today === goal) out.push(`🔥 Daily goal hit — ${goal}/${goal}! Streak extended.`);

    return out;
  } catch (e) {
    // Celebrations are gravy — never let them break a disposition.
    console.error("[celebrations] failed:", e);
    return [];
  }
}

// All non-terminal outcomes recycle the lead back to the pool. The BD's
// history is preserved via raw_lead_dispositions, so follow-up mode can
// re-surface leads where this BD had a connected_* conversation.
const RECYCLE_OUTCOMES = new Set<string>([
  "no_answer",
  "voicemail",
  "busy",
  "wrong_number",
  "bad_contact_info",
  // Every follow-up-scheduling outcome (connected_* + email_follow_up) —
  // sourced from the central list in lib/follow-up.ts so adding a new
  // sub-status here Just Works.
  ...FOLLOW_UP_OUTCOMES,
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
  const { leadId, outcome, notes, followUpDays } = input;

  // Verify the lead exists + the current user is its claimant. We don't
  // want one BD dispositioning another BD's claimed lead.
  const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, leadId)).limit(1);
  if (!lead) return { ok: false, next: "recycled", error: "Lead not found" };
  if (lead.claimedById !== user.id) {
    return { ok: false, next: "recycled", error: "This lead isn't claimed by you" };
  }

  // Qualified gate — the spec's minimum submission requirements. The
  // client can't render a qualified submission without the three
  // checkboxes; this guards the action itself.
  if (outcome === "qualified" && !input.qualifiedConfirmed) {
    return {
      ok: false,
      next: "recycled",
      error: "Confirm the three qualification requirements first.",
    };
  }

  const now = new Date();

  // Stamp the audit line into the disposition notes so the confirmation
  // survives on the park record forever, not just in the request.
  const noteBody = notes?.trim() || "";
  const finalNotes =
    outcome === "qualified"
      ? [
          "[Confirmed: spoke with decision-maker · $150k+ NOI verbal · willing to discuss sale]",
          noteBody,
        ].filter(Boolean).join("\n")
      : noteBody || null;

  // Log the attempt no matter what — single source of truth for "what's
  // happened on this lead historically".
  await db.insert(rawLeadDispositions).values({
    rawLeadId: leadId,
    byUserId: user.id,
    outcome,
    notes: finalNotes,
  });

  // Milestone check AFTER the insert so this dial counts toward its
  // own celebration (the 100th call celebrates on the 100th call).
  const celebrations = await computeCelebrations(user.id, outcome);

  // Common updates: bump attempts + stamp last call.
  const baseUpdate = {
    callAttempts: sql`${rawLeads.callAttempts} + 1`,
    lastCallAt: now,
    lastCallById: user.id,
    updatedAt: now,
  };

  if (RECYCLE_OUTCOMES.has(outcome)) {
    // Compute next follow-up only for scheduling outcomes (connected_* +
    // email_follow_up) — no-answer / voicemail / busy / wrong_number /
    // bad_contact_info recycle without scheduling.
    const schedules = isFollowUpOutcome(outcome);
    let nextFollowUpAt: Date | null = null;
    let cadence: number | null = null;
    if (schedules) {
      cadence =
        followUpDays && (FOLLOW_UP_DAYS_OPTIONS as readonly number[]).includes(followUpDays)
          ? followUpDays
          : DEFAULT_FOLLOW_UP_DAYS[outcome] ?? null;
      if (cadence != null) {
        nextFollowUpAt = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000);
      }
    }

    await db
      .update(rawLeads)
      .set({
        ...baseUpdate,
        status: "pool",
        claimedById: null,
        claimedAt: null,
        // Only stamp when we actually have a date — preserves any existing
        // value from a prior connected touch on the non-scheduling branches.
        ...(schedules
          ? {
              nextFollowUpAt,
              followUpCadenceDays: cadence,
              followUpSetById: user.id,
            }
          : {}),
      })
      .where(eq(rawLeads.id, leadId));
    revalidatePath("/lead-work");
    revalidatePath("/my-leads");
    revalidatePath("/today");
    return { ok: true, next: "recycled", celebrations };
  }

  if (outcome === "do_not_call") {
    await db
      .update(rawLeads)
      .set({
        ...baseUpdate,
        status: "dead",
        claimedById: null,
        claimedAt: null,
        // DNC clears any pending follow-up — no point pinging again.
        nextFollowUpAt: null,
      })
      .where(eq(rawLeads.id, leadId));
    revalidatePath("/lead-work");
    revalidatePath("/my-leads");
    revalidatePath("/today");
    return { ok: true, next: "dead", celebrations };
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
      // The deal pipeline owns follow-up from here — clear the BD's
      // callback schedule so /today stops nagging about a won lead.
      nextFollowUpAt: null,
    })
    .where(eq(rawLeads.id, leadId));

  revalidatePath("/lead-work");
  revalidatePath("/triage");
  revalidatePath("/deals");
  revalidatePath("/my-leads");
  revalidatePath("/today");
  return { ok: true, next: "converted", newDealId: newDeal?.id, celebrations };
}

/**
 * Inline-edit the contact info on a claimed lead. Used when the
 * skip-traced phone or email turns out to be wrong — instead of just
 * firing wrong_number and recycling, the BD updates the field so
 * future call attempts use the corrected value.
 *
 * Permission: only the current claimant or an admin can edit. Future
 * BDs who pick the lead up later see the updated value automatically.
 *
 * Pass null to clear a field; pass undefined to leave it untouched.
 * Both an empty string and a whitespace-only string also clear.
 */
export async function correctLeadContactAction(
  leadId: string,
  updates: { ownerPhone?: string | null; ownerEmail?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  const [lead] = await db
    .select({ claimedById: rawLeads.claimedById })
    .from(rawLeads)
    .where(eq(rawLeads.id, leadId))
    .limit(1);
  if (!lead) return { ok: false, error: "Lead not found" };

  const isAdmin = user.role === "admin";
  if (!isAdmin && lead.claimedById !== user.id) {
    return { ok: false, error: "Claim this lead first to edit it." };
  }

  // Coerce empty / whitespace → null so the DB doesn't store "".
  const patch: { ownerPhone?: string | null; ownerEmail?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (updates.ownerPhone !== undefined) {
    const v = (updates.ownerPhone ?? "").trim();
    patch.ownerPhone = v.length > 0 ? v : null;
  }
  if (updates.ownerEmail !== undefined) {
    const v = (updates.ownerEmail ?? "").trim();
    patch.ownerEmail = v.length > 0 ? v : null;
  }

  if (Object.keys(patch).length === 1) {
    // Only updatedAt — nothing to save.
    return { ok: true };
  }

  await db.update(rawLeads).set(patch).where(eq(rawLeads.id, leadId));

  revalidatePath("/lead-work");
  revalidatePath("/my-leads");
  revalidatePath("/admin/leads");
  return { ok: true };
}

/**
 * Manually set / change / clear the next follow-up date on a lead.
 *
 * Usable from /my-leads (the BD's personal status board) without going
 * through a fresh disposition. Pass `days = null` to clear the schedule
 * entirely (e.g. lead is dead but you don't want to fire a DNC yet).
 *
 * Permission: any user who has previously dispositioned the lead, OR the
 * current claimant. Prevents one BD from re-scheduling another BD's
 * leads. Admins (manage_users) can override.
 */
export async function setLeadFollowUpAction(
  leadId: string,
  days: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  // Permission check: did this user disposition the lead or are they the
  // current claimant? Admins can edit anyone's.
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    const [touched] = await db.execute(sql`
      SELECT 1 AS ok
      FROM raw_lead_dispositions
      WHERE raw_lead_id = ${leadId} AND by_user_id = ${user.id}
      LIMIT 1
    `) as unknown as Array<{ ok: number }>;
    const [lead] = await db
      .select({ claimedById: rawLeads.claimedById })
      .from(rawLeads)
      .where(eq(rawLeads.id, leadId));
    if (!touched && lead?.claimedById !== user.id) {
      return { ok: false, error: "You haven't worked this lead." };
    }
  }

  const now = new Date();
  const validDays =
    days != null && (FOLLOW_UP_DAYS_OPTIONS as readonly number[]).includes(days) ? days : null;
  const nextAt = validDays != null ? new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000) : null;

  await db
    .update(rawLeads)
    .set({
      nextFollowUpAt: nextAt,
      followUpCadenceDays: validDays,
      followUpSetById: user.id,
      updatedAt: now,
    })
    .where(eq(rawLeads.id, leadId));

  revalidatePath("/my-leads");
  revalidatePath("/today");
  revalidatePath("/lead-work");
  return { ok: true };
}
