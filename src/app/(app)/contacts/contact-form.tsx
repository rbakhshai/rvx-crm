"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Section } from "@/components/section";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  MultiSelectField,
} from "@/components/form-field";
import {
  BUYER_STATUS_OPTIONS,
  QUALIFICATION_TIER_OPTIONS,
  BUYER_LEAD_SOURCE_OPTIONS,
  DEPLOYABLE_CASH_OPTIONS,
  MAX_DEAL_SIZE_OPTIONS,
  EXCHANGE_1031_OPTIONS,
  FASTEST_TURNAROUND_OPTIONS,
  FINANCING_OPTIONS_OPTIONS,
  GP_LP_OPTIONS,
  PARK_TYPE_OPTIONS,
  REI_EXPERIENCE_OPTIONS,
  VALUABLE_SKILLS_OPTIONS,
  INVESTOR_TYPE_OPTIONS,
  FINANCING_RESOURCES_OPTIONS,
  PADS_DESIRED_BUCKETS,
  RVP_CLOSED_BUCKETS,
  TWELVE_MONTH_GOAL_BUCKETS,
  US_STATES,
} from "@/lib/options";
import type { SelectOption } from "@/components/form-field";
import type { Contact } from "@/db/schema";
import type { FormState } from "./actions";

const initialState: FormState = { ok: false };

