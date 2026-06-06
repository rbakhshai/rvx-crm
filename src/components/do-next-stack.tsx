"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { skipDoNextItemAction, completeDoNextTaskAction } from "@/app/actions/do-next";
import type { DoNextItem } from "@/lib/do-next";

/**
 * Single-card focus stack. Renders the highest-priority Do-Next item.
 * After the user acts, the row revalidates and the next item slides up.
 *
 * When nothing's left to act on, shows a celebratory empty state.
 */
export function DoNextStack({ items }: { items: DoNextItem[] }) {
  const [item, ...rest] = items;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(action: { kind: string; label: string; href?: string }) {
    if (!item) return;
    if (action.kind === "open" && action.href) {
      router.push(action.href as never);
      return;
    }
    startTransition(async () => {
      try {
        if (action.kind === "task_done") {
          await completeDoNextTaskAction(item.id);
          toast.success("Task completed");
        } else if (action.kind === "skip") {
          await skipDoNextItemAction(item.kind, item.id);
          toast.success("Skipped for today");
        }
      } catch (e) {
        toast.error("Couldn't do that", { description: e instanceof Error ? e.message : "Try again." });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 mb-4">
      <header className="flex items-baseline justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <h3 className="text-sm font-semibold">Do next</h3>
          {items.length > 0 && (
            <span className="text-[11px] text-muted">· {items.length} action{items.length === 1 ? "" : "s"} queued</span>
          )}
        </div>
      </header>

      {!item ? (
        <div className="py-8 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm font-medium">You're clear.</p>
          <p className="text-xs text-muted mt-1">Nothing urgent on your plate. Pick a stale buyer to follow up on, or take a breath.</p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl shrink-0 mt-0.5 leading-none" aria-hidden>{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-0.5">{item.badge}</div>
              <h4 className="text-base font-semibold leading-tight">{item.title}</h4>
              {item.subtitle && <p className="text-xs text-muted mt-0.5 truncate">{item.subtitle}</p>}
              <p className="text-xs text-foreground/80 mt-1.5">{item.reason}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {item.actions.map((a) =>
              a.kind === "open" ? (
                <Link
                  key={a.label}
                  href={(a.href ?? "/today") as never}
                  className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  disabled={isPending}
                  onClick={() => act(a)}
                  className={
                    "rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 " +
                    (a.kind === "task_done"
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background hover:bg-foreground/[0.04]")
                  }
                >
                  {a.label}
                </button>
              ),
            )}
          </div>

          {rest.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted">
              Up next: <strong className="text-foreground/80">{rest[0].title}</strong>
              {rest.length > 1 && <> · then {rest.length - 1} more</>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
