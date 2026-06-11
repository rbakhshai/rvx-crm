/**
 * One-line page/layout gate. Nav hides links by permission, but URLs
 * are typeable — every gated surface needs a server-side check too.
 *
 *   export default async function DealsLayout({ children }) {
 *     await gatePage("view_pipeline");
 *     return children;
 *   }
 *
 * Renders the 404 page rather than a "no permission" notice: for
 * need-to-know roles, not revealing that the page EXISTS is the point.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "./auth";
import { hasPermission } from "./has-permission";
import type { PermissionKey } from "./permissions";

export async function gatePage(key: PermissionKey): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, key))) notFound();
}
