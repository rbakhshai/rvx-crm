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
  type SelectOption,
} from "@/components/form-field";
import {
  DEAL_PRIORITY_OPTIONS,
  PARK_TYPE_DEAL_OPTIONS,
  DISPO_STAGE_OPTIONS,
  CALL_DISPOSITION_OPTIONS,
  DEAL_LEAD_SOURCE_OPTIONS,
  WEEKLY_OFFER_REVIEW_OPTIONS,
  ESCROW_FEE_OPTIONS,
  TRANSFER_TAX_OPTIONS,
  TITLE_POLICY_OPTIONS,
  AMENITIES_OPTIONS,
  US_STATES,
} from "@/lib/options";
import type { Deal, DealStatus } from "@/db/schema";
import type { FormState } from "./actions";

const initialState: FormState = { ok: false };

export function DealForm({
  action,
  deal,
  statuses,
  contactOptions,
  companyOptions,
  birdDogOptions,
  ownerOptions,
  cancelHref,
  submitLabel = "Save deal",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  deal?: Deal | null;
  statuses: DealStatus[];
  contactOptions: SelectOption[];
  companyOptions: SelectOption[];
  birdDogOptions: SelectOption[];
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

      <Section title="Identity & workflow">
        <TextField label="Deal name" name="name" defaultValue={deal?.name} placeholder="e.g. AURORA – CO 6C3C045" />
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Pipeline status" name="statusCode" options={statusOptions} defaultValue={deal?.statusCode} />
          <SelectField label="Priority" name="dealPriority" options={DEAL_PRIORITY_OPTIONS} defaultValue={deal?.dealPriority} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Dispo stage" name="dispoStage" options={DISPO_STAGE_OPTIONS} defaultValue={deal?.dispoStage} />
          <SelectField label="Call disposition" name="callDisposition" options={CALL_DISPOSITION_OPTIONS} defaultValue={deal?.callDisposition} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Lead source" name="leadSource" options={DEAL_LEAD_SOURCE_OPTIONS} defaultValue={deal?.leadSource} />
          <SelectField label="Weekly offer review" name="weeklyOfferReview" options={WEEKLY_OFFER_REVIEW_OPTIONS} defaultValue={deal?.weeklyOfferReview} />
        </div>
        <CheckboxField label="Ready for review" name="readyForReview" defaultChecked={deal?.readyForReview} />
      </Section>

      <Section title="Park details">
        <TextField label="Park address" name="parkAddress" defaultValue={deal?.parkAddress} />
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="City" name="parkCity" defaultValue={deal?.parkCity} />
          <SelectField label="State" name="parkState" options={US_STATES} defaultValue={deal?.parkState} />
          <SelectField label="Park type" name="parkType" options={PARK_TYPE_DEAL_OPTIONS} defaultValue={deal?.parkType} />
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <TextField label="Pads" name="padsCount" type="number" defaultValue={deal?.padsCount ?? ""} />
          <TextField label="Cabins" name="cabinsCount" defaultValue={deal?.cabinsCount} />
          <TextField label="Tent sites" name="tentSitesCount" defaultValue={deal?.tentSitesCount} />
          <TextField label="Hotel/motel" name="hotelMotelCount" defaultValue={deal?.hotelMotelCount} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Total units" name="totalUnits" type="number" defaultValue={deal?.totalUnits ?? ""} />
          <TextField label="Acres" name="acresCount" defaultValue={deal?.acresCount} />
          <TextField label="Full-hookup pads" name="fullHookupPads" defaultValue={deal?.fullHookupPads} />
        </div>
        <TextField label="Occupancy %" name="occupancyPct" type="number" defaultValue={deal?.occupancyPct ?? ""} hint="0-100" />
        <CheckboxField label="Has restaurant" name="hasRestaurant" defaultChecked={deal?.hasRestaurant} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Water system type" name="waterSystemType" defaultValue={deal?.waterSystemType} hint="(city, well)" />
          <TextField label="Septic system type" name="septicSystemType" defaultValue={deal?.septicSystemType} hint="(septic, city)" />
        </div>
        <TextAreaField label="Electrical (30 amp / 50 amp)" name="electricalDetail" defaultValue={deal?.electricalDetail} rows={2} />
        <MultiSelectField label="Amenities" name="amenities" options={AMENITIES_OPTIONS} defaultValue={deal?.amenities} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Listing link" name="listingLink" type="url" defaultValue={deal?.listingLink} />
          <TextField label="Property website" name="propertyWebsite" type="url" defaultValue={deal?.propertyWebsite} />
        </div>
        <TextField label="Google Map URL" name="googleMapUrl" type="url" defaultValue={deal?.googleMapUrl} />
        <TextAreaField label="What makes this special?" name="whatMakesThisSpecial" defaultValue={deal?.whatMakesThisSpecial} rows={2} />
        <TextAreaField label="Motivation to sell" name="motivationToSell" defaultValue={deal?.motivationToSell} rows={2} />
      </Section>

      <Section title="Financials — listed">
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="List price" name="listPrice" type="number" defaultValue={deal?.listPrice ?? ""} placeholder="$" />
          <TextField label="List NOI" name="listNoi" type="number" defaultValue={deal?.listNoi ?? ""} placeholder="$" />
          <TextField label="List cap rate" name="listCapRate" defaultValue={deal?.listCapRate} placeholder="8.5%" />
        </div>
        <CheckboxField label="Open to creative financing" name="openToCreative" defaultChecked={deal?.openToCreative} />
      </Section>

      <Section title="Financials — agreed">
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Agreed purchase price" name="agreedPurchasePrice" type="number" defaultValue={deal?.agreedPurchasePrice ?? ""} placeholder="$" />
          <TextField label="Agreed cap rate" name="agreedCapRate" defaultValue={deal?.agreedCapRate} placeholder="9%" />
          <TextField label="Cash offer" name="cashOffer" type="number" defaultValue={deal?.cashOffer ?? ""} placeholder="$" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Seller-finance down payment" name="sellerFinanceDownPayment" type="number" defaultValue={deal?.sellerFinanceDownPayment ?? ""} />
          <TextField label="Seller-finance amount" name="sellerFinanceAmount" type="number" defaultValue={deal?.sellerFinanceAmount ?? ""} />
          <TextField label="Seller-finance interest" name="sellerFinanceInterestRate" defaultValue={deal?.sellerFinanceInterestRate} placeholder="5%" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Hybrid purchase price" name="hybridPurchasePrice" type="number" defaultValue={deal?.hybridPurchasePrice ?? ""} />
          <TextField label="Hybrid down payment" name="hybridDownPayment" type="number" defaultValue={deal?.hybridDownPayment ?? ""} />
          <TextField label="Hybrid interest rate" name="hybridInterestRate" type="number" defaultValue={deal?.hybridInterestRate ?? ""} placeholder="6.5" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Hybrid amort (yrs)" name="hybridAmortYears" type="number" defaultValue={deal?.hybridAmortYears ?? ""} />
          <TextField label="Bank interest" name="bankInterestRate" defaultValue={deal?.bankInterestRate} />
          <TextField label="Equity contribution" name="equityContribution" type="number" defaultValue={deal?.equityContribution ?? ""} />
        </div>
      </Section>

      <Section title="Dates & timeline">
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="EMD due date" name="emdDueDate" type="date" defaultValue={deal?.emdDueDate} />
          <TextField label="EMD amount" name="emdAmount" type="number" defaultValue={deal?.emdAmount ?? ""} />
          <TextField label="EMD deposited" name="emdDeposited" type="date" defaultValue={deal?.emdDeposited} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <TextField label="Escrow opened" name="escrowOpened" type="date" defaultValue={deal?.escrowOpened} />
          <TextField label="Inspection period end" name="inspectionPeriodEnd" type="date" defaultValue={deal?.inspectionPeriodEnd} />
          <TextField label="PSA COE date" name="psaCoeDate" type="date" defaultValue={deal?.psaCoeDate} />
        </div>
      </Section>

      <Section title="Closing fees">
        <div className="grid sm:grid-cols-3 gap-3">
          <SelectField label="Escrow fee" name="escrowFeeResponsibility" options={ESCROW_FEE_OPTIONS} defaultValue={deal?.escrowFeeResponsibility} />
          <SelectField label="Transfer tax" name="transferTaxResponsibility" options={TRANSFER_TAX_OPTIONS} defaultValue={deal?.transferTaxResponsibility} />
          <SelectField label="Title policy" name="titlePolicyResponsibility" options={TITLE_POLICY_OPTIONS} defaultValue={deal?.titlePolicyResponsibility} />
        </div>
      </Section>

      <Section title="Bird dog attribution" description="Who sourced this deal?">
        <SelectField
          label="Bird dog"
          name="birdDogId"
          options={birdDogOptions}
          defaultValue={deal?.birdDogId}
          hint="pick from your team, or fill the fields below for an external lead"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Bird dog first name" name="birdDogFirstName" defaultValue={deal?.birdDogFirstName} />
          <TextField label="Bird dog last name" name="birdDogLastName" defaultValue={deal?.birdDogLastName} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Bird dog phone" name="birdDogPhone" type="tel" defaultValue={deal?.birdDogPhone} />
          <TextField label="Bird dog email" name="birdDogEmail" type="email" defaultValue={deal?.birdDogEmail} error={err("birdDogEmail")} />
        </div>
        <TextAreaField label="Notes from bird dog" name="birdDogAdditionalNotes" defaultValue={deal?.birdDogAdditionalNotes} rows={2} />
      </Section>

      <Section title="Relations">
        <SelectField label="Seller / realtor (company)" name="sellerCompanyId" options={companyOptions} defaultValue={deal?.sellerCompanyId} />
        <SelectField label="Confirmed buyer" name="confirmedBuyerId" options={contactOptions} defaultValue={deal?.confirmedBuyerId} />
        <SelectField label="Secondary buyer" name="secondaryBuyerId" options={contactOptions} defaultValue={deal?.secondaryBuyerId} />
      </Section>

      <Section title="Documents (URLs)">
        <TextField label="Marketing package" name="marketingPackageUrl" type="url" defaultValue={deal?.marketingPackageUrl} />
        <TextField label="P&L" name="pAndLUrl" type="url" defaultValue={deal?.pAndLUrl} />
        <TextField label="Appraisal" name="appraisalUrl" type="url" defaultValue={deal?.appraisalUrl} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="RVX one-pager" name="rvxOnePagerUrl" type="url" defaultValue={deal?.rvxOnePagerUrl} />
          <TextField label="RVX five-pager" name="rvxFivePagerUrl" type="url" defaultValue={deal?.rvxFivePagerUrl} />
        </div>
        <TextField label="Data room URL" name="dataRoomUrl" type="url" defaultValue={deal?.dataRoomUrl} />
      </Section>

      <Section title="Internal notes" description="Team-only.">
        <TextAreaField label="Acquisition manager notes" name="acquisitionManagerNotes" defaultValue={deal?.acquisitionManagerNotes} rows={2} />
        <TextAreaField label="Offer delivery notes" name="offerDeliveryInternalNotes" defaultValue={deal?.offerDeliveryInternalNotes} rows={2} />
        <TextAreaField label="Closer final notes" name="closerFinalNotes" defaultValue={deal?.closerFinalNotes} rows={2} />
      </Section>

      <Section title="Ownership">
        <div className="grid sm:grid-cols-2 gap-3">
          <SelectField label="Owner" name="ownerId" options={ownerOptions} defaultValue={deal?.ownerId} hint="defaults to you on create" />
          <SelectField label="Ops owner" name="opsOwnerId" options={ownerOptions} defaultValue={deal?.opsOwnerId} hint="who runs the deal day-to-day" />
        </div>
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
