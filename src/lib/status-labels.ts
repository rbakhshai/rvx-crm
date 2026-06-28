/**
 * Canonical display maps for the New Hire workflow, shared by both hire
 * desks (/hires and /acquisition/new-hires) so labels and colors can't
 * drift between the two queues.
 */

export type HireStatusKey =
  | "all"
  | "active"
  | "draft"
  | "finance_review"
  | "founder_review"
  | "requester_review"
  | "finalized"
  | "withdrawn";

export function isHireStatus(v: string | undefined): v is HireStatusKey {
  return (
    v === "all" || v === "active" || v === "draft" || v === "finance_review" ||
    v === "founder_review" || v === "requester_review" || v === "finalized" || v === "withdrawn"
  );
}

/** The four statuses that make up the day-to-day "active" queue. */
export const HIRE_ACTIVE_STATUSES = ["draft", "finance_review", "founder_review", "requester_review"] as const;

type HireStatus = Exclude<HireStatusKey, "all" | "active">;

export const HIRE_STATUS_LABEL: Record<HireStatus, string> = {
  draft:            "Draft",
  finance_review:   "Finance review",
  founder_review:   "Founder review",
  requester_review: "Final remarks",
  finalized:        "Finalized",
  withdrawn:        "Withdrawn",
};

export const HIRE_STATUS_TONE: Record<HireStatus, string> = {
  draft:            "bg-foreground/[0.05] text-foreground/70 border-border",
  finance_review:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  founder_review:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  requester_review: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  finalized:        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  withdrawn:        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

export const HIRE_TYPE_LABEL: Record<string, string> = {
  employee:        "Employee",
  contractor_1099: "1099",
  vendor:          "Vendor",
};
