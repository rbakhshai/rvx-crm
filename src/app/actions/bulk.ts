"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { deals, contacts, companies, birdDogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

// ============================================================================
// Deals
// ============================================================================

export async function bulkReassignDealOwnerAction(dealIds: string[], ownerId: string | null): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "edit_deals");
  if (dealIds.length === 0) return { count: 0 };

  const result = await db
    .update(deals)
    .set({ ownerId: ownerId || null, updatedAt: new Date() })
    .where(inArray(deals.id, dealIds))
    .returning({ id: deals.id });

  revalidatePath("/deals");
  revalidatePath("/deals/board");
  return { count: result.length };
}

export async function bulkSetDealPriorityAction(dealIds: string[], priority: "hot" | "warm" | "cold" | null): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "edit_deals");
  if (dealIds.length === 0) return { count: 0 };

  const result = await db
    .update(deals)
    .set({ dealPriority: priority, updatedAt: new Date() })
    .where(inArray(deals.id, dealIds))
    .returning({ id: deals.id });

  revalidatePath("/deals");
  revalidatePath("/deals/board");
  return { count: result.length };
}

export async function bulkDeleteDealsAction(dealIds: string[]): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "delete_deals");
  if (dealIds.length === 0) return { count: 0 };

  const result = await db
    .update(deals)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(inArray(deals.id, dealIds))
    .returning({ id: deals.id });

  revalidatePath("/deals");
  revalidatePath("/deals/board");
  revalidatePath("/trash");
  return { count: result.length };
}

// ============================================================================
// Contacts
// ============================================================================

export async function bulkDeleteContactsAction(ids: string[]): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "delete_contacts");
  if (ids.length === 0) return { count: 0 };

  const result = await db
    .update(contacts)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(inArray(contacts.id, ids))
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  revalidatePath("/trash");
  return { count: result.length };
}

export async function bulkReassignContactOwnerAction(ids: string[], ownerId: string | null): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "edit_contacts");
  if (ids.length === 0) return { count: 0 };

  const result = await db
    .update(contacts)
    .set({ ownerId: ownerId || null, updatedAt: new Date() })
    .where(inArray(contacts.id, ids))
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  return { count: result.length };
}

// ============================================================================
// Companies
// ============================================================================

export async function bulkDeleteCompaniesAction(ids: string[]): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "delete_companies");
  if (ids.length === 0) return { count: 0 };

  const result = await db
    .update(companies)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(inArray(companies.id, ids))
    .returning({ id: companies.id });

  revalidatePath("/companies");
  revalidatePath("/trash");
  return { count: result.length };
}

// ============================================================================
// Bird dogs
// ============================================================================

export async function bulkDeleteBirdDogsAction(ids: string[]): Promise<{ count: number }> {
  const user = await requireUser();
  await requirePermission(user, "delete_bird_dogs");
  if (ids.length === 0) return { count: 0 };

  const result = await db
    .update(birdDogs)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(inArray(birdDogs.id, ids))
    .returning({ id: birdDogs.id });

  revalidatePath("/bird-dogs");
  revalidatePath("/trash");
  return { count: result.length };
}
