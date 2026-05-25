import Link from "next/link";
import { cn } from "@/lib/cn";

export type ChipOption = { value: string; label: string };

/**
 * Server-rendered row of filter chips. Each chip is a link that toggles
 * the URL param. "All" clears the param. Active chip is highlighted.
 */
export function FilterChips({
  label,
  paramKey,
  current,
  pathname,
  searchParams,
  options,
}: {
  label: string;
  paramKey: string;
  current?: string;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  options: ChipOption[];
}) {
  function hrefFor(value: string | null): string {
    const next: Record<string, string> = { ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v != null)) } as Record<string, string>;
    if (value === null) delete next[paramKey];
    else next[paramKey] = value;
    const qs = new URLSearchParams(next).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted mr-1">{label}:</span>
      <Link
        href={hrefFor(null)}
        className={cn(
          "rounded-full px-2 py-0.5 border transition",
          !current
            ? "bg-foreground/[0.06] border-foreground/20 text-foreground"
            : "border-border text-muted hover:bg-foreground/[0.03]",
        )}
      >
        All
      </Link>
      {options.map((o) => {
        const active = current === o.value;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            className={cn(
              "rounded-full px-2 py-0.5 border transition",
              active
                ? "bg-foreground/[0.06] border-foreground/20 text-foreground"
                : "border-border text-muted hover:bg-foreground/[0.03]",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
