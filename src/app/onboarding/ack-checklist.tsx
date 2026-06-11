"use client";

/**
 * Final onboarding step: the expectations checklist. Every box must be
 * checked before "I'm in" enables — so Reza/Erica know each BD actually
 * read the expectations, not just clicked through. Checked keys are
 * persisted via completeOnboardingAction.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { cn } from "@/lib/cn";

export function AckChecklist({
  items,
}: {
  items: ReadonlyArray<{ key: string; label: string }>;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allChecked = checked.size === items.length;

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function finish() {
    if (!allChecked) return;
    setError(null);
    startTransition(async () => {
      const r = await completeOnboardingAction([...checked]);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong — try again.");
        return;
      }
      router.push("/today");
    });
  }

  return (
    <div>
      <ul className="space-y-3 mb-6">
        {items.map((item) => {
          const isOn = checked.has(item.key);
          return (
            <li key={item.key}>
              <label
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none",
                  isOn
                    ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08]"
                    : "border-border bg-background hover:bg-foreground/[0.02]",
                )}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.key)}
                  className="mt-0.5 size-4 shrink-0 accent-emerald-600 cursor-pointer"
                />
                <span className="text-sm leading-relaxed text-foreground/90">{item.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-muted tabular-nums">
          {checked.size} of {items.length} acknowledged
        </span>
        <button
          type="button"
          onClick={finish}
          disabled={!allChecked || pending}
          className={cn(
            "rounded-md px-5 py-2.5 text-sm font-semibold transition",
            allChecked
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-foreground/10 text-foreground/40 cursor-not-allowed",
          )}
        >
          {pending ? "Saving…" : allChecked ? "I'm in — take me to the dashboard →" : "Check every box to continue"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
