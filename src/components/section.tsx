export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border first:border-t-0 first:pt-0 pt-8 pb-6">
      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        <div className="md:col-span-2 space-y-4">{children}</div>
      </div>
    </section>
  );
}
