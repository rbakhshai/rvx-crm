/**
 * One-line view gate for server-component pages. Every page inside
 * (app) must call this (or do its own explicit check) — the sidebar
 * only HIDES links; it never was, and must never be, the security
 * boundary. (Kevin's beta finding #2, 2026-07-12.)
 *
 *   await requirePagePermission("view_contacts");
 *
 * notFound() (not redirect) so probing URLs can't distinguish
 * "doesn't exist" from "not allowed".
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import type { PermissionKey } from "@/lib/permissions";

export async function requirePagePermission(key: PermissionKey) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session!.user, key))) notFound();
  return session!;
}
