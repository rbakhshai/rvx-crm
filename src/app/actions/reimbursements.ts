"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reimbursementRequests } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

async function requireWrite() {
  const user = await requireUser();
  if (!(await hasPermission(user, "manage_reimbursements"))) {
    throw new Error("You don't have permission to manage reimbursements");
  }
  return user;
}

type Status = "pending" | "approved" | "purchased" | "fulfilled" | "declined";

/**
 * Open a new reimbursement request. Requester auto-set from session;
 * status defaults to "pending" so it shows up in the review queue.
 *
 * neededBy comes from <input type="date"> as YYYY-MM-DD; empty / missing
 * stores NULL. amountCents is optional — accept dollars-or-cents-with-
 * dot from the form and round to int cents.
 */
export async function createReimbursementAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireWrite();
  const itemDescription = String(formData.get("itemDescription") ?? "").trim();
  if (!itemDescription) return { ok: false, error: "Tell us what you need" };

  const parkName  = String(formData.get("parkName") ?? "").trim() || null;
  const reason    = String(formData.get("reason") ?? "").trim() || null;
  const productUrl = String(formData.get("productUrl") ?? "").trim() || null;
  const neededByRaw = String(formData.get("neededBy") ?? "").trim();
  const neededBy = neededByRaw ? new Date(`${neededByRaw}T00:00:00`) : null;

  // Dollars input → cents int. Empty → NULL. "42.50" → 4250.
  const amountRaw = String(formData.get("amount") ?? "").trim();
  let amountCents: number | null = null;
  if (amountRaw) {
    const parsed = parseFloat(amountRaw.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed) && parsed > 0) {
      amountCents = Math.round(parsed * 100);
    }
  }

  const [row] = await db
    .insert(reimbursementRequests)
    .values({
      parkName,
      itemDescription,
      reason,
      productUrl,
      neededBy,
      amountCents,
      requestedById: user.id,
    })
    .returning({ id: reimbursementRequests.id });

  revalidatePath("/reimbursements");
  return { ok: true, id: row?.id };
}

/** Inline-patch any of the editable fields. */
export async function updateReimbursementAction(
  id: string,
  patch: {
    parkName?: string | null;
    itemDescription?: string;
    reason?: string | null;
    productUrl?: string | null;
    neededByIso?: string | null;
    amountCents?: number | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  await requireWrite();
  function coerce(s: string | null | undefined): string | null | undefined {
    if (s === undefined) return undefined;
    if (s === null) return null;
    const t = s.trim();
    return t.length > 0 ? t : null;
  }
  const next: Partial<typeof reimbursementRequests.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.parkName !== undefined)        next.parkName        = coerce(patch.parkName);
  if (patch.reason !== undefined)          next.reason          = coerce(patch.reason);
  if (patch.productUrl !== undefined)      next.productUrl      = coerce(patch.productUrl);
  if (patch.itemDescription && patch.itemDescription.trim().length > 0) {
    next.itemDescription = patch.itemDescription.trim();
  }
  if (patch.neededByIso !== undefined) {
    next.neededBy = patch.neededByIso ? new Date(`${patch.neededByIso}T00:00:00`) : null;
  }
  if (patch.amountCents !== undefined) {
    next.amountCents = patch.amountCents != null && patch.amountCents > 0 ? patch.amountCents : null;
  }

  await db.update(reimbursementRequests).set(next).where(eq(reimbursementRequests.id, id));
  revalidatePath("/reimbursements");
  revalidatePath(`/reimbursements/${id}`);
  return { ok: true };
}

/**
 * Advance through the workflow. Each call moves one step:
 *   pending → approved → purchased → fulfilled
 * Stamps the matching at/by columns so we have an audit trail of who
 * pushed it forward at each step.
 */
export async function advanceReimbursementAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireWrite();
  const [row] = await db
    .select({ status: reimbursementRequests.status })
    .from(reimbursementRequests)
    .where(eq(reimbursementRequests.id, id));
  if (!row) return { ok: false, error: "Not found" };
  const now = new Date();
  switch (row.status as Status) {
    case "pending":
      await db.update(reimbursementRequests)
        .set({ status: "approved", approvedAt: now, approvedById: user.id, updatedAt: now })
        .where(eq(reimbursementRequests.id, id));
      break;
    case "approved":
      await db.update(reimbursementRequests)
        .set({ status: "purchased", purchasedAt: now, purchasedById: user.id, updatedAt: now })
        .where(eq(reimbursementRequests.id, id));
      break;
    case "purchased":
      await db.update(reimbursementRequests)
        .set({ status: "fulfilled", fulfilledAt: now, fulfilledById: user.id, updatedAt: now })
        .where(eq(reimbursementRequests.id, id));
      break;
    default:
      return { ok: false, error: "Already at the final step" };
  }
  revalidatePath("/reimbursements");
  revalidatePath(`/reimbursements/${id}`);
  return { ok: true };
}

/** Decline the request with a reason — terminal. */
export async function declineReimbursementAction(id: string, reason: string): Promise<{ ok: boolean }> {
  const user = await requireWrite();
  await db
    .update(reimbursementRequests)
    .set({
      status: "declined",
      declinedAt: new Date(),
      declinedById: user.id,
      declineReason: reason.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(reimbursementRequests.id, id));
  revalidatePath("/reimbursements");
  revalidatePath(`/reimbursements/${id}`);
  return { ok: true };
}

/** Soft delete. Audit trail preserved. */
export async function deleteReimbursementAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireWrite();
  await db
    .update(reimbursementRequests)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(and(eq(reimbursementRequests.id, id), isNull(reimbursementRequests.deletedAt)));
  revalidatePath("/reimbursements");
  return { ok: true };
}
