import { LinkButton } from "./button";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">{description}</p>
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
