"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { userListPreferences, type UserListPreferences } from "@/db/schema";
import { auth } from "@/lib/auth";

export type Scope = "contacts" | "companies" | "deals";

export async function loadColumnPreferences(scope: Scope): Promise<UserListPreferences | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const prefs = await db
    .select()
    .from(userListPreferences)
    .where(and(eq(userListPreferences.userId, session.user.id), eq(userListPreferences.scope, scope)))
    .limit(1);

  return prefs[0] ?? null;
}

export async function saveColumnPreferences(
  scope: Scope,
  columns: Array<{ key: string; visible: boolean; order: number }>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not authenticated" };

  try {
    // Delete existing + insert new (simpler than upsert for now)
    await db
      .delete(userListPreferences)
      .where(and(eq(userListPreferences.userId, session.user.id), eq(userListPreferences.scope, scope)));

    await db.insert(userListPreferences).values({
      userId: session.user.id,
      scope,
      columns,
    });

    revalidatePath(`/${scope}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save" };
  }
}
