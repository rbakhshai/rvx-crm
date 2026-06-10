"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

/**
 * Mark the current user as onboarded. Used by both "Finish" and "Skip"
 * on /onboarding — once stamped, the layout-level redirect stops firing.
 *
 * Idempotent: re-stamping a non-NULL value is a no-op.
 */
export async function completeOnboardingAction(): Promise<{ ok: boolean }> {
  const me = await requireUser();
  await db
    .update(userTable)
    .set({ onboardedAt: new Date(), updatedAt: new Date() })
    .where(eq(userTable.id, me.id));
  revalidatePath("/onboarding");
  revalidatePath("/today");
  return { ok: true };
}

/**
 * Admin-only: clear another user's onboarding stamp so they see the
 * walkthrough again next time they log in. Useful after a content
 * refresh.
 */
export async function resetUserOnboardingAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireUser();
  if (me.role !== "admin") return { ok: false, error: "Admin only" };
  await db
    .update(userTable)
    .set({ onboardedAt: null, updatedAt: new Date() })
    .where(eq(userTable.id, userId));
  revalidatePath("/settings/users");
  return { ok: true };
}
