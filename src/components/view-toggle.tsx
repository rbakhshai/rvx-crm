import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Small top-right icon toggle: flat list vs. grouped view. Server-rendered
 * — each option is a link that sets `?view=` and preserves the other URL
 * params, mirroring how FilterChips / sorting already work on these pages.
 *
 * "list" is the default, so it clears the param rather than setting
 * view=list (keeps the URL clean).
 */
export function ViewToggle({
  current,
  pathname,
  searchParams,
  paramKey = "view",
}: {
  current?: string;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  paramKey?: string;
}) {
  const isGroup = current === "group";

  function hrefFor(value: "list" | "group"): string {
    const next = {
      ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v != null)),
    } as Record<string, string>;
    if (value === "list") delete next[paramKey];
    else next[paramKey] = value;
    const qs = new URLSearchParams(next).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
      <Link
        href={hrefFor("list") as never}
        aria-label="List view"
        aria-pressed={!isGroup}
        className={cn(
          "flex items-center justify-center size-8 transition",
          !isGroup ? "bg-foreground/[0.06] text-foreground" : "text-muted hover:bg-foreground/[0.03]",
        )}
      >
        <ListIcon />
      </Link>
      <Link
        href={hrefFor("group") as never}
        aria-label="Group view"
        aria-pressed={isGroup}
        className={cn(
          "flex items-center justify-center size-8 border-l border-border transition",
          isGroup ? "bg-foreground/[0.06] text-foreground" : "text-muted hover:bg-foreground/[0.03]",
        )}
      >
        <GroupIcon />
      </Link>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.5" cy="4" r="0.9" fill="currentColor" />
      <circle cx="2.5" cy="8" r="0.9" fill="currentColor" />
      <circle cx="2.5" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      {/* two grouped sections, each with a header bar + a row */}
      <rect x="2" y="2" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 4.5h5M4 11.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
