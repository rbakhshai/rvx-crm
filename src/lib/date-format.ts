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
 * Relative time: "just now" / "5m ago" / "3h ago" / "2d ago", falling
 * back to fmtDate() past 7 days. Used in activity feeds, the My Leads
 * "last touched" column, and anywhere "how fresh is this" matters more
 * than the exact stamp.
 *
 * Symmetric for the future: "in 5m" / "in 3h" / "in 2d", same fallback.
 */
export function fmtRelative(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";

  const ms = date.getTime() - Date.now();
  const future = ms > 0;
  const absMs = Math.abs(ms);
  const mins = Math.floor(absMs / 60_000);
  if (mins < 1) return "just now";
  const fmt = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (mins < 60) return fmt(mins, "m");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return fmt(hrs, "h");
  const days = Math.floor(hrs / 24);
  if (days < 7) return fmt(days, "d");
  return fmtDate(date);
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
