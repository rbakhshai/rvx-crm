import { LinkButton } from "./button";

export function EmptyState({
  icon = "📭",
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  /** Single emoji or React node shown above the title. Defaults to a mailbox. */
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center">
      <div className="text-3xl mb-3 opacity-70 select-none">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted max-w-md mx-auto leading-relaxed">{description}</p>
      {ctaLabel && ctaHref && (
        <div className="mt-5">
          <LinkButton href={ctaHref} size="sm">
            {ctaLabel}
          </LinkButton>
        </div>
      )}
    </div>
  );
}
