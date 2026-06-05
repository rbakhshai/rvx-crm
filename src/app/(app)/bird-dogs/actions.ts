"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { birdDogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { birdDogFormSchema, parseBirdDogForm } from "@/lib/validation/bird-dogs";

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

function toValues(v: ReturnType<typeof birdDogFormSchema.parse>) {
  return {
    ownerId: v.ownerId || null,
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    cellPhone: v.cellPhone,
    facebookUrl: v.facebookUrl,
    statusCode: v.statusCode,
    acquisitionLevel: v.acquisitionLevel as never,
    startDate: v.startDate,
    agreementSignDate: v.agreementSignDate,
    sendAgreement: v.sendAgreement,
    sendOnboardingPacket: v.sendOnboardingPacket,
    sendTrainingVideos: v.sendTrainingVideos,
    rvxAgreementSigned: v.rvxAgreementSigned,
    autoSendTerminationEmail: v.autoSendTerminationEmail,
    manuallyRemoveFromTracker: v.manuallyRemoveFromTracker,
    isInDiscord: v.isInDiscord,
    kickedFromDiscord: v.kickedFromDiscord,
    giveAccessToTracker: v.giveAccessToTracker,
    resumeUrl: v.resumeUrl,
    w9Url: v.w9Url,
    signedAgreementUrl: v.signedAgreementUrl,
    completedTraining: v.completedTraining,
    ethicsTrainingStatus: v.ethicsTrainingStatus as never,
    whyJoinRvx: v.whyJoinRvx,
    howHeardAboutRvx: v.howHeardAboutRvx,
    currentW2: v.currentW2,
    priorW2: v.priorW2,
    w2Goals: v.w2Goals,
    hospitalityBackground: v.hospitalityBackground,
    businessOpsBackground: v.businessOpsBackground,
    weeklyExecutionPlan: v.weeklyExecutionPlan,
    gamePlanForward: v.gamePlanForward,
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
    bulkEmailOptedOut: v.bulkEmailOptedOut,
  };
}

export async function createBirdDogAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = birdDogFormSchema.safeParse(parseBirdDogForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const values = { ...toValues(parsed.data), ownerId: parsed.data.ownerId || user.id };
  const [row] = await db.insert(birdDogs).values(values).returning({ id: birdDogs.id });
  revalidatePath("/bird-dogs");
  redirect(`/bird-dogs/${row.id}`);
}

export async function updateBirdDogAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = birdDogFormSchema.safeParse(parseBirdDogForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  await db.update(birdDogs).set({ ...toValues(parsed.data), updatedAt: new Date() }).where(eq(birdDogs.id, id));
  revalidatePath(`/bird-dogs/${id}`);
  revalidatePath("/bird-dogs");
  redirect(`/bird-dogs/${id}`);
}

/** Soft-delete: row hidden from lists, recoverable from /trash for 30 days. */
export async function deleteBirdDogAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "delete_bird_dogs");
  await db
    .update(birdDogs)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(eq(birdDogs.id, id));
  revalidatePath("/bird-dogs");
  revalidatePath("/trash");
  redirect("/bird-dogs");
}

export async function restoreBirdDogAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "restore_from_trash");
  await db
    .update(birdDogs)
    .set({ deletedAt: null, deletedById: null, updatedAt: new Date() })
    .where(eq(birdDogs.id, id));
  revalidatePath("/bird-dogs");
  revalidatePath("/trash");
  redirect(`/bird-dogs/${id}`);
}

export async function purgeBirdDogAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "purge_permanently");
  await db.delete(birdDogs).where(eq(birdDogs.id, id));
  revalidatePath("/trash");
  redirect("/trash" as never);
}
