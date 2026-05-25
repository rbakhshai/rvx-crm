"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { submitBirdDogApplicationAction, type IntakeFormState } from "./actions";

const initialState: IntakeFormState = { ok: false };

const inputClass =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-base placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </span>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pt-6 first:pt-0 border-t border-border first:border-t-0 -mx-1 px-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="text-xs text-muted mt-1">{description}</p>}
    </div>
  );
}

function CommunityRow({
  flagName,
  sinceName,
  label,
}: {
  flagName: string;
  sinceName: string;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm w-32">
        <input type="checkbox" name={flagName} className="size-4 rounded border-border text-primary focus:ring-1 focus:ring-primary" />
        {label}
      </label>
      <input
        type="text"
        name={sinceName}
        placeholder="since when? (e.g. 2023)"
        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted/60"
      />
    </div>
  );
}

export function ApplicationForm() {
  const [state, formAction, isPending] = useActionState(submitBirdDogApplicationAction, initialState);
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      {/* --- About you --- */}
      <SectionHeader title="About you" />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <Label label="First name" required />
          <input name="firstName" autoComplete="given-name" required className={inputClass} />
          <FieldError error={err("firstName")} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Last name" required />
          <input name="lastName" autoComplete="family-name" required className={inputClass} />
          <FieldError error={err("lastName")} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Email" required />
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
          <FieldError error={err("email")} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Cell phone" required />
          <input name="cellPhone" type="tel" autoComplete="tel" required className={inputClass} />
          <FieldError error={err("cellPhone")} />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <Label label="Facebook profile URL" />
          <input name="facebookUrl" type="url" placeholder="https://facebook.com/yourname" className={inputClass} />
        </label>
      </div>

      {/* --- RV lifestyle --- */}
      <SectionHeader title="RV lifestyle" description="Helps us route you to the right deals." />
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block space-y-1.5">
          <Label label="RV class" />
          <input name="rvClass" placeholder="A / B / C / fifth-wheel…" className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Your rig" />
          <input name="rvRig" placeholder="e.g. 2018 Tiffin Allegro" className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Currently traveling in an RV?" />
          <select name="yearsFullTimeTraveling" className={inputClass} defaultValue="">
            <option value="">— select —</option>
            <option value="yes_full_time">Yes — full-time</option>
            <option value="yes_part_time">Yes — part-time / seasonally</option>
            <option value="no_but_used_to">No — but I used to</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      {/* --- Community --- */}
      <SectionHeader title="Pace Morby community memberships" description="Subto, Gator, Top Tier, Owners Club, Zero Down — check any you're part of." />
      <div className="space-y-2.5">
        <CommunityRow flagName="subtoMember" sinceName="subtoSince" label="Subto" />
        <CommunityRow flagName="gatorMember" sinceName="gatorSince" label="Gator" />
        <CommunityRow flagName="topTierMember" sinceName="topTierSince" label="Top Tier" />
        <CommunityRow flagName="ownersClubMember" sinceName="ownersClubSince" label="Owners Club" />
        <CommunityRow flagName="zeroDownMember" sinceName="zeroDownSince" label="Zero Down" />
      </div>

      {/* --- Background --- */}
      <SectionHeader title="Background" description="So we know who we're working with." />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <Label label="What's your current W2 / job?" />
          <input name="currentW2" placeholder="e.g. Project manager at XYZ" className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <Label label="What did you do before that?" />
          <input name="priorW2" className={inputClass} />
        </label>
      </div>
      <label className="block space-y-1.5">
        <Label label="What are your W2 / income goals?" />
        <textarea name="w2Goals" rows={2} placeholder="What are you trying to build? Replace your W2? Add income on the side?" className={`${inputClass} resize-y`} />
      </label>
      <label className="block space-y-1.5">
        <Label label="Any hospitality or RV-park experience?" />
        <textarea name="hospitalityBackground" rows={2} className={`${inputClass} resize-y`} />
      </label>
      <label className="block space-y-1.5">
        <Label label="Any business operations background?" />
        <textarea name="businessOpsBackground" rows={2} className={`${inputClass} resize-y`} />
      </label>

      {/* --- Why you --- */}
      <SectionHeader title="Why you?" description="The honest pitch — what makes you a good fit." />
      <label className="block space-y-1.5">
        <Label label="Why do you want to join RVX as a bird dog?" />
        <textarea name="whyJoinRvx" rows={3} placeholder="What attracts you to this work?" className={`${inputClass} resize-y`} />
      </label>
      <label className="block space-y-1.5">
        <Label label="How did you hear about RVX?" />
        <textarea name="howHeardAboutRvx" rows={2} placeholder="A Subto event? Facebook group? Friend?" className={`${inputClass} resize-y`} />
      </label>
      <label className="block space-y-1.5">
        <Label label="What does your weekly execution look like?" />
        <textarea
          name="weeklyExecutionPlan"
          rows={3}
          placeholder="Hours you can put in, outreach days, follow-up habits, anything else."
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="pt-4 border-t border-border">
        <Button type="submit" variant="gold" disabled={isPending} className="w-full sm:w-auto px-6 py-3 text-base">
          {isPending ? "Sending…" : "Submit application →"}
        </Button>
        <p className="mt-3 text-xs text-muted">
          Our team personally reviews every application. You&apos;ll hear back within a few days if we have open positions that fit.
        </p>
      </div>
    </form>
  );
}
