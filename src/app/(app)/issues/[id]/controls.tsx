"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  deleteIssueAction,
  reopenIssueAction,
  setIssueAssigneeAction,
  setIssuePriorityAction,
  solveIssueAction,
} from "@/app/actions/issues";

type Teammate = { id: string; name: string; firstName: string };
type Priority = "red" | "orange" | "green";
type Status = "open" | "discussing" | "solved";

const PRIORITIES: Array<{ key: Priority; label: string; dot: string }> = [
  { key: "red", label: "Critical", dot: "bg-rose-500" },
  { key: "orange", label: "Within 24h", dot: "bg-amber-500" },
  { key: "green", label: "Next L10", dot: "bg-emerald-500" },
];

export function IssueDetailControls({
  issueId,
  currentPriority,
  currentAssigneeId,
  currentStatus,
  teammates,
}: {
  issueId: string;
  currentPriority: Priority;
  currentAssigneeId: string | null;
  currentStatus: Status;
  teammates: Teammate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showSolve, setShowSolve] = useState(false);
  const [summary, setSummary] = useState("");

  function changePriority(p: Priority) {
    if (p === currentPriority) return;
    startTransition(async () => {
      try {
        await setIssuePriorityAction(issueId, p);
        toast.success(`Priority → ${PRIORITIES.find((x) => x.key === p)?.label}`);
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function changeAssignee(id: string) {
    startTransition(async () => {
      try {
        await setIssueAssigneeAction(issueId, id || null);
        toast.success("Assignee updated");
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function solve() {
    if (!summary.trim()) {
      toast.error("Add a one-line solution summary");
      return;
    }
    const fd = new FormData();
    fd.set("issueId", issueId);
    fd.set("summary", summary);
    startTransition(async () => {
      const r = await solveIssueAction(fd);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't solve");
        return;
      }
      toast.success("Solved 🎉");
      setShowSolve(false);
      setSummary("");
      router.refresh();
    });
  }

  function reopen() {
    if (!confirm("Reopen this issue? The solution summary will be cleared.")) return;
    startTransition(async () => {
      await reopenIssueAction(issueId);
      toast.success("Reopened");
      router.refresh();
    });
  }

  function del() {
    if (!confirm("Delete this issue? It can be restored from trash.")) return;
    startTransition(async () => {
      await deleteIssueAction(issueId);
      toast.success("Deleted");
      router.push("/issues" as never);
    });
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-background space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1.5">Priority</div>
          <div className="inline-flex rounded-md border border-border bg-background overflow-hidden">
            {PRIORITIES.map((p) => {
              const active = p.key === currentPriority;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => changePriority(p.key)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs transition disabled:opacity-50",
                    active && "bg-foreground/[0.04] font-medium",
                    !active && "hover:bg-foreground/[0.02] text-foreground/70",
                  )}
                >
                  <span className={cn("size-2 rounded-full", p.dot)} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Assignee */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1.5">Assignee</div>
          <select
            value={currentAssigneeId ?? ""}
            onChange={(e) => changeAssignee(e.target.value)}
            disabled={isPending}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm cursor-pointer w-full max-w-xs"
          >
            <option value="">(unassigned)</option>
            {teammates.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Solve / reopen / delete */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
        {currentStatus !== "solved" ? (
          showSolve ? (
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    solve();
                  }
                }}
                placeholder="Solution summary (e.g. Marco will call by EOD)"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                disabled={isPending}
              />
              <button
                type="button"
                onClick={solve}
                disabled={isPending || !summary.trim()}
                className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Mark solved
              </button>
              <button
                type="button"
                onClick={() => { setShowSolve(false); setSummary(""); }}
                disabled={isPending}
                className="text-xs text-muted hover:text-foreground"
              >
                cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSolve(true)}
              disabled={isPending}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-foreground/[0.04]"
            >
              ✓ Solve…
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={reopen}
            disabled={isPending}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-foreground/[0.04]"
          >
            ↶ Reopen
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={del}
            disabled={isPending}
            className="text-xs text-muted hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
