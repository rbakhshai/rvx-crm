"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyBriefs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { generateDailyBrief } from "@/lib/daily-brief";

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

/**
 * Get today's brief for this user. Generates + caches on first call of the
 * day, returns the cached row on subsequent calls. Safe to invoke from a
 * Server Component during render — it's just a select + maybe an insert.
 */
export async function getOrCreateDailyBrief(userId: string): Promise<{
  contentMd: string;
  createdAt: Date;
  cached: boolean;
}> {
  const forDate = todayUtcDate();

  const [existing] = await db
    .select({ contentMd: dailyBriefs.contentMd, createdAt: dailyBriefs.createdAt })
    .from(dailyBriefs)
    .where(and(eq(dailyBriefs.userId, userId), eq(dailyBriefs.forDate, forDate)))
    .limit(1);

  if (existing) return { ...existing, cached: true };

  const result = await generateDailyBrief(userId);
  const [row] = await db
    .insert(dailyBriefs)
    .values({
      userId,
      forDate,
      contentMd: result.contentMd,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    })
    .returning({ contentMd: dailyBriefs.contentMd, createdAt: dailyBriefs.createdAt });

  return { ...row, cached: false };
}

/** Force a fresh brief — called from the refresh button. */
export async function regenerateDailyBriefAction(): Promise<void> {
  const userId = await requireUserId();
  const forDate = todayUtcDate();

  const result = await generateDailyBrief(userId);
  await db
    .insert(dailyBriefs)
    .values({
      userId,
      forDate,
      contentMd: result.contentMd,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    })
    .onConflictDoUpdate({
      target: [dailyBriefs.userId, dailyBriefs.forDate],
      set: {
        contentMd: result.contentMd,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        createdAt: new Date(),
      },
    });

  revalidatePath("/today");
}
