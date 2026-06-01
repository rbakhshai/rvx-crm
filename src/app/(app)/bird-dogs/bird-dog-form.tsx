"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Section } from "@/components/section";
import { TextField, TextAreaField, SelectField, CheckboxField } from "@/components/form-field";
import {
  BD_ACQUISITION_LEVEL_OPTIONS,
  TRAINING_STATUS_OPTIONS,
} from "@/lib/options";
import type { SelectOption } from "@/components/form-field";
import type { BirdDog, BirdDogStatus } from "@/db/schema";
import type { FormState } from "./actions";

const initialState: FormState = { ok: false };

export function BirdDogForm({
  action,
  birdDog,
  statuses,
  ownerOptions,
  cancelHref,
  submitLabel = "Save bird dog",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  birdDog?: BirdDog | null;
  statuses: BirdDogStatus[];
  ownerOptions: SelectOption[];
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const err = (k: string) => state.errors?.[k]?.[0];

  const statusOptions = statuses.map((s) => ({ value: s.code, label: s.label }));

  return (
    <form action={formAction} className="pb-20">
      {state.message && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <Section title="Identity">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="First name" name="firstName" defaultValue={birdDog?.firstName} />
          <TextField label="Last name" name="lastName" defaultValue={birdDog?.lastName} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Email" name="email" type="email" defaultValue={birdDog?.email} error={err("email")} />
          <TextField label="Cell phone" name="cellPhone" type="tel" defaultValue={birdDog?.cellPhone} />
        </div>
        <TextField label="Facebook URL" name="facebookUrl" type="url" defaultValue={birdDog?.facebookUrl} />
      </Section>

      <Section title="Status & level">
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Onboarding status" name="statusCode" options={statusOptions} defaultValue={birdDog?.statusCode} />
          <SelectField label="Acquisition level" name="acquisitionLevel" options={BD_ACQUISITION_LEVEL_OPTIONS} defaultValue={birdDog?.acquisitionLevel} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Start date" name="startDate" type="date" defaultValue={birdDog?.startDate} />
          <TextField label="Agreement sign date" name="agreementSignDate" type="date" defaultValue={birdDog?.agreementSignDate} />
        </div>
      </Section>

      <Section title="Onboarding triggers" description="Checkboxes that fire automations in Phase 4.">
        <div className="grid sm:grid-cols-2 gap-2">
          <CheckboxField label="Send agreement" name="sendAgreement" defaultChecked={birdDog?.sendAgreement} />
          <CheckboxField label="Send onboarding packet" name="sendOnboardingPacket" defaultChecked={birdDog?.sendOnboardingPacket} />
          <CheckboxField label="Send training videos" name="sendTrainingVideos" defaultChecked={birdDog?.sendTrainingVideos} />
          <CheckboxField label="RVX agreement signed" name="rvxAgreementSigned" defaultChecked={birdDog?.rvxAgreementSigned} />
          <CheckboxField label="Auto-send termination email" name="autoSendTerminationEmail" defaultChecked={birdDog?.autoSendTerminationEmail} />
          <CheckboxField label="Manually remove from tracker" name="manuallyRemoveFromTracker" defaultChecked={birdDog?.manuallyRemoveFromTracker} />
        </div>
      </Section>

      <Section title="Discord & access">
        <div className="grid sm:grid-cols-2 gap-2">
          <CheckboxField label="In Discord" name="isInDiscord" defaultChecked={birdDog?.isInDiscord} />
          <CheckboxField label="Kicked from Discord" name="kickedFromDiscord" defaultChecked={birdDog?.kickedFromDiscord} />
          <CheckboxField label="Give access to tracker" name="giveAccessToTracker" defaultChecked={birdDog?.giveAccessToTracker} />
        </div>
      </Section>

      <Section title="Files">
        <TextField label="Resume URL" name="resumeUrl" defaultValue={birdDog?.resumeUrl} />
        <TextField label="W9 URL" name="w9Url" defaultValue={birdDog?.w9Url} />
        <TextField label="Signed agreement URL" name="signedAgreementUrl" defaultValue={birdDog?.signedAgreementUrl} />
      </Section>

      <Section title="Training">
        <div className="grid sm:grid-cols-2 gap-3">
          <CheckboxField label="Completed training" name="completedTraining" defaultChecked={birdDog?.completedTraining} />
          <SelectField label="Ethics training" name="ethicsTrainingStatus" options={TRAINING_STATUS_OPTIONS} defaultValue={birdDog?.ethicsTrainingStatus} />
        </div>
      </Section>

      <Section title="Background">
        <TextAreaField label="Why do you want to join RVX?" name="whyJoinRvx" defaultValue={birdDog?.whyJoinRvx} rows={2} />
        <TextAreaField label="How did you hear about RVX?" name="howHeardAboutRvx" defaultValue={birdDog?.howHeardAboutRvx} rows={2} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Current W2" name="currentW2" defaultValue={birdDog?.currentW2} />
          <TextField label="Prior W2" name="priorW2" defaultValue={birdDog?.priorW2} />
        </div>
        <TextAreaField label="W2 income goals" name="w2Goals" defaultValue={birdDog?.w2Goals} rows={2} />
        <TextAreaField label="Hospitality background" name="hospitalityBackground" defaultValue={birdDog?.hospitalityBackground} rows={2} />
        <TextAreaField label="Business ops background" name="businessOpsBackground" defaultValue={birdDog?.businessOpsBackground} rows={2} />
        <TextAreaField label="Weekly execution plan" name="weeklyExecutionPlan" defaultValue={birdDog?.weeklyExecutionPlan} rows={2} />
        <TextAreaField label="Game plan forward" name="gamePlanForward" defaultValue={birdDog?.gamePlanForward} rows={2} />
      </Section>

      <Section title="RV lifestyle">
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="RV class" name="rvClass" defaultValue={birdDog?.rvClass} />
          <TextField label="RV rig" name="rvRig" defaultValue={birdDog?.rvRig} />
          <TextField label="Years full-time" name="yearsFullTimeTraveling" defaultValue={birdDog?.yearsFullTimeTraveling} />
        </div>
      </Section>

      <Section title="Community memberships">
        <div className="grid sm:grid-cols-2 gap-2">
          <CheckboxField label="Subto" name="subtoMember" defaultChecked={birdDog?.subtoMember} />
          <TextField label="Subto since" name="subtoSince" defaultValue={birdDog?.subtoSince} />
          <CheckboxField label="Gator" name="gatorMember" defaultChecked={birdDog?.gatorMember} />
          <TextField label="Gator since" name="gatorSince" defaultValue={birdDog?.gatorSince} />
          <CheckboxField label="Top Tier" name="topTierMember" defaultChecked={birdDog?.topTierMember} />
          <TextField label="Top Tier since" name="topTierSince" defaultValue={birdDog?.topTierSince} />
          <CheckboxField label="Owners Club" name="ownersClubMember" defaultChecked={birdDog?.ownersClubMember} />
          <TextField label="Owners Club since" name="ownersClubSince" defaultValue={birdDog?.ownersClubSince} />
          <CheckboxField label="Zero Down" name="zeroDownMember" defaultChecked={birdDog?.zeroDownMember} />
          <TextField label="Zero Down since" name="zeroDownSince" defaultValue={birdDog?.zeroDownSince} />
        </div>
      </Section>

      <Section title="Marketing prefs">
        <CheckboxField label="Opted out of bulk email" name="bulkEmailOptedOut" defaultChecked={birdDog?.bulkEmailOptedOut} />
      </Section>

      <Section title="Ownership">
        <SelectField label="Owner" name="ownerId" options={ownerOptions} defaultValue={birdDog?.ownerId} hint="defaults to you on create" />
      </Section>

      <div className="sticky bottom-0 -mx-8 mt-8 border-t border-border bg-background/95 backdrop-blur px-8 py-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref as never)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
