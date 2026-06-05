"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  ddChecklistItems,
  ddCapxItems,
  ddWalkThroughs,
  ddNegotiationItems,
  ddNoiItems,
  ddParkOwnedHomes,
  ddRentRollEntries,
  ddComparables,
  ddContacts,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { DD_CHECKLIST_TEMPLATE_WITH_ORDER } from "@/lib/dd-checklist-template";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function emptyToNullDate(v: FormDataEntryValue | null): string | null {
  const s = emptyToNull(v);
  if (!s) return null;
  // Postgres `date` columns accept YYYY-MM-DD strings as-is
  return s;
}

function rev(dealId: string) {
  revalidatePath(`/deals/${dealId}/due-diligence`);
}

// ============================================================================
// CHECKLIST — seed on first visit, then per-item updates
// ============================================================================

export async function ensureDdChecklistAction(dealId: string): Promise<void> {
  const existing = await db
    .select({ id: ddChecklistItems.id })
    .from(ddChecklistItems)
    .where(eq(ddChecklistItems.dealId, dealId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(ddChecklistItems).values(
    DD_CHECKLIST_TEMPLATE_WITH_ORDER.map((t) => ({
      dealId,
      section: t.section,
      label: t.label,
      sortOrder: t.sortOrder,
    })),
  );
}

export async function toggleDdChecklistItemAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const itemId = String(formData.get("itemId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  const isDone = String(formData.get("done") ?? "") === "true";
  if (!itemId) return;

  await db
    .update(ddChecklistItems)
    .set({
      doneAt: isDone ? new Date() : null,
      doneById: isDone ? userId : null,
      updatedAt: new Date(),
    })
    .where(eq(ddChecklistItems.id, itemId));
  rev(dealId);
}

export async function updateDdChecklistItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const itemId = String(formData.get("itemId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!itemId) return;
  await db
    .update(ddChecklistItems)
    .set({
      dateOrdered: emptyToNullDate(formData.get("dateOrdered")),
      scheduledCompletion: emptyToNullDate(formData.get("scheduledCompletion")),
      notes: emptyToNull(formData.get("notes")),
      artifactUrl: emptyToNull(formData.get("artifactUrl")),
      updatedAt: new Date(),
    })
    .where(eq(ddChecklistItems.id, itemId));
  rev(dealId);
}

// ============================================================================
// CAPX
// ============================================================================

export async function addCapxItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const type = String(formData.get("type") ?? "other") as
    | "roads"
    | "water_lines"
    | "sewer_lines"
    | "gas"
    | "electricity"
    | "landscaping"
    | "buildings"
    | "park_owned_homes"
    | "other";
  const description = emptyToNull(formData.get("description"));
  const expectedCost = emptyToNull(formData.get("expectedCost"));
  const timeline = emptyToNull(formData.get("timeline"));
  if (!dealId) return;
  await db.insert(ddCapxItems).values({ dealId, type, description, expectedCost, timeline });
  rev(dealId);
}

export async function deleteCapxItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddCapxItems).where(eq(ddCapxItems.id, id));
  rev(dealId);
}

// ============================================================================
// WALK-THROUGHS
// ============================================================================

export async function addWalkThroughAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const inspectedAt = emptyToNullDate(formData.get("inspectedAt"));
  if (!dealId || !inspectedAt) return;
  await db.insert(ddWalkThroughs).values({
    dealId,
    inspectedAt,
    inspectedById: userId,
    problemsFound: emptyToNull(formData.get("problemsFound")),
    problemsCorrected: emptyToNull(formData.get("problemsCorrected")),
  });
  rev(dealId);
}

export async function deleteWalkThroughAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddWalkThroughs).where(eq(ddWalkThroughs.id, id));
  rev(dealId);
}

// ============================================================================
// NEGOTIATION ITEMS
// ============================================================================

export async function addNegotiationItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const problem = emptyToNull(formData.get("problem"));
  if (!dealId || !problem) return;
  await db.insert(ddNegotiationItems).values({
    dealId,
    problem,
    solution: emptyToNull(formData.get("solution")),
    estimatedCost: emptyToNull(formData.get("estimatedCost")),
    timeline: emptyToNull(formData.get("timeline")),
  });
  rev(dealId);
}

export async function resolveNegotiationItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  const isResolved = String(formData.get("resolved") ?? "") === "true";
  if (!id) return;
  await db
    .update(ddNegotiationItems)
    .set({
      resolvedAt: isResolved ? new Date() : null,
      resolution: isResolved ? emptyToNull(formData.get("resolution")) : null,
    })
    .where(eq(ddNegotiationItems.id, id));
  rev(dealId);
}

export async function deleteNegotiationItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddNegotiationItems).where(eq(ddNegotiationItems.id, id));
  rev(dealId);
}

// ============================================================================
// NOI ITEMS
// ============================================================================

export async function addNoiItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const direction = String(formData.get("direction") ?? "increase_income") as
    | "increase_income"
    | "reduce_expense";
  const item = emptyToNull(formData.get("item"));
  if (!dealId || !item) return;
  await db.insert(ddNoiItems).values({
    dealId,
    direction,
    item,
    noiImpact: emptyToNull(formData.get("noiImpact")),
    timeline: emptyToNull(formData.get("timeline")),
  });
  rev(dealId);
}

