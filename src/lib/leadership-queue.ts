/**
 * Leadership queue — what's waiting on YOU across the two leadership
 * workflows (New Hires + Reimbursements). Powers the Today widget so
 * Kevin doesn't have to remember to check /hires when Marco submits
 * a request, and Reza sees the queue ahead of him without hunting.
 *
 * Ownership rules:
 *   HIRES
 *     finance_review    → cfo (Finance / Kevin)
 *     founder_review    → admin (Reza)
 *     requester_review  → the original requester
 *
 *   REIMBURSEMENTS
 *     pending           → admin or cfo (the approvers)
 *     approved          → cfo (Finance buys it)
 *     purchased         → the original requester (mark fulfilled)
 *
 * Anyone with manage_hires / manage_reimbursements can act regardless
 * of role, but the WIDGET only surfaces what's "on you" so /today
 * stays a focused daily driver.
 */
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { hireRequests, reimbursementRequests } from "@/db/schema";

export type LeadershipItem = {
  id: string;
  kind: "hire" | "reimbursement";
  title: string;
  /** Status string for the chip — pretty already. */
  statusLabel: string;
  /** Tailwind class string for tone. */
  tone: "blue" | "violet" | "amber" | "emerald" | "rose";
  /** Where to click through. */
  href: string;
};

const HIRE_STATUS_TONE: Record<string, "blue" | "violet" | "amber"> = {
  finance_review:   "blue",
  founder_review:   "violet",
  requester_review: "amber",
};
const HIRE_STATUS_LABEL: Record<string, string> = {
  finance_review:   "Finance review",
  founder_review:   "Founder review",
  requester_review: "Final remarks",
};

const REIMB_STATUS_TONE: Record<string, "amber" | "blue" | "violet"> = {
  pending:    "amber",
  approved:   "blue",
  purchased:  "violet",
};
const REIMB_STATUS_LABEL: Record<string, string> = {
  pending:    "Awaiting approval",
  approved:   "To purchase",
  purchased:  "Mark when received",
};

export async function getLeadershipQueueForUser(
  userId: string,
  role: string | null | undefined,
): Promise<LeadershipItem[]> {
  const isAdmin = role === "admin";
  const isCfo = role === "cfo";

  // ----- Hires -----
  // Pull every active hire (not finalized / withdrawn / deleted) and
  // filter in JS — list is tiny and the rules are role-conditional.
  const hires = await db
    .select({
      id: hireRequests.id,
      candidateName: hireRequests.candidateName,
      status: hireRequests.status,
      requestedById: hireRequests.requestedById,
    })
    .from(hireRequests)
    .where(
      and(
        isNull(hireRequests.deletedAt),
        // Active only
        or(
          eq(hireRequests.status, "finance_review"),
          eq(hireRequests.status, "founder_review"),
          eq(hireRequests.status, "requester_review"),
        ),
      ),
    );

  const hireItems: LeadershipItem[] = hires
    .filter((h) => {
      if (h.status === "finance_review")    return isCfo;
      if (h.status === "founder_review")    return isAdmin;
      if (h.status === "requester_review")  return h.requestedById === userId;
      return false;
    })
    .map((h) => ({
      id: h.id,
      kind: "hire",
      title: h.candidateName,
      statusLabel: HIRE_STATUS_LABEL[h.status] ?? h.status,
      tone: HIRE_STATUS_TONE[h.status] ?? "blue",
      href: `/hires/${h.id}`,
    }));

  // ----- Reimbursements -----
  const reimbs = await db
    .select({
      id: reimbursementRequests.id,
      itemDescription: reimbursementRequests.itemDescription,
      status: reimbursementRequests.status,
      requestedById: reimbursementRequests.requestedById,
    })
    .from(reimbursementRequests)
    .where(
      and(
        isNull(reimbursementRequests.deletedAt),
        or(
          eq(reimbursementRequests.status, "pending"),
          eq(reimbursementRequests.status, "approved"),
          eq(reimbursementRequests.status, "purchased"),
        ),
      ),
    );

  const reimbItems: LeadershipItem[] = reimbs
    .filter((r) => {
      if (r.status === "pending")    return isAdmin || isCfo;
      if (r.status === "approved")   return isCfo;
      if (r.status === "purchased")  return r.requestedById === userId;
      return false;
    })
    .map((r) => ({
      id: r.id,
      kind: "reimbursement",
      title: r.itemDescription,
      statusLabel: REIMB_STATUS_LABEL[r.status] ?? r.status,
      tone: REIMB_STATUS_TONE[r.status] ?? "amber",
      href: `/reimbursements/${r.id}`,
    }));

  return [...hireItems, ...reimbItems];
}
