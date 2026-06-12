"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { birdDogs } from "@/db/schema";
import { sendNotification } from "@/lib/email";

const BD_NOTIFY_EMAIL = process.env.BD_NOTIFY_EMAIL ?? "recruiting@rvparkexchange.com";

const baseUrl = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export type IntakeFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const optionalText = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined));

const checkboxBool = z
  .union([z.string(), z.undefined()])
  .transform((v) => v === "on" || v === "true");

const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email"),
  cellPhone: z.string().trim().min(7, "Enter a phone number"),
  facebookUrl: optionalText,

  rvClass: optionalText,
  rvRig: optionalText,
  yearsFullTimeTraveling: optionalText,

  subtoMember: checkboxBool,
  subtoSince: optionalText,
  gatorMember: checkboxBool,
  gatorSince: optionalText,
  topTierMember: checkboxBool,
  topTierSince: optionalText,
  ownersClubMember: checkboxBool,
  ownersClubSince: optionalText,
  zeroDownMember: checkboxBool,
  zeroDownSince: optionalText,

  currentW2: optionalText,
  priorW2: optionalText,
  w2Goals: optionalText,
  hospitalityBackground: optionalText,
  businessOpsBackground: optionalText,

  whyJoinRvx: optionalText,
  howHeardAboutRvx: optionalText,
  weeklyExecutionPlan: optionalText,

  // Program acknowledgments (spec Phase 1). Deliberately NOT required —
  // an applicant who can't check all five isn't blocked, they're routed
  // to the Referral Partner offer on the thank-you page.
  ackColdCalling: checkboxBool,
  ackHours: checkboxBool,
  ackExclusive: checkboxBool,
  ackAccelerator: checkboxBool,
  ackTimeline: checkboxBool,
});

export async function submitBirdDogApplicationAction(
  _prev: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  const acks = [
    v.ackColdCalling && "cold_calling",
    v.ackHours && "hours",
    v.ackExclusive && "exclusive",
    v.ackAccelerator && "accelerator",
    v.ackTimeline && "timeline",
  ].filter(Boolean) as string[];
  const qualified = acks.length === 5;

  const [row] = await db
    .insert(birdDogs)
    .values({
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      cellPhone: v.cellPhone,
      facebookUrl: v.facebookUrl,
      statusCode: "hold_see_notes",
      acquisitionLevel: "onboarding",
      applicationQualified: qualified,
      applicationAcks: acks.join(","),
      rvClass: v.rvClass,
      rvRig: v.rvRig,
      yearsFullTimeTraveling: v.yearsFullTimeTraveling,
      subtoMember: v.subtoMember,
      subtoSince: v.subtoSince,
      gatorMember: v.gatorMember,
      gatorSince: v.gatorSince,
      topTierMember: v.topTierMember,
      topTierSince: v.topTierSince,
      ownersClubMember: v.ownersClubMember,
      ownersClubSince: v.ownersClubSince,
      zeroDownMember: v.zeroDownMember,
      zeroDownSince: v.zeroDownSince,
      currentW2: v.currentW2,
      priorW2: v.priorW2,
      w2Goals: v.w2Goals,
      hospitalityBackground: v.hospitalityBackground,
      businessOpsBackground: v.businessOpsBackground,
      whyJoinRvx: v.whyJoinRvx,
      howHeardAboutRvx: v.howHeardAboutRvx,
      weeklyExecutionPlan: v.weeklyExecutionPlan,
    })
    .returning({ id: birdDogs.id });

  const communities = [
    v.subtoMember && `Subto${v.subtoSince ? ` (${v.subtoSince})` : ""}`,
    v.gatorMember && `Gator${v.gatorSince ? ` (${v.gatorSince})` : ""}`,
    v.topTierMember && `Top Tier${v.topTierSince ? ` (${v.topTierSince})` : ""}`,
    v.ownersClubMember && `Owners Club${v.ownersClubSince ? ` (${v.ownersClubSince})` : ""}`,
    v.zeroDownMember && `Zero Down${v.zeroDownSince ? ` (${v.zeroDownSince})` : ""}`,
  ].filter(Boolean).join(", ") || "none listed";

  await sendNotification({
    kind: "bird_dog_application",
    to: BD_NOTIFY_EMAIL,
    subject: `New BD application — ${v.firstName} ${v.lastName}`,
    bodyMd: [
      `${v.firstName} ${v.lastName} applied to join the RVX bird-dog team.`,
      ``,
      qualified
        ? `Qualification: ✅ acknowledged all 5 program commitments — proceed to discovery call.`
        : `Qualification: ⚠️ checked ${acks.length}/5 commitments (${acks.join(", ") || "none"}) — offered the Referral Partner path.`,
      ``,
      `Email:        ${v.email}`,
      `Phone:        ${v.cellPhone}`,
      v.facebookUrl ? `Facebook:     ${v.facebookUrl}` : ``,
      ``,
      `Communities:  ${communities}`,
      `RV lifestyle: ${[v.rvClass, v.rvRig, v.yearsFullTimeTraveling ? `${v.yearsFullTimeTraveling} yrs full-time` : ""].filter(Boolean).join(" · ") || "—"}`,
      ``,
      `Current W2:   ${v.currentW2 ?? "—"}`,
      `Prior W2:     ${v.priorW2 ?? "—"}`,
      `W2 goals:     ${v.w2Goals ?? "—"}`,
      v.hospitalityBackground ? `\nHospitality:\n${v.hospitalityBackground}\n` : ``,
      v.businessOpsBackground ? `\nBusiness ops:\n${v.businessOpsBackground}\n` : ``,
      v.whyJoinRvx ? `\nWhy join RVX:\n${v.whyJoinRvx}\n` : ``,
      v.howHeardAboutRvx ? `\nHow heard:\n${v.howHeardAboutRvx}\n` : ``,
      v.weeklyExecutionPlan ? `\nWeekly execution plan:\n${v.weeklyExecutionPlan}\n` : ``,
      ``,
      `Status:       on hold (intake) — pending team review.`,
      `Open in CRM:  ${baseUrl()}/bird-dogs/${row.id}`,
    ].filter(Boolean).join("\n"),
    payload: { birdDogId: row.id, source: "bird-dog-apply" },
  });

  redirect(qualified ? `/bird-dog/thank-you` : `/bird-dog/thank-you?path=referral`);
}
