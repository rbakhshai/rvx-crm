"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { getEffectiveRole } from "@/lib/view-as";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

/**
 * Post an announcement to every BD's Today hub. Gated on view_bd_team —
 * the same capability that defines "leadership" for the BD program.
 */
export async function postAnnouncementAction(body: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(user, "view_bd_team");

  const trimmed = (body ?? "").trim();
  if (trimmed.length < 3) return { ok: false, error: "Write the announcement first." };

  await db.insert(announcements).values({
    body: trimmed.slice(0, 2000),
    createdById: user.id,
  });

  revalidatePath("/bd-team");
  revalidatePath("/today");
  return { ok: true };
}

/**
 * Soft-delete an announcement. Authors can remove their own posts;
 * beyond that, deletion follows the standing rule — only the CEO
 * (admin) and Sales & Marketing (acquisitions_manager) delete records.
 */
export async function deleteAnnouncementAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(user, "view_bd_team");

  const [row] = await db
    .select({ createdById: announcements.createdById })
    .from(announcements)
    .where(and(eq(announcements.id, id), isNull(announcements.deletedAt)))
    .limit(1);
  if (!row) return { ok: false, error: "Announcement not found" };

  const effectiveRole = await getEffectiveRole(user.role);
  const canDeleteAny = effectiveRole === "admin" || effectiveRole === "acquisitions_manager";
  if (!canDeleteAny && row.createdById !== user.id) {
    return { ok: false, error: "You can only remove your own announcements." };
  }

  await db.update(announcements).set({ deletedAt: new Date() }).where(eq(announcements.id, id));

  revalidatePath("/bd-team");
  revalidatePath("/today");
  return { ok: true };
}
