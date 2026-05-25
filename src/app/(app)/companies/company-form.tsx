"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Section } from "@/components/section";
import { TextField, TextAreaField, SelectField, CheckboxField } from "@/components/form-field";
import {
  COMPANY_RELATIONSHIP_OPTIONS,
  COMPANY_REVENUE_OPTIONS,
  COMPANY_EMPLOYEE_OPTIONS,
  US_STATES,
} from "@/lib/options";
import type { Company } from "@/db/schema";
import type { FormState } from "./actions";

const initialState: FormState = { ok: false };

export function CompanyForm({
  action,
  company,
  cancelHref,
  submitLabel = "Save seller",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  company?: Company | null;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="pb-20">
      {state.message && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <Section title="Identity" description="Who is this — owner, realtor, or both?">
        <TextField label="Company / name on file" name="name" required defaultValue={company?.name} error={err("name")} />
        <SelectField
          label="Relationship to park"
          name="relationshipToPark"
          required
          options={COMPANY_RELATIONSHIP_OPTIONS}
          defaultValue={company?.relationshipToPark}
          error={err("relationshipToPark")}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Seller / broker first name" name="sellerFirstName" defaultValue={company?.sellerFirstName} />
          <TextField label="Seller / broker last name" name="sellerLastName" defaultValue={company?.sellerLastName} />
        </div>
      </Section>

      <Section title="Contact info">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Email" name="email" type="email" defaultValue={company?.email} error={err("email")} />
          <TextField label="Cell phone" name="phone" type="tel" defaultValue={company?.phone} />
        </div>
        <TextField label="Office phone" name="officePhone" type="tel" defaultValue={company?.officePhone} />
      </Section>

      <Section title="Address">
        <TextField label="Street" name="address" defaultValue={company?.address} />
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="City" name="city" defaultValue={company?.city} />
          <SelectField label="State" name="state" options={US_STATES} defaultValue={company?.state} />
          <TextField label="ZIP" name="zipcode" defaultValue={company?.zipcode} />
        </div>
      </Section>

      <Section title="Social">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Facebook page" name="facebookPage" defaultValue={company?.facebookPage} />
          <TextField label="Instagram" name="instagramName" defaultValue={company?.instagramName} />
        </div>
      </Section>

      <Section title="Optional metadata">
        <TextAreaField label="Description" name="description" defaultValue={company?.description} rows={3} />
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Annual revenue" name="annualRevenue" options={COMPANY_REVENUE_OPTIONS} defaultValue={company?.annualRevenue} />
          <SelectField label="Employee count" name="employeeCount" options={COMPANY_EMPLOYEE_OPTIONS} defaultValue={company?.employeeCount} />
        </div>
        <CheckboxField label="Opted out of bulk email" name="bulkEmailOptedOut" defaultChecked={company?.bulkEmailOptedOut ?? false} />
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
