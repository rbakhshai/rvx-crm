"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedViews } from "@/db/schema";
import { auth } from "@/lib/auth";

export type ViewScope = "deals" | "contacts" | "companies" | "bird_dogs";

const SCOPE_PATH: Record<ViewScope, string> = {
  deals: "/deals",
  contacts: "/contacts",
  companies: "/companies",
  bird_dogs: "/bird-dogs",
};

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

export async function listSavedViews(scope: ViewScope, userId: string) {
  return db
    .select()
    .from(savedViews)
    .where(and(eq(savedViews.userId, userId), eq(savedViews.scope, scope)))
    .orderBy(asc(savedViews.sortOrder), asc(savedViews.createdAt));
}

export async function saveCurrentViewAction(
  scope: ViewScope,
  label: string,
  params: Record<string, string>,
): Promise<void> {
  const userId = await requireUserId();
  if (!label.trim()) throw new Error("Label is required");

  await db.insert(savedViews).values({
    userId,
    scope,
    label: label.trim(),
    params: params as object,
  });

  revalidatePath(SCOPE_PATH[scope]);
}

export async function deleteSavedViewAction(id: string, scope: ViewScope): Promise<void> {
  const userId = await requireUserId();
  await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
  revalidatePath(SCOPE_PATH[scope]);
}

export async function renameSavedViewAction(id: string, scope: ViewScope, label: string): Promise<void> {
  const userId = await requireUserId();
  if (!label.trim()) throw new Error("Label is required");
  await db
    .update(savedViews)
    .set({ label: label.trim(), updatedAt: new Date() })
    .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
  revalidatePath(SCOPE_PATH[scope]);
}
