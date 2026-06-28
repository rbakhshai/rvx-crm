/**
 * Shared helpers for the Buyers / Sellers / Deals list pages, which all
 * implement identical column-preference loading and sort-link building.
 * Extracted so the three pages stay byte-for-byte consistent.
 */
import type { Column } from "@/components/data-table";
import type { ColumnConfig } from "@/components/column-editor";
import { loadColumnPreferences, type Scope } from "@/app/actions/list-preferences";

/**
 * Load a user's saved column layout for `scope` and resolve it against
 * the page's full column set. Returns:
 *   - displayColumns:        columns to render (filtered + reordered)
 *   - allColumnConfigs:      every column, for the "add column" picker
 *   - selectedColumnConfigs: the saved layout, labelled, for the editor
 * With no saved prefs, falls back to showing every column in order.
 */
export async function buildColumnPreferences<R>(scope: Scope, columns: Column<R>[]): Promise<{
  displayColumns: Column<R>[];
  allColumnConfigs: ColumnConfig[];
  selectedColumnConfigs: ColumnConfig[];
}> {
  const allColumnConfigs: ColumnConfig[] = columns.map((col, i) => ({
    key: col.key,
    label: col.header || col.key,
    visible: true,
    order: i,
  }));

  const prefs = await loadColumnPreferences(scope);
  if (!prefs?.columns) {
    return { displayColumns: columns, allColumnConfigs, selectedColumnConfigs: allColumnConfigs };
  }

  const visibleKeys = prefs.columns
    .filter((c) => c.visible)
    .sort((a, b) => a.order - b.order)
    .map((c) => c.key);

  const displayColumns = visibleKeys
    .map((key) => columns.find((col) => col.key === key))
    .filter((col): col is Column<R> => col !== undefined);

  const selectedColumnConfigs = prefs.columns.map((pref) => ({
    ...pref,
    label: allColumnConfigs.find((c) => c.key === pref.key)?.label || pref.key,
  }));

  return { displayColumns, allColumnConfigs, selectedColumnConfigs };
}

/**
 * Build a sort link that flips one column's direction while preserving
 * every other active query param (filters, search, view, etc.).
 */
export function buildSortHref(
  pathname: string,
  params: Record<string, string | undefined>,
  key: string,
  nextDir: "asc" | "desc",
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "sort" || k === "dir") continue;
    if (typeof v === "string" && v.length > 0) qs.set(k, v);
  }
  qs.set("sort", key);
  qs.set("dir", nextDir);
  return `${pathname}?${qs.toString()}`;
}
