"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { submitIntakeStep1Action, type IntakeFormState } from "./actions";
import { FASTEST_TURNAROUND_OPTIONS, TWELVE_MONTH_GOAL_BUCKETS } from "@/lib/options";

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

export function Step1Form() {
  const [state, formAction, isPending] = useActionState(submitIntakeStep1Action, initialState);
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

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
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <Label label="Email" required />
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
          <FieldError error={err("email")} />
        </label>
        <label className="block space-y-1.5">
          <Label label="Phone" required />
          <input name="phone" type="tel" autoComplete="tel" required className={inputClass} />
          <FieldError error={err("phone")} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <Label label="How fast are you looking to acquire?" />
        <select name="fastestTurnaround" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {FASTEST_TURNAROUND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <Label label="Acquisition goal — how many parks in the next 12 months?" />
        <select name="twelveMonthGoalsBucket" className={inputClass} defaultValue="">
          <option value="">— select —</option>
          {TWELVE_MONTH_GOAL_BUCKETS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="pt-2">
        <Button type="submit" variant="gold" disabled={isPending} className="w-full sm:w-auto px-6 py-3 text-base">
          {isPending ? "Saving…" : "Continue to buy box →"}
        </Button>
        <p className="mt-3 text-xs text-muted">Your information is confidential and never shared.</p>
      </div>
    </form>
  );
}
