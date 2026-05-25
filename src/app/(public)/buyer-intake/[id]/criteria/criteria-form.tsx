"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import {
  PARK_TYPE_OPTIONS,
  PADS_DESIRED_BUCKETS,
  MAX_DEAL_SIZE_OPTIONS,
  US_STATES,
} from "@/lib/options";
import { submitIntakeStep2Action, type IntakeFormState } from "../../actions";

const initialState: IntakeFormState = { ok: false };

const inputClass =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Label({ label }: { label: string }) {
  return <span className="text-sm font-medium text-foreground">{label}</span>;
}

function CheckGrid({ name, options }: { name: string; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="rounded-md border border-border bg-background p-3 max-h-56 overflow-y-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              className="size-4 rounded border-border text-primary focus:ring-1 focus:ring-primary"
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CriteriaForm({ id }: { id: string }) {
  const action = submitIntakeStep2Action.bind(null, id);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label label="Which states are you targeting? (pick any)" />
        <CheckGrid name="targetStates" options={US_STATES} />
      </div>

      <div className="space-y-1.5">
        <Label label="Park types you'd consider" />
        <CheckGrid name="parkTypePreferences" options={PARK_TYPE_OPTIONS} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <Label label="Pads desired" />
          <select name="amountOfPadsDesiredBucket" className={inputClass} defaultValue="">
            <option value="">— select —</option>
            {PADS_DESIRED_BUCKETS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <Label label="Max deal size" />
          <select name="maxDealSize" className={inputClass} defaultValue="">
            <option value="">— select —</option>
            {MAX_DEAL_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Open to parks on leased land?</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="openToLeasedLand" value="yes" />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="openToLeasedLand" value="no" defaultChecked />
            No
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">OK with parks that have a restaurant?</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="parkWithRestaurant" value="yes" />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="parkWithRestaurant" value="no" />
            No
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="parkWithRestaurant" value="" defaultChecked />
            Doesn&apos;t matter
          </label>
        </div>
      </fieldset>

      <div className="pt-2">
        <Button type="submit" variant="gold" disabled={isPending} className="w-full sm:w-auto px-6 py-3 text-base">
          {isPending ? "Saving…" : "Continue to qualifying →"}
        </Button>
      </div>
    </form>
  );
}
