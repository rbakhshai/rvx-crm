"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { completeTaskAction, uncompleteTaskAction, deleteTaskAction } from "@/app/actions/tasks";

const typeBadge: Record<string, string> = {
  task: "Task",
  call: "📞 Call",
  email: "✉ Email",
  admin: "🗂 Admin",
};

function fmtDue(d: Date | null): { label: string; overdue: boolean; soon: boolean } {
  if (!d) return { label: "no due date", overdue: false, soon: false };
  const now = Date.now();
  const diff = d.getTime() - now;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 0) {
    const dOver = Math.ceil(-diff / day);
    return { label: dOver === 0 ? "due today" : `${dOver}d overdue`, overdue: true, soon: false };
  }
  if (diff < day) return { label: "due today", overdue: false, soon: true };
  if (diff < 7 * day) return { label: `due in ${Math.ceil(diff / day)}d`, overdue: false, soon: true };
  return { label: `due ${d.toLocaleDateString()}`, overdue: false, soon: false };
}

export function TaskRow({
  task,
  assigneeName,
  parentLabel,
  parentHref,
}: {
  task: {
    id: string;
    subject: string;
    body: string | null;
    type: string;
    dueAt: Date | null;
    completedAt: Date | null;
    parentTable: string;
    parentId: string;
  };
  assigneeName: string | null;
  parentLabel?: string;
  parentHref?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const done = !!task.completedAt;
  const due = fmtDue(task.dueAt);

  function toggle() {
    startTransition(async () => {
      if (done) {
        await uncompleteTaskAction(task.id, task.parentTable, task.parentId);
      } else {
        await completeTaskAction(task.id, task.parentTable, task.parentId);
      }
      router.refresh();
    });
  }

  function del() {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      await deleteTaskAction(task.id, task.parentTable, task.parentId);
      router.refresh();
    });
  }

  return (
    <div className={cn("rounded-lg border p-3 bg-background", done ? "border-border opacity-60" : "border-border")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "mt-0.5 size-4 shrink-0 rounded border transition disabled:opacity-50",
            done
              ? "bg-green-500 border-green-500 text-white"
              : "border-foreground/30 hover:border-foreground/60",
          )}
        >
          {done ? "✓" : ""}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("text-sm font-medium", done && "line-through text-muted")}>
              {task.subject}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted">{typeBadge[task.type] ?? task.type}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted flex-wrap">
            <span
              className={cn(
                due.overdue && !done && "text-red-600 font-medium",
                due.soon && !done && "text-yellow-700",
              )}
            >
              {due.label}
            </span>
            <span>·</span>
            <span>{assigneeName ? `@${assigneeName}` : "unassigned"}</span>
            {parentLabel && parentHref && (
              <>
                <span>·</span>
                <a href={parentHref} className="hover:underline">{parentLabel}</a>
              </>
            )}
            {task.body && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="hover:underline"
                >
                  {expanded ? "hide" : "show"} details
                </button>
              </>
            )}
          </div>
          {expanded && task.body && (
            <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{task.body}</p>
          )}
        </div>
        <button
          type="button"
          onClick={del}
          disabled={isPending}
          className="text-[11px] text-muted hover:text-red-600 disabled:opacity-50"
        >
          delete
        </button>
      </div>
    </div>
  );
}
