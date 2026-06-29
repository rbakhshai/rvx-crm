/**
 * Server-rendered pagination control for list pages. Emits ?page=N links
 * that preserve all other active query params (filters, search, sort).
 * Renders nothing when everything fits on one page.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";

export const DEFAULT_PAGE_SIZE = 50;

/** Parse a 1-based page number from a raw search param. */
export function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function Pagination({
  pathname,
  params,
  page,
  pageSize,
  total,
}: {
  pathname: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function href(p: number): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page") continue;
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
    }
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${pathname}?${s}` : pathname;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <PageLink href={href(page - 1)} disabled={page <= 1}>← Prev</PageLink>
        <span className="text-muted tabular-nums px-1.5">Page {page} / {totalPages}</span>
        <PageLink href={href(page + 1)} disabled={page >= totalPages}>Next →</PageLink>
      </div>
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  const base = "rounded-md border px-2.5 py-1 text-xs transition";
  if (disabled) {
    return <span className={cn(base, "border-border text-muted/50 cursor-default")} aria-disabled>{children}</span>;
  }
  return (
    <Link href={href as never} className={cn(base, "border-border text-foreground/80 hover:bg-foreground/[0.04]")}>
      {children}
    </Link>
  );
}
