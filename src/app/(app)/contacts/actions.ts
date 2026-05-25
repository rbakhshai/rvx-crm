"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { contactFormSchema, parseContactFormData } from "@/lib/validation/contacts";

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

export async function createContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = contactFormSchema.safeParse(parseContactFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;
  const ownerId = v.ownerId || (await requireUser()).id;
  const [row] = await db
    .insert(contacts)
    .values({
      ownerId,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      smsNumber: v.smsNumber,
      officePhone: v.officePhone,
      title: v.title,
      timezone: v.timezone,
      birthday: v.birthday,
      address: v.address,
      address2: v.address2,
      city: v.city,
      state: v.state,
      zip: v.zip,
      country: v.country,
      website: v.website,
      facebookLink: v.facebookLink,
      instagramLink: v.instagramLink,
      linkedinLink: v.linkedinLink,
      twitterLink: v.twitterLink,
      blinqProfile: v.blinqProfile,
      status: v.status as never,
      qualificationTier: v.qualificationTier as never,
      buyerNumber: v.buyerNumber ? Number(v.buyerNumber) : undefined,
      topTier: v.topTier,
      parkTypePreferences: v.parkTypePreferences,
      targetStates: v.targetStates,
      strictStates: v.strictStates,
      padsDesiredMin: v.padsDesiredMin ? Number(v.padsDesiredMin) : undefined,
      amountOfPadsDesiredBucket: v.amountOfPadsDesiredBucket,
      maxDealSize: v.maxDealSize as never,
      minNoiUsd: v.minNoiUsd ? String(v.minNoiUsd) : undefined,
      parkWithRestaurant: v.parkWithRestaurant,
      openToLeasedLand: v.openToLeasedLand,
      deployableCash: v.deployableCash as never,
      willUse1031: v.willUse1031,
      using1031Amount: v.using1031Amount as never,
      pofAmount: v.pofAmount ? String(v.pofAmount) : undefined,
      canProducePof: v.canProducePof,
      financingOptions: v.financingOptions as never,
      currentFinancingResources: v.currentFinancingResources,
      fastestTurnaround: v.fastestTurnaround as never,
      investorType: v.investorType,
      gpLp: v.gpLp as never,
      reiExperienceOutsideRvp: v.reiExperienceOutsideRvp,
      rvpClosedInPastBucket: v.rvpClosedInPastBucket,
      twelveMonthGoalsBucket: v.twelveMonthGoalsBucket,
      buyersValuableSkills: v.buyersValuableSkills,
      describeSkillExperience: v.describeSkillExperience,
      signedNcnda: v.signedNcnda,
      smsPermission: v.smsPermission,
      bulkSmsOptedOut: v.bulkSmsOptedOut,
      subtoMember: v.subtoMember,
      ownersClubMember: v.ownersClubMember,
      gatorMember: v.gatorMember,
      topTierMember: v.topTierMember,
      subtoMemberSince: v.subtoMemberSince,
      nameOfLlc: v.nameOfLlc,
      buyersAdditionalComments: v.buyersAdditionalComments,
      minReturnRequired: v.minReturnRequired,
      buyerLeadSource: v.buyerLeadSource as never,
      internalNotesBuyerContact: v.internalNotesBuyerContact,
      internalNotesBuyerCriteria: v.internalNotesBuyerCriteria,
      internalNotesQualifyCredibility: v.internalNotesQualifyCredibility,
    })
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  redirect(`/contacts/${row.id}`);
}

export async function updateContactAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = contactFormSchema.safeParse(parseContactFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  await db
    .update(contacts)
    .set({
      ownerId: v.ownerId || null,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      smsNumber: v.smsNumber,
      officePhone: v.officePhone,
      title: v.title,
      timezone: v.timezone,
      birthday: v.birthday,
      address: v.address,
      address2: v.address2,
      city: v.city,
      state: v.state,
      zip: v.zip,
      country: v.country,
      website: v.website,
      facebookLink: v.facebookLink,
      instagramLink: v.instagramLink,
      linkedinLink: v.linkedinLink,
      twitterLink: v.twitterLink,
      blinqProfile: v.blinqProfile,
      status: v.status as never,
      qualificationTier: v.qualificationTier as never,
      buyerNumber: v.buyerNumber ? Number(v.buyerNumber) : undefined,
      topTier: v.topTier,
      parkTypePreferences: v.parkTypePreferences,
      targetStates: v.targetStates,
      strictStates: v.strictStates,
      padsDesiredMin: v.padsDesiredMin ? Number(v.padsDesiredMin) : undefined,
      amountOfPadsDesiredBucket: v.amountOfPadsDesiredBucket,
      maxDealSize: v.maxDealSize as never,
      minNoiUsd: v.minNoiUsd ? String(v.minNoiUsd) : undefined,
      parkWithRestaurant: v.parkWithRestaurant,
      openToLeasedLand: v.openToLeasedLand,
      deployableCash: v.deployableCash as never,
      willUse1031: v.willUse1031,
      using1031Amount: v.using1031Amount as never,
      pofAmount: v.pofAmount ? String(v.pofAmount) : undefined,
      canProducePof: v.canProducePof,
      financingOptions: v.financingOptions as never,
      currentFinancingResources: v.currentFinancingResources,
      fastestTurnaround: v.fastestTurnaround as never,
      investorType: v.investorType,
      gpLp: v.gpLp as never,
      reiExperienceOutsideRvp: v.reiExperienceOutsideRvp,
      rvpClosedInPastBucket: v.rvpClosedInPastBucket,
      twelveMonthGoalsBucket: v.twelveMonthGoalsBucket,
      buyersValuableSkills: v.buyersValuableSkills,
      describeSkillExperience: v.describeSkillExperience,
      signedNcnda: v.signedNcnda,
      smsPermission: v.smsPermission,
      bulkSmsOptedOut: v.bulkSmsOptedOut,
      subtoMember: v.subtoMember,
      ownersClubMember: v.ownersClubMember,
      gatorMember: v.gatorMember,
      topTierMember: v.topTierMember,
      subtoMemberSince: v.subtoMemberSince,
      nameOfLlc: v.nameOfLlc,
      buyersAdditionalComments: v.buyersAdditionalComments,
      minReturnRequired: v.minReturnRequired,
      buyerLeadSource: v.buyerLeadSource as never,
      internalNotesBuyerContact: v.internalNotesBuyerContact,
      internalNotesBuyerCriteria: v.internalNotesBuyerCriteria,
      internalNotesQualifyCredibility: v.internalNotesQualifyCredibility,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));

  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function deleteContactAction(id: string): Promise<void> {
  await requireUser();
  await db.delete(contacts).where(eq(contacts.id, id));
  revalidatePath("/contacts");
  redirect("/contacts");
}
