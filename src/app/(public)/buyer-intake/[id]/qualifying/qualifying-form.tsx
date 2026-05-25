"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import {
  DEPLOYABLE_CASH_OPTIONS,
  EXCHANGE_1031_OPTIONS,
  FINANCING_OPTIONS_OPTIONS,
  FINANCING_RESOURCES_OPTIONS,
  REI_EXPERIENCE_OPTIONS,
  RVP_CLOSED_BUCKETS,
} from "@/lib/options";
import { submitIntakeStep3Action, type IntakeFormState } from "../../actions";

const initialState: IntakeFormState = { ok: false };

const inputClass =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Label({ label }: { label: string }) {
  return <span className="text-sm font-medium text-foreground">{label}</span>;
}

function CheckGrid({ name, options }: { name: string; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="grid sm:grid-cols-2 gap-x-3 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              className="size-4 rounded border-border text-primary focus:ring-1 focus:ring-primary"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function QualifyingForm({ id }: { id: string }) {
  const action = submitIntakeStep3Action.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <label className="block space-y-1.5">
        <Label label="How much deployable cash do you have for an acquisition?" />
        <select name="deployableCash" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {DEPLOYABLE_CASH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Are you using a 1031 exchange?</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="willUse1031" value="yes" /> Yes</label>
          <label className="flex items-center gap-2"><input type="radio" name="willUse1031" value="no" defaultChecked /> No</label>
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <Label label="If yes — roughly how much?" />
        <select name="using1031Amount" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {EXCHANGE_1031_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <Label label="Financing requirement" />
        <select name="financingOptions" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {FINANCING_OPTIONS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="space-y-1.5">
        <Label label="Financing resources you already have access to" />
        <CheckGrid name="currentFinancingResources" options={FINANCING_RESOURCES_OPTIONS} />
      </div>

      <div className="space-y-1.5">
        <Label label="Your real-estate experience outside RV parks" />
        <CheckGrid name="reiExperienceOutsideRvp" options={REI_EXPERIENCE_OPTIONS} />
      </div>

      <label className="block space-y-1.5">
        <Label label="How many RV parks have you closed in the past?" />
        <select name="rvpClosedInPastBucket" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {RVP_CLOSED_BUCKETS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <Label label="Tell us about your background" />
        <textarea
          name="describeSkillExperience"
          rows={3}
          placeholder="What do you bring — capital, operations, hospitality, RE network, contractor skills?"
          className={`${inputClass} resize-y`}
        />
      </label>

      <label className="block space-y-1.5">
        <Label label="Anything else we should know?" />
        <textarea
          name="buyersAdditionalComments"
          rows={2}
          placeholder="Optional"
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="pt-2">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto px-6 py-3 text-base">
          {isPending ? "Saving…" : "Finish — join the private buyer list →"}
        </Button>
      </div>
    </form>
  );
}