export async function deleteNoiItemAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddNoiItems).where(eq(ddNoiItems.id, id));
  rev(dealId);
}

// ============================================================================
// PARK-OWNED HOMES & BUILDINGS
// ============================================================================

export async function addParkOwnedHomeAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const category = String(formData.get("category") ?? "park_owned_home") as
    | "park_owned_home"
    | "building_or_structure";
  if (!dealId) return;
  await db.insert(ddParkOwnedHomes).values({
    dealId,
    category,
    spaceNumberOrType: emptyToNull(formData.get("spaceNumberOrType")),
    status: emptyToNull(formData.get("status")),
    year: emptyToNull(formData.get("year")),
    size: emptyToNull(formData.get("size")),
    condition: emptyToNull(formData.get("condition")),
    marketValue: emptyToNull(formData.get("marketValue")),
    listOfRepairs: emptyToNull(formData.get("listOfRepairs")),
    costOfRepairs: emptyToNull(formData.get("costOfRepairs")),
    use: emptyToNull(formData.get("use")),
  });
  rev(dealId);
}

export async function deleteParkOwnedHomeAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddParkOwnedHomes).where(eq(ddParkOwnedHomes.id, id));
  rev(dealId);
}

// ============================================================================
// RENT ROLL
// ============================================================================

export async function addRentRollEntryAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const asOfDate = emptyToNullDate(formData.get("asOfDate"));
  if (!dealId || !asOfDate) return;
  await db.insert(ddRentRollEntries).values({
    dealId,
    asOfDate,
    spaceNumber: emptyToNull(formData.get("spaceNumber")),
    residentName: emptyToNull(formData.get("residentName")),
    securityDeposit: emptyToNull(formData.get("securityDeposit")),
    moveInDate: emptyToNullDate(formData.get("moveInDate")),
    delinquentBalance: emptyToNull(formData.get("delinquentBalance")),
    lotRent: emptyToNull(formData.get("lotRent")),
    rentalHomeRent: emptyToNull(formData.get("rentalHomeRent")),
    notePayment: emptyToNull(formData.get("notePayment")),
    otherCharges: emptyToNull(formData.get("otherCharges")),
    paymentsReceived: emptyToNull(formData.get("paymentsReceived")),
    utilityBillback: emptyToNull(formData.get("utilityBillback")),
    notes: emptyToNull(formData.get("notes")),
  });
  rev(dealId);
}

export async function deleteRentRollEntryAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddRentRollEntries).where(eq(ddRentRollEntries.id, id));
  rev(dealId);
}

// ============================================================================
// COMPARABLES
// ============================================================================

export async function addComparableAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const type = String(formData.get("type") ?? "rv_or_mh_park") as
    | "rv_or_mh_park"
    | "apartment"
    | "single_family";
  if (!dealId) return;
  await db.insert(ddComparables).values({
    dealId,
    type,
    name: emptyToNull(formData.get("name")),
    address: emptyToNull(formData.get("address")),
    city: emptyToNull(formData.get("city")),
    state: emptyToNull(formData.get("state")),
    zip: emptyToNull(formData.get("zip")),
    phone: emptyToNull(formData.get("phone")),
    spacesOrUnits: emptyToNull(formData.get("spacesOrUnits")),
    rentLow: emptyToNull(formData.get("rentLow")),
    rentHigh: emptyToNull(formData.get("rentHigh")),
    occupiedCount: (() => {
      const v = emptyToNull(formData.get("occupiedCount"));
      return v ? Number(v) : null;
    })(),
    vacantCount: (() => {
      const v = emptyToNull(formData.get("vacantCount"));
      return v ? Number(v) : null;
    })(),
    utilitiesIncluded: emptyToNull(formData.get("utilitiesIncluded")),
    moveInSpecials: emptyToNull(formData.get("moveInSpecials")),
    salesPrice: emptyToNull(formData.get("salesPrice")),
    notes: emptyToNull(formData.get("notes")),
  });
  rev(dealId);
}

export async function deleteComparableAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddComparables).where(eq(ddComparables.id, id));
  rev(dealId);
}

// ============================================================================
// DD CONTACTS
// ============================================================================

export async function addDdContactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const dealId = String(formData.get("dealId") ?? "");
  const category = String(formData.get("category") ?? "purchase") as
    | "purchase"
    | "government"
    | "utility"
    | "vendor"
    | "market";
  const role = emptyToNull(formData.get("role"));
  if (!dealId || !role) return;
  await db.insert(ddContacts).values({
    dealId,
    category,
    role,
    contactName: emptyToNull(formData.get("contactName")),
    phone: emptyToNull(formData.get("phone")),
    fax: emptyToNull(formData.get("fax")),
    email: emptyToNull(formData.get("email")),
    address: emptyToNull(formData.get("address")),
    notes: emptyToNull(formData.get("notes")),
  });
  rev(dealId);
}

export async function deleteDdContactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  if (!id) return;
  await db.delete(ddContacts).where(and(eq(ddContacts.id, id), eq(ddContacts.dealId, dealId)));
  rev(dealId);
}