export function ContactForm({
  action,
  contact,
  ownerOptions,
  cancelHref,
  submitLabel = "Save buyer",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  contact?: Contact | null;
  ownerOptions: SelectOption[];
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  function getError(field: string) {
    return state.errors?.[field]?.[0];
  }

  return (
    <form action={formAction} className="pb-20">
      {state.message && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <Section title="Identity" description="Name, email, phone, social profiles.">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="First name" name="firstName" defaultValue={contact?.firstName} error={getError("firstName")} />
          <TextField label="Last name" name="lastName" defaultValue={contact?.lastName} error={getError("lastName")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Email" name="email" type="email" defaultValue={contact?.email} error={getError("email")} />
          <TextField label="Phone" name="phone" type="tel" defaultValue={contact?.phone} error={getError("phone")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="SMS number" name="smsNumber" type="tel" defaultValue={contact?.smsNumber} hint="if different from phone" />
          <TextField label="Office phone" name="officePhone" type="tel" defaultValue={contact?.officePhone} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Title" name="title" defaultValue={contact?.title} />
          <TextField label="Birthday" name="birthday" type="date" defaultValue={contact?.birthday} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Website" name="website" type="url" defaultValue={contact?.website} placeholder="https://" />
          <TextField label="LinkedIn" name="linkedinLink" type="url" defaultValue={contact?.linkedinLink} placeholder="https://" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Facebook" name="facebookLink" defaultValue={contact?.facebookLink} />
          <TextField label="Instagram" name="instagramLink" defaultValue={contact?.instagramLink} />
        </div>
      </Section>

      <Section title="Address">
        <TextField label="Street" name="address" defaultValue={contact?.address} />
        <TextField label="Street 2" name="address2" defaultValue={contact?.address2} />
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="City" name="city" defaultValue={contact?.city} />
          <SelectField label="State" name="state" options={US_STATES} defaultValue={contact?.state} />
          <TextField label="ZIP" name="zip" defaultValue={contact?.zip} />
        </div>
        <TextField label="Country" name="country" defaultValue={contact?.country} placeholder="USA" />
      </Section>

      <Section title="Status & qualification" description="Where this buyer is in your tiered book.">
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Status" name="status" options={BUYER_STATUS_OPTIONS} defaultValue={contact?.status} />
          <SelectField label="Qualification tier" name="qualificationTier" options={QUALIFICATION_TIER_OPTIONS} defaultValue={contact?.qualificationTier} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Buyer number" name="buyerNumber" type="number" defaultValue={contact?.buyerNumber ?? ""} hint="unique" />
          <SelectField label="Lead source" name="buyerLeadSource" options={BUYER_LEAD_SOURCE_OPTIONS} defaultValue={contact?.buyerLeadSource} />
        </div>
        <CheckboxField label="Top-tier buyer" name="topTier" defaultChecked={contact?.topTier} />
      </Section>

      <Section title="Buy box" description="What this buyer is actively looking for. Drives the matching engine.">
        <MultiSelectField label="Park type preferences" name="parkTypePreferences" options={PARK_TYPE_OPTIONS} defaultValue={contact?.parkTypePreferences} />
        <MultiSelectField label="Target states" name="targetStates" options={US_STATES} defaultValue={contact?.targetStates} />
        <CheckboxField label="Strict on states (won't go outside list)" name="strictStates" defaultChecked={contact?.strictStates} />
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Pads desired" name="amountOfPadsDesiredBucket" options={PADS_DESIRED_BUCKETS} defaultValue={contact?.amountOfPadsDesiredBucket} />
          <TextField label="Pads desired (min, exact)" name="padsDesiredMin" type="number" defaultValue={contact?.padsDesiredMin ?? ""} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Max deal size" name="maxDealSize" options={MAX_DEAL_SIZE_OPTIONS} defaultValue={contact?.maxDealSize} />
          <TextField label="Minimum NOI (USD)" name="minNoiUsd" type="number" defaultValue={contact?.minNoiUsd ?? ""} placeholder="0" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <CheckboxField label="OK with parks that have a restaurant" name="parkWithRestaurant" defaultChecked={contact?.parkWithRestaurant ?? false} />
          <CheckboxField label="Open to parks on leased land" name="openToLeasedLand" defaultChecked={contact?.openToLeasedLand ?? false} hint="required at intake" />
        </div>
      </Section>

      <Section title="Capital & financing">
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Deployable cash" name="deployableCash" options={DEPLOYABLE_CASH_OPTIONS} defaultValue={contact?.deployableCash} />
          <TextField label="POF amount (USD)" name="pofAmount" type="number" defaultValue={contact?.pofAmount ?? ""} placeholder="0" />
        </div>
        <CheckboxField label="Can produce proof of funds" name="canProducePof" defaultChecked={contact?.canProducePof ?? false} />
        <div className="grid sm:grid-cols-2 gap-3">
          <CheckboxField label="Will use 1031 exchange" name="willUse1031" defaultChecked={contact?.willUse1031 ?? false} />
          <SelectField label="1031 amount" name="using1031Amount" options={EXCHANGE_1031_OPTIONS} defaultValue={contact?.using1031Amount} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Financing requirement" name="financingOptions" options={FINANCING_OPTIONS_OPTIONS} defaultValue={contact?.financingOptions} />
          <SelectField label="Fastest turnaround" name="fastestTurnaround" options={FASTEST_TURNAROUND_OPTIONS} defaultValue={contact?.fastestTurnaround} />
        </div>
        <MultiSelectField label="Current financing resources" name="currentFinancingResources" options={FINANCING_RESOURCES_OPTIONS} defaultValue={contact?.currentFinancingResources} />
        <MultiSelectField label="Investor type" name="investorType" options={INVESTOR_TYPE_OPTIONS} defaultValue={contact?.investorType} />
        <SelectField label="GP / LP preference" name="gpLp" options={GP_LP_OPTIONS} defaultValue={contact?.gpLp} />
      </Section>

      <Section title="Experience & background">
        <MultiSelectField label="RE experience outside RVP" name="reiExperienceOutsideRvp" options={REI_EXPERIENCE_OPTIONS} defaultValue={contact?.reiExperienceOutsideRvp} />
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="RVPs closed in the past" name="rvpClosedInPastBucket" options={RVP_CLOSED_BUCKETS} defaultValue={contact?.rvpClosedInPastBucket} />
          <SelectField label="12-month acquisition goals" name="twelveMonthGoalsBucket" options={TWELVE_MONTH_GOAL_BUCKETS} defaultValue={contact?.twelveMonthGoalsBucket} />
        </div>
        <MultiSelectField label="Valuable skills / background" name="buyersValuableSkills" options={VALUABLE_SKILLS_OPTIONS} defaultValue={contact?.buyersValuableSkills} />
        <TextAreaField label="Describe skill / trade experience" name="describeSkillExperience" defaultValue={contact?.describeSkillExperience} />
      </Section>

      <Section title="Compliance & marketing prefs">
        <CheckboxField label="Signed NCNDA" name="signedNcnda" defaultChecked={contact?.signedNcnda ?? false} />
        <CheckboxField label="SMS permission granted" name="smsPermission" defaultChecked={contact?.smsPermission ?? false} />
        <CheckboxField label="Opted out of bulk SMS" name="bulkSmsOptedOut" defaultChecked={contact?.bulkSmsOptedOut ?? false} />
      </Section>

      <Section title="Community (Pace Morby ecosystem)">
        <div className="grid sm:grid-cols-2 gap-3">
          <CheckboxField label="Subto member" name="subtoMember" defaultChecked={contact?.subtoMember ?? false} />
          <TextField label="Subto member since" name="subtoMemberSince" defaultValue={contact?.subtoMemberSince} placeholder="2023" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <CheckboxField label="Gator member" name="gatorMember" defaultChecked={contact?.gatorMember ?? false} />
          <CheckboxField label="Top Tier" name="topTierMember" defaultChecked={contact?.topTierMember ?? false} />
          <CheckboxField label="Owners Club" name="ownersClubMember" defaultChecked={contact?.ownersClubMember ?? false} />
        </div>
      </Section>

      <Section title="Intake details">
        <TextField label="Name of LLC" name="nameOfLlc" defaultValue={contact?.nameOfLlc} />
        <TextAreaField label="Additional comments" name="buyersAdditionalComments" defaultValue={contact?.buyersAdditionalComments} rows={3} />
        <TextField label="Minimum return required" name="minReturnRequired" defaultValue={contact?.minReturnRequired} placeholder="e.g. 10% cash-on-cash" />
      </Section>

      <Section title="Internal notes" description="Visible to the team only. Never shared with the buyer.">
        <TextAreaField label="Notes — contact" name="internalNotesBuyerContact" defaultValue={contact?.internalNotesBuyerContact} rows={2} />
        <TextAreaField label="Notes — buy-box criteria" name="internalNotesBuyerCriteria" defaultValue={contact?.internalNotesBuyerCriteria} rows={2} />
        <TextAreaField label="Notes — qualification / credibility" name="internalNotesQualifyCredibility" defaultValue={contact?.internalNotesQualifyCredibility} rows={2} />
      </Section>

      <Section title="Ownership" description="Who on the team owns this record?">
        <SelectField
          label="Owner"
          name="ownerId"
          options={ownerOptions}
          defaultValue={contact?.ownerId}
          hint="defaults to you on create"
        />
      </Section>

      <div className="sticky bottom-0 -mx-8 mt-8 border-t border-border bg-background/95 backdrop-blur px-8 py-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
