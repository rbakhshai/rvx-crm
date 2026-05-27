"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, companies, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { generateDealSummary, type DealSummaryInput, isAnthropicConfigured } from "@/lib/ai";

export type AiSummaryResult =
  | { ok: true; summary: string }
  | { ok: false; message: string };

export async function generateDealSummaryAction(dealId: string): Promise<AiSummaryResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, message: "Not authenticated" };
  if (!isAnthropicConfigured()) return { ok: false, message: "Anthropic API key not configured" };

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { ok: false, message: "Deal not found" };

  // Pull linked seller + bird dog for richer context
  let sellerName: string | null = null;
  let sellerRelationship: string | null = null;
  if (deal.sellerCompanyId) {
    const [c] = await db
      .select({
        name: companies.name,
        sellerFirstName: companies.sellerFirstName,
        sellerLastName: companies.sellerLastName,
        relationshipToPark: companies.relationshipToPark,
      })
      .from(companies)
      .where(eq(companies.id, deal.sellerCompanyId))
      .limit(1);
    if (c) {
      sellerName = [c.sellerFirstName, c.sellerLastName].filter(Boolean).join(" ") || c.name;
      sellerRelationship = c.relationshipToPark;
    }
  }

  let birdDogName: string | null = null;
  if (deal.birdDogId) {
    const [bd] = await db
      .select({ firstName: birdDogs.firstName, lastName: birdDogs.lastName })
      .from(birdDogs)
      .where(eq(birdDogs.id, deal.birdDogId))
      .limit(1);
    if (bd) {
      birdDogName = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || null;
    }
  }

  const input: DealSummaryInput = {
    parkName: deal.name,
    parkAddress: deal.parkAddress,
    parkCity: deal.parkCity,
    parkState: deal.parkState,
    padsCount: deal.padsCount,
    totalUnits: deal.totalUnits,
    acresCount: deal.acresCount,
    listPrice: deal.listPrice,
    listNoi: deal.listNoi,
    listCapRate: deal.listCapRate,
    agreedPurchasePrice: deal.agreedPurchasePrice,
    openToCreative: deal.openToCreative,
    currentMortgageDebt: deal.currentMortgageDebt,
    currentMortgagePayment: deal.currentMortgagePayment,
    currentMortgageInterestRate: deal.currentMortgageInterestRate,
    currentMortgageBalloonDate: deal.currentMortgageBalloonDate,
    hasRestaurant: deal.hasRestaurant,
    amenities: deal.amenities,
    motivationToSell: deal.motivationToSell,
    lookingToRetire: deal.lookingToRetire,
    importantSellerTerms: deal.importantSellerTerms,
    whatMakesThisSpecial: deal.whatMakesThisSpecial,
    ownedTheParkLong: deal.ownedTheParkLong,
    ownsOtherParks: deal.ownsOtherParks,
    taxesCurrent: deal.taxesCurrent,
    permissionToShareFinancials: deal.permissionToShareFinancials,
    birdDogName,
    birdDogAdditionalNotes: deal.birdDogAdditionalNotes,
    sellerName,
    sellerRelationship,
  };

  try {
    const summary = await generateDealSummary(input);
    await db
      .update(deals)
      .set({ aiSummaryMd: summary, updatedAt: new Date() })
      .where(eq(deals.id, dealId));

    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/triage");
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Generation failed" };
  }
}
