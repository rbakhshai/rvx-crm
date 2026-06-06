/**
 * Compute the Monday (local) of the week containing the given date.
 * Used as the natural key for L10 meetings — every weekday a team
 * runs L10 on rolls up to one Monday-stamped row.
 *
 * Lives in /lib because "use server" files (where the actions live)
 * can only export async functions.
 */
export function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const shift = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + shift);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
