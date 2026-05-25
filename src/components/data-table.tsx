import Link from "next/link";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  rowHref,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-foreground/[0.02] text-left">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
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
