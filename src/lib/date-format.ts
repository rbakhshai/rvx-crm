/**
 * Centralized date formatting.
 *
 * House style is "Jun 1 '26" — always include the year so the reader knows
 * at a glance whether a record is old or fresh. We deliberately don't strip
 * the year for current-year dates: the whole point of showing the year is
 * making "is this stale?" obvious without hover.
 */

/**
 * "Jun 1 '26" — short month + day + 2-digit year. The leading apostrophe
 * is part of the literal so the reader can scan year boundaries quickly.
 *
 * Accepts either a Date or an ISO date string. Returns "—" for null/undefined
 * so the caller doesn't have to special-case nulls everywhere.
 */
export function fmtDate(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";

  const month = date.toLocaleString(undefined, { month: "short" });
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month} ${day} '${year}`;
}

/**
 * "Jun 1 '26, 3:42 PM" — fmtDate plus the local time. For activity logs
 * and timestamps where the time-of-day matters.
 */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmtDate(date)}, ${time}`;
}

/**
 * "Mon, Jun 1 '26" — for page headers like the /today subtitle where the
 * weekday is useful context.
 */
export function fmtDateWithWeekday(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";

  const weekday = date.toLocaleString(undefined, { weekday: "short" });
  return `${weekday}, ${fmtDate(date)}`;
}
