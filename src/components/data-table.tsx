import Link from "next/link";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  /**
   * Setting this makes the column header clickable to sort.
   * The value is what the page's URL `?sort=` will be set to.
   */
  sortKey?: string;
};

export type SortConfig = {
  /** Current sort key (matches one of the columns' sortKey). */
  current: string | null;
  /** Current direction. */
  dir: "asc" | "desc";
  /** Build a URL for sorting by a given key — page-side knows the route + other params. */
  hrefFor: (sortKey: string, nextDir: "asc" | "desc") => string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  rowHref,
  empty,
  sort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  empty?: React.ReactNode;
  sort?: SortConfig;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-foreground/[0.02] text-left">
          <tr>
            {columns.map((col) => {
              const sortable = sort && col.sortKey;
              const isCurrent = sortable && sort?.current === col.sortKey;
              const nextDir: "asc" | "desc" = isCurrent && sort?.dir === "asc" ? "desc" : "asc";
              const arrow = !sortable
                ? null
                : isCurrent
                ? sort?.dir === "asc"
                  ? "↑"
                  : "↓"
                : "⇅";

              const inner = (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    sortable && "hover:text-foreground transition cursor-pointer",
                    isCurrent && "text-foreground",
                  )}
                >
                  <span>{col.header}</span>
                  {arrow && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        !isCurrent && "text-foreground/30",
                      )}
                    >
                      {arrow}
                    </span>
                  )}
                </span>
              );

              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted",
                    col.className,
                  )}
                  aria-sort={isCurrent ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {sortable ? (
                    <Link href={sort.hrefFor(col.sortKey!, nextDir) as never}>
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const content = columns.map((col) => (
              <td key={col.key} className={cn("px-3.5 py-2.5 align-middle", col.className)}>
                {col.render(row)}
              </td>
            ));
            return rowHref ? (
              <tr key={row.id} className="border-t border-border hover:bg-foreground/[0.02] cursor-pointer">
                {columns.map((col, i) => (
                  <td key={col.key} className={cn("p-0 align-middle", col.className)}>
                    <Link
                      href={rowHref(row) as never}
                      className={cn("block px-3.5 py-2.5", i === 0 && "font-medium")}
                    >
                      {col.render(row)}
                    </Link>
                  </td>
                ))}
              </tr>
            ) : (
              <tr key={row.id} className="border-t border-border">
                {content}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
