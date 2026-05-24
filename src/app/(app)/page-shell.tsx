export function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="flex items-start justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="pt-6">{children}</div>
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
