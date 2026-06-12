"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { poolMembers, poolDistributions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { getEffectiveRole } from "@/lib/view-as";
import { getPoolData } from "@/lib/pool";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

/** Pool administration = CEO or Finance (Kevin). Money, not content. */
async function requirePoolAdmin(user: { role?: string | null }) {
  await requirePermission(user, "view_pool");
  const role = await getEffectiveRole(user.role);
  if (role !== "admin" && role !== "cfo") {
    throw new Error("Only the CEO or Finance can manage the pool.");
  }
}

export async function addPoolMemberAction(
  userId: string,
  seatStartAt: string, // YYYY-MM-DD
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await requirePoolAdmin(user);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not allowed" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seatStartAt)) {
    return { ok: false, error: "Pick a seat-start date." };
  }
  await db
    .insert(poolMembers)
    .values({ userId, seatStartAt, addedById: user.id })
    .onConflictDoNothing();
  revalidatePath("/pool");
  return { ok: true };
}

export async function setPoolMemberAction(
  memberId: string,
  patch: { seatStartAt?: string; active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await requirePoolAdmin(user);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not allowed" };
  }
  const set: { seatStartAt?: string; active?: boolean } = {};
  if (patch.seatStartAt && /^\d{4}-\d{2}-\d{2}$/.test(patch.seatStartAt)) set.seatStartAt = patch.seatStartAt;
  if (typeof patch.active === "boolean") set.active = patch.active;
  if (Object.keys(set).length === 0) return { ok: true };
  await db.update(poolMembers).set(set).where(eq(poolMembers.id, memberId));
  revalidatePath("/pool");
  return { ok: true };
}

/**
 * Record a quarterly payout. The per-member split is computed from the
 * CURRENT vested roster and frozen into the row — history never moves.
 */
export async function recordDistributionAction(input: {
  quarter: string;
  totalUsd: number;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await requirePoolAdmin(user);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not allowed" };
  }
  const quarter = (input.quarter ?? "").trim();
  if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
    return { ok: false, error: 'Quarter must look like "2030-Q1".' };
  }
  const totalCents = Math.round((input.totalUsd ?? 0) * 100);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return { ok: false, error: "Enter the payout total." };
  }

  const pool = await getPoolData();
  const vested = pool.members.filter((m) => m.points > 0);
  if (vested.length === 0) {
    return { ok: false, error: "Nobody is vested yet — there's no one to split it across." };
  }
  const totalPoints = vested.reduce((a, m) => a + m.points, 0);
  const split = vested.map((m) => ({
    userId: m.userId,
    name: m.name,
    points: m.points,
    cents: Math.round((totalCents * m.points) / totalPoints),
  }));

  await db.insert(poolDistributions).values({
    quarter,
    totalCents,
    split,
    notes: input.notes?.trim() || null,
    recordedById: user.id,
  });

  revalidatePath("/pool");
  return { ok: true };
}
