"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ACK_KEYS } from "@/lib/onboarding-acks";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

/**
 * Mark the current user as onboarded, recording which expectation
 * items they checked on the final step.
 *
 * BD-tier users must check EVERY item in ACK_KEYS — the whole point is
 * proof they read + accepted the expectations from the recruiting
 * funnel (deals take 60–120+ days, performance pay, weekly activity…).
 * Leadership visiting /onboarding manually can finish without acks.
 *
 * Idempotent: re-stamping a non-NULL onboardedAt is a no-op.
 */
export async function completeOnboardingAction(
  acks: string[] = [],
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireUser();

  const role = (me as { role?: string }).role ?? "";
  const isBdTier = role === "bd_level_1" || role === "bd_level_2" || role === "bd_level_3";

  // Only count keys we actually defined — a hand-rolled POST can't
  // sneak in fake acknowledgments.
  const validAcks = acks.filter((k) => (ACK_KEYS as readonly string[]).includes(k));

  if (isBdTier && validAcks.length < ACK_KEYS.length) {
    return { ok: false, error: "Please check every box — we need to know you've read each one." };
  }

  await db
    .update(userTable)
    .set({
      onboardedAt: new Date(),
      onboardingAcks: validAcks.length > 0 ? { keys: validAcks, at: new Date().toISOString() } : null,
      updatedAt: new Date(),
    })
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
