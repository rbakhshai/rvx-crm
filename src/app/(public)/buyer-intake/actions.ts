"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { sendNotification } from "@/lib/email";
import { isPublicFormAbuse } from "@/lib/public-form-guard";

const BUYER_LEAD_NOTIFY_EMAIL = process.env.BUYER_LEAD_NOTIFY_EMAIL ?? "buyers@rvparkexchange.com";

const baseUrl = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export type IntakeFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const optionalArray = z
  .union([z.string(), z.array(z.string()), z.undefined()])
  .transform((v) => (Array.isArray(v) ? v : v ? [v] : []));

// -------- STEP 1 — contact + commitment --------

const step1Schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number"),
  fastestTurnaround: z.string().optional(),
  twelveMonthGoalsBucket: z.string().optional(),
});

export async function submitIntakeStep1Action(
  _prev: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  if (await isPublicFormAbuse(formData)) {
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  const raw = Object.fromEntries(formData.entries());
  const parsed = step1Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  // openToLeasedLand is required in the contacts table; we don't ask in step 1
  // (it's a buy-box question for step 2). Default false; user can change in step 2.
  const [row] = await db
    .insert(contacts)
    .values({
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      smsNumber: v.phone,
      status: "new_waiting_to_connect",
      fastestTurnaround: v.fastestTurnaround as never,
      twelveMonthGoalsBucket: v.twelveMonthGoalsBucket,
      buyerLeadSource: "buyer_popup",
      bulkEmailStatus: "single_opt_in",
      openToLeasedLand: false,
    })
    .returning({ id: contacts.id });

  await sendNotification({
    kind: "new_lead",
    to: BUYER_LEAD_NOTIFY_EMAIL,
    subject: `[in progress] New buyer started intake — ${v.firstName} ${v.lastName}`,
    bodyMd: [
      `${v.firstName} ${v.lastName} just started /buyer-intake.`,
      ``,
      `Email:    ${v.email}`,
      `Phone:    ${v.phone}`,
      `Timeline: ${v.fastestTurnaround ?? "—"}`,
      `Goals:    ${v.twelveMonthGoalsBucket ?? "—"} acquisitions in 12mo`,
      ``,
      `If they don't complete step 2/3, they'll show as "new — waiting to connect" in /contacts.`,
      ``,
      `Profile in CRM: ${baseUrl()}/contacts/${row.id}`,
    ].join("\n"),
    payload: { contactId: row.id, source: "buyer-intake", step: 1 },
  });

  redirect(`/buyer-intake/${row.id}/criteria`);
}

// -------- STEP 2 — buy box --------

const step2Schema = z.object({
  targetStates: optionalArray,
  parkTypePreferences: optionalArray,
  amountOfPadsDesiredBucket: z.string().optional(),
  maxDealSize: z.string().optional(),
  parkWithRestaurant: z.string().optional(),
  openToLeasedLand: z.string().optional(),
});

export async function submitIntakeStep2Action(
  id: string,
  _prev: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  const parsed = step2Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  await db
    .update(contacts)
    .set({
      targetStates: v.targetStates,
      parkTypePreferences: v.parkTypePreferences,
      amountOfPadsDesiredBucket: v.amountOfPadsDesiredBucket,
      maxDealSize: v.maxDealSize as never,
      parkWithRestaurant: v.parkWithRestaurant === "yes" ? true : v.parkWithRestaurant === "no" ? false : null,
      openToLeasedLand: v.openToLeasedLand === "yes",
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));
  redirect(`/buyer-intake/${id}/qualifying`);
}

// -------- STEP 3 — qualifying --------

const step3Schema = z.object({
  deployableCash: z.string().optional(),
  willUse1031: z.string().optional(),
  using1031Amount: z.string().optional(),
  financingOptions: z.string().optional(),
  currentFinancingResources: optionalArray,
  reiExperienceOutsideRvp: optionalArray,
  rvpClosedInPastBucket: z.string().optional(),
  describeSkillExperience: z.string().optional(),
  buyersAdditionalComments: z.string().optional(),
});

export async function submitIntakeStep3Action(
  id: string,
  _prev: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  const parsed = step3Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  await db
    .update(contacts)
    .set({
      deployableCash: v.deployableCash as never,
      willUse1031: v.willUse1031 === "yes" ? true : v.willUse1031 === "no" ? false : null,
      using1031Amount: v.using1031Amount as never,
      financingOptions: v.financingOptions as never,
      currentFinancingResources: v.currentFinancingResources,
      reiExperienceOutsideRvp: v.reiExperienceOutsideRvp,
      rvpClosedInPastBucket: v.rvpClosedInPastBucket,
      describeSkillExperience: v.describeSkillExperience,
      buyersAdditionalComments: v.buyersAdditionalComments,
      // Advance status — they finished intake
      status: "active_looking",
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id));

  // Fire the "completed" notification with the full picture
  const [c] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (c) {
    await sendNotification({
      kind: "new_lead",
      to: BUYER_LEAD_NOTIFY_EMAIL,
      subject: `[complete] Buyer profile complete — ${c.firstName} ${c.lastName}`,
      bodyMd: [
        `${c.firstName} ${c.lastName} just completed /buyer-intake.`,
        ``,
        `Email:        ${c.email}`,
        `Phone:        ${c.phone}`,
        `Timeline:     ${c.fastestTurnaround ?? "—"}`,
        `12mo goals:   ${c.twelveMonthGoalsBucket ?? "—"}`,
        ``,
        `BUY BOX`,
        `Target states: ${c.targetStates?.join(", ") ?? "—"}`,
        `Park types:    ${c.parkTypePreferences?.join(", ") ?? "—"}`,
        `Pads desired:  ${c.amountOfPadsDesiredBucket ?? "—"}`,
        `Max deal:      ${c.maxDealSize ?? "—"}`,
        `Restaurant ok: ${c.parkWithRestaurant === true ? "yes" : c.parkWithRestaurant === false ? "no" : "—"}`,
        `Leased land:   ${c.openToLeasedLand ? "yes" : "no"}`,
        ``,
        `CAPITAL`,
        `Deployable cash: ${c.deployableCash ?? "—"}`,
        `Using 1031:      ${c.willUse1031 === true ? `yes (${c.using1031Amount ?? "amt unknown"})` : c.willUse1031 === false ? "no" : "—"}`,
        `Financing:       ${c.financingOptions ?? "—"}`,
        `Resources:       ${c.currentFinancingResources?.join(", ") ?? "—"}`,
        ``,
        `EXPERIENCE`,
        `RE outside RVP: ${c.reiExperienceOutsideRvp?.join(", ") ?? "—"}`,
        `RVPs closed:    ${c.rvpClosedInPastBucket ?? "—"}`,
        c.describeSkillExperience ? `\nSkill notes:\n${c.describeSkillExperience}\n` : ``,
        c.buyersAdditionalComments ? `\nAdditional comments:\n${c.buyersAdditionalComments}\n` : ``,
        ``,
        `Open profile: ${baseUrl()}/contacts/${id}`,
      ].filter(Boolean).join("\n"),
      payload: { contactId: id, source: "buyer-intake", step: 3 },
    });
  }

  redirect(`/buyer-intake/${id}/thank-you`);
}
