"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { VIEW_AS_COOKIE, VIEWABLE_ROLES } from "@/lib/view-as";

/**
 * Both actions check the RAW session role — deliberately NOT
 * requirePermission, which resolves the effective (previewed) role.
 * If exit were gated on the effective role, an admin viewing-as a BD
 * could never get back out.
 */
async function requireRealAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  if ((session.user as { role?: string }).role !== "admin") {
    throw new Error("Only the CEO can use View As");
  }
  return session.user;
}

export async function setViewAsRoleAction(role: string): Promise<{ ok: boolean; error?: string }> {
  await requireRealAdmin();
  if (!VIEWABLE_ROLES.some((r) => r.value === role)) {
    return { ok: false, error: "Unknown role" };
  }
  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    // Session cookie — closing the browser exits the preview, so the
    // CEO never wakes up tomorrow still trapped in BD-view.
    path: "/",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearViewAsRoleAction(): Promise<{ ok: boolean }> {
  await requireRealAdmin();
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true };
}
