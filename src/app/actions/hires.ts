"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { hireRequests } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

async function requireHiresWrite() {
  const user = await requireUser();
  if (!(await hasPermission(user, "manage_hires"))) {
    throw new Error("You don't have permission to manage hires");
  }
  return user;
}

type Type = "employee" | "contractor_1099" | "vendor";
type Status =
  | "draft"
  | "finance_review"
  | "founder_review"
  | "requester_review"
  | "finalized"
  | "withdrawn";
type Category = "leadership" | "acquisition";

const TYPES: ReadonlyArray<Type> = ["employee", "contractor_1099", "vendor"];
const CATEGORIES: ReadonlyArray<Category> = ["leadership", "acquisition"];

/**
 * Both desks share this engine, so a transition can affect either
 * queue. Revalidating both list + detail paths is cheap and avoids an
 * extra category lookup in every action.
 */
function revalidateHire(id: string) {
  revalidatePath("/hires");
  revalidatePath(`/hires/${id}`);
  revalidatePath("/acquisition/new-hires");
  revalidatePath(`/acquisition/new-hires/${id}`);
}

/** Legal forward / backward transitions for the hire workflow. */
const NEXT_STATUS: Record<Status, Status | null> = {
  draft:             "finance_review",
  finance_review:    "founder_review",
  founder_review:    "requester_review",
  requester_review:  "finalized",
  finalized:         null,
  withdrawn:         null,
};

const PREV_STATUS: Record<Status, Status | null> = {
  draft:             null,
  finance_review:    "draft",
  founder_review:    "finance_review",
  requester_review:  "founder_review",
  finalized:         "requester_review",
  withdrawn:         null,
};

// ============================================================================
// CRUD
// ============================================================================

/**
 * Open a new hire request. Defaults type to 1099 since that's the
 * most common case (per Reza's note in the email thread) and status
 * to "draft" so the requester can flesh out duties before submitting.
 */
export async function createHireRequestAction(formData: FormData): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const user = await requireHiresWrite();
  const candidateName = String(formData.get("candidateName") ?? "").trim();
  if (!candidateName) return { ok: false, error: "Candidate name is required" };

  const typeRaw = String(formData.get("type") ?? "contractor_1099");
  const type: Type = (TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as Type) : "contractor_1099";

  const categoryRaw = String(formData.get("category") ?? "leadership");
  const category: Category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? (categoryRaw as Category) : "leadership";

  const candidateEmail = String(formData.get("candidateEmail") ?? "").trim() || null;
  const candidatePhone = String(formData.get("candidatePhone") ?? "").trim() || null;
  const forUnit        = String(formData.get("forUnit") ?? "").trim() || null;
  const roleTitle      = String(formData.get("roleTitle") ?? "").trim() || null;
  const rolesAndDuties = String(formData.get("rolesAndDuties") ?? "").trim() || null;

  const [row] = await db
    .insert(hireRequests)
    .values({
      candidateName,
      candidateEmail,
      candidatePhone,
      type,
      category,
      forUnit,
      roleTitle,
      rolesAndDuties,
      requestedById: user.id,
    })
    .returning({ id: hireRequests.id });

  revalidateHire(row?.id ?? "");
  return { ok: true, id: row?.id };
}

/**
 * Inline-edit a single field on the request. Any of the editable
 * text fields can be patched in one call; pass `null` to clear.
 */
export async function updateHireRequestAction(
  id: string,
  patch: {
    candidateName?: string;
    candidateEmail?: string | null;
    candidatePhone?: string | null;
    type?: Type;
    forUnit?: string | null;
    roleTitle?: string | null;
    rolesAndDuties?: string | null;
    financeNotes?: string | null;
    founderNotes?: string | null;
    requesterFinalNotes?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  await requireHiresWrite();

  // Normalize: empty / whitespace-only string clears to null. Validate
  // the type enum so the caller can't sneak in a bad value.
  const next: Partial<typeof hireRequests.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  function coerce(s: string | null | undefined): string | null | undefined {
    if (s === undefined) return undefined;
    if (s === null) return null;
    const t = s.trim();
    return t.length > 0 ? t : null;
  }

  if (patch.candidateName !== undefined && patch.candidateName.trim().length > 0) {
    next.candidateName = patch.candidateName.trim();
  }
  if (patch.candidateEmail !== undefined)        next.candidateEmail        = coerce(patch.candidateEmail);
  if (patch.candidatePhone !== undefined)        next.candidatePhone        = coerce(patch.candidatePhone);
  if (patch.forUnit !== undefined)               next.forUnit               = coerce(patch.forUnit);
  if (patch.roleTitle !== undefined)             next.roleTitle             = coerce(patch.roleTitle);
  if (patch.rolesAndDuties !== undefined)        next.rolesAndDuties        = coerce(patch.rolesAndDuties);
  if (patch.financeNotes !== undefined)          next.financeNotes          = coerce(patch.financeNotes);
  if (patch.founderNotes !== undefined)          next.founderNotes          = coerce(patch.founderNotes);
  if (patch.requesterFinalNotes !== undefined)   next.requesterFinalNotes   = coerce(patch.requesterFinalNotes);
  if (patch.type && (TYPES as readonly string[]).includes(patch.type)) {
    next.type = patch.type;
  }

  await db.update(hireRequests).set(next).where(eq(hireRequests.id, id));
  revalidateHire(id);
  return { ok: true };
}

// ============================================================================
// Workflow transitions
// ============================================================================

/** Move forward one step. No-op at the end of the line. */
export async function advanceHireStatusAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireHiresWrite();
  const [row] = await db.select({ status: hireRequests.status }).from(hireRequests).where(eq(hireRequests.id, id));
  if (!row) return { ok: false, error: "Not found" };
  const next = NEXT_STATUS[row.status as Status];
  if (!next) return { ok: false, error: "Already at the final step" };
  await db
    .update(hireRequests)
    .set({
      status: next,
      finalizedAt: next === "finalized" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(hireRequests.id, id));
  revalidateHire(id);
  return { ok: true };
}

/** Move backward one step. Used when a reviewer kicks it back. */
export async function reverseHireStatusAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireHiresWrite();
  const [row] = await db.select({ status: hireRequests.status }).from(hireRequests).where(eq(hireRequests.id, id));
  if (!row) return { ok: false, error: "Not found" };
  const prev = PREV_STATUS[row.status as Status];
  if (!prev) return { ok: false, error: "Already at the start" };
  await db
    .update(hireRequests)
    .set({
      status: prev,
      finalizedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(hireRequests.id, id));
  revalidateHire(id);
  return { ok: true };
}

/** Withdraw the request entirely. Keeps the row for the audit trail. */
export async function withdrawHireAction(id: string, reason: string): Promise<{ ok: boolean }> {
  await requireHiresWrite();
  await db
    .update(hireRequests)
    .set({
      status: "withdrawn",
      withdrawnAt: new Date(),
      withdrawnReason: reason.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(hireRequests.id, id));
  revalidateHire(id);
  return { ok: true };
}

/** Soft-delete (admin-only — keeps history). */
export async function deleteHireAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireHiresWrite();
  await db
    .update(hireRequests)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(and(eq(hireRequests.id, id), isNull(hireRequests.deletedAt)));
  revalidateHire(id);
  return { ok: true };
}
