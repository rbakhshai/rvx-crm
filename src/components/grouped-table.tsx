import { DataTable, type Column } from "./data-table";

export type RowGroup<T> = {
  key: string;
  label: string;
  rows: T[];
};

/**
 * Renders one DataTable per group with a labeled header + count. Used by
 * the list pages when `?view=group` is active. Pure server component —
 * grouping is computed page-side via `buildGroups` and passed in.
 */
export function GroupedTables<T extends { id: string }>({
  groups,
  columns,
  rowHref,
  emptyLabel = "Nothing here",
}: {
  groups: RowGroup<T>[];
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  emptyLabel?: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <h3 className="text-sm font-semibold tracking-tight">{g.label}</h3>
            <span className="text-[11px] rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted font-medium tabular-nums">
              {g.rows.length}
            </span>
          </div>
          <DataTable rows={g.rows} columns={columns} rowHref={rowHref} />
        </section>
      ))}
    </div>
  );
}

/**
 * Bucket rows into ordered groups.
 *
 * @param rows     the records to group
 * @param keyOf    extract a row's group key (null → falls into the catch-all bucket)
 * @param labelOf  human label for a group key
 * @param order    optional ordered list of keys; groups not listed sort
 *                 after, alphabetically by label. The null/catch-all key is
 *                 always sorted last.
 * @param nullLabel label for the null bucket (e.g. "Unassigned", "No stage")
 */
export function buildGroups<T>(
  rows: T[],
  keyOf: (row: T) => string | null,
  labelOf: (key: string) => string,
  order: string[] | undefined,
  nullLabel: string,
): RowGroup<T>[] {
  const NULL_KEY = "__null__";
  const buckets = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyOf(r) ?? NULL_KEY;
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }

  const orderIndex = new Map((order ?? []).map((k, i) => [k, i]));
  const entries = [...buckets.entries()].map(([key, groupRows]) => ({
    key,
    label: key === NULL_KEY ? nullLabel : labelOf(key),
    rows: groupRows,
  }));

  entries.sort((a, b) => {
    // null bucket always last
    if (a.key === NULL_KEY) return 1;
    if (b.key === NULL_KEY) return -1;
    const ai = orderIndex.has(a.key) ? orderIndex.get(a.key)! : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b.key) ? orderIndex.get(b.key)! : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label);
  });

  return entries;
}
