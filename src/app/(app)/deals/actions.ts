"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { sendNotification } from "@/lib/email";
import { dealFormSchema, parseDealForm } from "@/lib/validation/deals";

const UW_NOTIFY_EMAIL = "uw@rvparkexchange.com";

async function notifyUwReadyForReview(deal: { id: string; name: string | null; parkAddress: string | null; parkCity: string | null; parkState: string | null }) {
  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const where = [deal.parkCity, deal.parkState].filter(Boolean).join(", ") || "no location";
  const body = [
    `Deal "${title}" was flagged Ready for Review.`,
    ``,
    `Location: ${where}`,
    `Open in CRM: ${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/deals/${deal.id}`,
  ].join("\n");
  await sendNotification({
    kind: "deal_ready_for_review",
    to: UW_NOTIFY_EMAIL,
    subject: `[RVX] Ready for review — ${title}`,
    bodyMd: body,
    payload: { dealId: deal.id },
  });
}

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

function toNumStr(v: string | undefined): string | undefined {
  if (v === undefined || v === "") return undefined;
  return String(v);
}
function toInt(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  return Number(v);
}

function toValues(v: ReturnType<typeof dealFormSchema.parse>) {
  return {
    name: v.name,
    parkAddress: v.parkAddress,
    parkCity: v.parkCity,
    parkState: v.parkState,
    parkType: v.parkType as never,
    padsCount: toInt(v.padsCount),
    cabinsCount: v.cabinsCount,
    tentSitesCount: v.tentSitesCount,
    hotelMotelCount: v.hotelMotelCount,
    totalUnits: toInt(v.totalUnits),
    acresCount: v.acresCount,
    fullHookupPads: v.fullHookupPads,
    waterSystemType: v.waterSystemType,
    septicSystemType: v.septicSystemType,
    electricalDetail: v.electricalDetail,
    occupancyPct: toNumStr(v.occupancyPct),
    amenities: v.amenities,
    googleMapUrl: v.googleMapUrl,
    listingLink: v.listingLink,
    propertyWebsite: v.propertyWebsite,
    hasRestaurant: v.hasRestaurant,
    whatMakesThisSpecial: v.whatMakesThisSpecial,
    motivationToSell: v.motivationToSell,
    listPrice: toNumStr(v.listPrice),
    listNoi: toNumStr(v.listNoi),
    listCapRate: v.listCapRate,
    openToCreative: v.openToCreative,
    agreedPurchasePrice: toNumStr(v.agreedPurchasePrice),
    agreedCapRate: v.agreedCapRate,
    cashOffer: toNumStr(v.cashOffer),
    sellerFinanceDownPayment: toNumStr(v.sellerFinanceDownPayment),
    sellerFinanceAmount: toNumStr(v.sellerFinanceAmount),
    sellerFinanceInterestRate: v.sellerFinanceInterestRate,
    sellerFinanceAmortYears: v.sellerFinanceAmortYears,
    sellerFinanceBalloonYears: v.sellerFinanceBalloonYears,
    hybridPurchasePrice: toNumStr(v.hybridPurchasePrice),
    hybridDownPayment: toNumStr(v.hybridDownPayment),
    hybridInterestRate: toNumStr(v.hybridInterestRate),
    hybridAmortYears: toInt(v.hybridAmortYears),
    bankInterestRate: v.bankInterestRate,
    bankAmortYears: v.bankAmortYears,
    equityContribution: toNumStr(v.equityContribution),
    statusCode: v.statusCode,
    dispoStage: v.dispoStage as never,
    dealPriority: v.dealPriority as never,
    callDisposition: v.callDisposition as never,
    weeklyOfferReview: v.weeklyOfferReview as never,
    readyForReview: v.readyForReview,
    leadSource: v.leadSource as never,
    birdDogId: v.birdDogId || null,
    birdDogFirstName: v.birdDogFirstName,
    birdDogLastName: v.birdDogLastName,
    birdDogPhone: v.birdDogPhone,
    birdDogEmail: v.birdDogEmail,
    birdDogAdditionalNotes: v.birdDogAdditionalNotes,
    marketingPackageUrl: v.marketingPackageUrl,
    pAndLUrl: v.pAndLUrl,
    appraisalUrl: v.appraisalUrl,
    rvxOnePagerUrl: v.rvxOnePagerUrl,
    rvxFivePagerUrl: v.rvxFivePagerUrl,
    dataRoomUrl: v.dataRoomUrl,
    emdDueDate: v.emdDueDate,
    emdAmount: toNumStr(v.emdAmount),
    emdDeposited: v.emdDeposited,
    escrowOpened: v.escrowOpened,
    inspectionPeriodEnd: v.inspectionPeriodEnd,
    psaCoeDate: v.psaCoeDate,
    escrowFeeResponsibility: v.escrowFeeResponsibility as never,
    transferTaxResponsibility: v.transferTaxResponsibility as never,
    titlePolicyResponsibility: v.titlePolicyResponsibility as never,
    confirmedBuyerId: v.confirmedBuyerId || null,
    secondaryBuyerId: v.secondaryBuyerId || null,
    sellerCompanyId: v.sellerCompanyId || null,
    acquisitionManagerNotes: v.acquisitionManagerNotes,
    offerDeliveryInternalNotes: v.offerDeliveryInternalNotes,
    closerFinalNotes: v.closerFinalNotes,
    ownerId: v.ownerId || null,
    opsOwnerId: v.opsOwnerId || null,
  };
}

