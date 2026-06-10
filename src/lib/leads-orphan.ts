/**
 * Orphan-park handling.
 *
 * When a BD is suspended or deleted, any leads they had actively claimed
 * (status='claimed') should fall back to the pool so another teammate
 * can pick them up — otherwise they sit forever attached to a user who
 * is no longer working them.
 *
 * Notes are NOT affected: raw_lead_dispositions rows are immutable and
 * include every BD's call notes, so the lead's history follows the
 * park profile, not the BD who left. The "Prior touches" panel on
 * /bd-triage surfaces them to the next BD who claims it.
 *
 * Closes feedback #7000 (Erica).
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { rawLeads } from "@/db/schema";

/**
 * Recycle every lead currently claimed by `userId` back to the pool.
 * Returns the count actually moved so callers (suspend / delete user
 * actions, the manual /admin/leads cleanup tool) can include it in
 * their audit log + toast.
 *
 * Idempotent — calling twice in a row simply returns 0 the second time.
 */
export async function recycleUserClaimedLeads(userId: string): Promise<number> {
  if (!userId) return 0;
  const result = await db
    .update(rawLeads)
    .set({
      status: "pool",
      claimedById: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(rawLeads.claimedById, userId), eq(rawLeads.status, "claimed")))
    .returning({ id: rawLeads.id });
  return result.length;
}

/**
 * One-off cleanup: any lead with status='claimed' AND claimedById IS NULL
 * is by definition an orphan (the FK fired ON DELETE SET NULL on a hard
 * user delete, but the status stayed). Reset them to pool.
 *
 * Returns the count moved. Safe to run any time.
 */
export async function cleanUpDanglingClaims(): Promise<number> {
  const result = await db
    .update(rawLeads)
    .set({
      status: "pool",
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(rawLeads.status, "claimed"), isNull(rawLeads.claimedById)))
    .returning({ id: rawLeads.id });
  return result.length;
}
