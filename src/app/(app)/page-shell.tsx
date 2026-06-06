type Width = "narrow" | "default" | "wide" | "full";

const widthClass: Record<Width, string> = {
  narrow: "max-w-3xl",         // 768px — single-column forms
  default: "max-w-6xl",        // 1152px — detail pages with prose
  wide: "max-w-screen-2xl",    // 1536px — list pages, dashboards, tables
  full: "max-w-none",          // edge-to-edge for kanban / DD / wide grids
};

export function PageShell({
  title,
  subtitle,
  action,
  children,
  width = "default",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /**
   * How wide the page should be. Defaults to "default" (max-w-6xl) for the
   * legacy detail-page look. List pages and dashboards should pass "wide";
   * kanban / wide tables pass "full" to use every pixel.
   */
  width?: Width;
}) {
  return (
    <div className={`${widthClass[width]} mx-auto px-4 sm:px-8 py-6 sm:py-10`}>
      <header className="flex items-start justify-between gap-4 pb-4 sm:pb-6 border-b border-border flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="pt-4 sm:pt-6">{children}</div>
    </div>
  );
}

export function ComingSoon({
  phase,
  description,
  features,
}: {
  phase: string;
  description: string;
  features?: string[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center">
      <div className="text-xs uppercase tracking-widest text-muted font-medium">{phase}</div>
      <p className="mt-3 text-base text-foreground/80 max-w-md mx-auto">{description}</p>
      {features && features.length > 0 && (
        <ul className="mt-6 inline-flex flex-col items-start gap-1.5 text-sm text-foreground/70">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-foreground/30" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
