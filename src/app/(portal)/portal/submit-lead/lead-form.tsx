"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { US_STATES } from "@/lib/us-states";
import { submitLeadAction, type SubmitLeadState } from "./actions";

const initialState: SubmitLeadState = { ok: true };

export function LeadForm({
  defaults,
}: {
  defaults: {
    repFirstName: string;
    repLastName: string;
    repPhone: string;
    repEmail: string;
  };
}) {
  const [state, formAction, isPending] = useActionState(submitLeadAction, initialState);
  const e = (key: string) => state.errors?.[key]?.[0];

  return (
    <form action={formAction} className="space-y-8">
      {/* Lead Details */}
      <Fieldset title="Lead details" description="Where is this park?">
        <Field label="Full RV Park name" name="parkName" required error={e("parkName")} />
        <Field label="Full RV Park address" name="parkAddress" required error={e("parkAddress")} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="City" name="parkCity" required error={e("parkCity")} />
          <SelectField label="State" name="parkState" required error={e("parkState")}>
            <option value="">Select…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </SelectField>
        </div>
      </Fieldset>

      {/* Seller Details */}
      <Fieldset title="Seller details" description="Who can we talk to?">
        <SelectField label="Seller profile" name="sellerProfile" required error={e("sellerProfile")}>
          <option value="">Select…</option>
          <option value="owner">Owner</option>
          <option value="realtor">Realtor (avoid)</option>
          <option value="owner_realtor">Owner who is also a realtor</option>
        </SelectField>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First name (seller or realtor)" name="sellerFirstName" required error={e("sellerFirstName")} />
          <Field label="Last name (seller or realtor)" name="sellerLastName" required error={e("sellerLastName")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Seller phone" name="sellerPhone" type="tel" required error={e("sellerPhone")} />
          <Field label="Seller email" name="sellerEmail" type="email" required error={e("sellerEmail")} />
        </div>
      </Fieldset>

      {/* Property Details */}
      <Fieldset title="Property details" description="The numbers. Estimates are fine if exact figures aren't shared yet.">
        <Field
          label="Besides RV sites, do you offer any other types of camping or rentals?"
          name="otherCampingTypes"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="# of RV pads" name="padsCount" type="number" required error={e("padsCount")} />
          <Field label="# of cabins (if applicable)" name="cabinsCount" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="# of tent sites" name="tentSitesCount" />
          <Field label="# of hotel/motel suites" name="hotelMotelCount" />
          <Field label="# of total units combined" name="totalUnits" type="number" />
        </div>
        <Field
          label="How many acres? Allowed to expand? Permits?"
          name="acresCount"
          required
          error={e("acresCount")}
        />
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="NOI ($)" name="listNoi" required error={e("listNoi")} hint="Net operating income." />
          <Field label="Cap rate (%)" name="listCapRate" required error={e("listCapRate")} />
          <Field label="Asking price ($)" name="listPrice" required error={e("listPrice")} />
        </div>
        <Field label="Property website" name="propertyWebsite" type="url" hint="e.g. https://..." />
        <TextareaField
          label="Anything specific or important to the seller when considering selling?"
          name="importantSellerTerms"
          rows={3}
        />
      </Fieldset>

      {/* Spatial */}
      <Fieldset
        title="Spatial map"
        description="Optional but helps us underwrite faster. (The Google Map view is auto-generated from the address you entered above.)"
      >
        <Field
          label="Spatial picture w/ major city — paste image URL"
          name="spatialPictureUrl"
          type="url"
          hint="Drop the image into Google Drive / Dropbox and paste the share link."
        />
      </Fieldset>

      {/* Attachments */}
      <Fieldset
        title="Attachments"
        description="Paste shareable links (Google Drive, Dropbox, iCloud). File uploads coming soon."
      >
        <Field label="Profit & Loss statements (URL)" name="pAndLUrl" type="url" />
        <Field label="T-12 (URL)" name="t12Url" type="url" />
        <Field label="Additional file 1 (URL)" name="additionalFile1Url" type="url" />
        <Field label="Additional file 2 (URL)" name="additionalFile2Url" type="url" />
        <Field label="Additional file 3 (URL)" name="additionalFile3Url" type="url" />
        <Field
          label="Any Dropbox / Google Drive folder URL"
          name="sharedDriveUrl"
          type="url"
          hint="If you have a folder with everything in it, just drop the link here."
        />
      </Fieldset>

      {/* Bird-dog info */}
      <Fieldset title="Your info" description="Pre-filled from your profile — edit if needed.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your first name" name="repFirstName" defaultValue={defaults.repFirstName} required error={e("repFirstName")} />
          <Field label="Your last name" name="repLastName" defaultValue={defaults.repLastName} required error={e("repLastName")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your phone" name="repPhone" type="tel" defaultValue={defaults.repPhone} required error={e("repPhone")} />
          <Field label="Your email" name="repEmail" type="email" defaultValue={defaults.repEmail} required error={e("repEmail")} />
        </div>
        <TextareaField
          label="What makes this park special?"
          name="whatMakesThisSpecial"
          rows={3}
          required
          error={e("whatMakesThisSpecial")}
          hint="Why is this a good deal for us? Why is the seller motivated?"
        />
        <TextareaField
          label="Additional notes for our team"
          name="birdDogAdditionalNotes"
          rows={2}
        />
      </Fieldset>

      {/* Confirm + submit */}
      <div className="rounded-lg border border-border bg-foreground/[0.02] p-4 space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="permissionConfirmed" required className="mt-0.5 size-4" />
          <span>
            I confirm I have permission from the seller (or realtor) to submit this lead for evaluation, and the
            information above is accurate to the best of my knowledge.
          </span>
        </label>
        {e("permissionConfirmed") && <p className="text-sm text-red-600">{e("permissionConfirmed")}</p>}
        {state.message && !state.ok && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.message}
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="gold" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit lead →"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  hint,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={
          "mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm " +
          (error ? "border-red-400" : "border-border")
        }
      />
      {hint && !error && <span className="text-[11px] text-muted mt-1 block">{hint}</span>}
      {error && <span className="text-[11px] text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className={
          "mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm " +
          (error ? "border-red-400" : "border-border")
        }
      >
        {children}
      </select>
      {error && <span className="text-[11px] text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function TextareaField({
  label,
  name,
  rows = 3,
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        className={
          "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-y " +
          (error ? "border-red-400" : "border-border")
        }
      />
      {hint && !error && <span className="text-[11px] text-muted mt-1 block">{hint}</span>}
      {error && <span className="text-[11px] text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}
