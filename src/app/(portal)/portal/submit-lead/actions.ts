"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { birdDogs, companies, deals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/email";

const LEAD_NOTIFY_EMAIL = process.env.SELLER_LEAD_NOTIFY_EMAIL ?? "leads@rvparkexchange.com";

const optionalText = z.string().trim().optional().or(z.literal("").transform(() => undefined));
const optionalUrl = optionalText;
const optionalPrice = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const cleaned = v.replace(/[^0-9.]/g, "");
    return cleaned.length ? cleaned : undefined;
  });
const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  });

const submitLeadSchema = z.object({
  // Lead Details
  parkName: z.string().trim().min(2, "Park name is required"),
  parkAddress: z.string().trim().min(5, "Park address is required"),
  parkCity: z.string().trim().min(1, "City is required"),
  parkState: z.string().trim().min(2, "State is required"),

  // Seller Details
  sellerProfile: z.enum(["owner", "realtor", "owner_realtor"], {
    errorMap: () => ({ message: "Pick a seller profile" }),
  }),
  sellerFirstName: z.string().trim().min(1, "Seller first name is required"),
  sellerLastName: z.string().trim().min(1, "Seller last name is required"),
  sellerPhone: z.string().trim().min(7, "Seller phone is required"),
  sellerEmail: z.string().trim().email("Enter a valid seller email"),

  // Property Details
  otherCampingTypes: optionalText,
  padsCount: optionalInt,
  cabinsCount: optionalText,
  tentSitesCount: optionalText,
  hotelMotelCount: optionalText,
  totalUnits: optionalInt,
  acresCount: z.string().trim().min(1, "Acres / expansion / permits info is required"),
  listNoi: z.string().trim().min(1, "NOI is required"),
  listCapRate: z.string().trim().min(1, "Cap rate is required"),
  listPrice: z.string().trim().min(1, "Asking price is required"),
  propertyWebsite: optionalUrl,
  importantSellerTerms: optionalText,

  // Spatial / Map
  spatialPictureUrl: optionalUrl,
  googleMapUrl: optionalUrl,

  // Attachments — URL fields (paste from Drive / Dropbox until R2 wired)
  pAndLUrl: optionalUrl,
  t12Url: optionalUrl,
  additionalFile1Url: optionalUrl,
  additionalFile2Url: optionalUrl,
  additionalFile3Url: optionalUrl,
  sharedDriveUrl: optionalUrl,

  // Bird-dog info (pre-filled but editable)
  repFirstName: z.string().trim().min(1, "Your first name is required"),
  repLastName: z.string().trim().min(1, "Your last name is required"),
  repPhone: z.string().trim().min(7, "Your phone is required"),
  repEmail: z.string().trim().email("Enter your email"),

  whatMakesThisSpecial: z.string().trim().min(1, "Tell us what makes this park special"),
  birdDogAdditionalNotes: optionalText,

  permissionConfirmed: z.literal("on", {
    errorMap: () => ({ message: "You must confirm you have permission to submit this lead" }),
  }),
});

export type SubmitLeadState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const SELLER_PROFILE_TO_RELATIONSHIP = {
  owner: "owner",
  realtor: "realtor",
  owner_realtor: "owner_realtor",
} as const;

export async function submitLeadAction(
  _prev: SubmitLeadState,
  formData: FormData,
): Promise<SubmitLeadState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, message: "Not authenticated" };

  // Verify the user is actually a linked bird dog
  const [bd] = await db
    .select()
    .from(birdDogs)
    .where(eq(birdDogs.userId, session.user.id))
    .limit(1);
  if (!bd) return { ok: false, message: "Your account isn't linked to a bird-dog profile yet." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = submitLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const v = parsed.data;

  // 1. Create the seller company record
  const sellerDisplayName = `${v.sellerFirstName} ${v.sellerLastName}`.trim();
  const [company] = await db
    .insert(companies)
    .values({
      name: sellerDisplayName || `(seller for ${v.parkName})`,
      relationshipToPark: SELLER_PROFILE_TO_RELATIONSHIP[v.sellerProfile],
      sellerFirstName: v.sellerFirstName,
      sellerLastName: v.sellerLastName,
      email: v.sellerEmail,
      phone: v.sellerPhone,
    })
    .returning({ id: companies.id });

  // 2. Create the deal — link to seller company and bird dog
  const [deal] = await db
    .insert(deals)
    .values({
      name: v.parkName,
      parkAddress: v.parkAddress,
      parkCity: v.parkCity,
      parkState: v.parkState === "OTHER" ? null : v.parkState,

      sellerCompanyId: company.id,
      birdDogId: bd.id,
      birdDogFirstName: v.repFirstName,
      birdDogLastName: v.repLastName,
      birdDogPhone: v.repPhone,
      birdDogEmail: v.repEmail,
      birdDogAdditionalNotes: v.birdDogAdditionalNotes,
      birdDogSharedDriveUrl: v.sharedDriveUrl,

      mixUse: v.otherCampingTypes,
      padsCount: v.padsCount,
      cabinsCount: v.cabinsCount,
      tentSitesCount: v.tentSitesCount,
      hotelMotelCount: v.hotelMotelCount,
      totalUnits: v.totalUnits,
      acresCount: v.acresCount,
      listNoi: v.listNoi.replace(/[^0-9.]/g, "") || null,
      listCapRate: v.listCapRate,
      listPrice: v.listPrice.replace(/[^0-9.]/g, "") || null,
      propertyWebsite: v.propertyWebsite,
      importantSellerTerms: v.importantSellerTerms,
      whatMakesThisSpecial: v.whatMakesThisSpecial,

      googleMapUrl: v.googleMapUrl,
      spatialPictureUrl: v.spatialPictureUrl,
      pAndLUrl: v.pAndLUrl,
      additionalFinancialsUrl: v.t12Url,
      additionalFile1Url: v.additionalFile1Url,
      additionalFile2Url: v.additionalFile2Url,
      additionalFile3Url: v.additionalFile3Url,

      leadSource: "bird_dog",
      statusCode: "new_lead_received",
    })
    .returning({ id: deals.id });

  // 3. Notify the team
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  await sendNotification({
    kind: "new_lead",
    to: LEAD_NOTIFY_EMAIL,
    subject: `New bird-dog lead — ${v.parkName} (${v.parkCity}, ${v.parkState})`,
    bodyMd: [
      `Submitted by bird dog: ${v.repFirstName} ${v.repLastName} (${v.repEmail}, ${v.repPhone})`,
      ``,
      `Park:    ${v.parkName}`,
      `Address: ${v.parkAddress}, ${v.parkCity}, ${v.parkState}`,
      `Seller:  ${sellerDisplayName} (${v.sellerProfile}) — ${v.sellerEmail}, ${v.sellerPhone}`,
      ``,
      `Asking:  $${v.listPrice}`,
      `NOI:     $${v.listNoi}`,
      `Cap:     ${v.listCapRate}`,
      `Pads:    ${v.padsCount ?? "—"}`,
      `Acres:   ${v.acresCount}`,
      ``,
      `Special: ${v.whatMakesThisSpecial}`,
      v.birdDogAdditionalNotes ? `BD notes: ${v.birdDogAdditionalNotes}` : ``,
      ``,
      `Open in CRM: ${baseUrl}/deals/${deal.id}`,
    ].join("\n"),
    payload: { dealId: deal.id, birdDogId: bd.id, source: "bird-dog-portal" },
  });

  revalidatePath("/portal");
  redirect("/portal/submit-lead/thank-you");
}
