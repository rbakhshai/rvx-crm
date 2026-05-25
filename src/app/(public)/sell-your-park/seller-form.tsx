"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { submitSellerIntakeAction, type IntakeFormState } from "./actions";

const initialState: IntakeFormState = { ok: false };

const inputClass =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-base placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
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

export function SellerIntakeForm() {
  const [state, formAction, isPending] = useActionState(submitSellerIntakeAction, initialState);
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
          <FieldLabel label="First name" required />
          <input name="firstName" type="text" autoComplete="given-name" required className={inputClass} />
          <FieldError error={err("firstName")} />
        </label>
        <label className="block space-y-1.5">
          <FieldLabel label="Last name" required />
          <input name="lastName" type="text" autoComplete="family-name" required className={inputClass} />
          <FieldError error={err("lastName")} />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <FieldLabel label="Email" required />
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
          <FieldError error={err("email")} />
        </label>
        <label className="block space-y-1.5">
          <FieldLabel label="Phone" required />
          <input name="phone" type="tel" autoComplete="tel" required className={inputClass} />
          <FieldError error={err("phone")} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <FieldLabel label="Park address" required />
        <input
          name="parkAddress"
          type="text"
          autoComplete="street-address"
          required
          placeholder="e.g. 1234 Lake Rd, Asheville, NC 28801"
          className={inputClass}
        />
        <FieldError error={err("parkAddress")} />
      </label>

      <label className="block space-y-1.5">
        <FieldLabel label="Asking price" />
        <input
          name="askingPrice"
          type="text"
          inputMode="numeric"
          placeholder="$ (or leave blank — say 'open to offers' below)"
          className={inputClass}
        />
        <FieldError error={err("askingPrice")} />
      </label>

      <label className="block space-y-1.5">
        <FieldLabel label="Tell us about your park" />
        <textarea
          name="tellUsMore"
          rows={4}
          placeholder="Anything we should know — number of pads, timeline, why you're selling, what's most important to you in a buyer."
          className={`${inputClass} resize-y`}
        />
        <FieldError error={err("tellUsMore")} />
      </label>

      <div className="pt-2">
        <Button type="submit" variant="gold" size="md" disabled={isPending} className="w-full sm:w-auto px-6 py-3 text-base">
          {isPending ? "Sending…" : "Tell us about your park →"}
        </Button>
        <p className="mt-3 text-xs text-muted">
          By submitting you agree we may contact you about your park. We will not share your information.
        </p>
      </div>
    </form>
  );
}