export async function createDealAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  await requirePermission(user, "create_deals");
  const parsed = dealFormSchema.safeParse(parseDealForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const values = { ...toValues(parsed.data), ownerId: parsed.data.ownerId || user.id };
  const [row] = await db
    .insert(deals)
    .values(values)
    .returning({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
    });

  // Fire UW notification if the deal was created already flagged Ready
  if (values.readyForReview) {
    await notifyUwReadyForReview(row);
  }

  revalidatePath("/deals");
  redirect(`/deals/${row.id}`);
}

export async function updateDealAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  await requirePermission(user, "edit_deals");
  const parsed = dealFormSchema.safeParse(parseDealForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const values = toValues(parsed.data);

  // Detect false → true transition on readyForReview + stage changes
  const [existing] = await db
    .select({ readyForReview: deals.readyForReview, statusCode: deals.statusCode })
    .from(deals)
    .where(eq(deals.id, id))
    .limit(1);

  // Reset the stage clock only when the edit actually changes the stage.
  const stageChanged = !!values.statusCode && values.statusCode !== existing?.statusCode;
  await db
    .update(deals)
    .set({ ...values, updatedAt: new Date(), ...(stageChanged ? { statusChangedAt: new Date() } : {}) })
    .where(eq(deals.id, id));

  if (values.readyForReview && !existing?.readyForReview) {
    const [row] = await db
      .select({
        id: deals.id,
        name: deals.name,
        parkAddress: deals.parkAddress,
        parkCity: deals.parkCity,
        parkState: deals.parkState,
      })
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);
    if (row) await notifyUwReadyForReview(row);
  }

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}

/**
 * Soft-delete: sets deleted_at so the row vanishes from lists but stays
 * recoverable from /trash for 30 days.
 */
export async function deleteDealAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "delete_deals");
  await db
    .update(deals)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(eq(deals.id, id));
  revalidatePath("/deals");
  revalidatePath("/trash");
  redirect("/deals");
}

/** Restore a soft-deleted deal from /trash. */
export async function restoreDealAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "restore_from_trash");
  await db
    .update(deals)
    .set({ deletedAt: null, deletedById: null, updatedAt: new Date() })
    .where(eq(deals.id, id));
  revalidatePath("/deals");
  revalidatePath("/trash");
  redirect(`/deals/${id}`);
}

/** Permanently remove the row — only callable from /trash after a confirm. */
export async function purgeDealAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "purge_permanently");
  await db.delete(deals).where(eq(deals.id, id));
  revalidatePath("/trash");
  redirect("/trash" as never);
}

/**
 * Kanban drag-and-drop server action. Moves a deal to a role lane by setting
 * its status to the first (lowest sort_order) status within that role.
 * If the user wants a more specific status within the role, they edit the
 * deal directly.
 */
export async function updateDealStatusByRoleAction(
  dealId: string,
  newRole: string,
): Promise<{ ok: boolean; statusCode?: string; error?: string }> {
  const user = await requireUser();
  await requirePermission(user, "edit_deals");

  const { dealStatuses } = await import("@/db/schema");
  const { and, asc } = await import("drizzle-orm");

  const [target] = await db
    .select({ code: dealStatuses.code })
    .from(dealStatuses)
    .where(and(eq(dealStatuses.role, newRole as never), eq(dealStatuses.isActive, true)))
    .orderBy(asc(dealStatuses.sortOrder))
    .limit(1);

  if (!target) {
    return { ok: false, error: `No active statuses found for role "${newRole}"` };
  }

  const [existing] = await db
    .select({ readyForReview: deals.readyForReview, statusCode: deals.statusCode })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);
  const previousReady = existing?.readyForReview ?? false;

  await db
    .update(deals)
    .set({
      statusCode: target.code,
      closerLastTouch: new Date(),
      updatedAt: new Date(),
      // Reset the stage clock only on a real stage change.
      ...(target.code !== existing?.statusCode ? { statusChangedAt: new Date() } : {}),
    })
    .where(eq(deals.id, dealId));

  // If moving INTO underwriting lane and not already flagged, also fire UW notification
  if (newRole === "uw" && !previousReady) {
    const [row] = await db
      .select({
        id: deals.id,
        name: deals.name,
        parkAddress: deals.parkAddress,
        parkCity: deals.parkCity,
        parkState: deals.parkState,
      })
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);
    if (row) await notifyUwReadyForReview(row);
  }

  revalidatePath("/deals/board");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { ok: true, statusCode: target.code };
}
