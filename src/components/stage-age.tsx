/**
 * "Time in stage" cell — days since the deal entered its current stage,
 * aging from quiet to loud: muted < 14d, amber 14–29d, red ≥ 30d.
 * Deals die of neglect silently; this makes the clock visible.
 */
const WARN_DAYS = 14;
const DANGER_DAYS = 30;

export function StageAge({ since }: { since: Date | string | null | undefined }) {
  if (!since) return <span className="text-muted">—</span>;
  const entered = new Date(since);
  const days = Math.floor((Date.now() - entered.getTime()) / (24 * 60 * 60 * 1000));
  const label = days <= 0 ? "today" : `${days}d`;
  const tone =
    days >= DANGER_DAYS
      ? "text-rose-600 dark:text-rose-400 font-semibold"
      : days >= WARN_DAYS
        ? "text-amber-700 dark:text-amber-400 font-medium"
        : "text-muted";
  return (
    <span className={tone} title={`In this stage since ${entered.toLocaleDateString()}`}>
      {label}
    </span>
  );
}
