"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { rawLeads } from "@/db/schema";
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
