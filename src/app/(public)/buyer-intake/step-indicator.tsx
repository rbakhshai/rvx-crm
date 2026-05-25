import { cn } from "@/lib/cn";

const STEPS = [
  { n: 1, label: "About you" },
  { n: 2, label: "Buy box" },
  { n: 3, label: "Qualifying" },
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <div
              className={cn(
                "size-7 rounded-full grid place-items-center text-xs font-semibold border-2",
                done && "bg-primary text-primary-foreground border-primary",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted",
              )}
            >
              {done ? "✓" : s.n}
            </div>
            <span
              className={cn(
                "text-xs",
                done && "text-foreground",
                active && "font-semibold text-foreground",
                !done && !active && "text-muted",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted mx-1">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
