import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealStatuses, contacts, companies, birdDogs, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { DeleteButton } from "@/components/delete-button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { MatchedBuyers } from "@/components/matched-buyers";
import { deleteDealAction } from "../actions";
import { Badge } from "@/components/badge";
import { Section } from "@/components/section";
import { GoogleMap } from "@/components/google-map";
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
} from "@/lib/options";

const priorityLabel = new Map(DEAL_PRIORITY_OPTIONS.map((o) => [o.value, o.label]));
const parkTypeLabel = new Map(PARK_TYPE_DEAL_OPTIONS.map((o) => [o.value, o.label]));
const dispoLabel = new Map(DISPO_STAGE_OPTIONS.map((o) => [o.value, o.label]));
const callDispoLabel = new Map(CALL_DISPOSITION_OPTIONS.map((o) => [o.value, o.label]));
const leadSourceLabel = new Map(DEAL_LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label]));
const reviewLabel = new Map(WEEKLY_OFFER_REVIEW_OPTIONS.map((o) => [o.value, o.label]));
const escrowFeeLabel = new Map(ESCROW_FEE_OPTIONS.map((o) => [o.value, o.label]));
const transferTaxLabel = new Map(TRANSFER_TAX_OPTIONS.map((o) => [o.value, o.label]));
const titlePolicyLabel = new Map(TITLE_POLICY_OPTIONS.map((o) => [o.value, o.label]));
const amenityLabel = new Map(AMENITIES_OPTIONS.map((o) => [o.value, o.label]));

const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-1 text-sm">
        {value === null || value === undefined || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

function money(v: string | null | undefined) {
  if (v == null || v === "") return undefined;
  return `$${Number(v).toLocaleString()}`;
}
function bool(v: boolean | null | undefined) {
  if (v == null) return undefined;
  return v ? <Badge tone="success">Yes</Badge> : <Badge tone="muted">No</Badge>;
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  const [statuses, [confirmedBuyer], [secondaryBuyer], [sellerCo], [bdRow]] = await Promise.all([
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    deal.confirmedBuyerId
      ? db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(eq(contacts.id, deal.confirmedBuyerId)).limit(1)
      : Promise.resolve([null]),
    deal.secondaryBuyerId
      ? db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(eq(contacts.id, deal.secondaryBuyerId)).limit(1)
      : Promise.resolve([null]),
    deal.sellerCompanyId
      ? db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.id, deal.sellerCompanyId)).limit(1)
      : Promise.resolve([null]),
    deal.birdDogId
      ? db.select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName }).from(birdDogs).where(eq(birdDogs.id, deal.birdDogId)).limit(1)
      : Promise.resolve([null]),
  ]);
  const statusLabel = new Map(statuses.map((s) => [s.code, s.label]));

  const session = await auth.api.getSession({ headers: await headers() });
  const ownerIds = [deal.ownerId, deal.opsOwnerId].filter((x): x is string => !!x);
  const ownerRows = ownerIds.length
    ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, ownerIds))
    : [];
  const ownerMap = new Map(ownerRows.map((u) => [u.id, u]));
  const owner = deal.ownerId ? ownerMap.get(deal.ownerId) : null;
  const opsOwner = deal.opsOwnerId ? ownerMap.get(deal.opsOwnerId) : null;
  const deleteBound = deleteDealAction.bind(null, id);

  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const subtitle = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");

  return (
    <PageShell
      title={title}
      subtitle={subtitle || "no location set"}
      action={
        <div className="flex gap-2 items-center">
          <Link href="/deals" className="text-sm text-muted hover:text-foreground self-center">
            ← Back
          </Link>
          <LinkButton href={`/deals/${deal.id}/dispo`} variant="gold" size="sm">
            Dispo to buyers →
          </LinkButton>
          <LinkButton href={`/deals/${deal.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
          <DeleteButton
            action={deleteBound}
            confirmText={`Delete deal "${title}"? This cannot be undone.`}
          />
        </div>
      }
    >
      <Section title="Workflow">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Stage" value={deal.statusCode ? statusLabel.get(deal.statusCode) ?? deal.statusCode : null} />
          <Field
            label="Priority"
            value={
              deal.dealPriority ? (
                <Badge tone={priorityTone[deal.dealPriority as keyof typeof priorityTone] ?? "default"}>
                  {priorityLabel.get(deal.dealPriority)}
                </Badge>
              ) : null
            }
          />
          <Field label="Dispo stage" value={deal.dispoStage ? dispoLabel.get(deal.dispoStage) : null} />
          <Field label="Call disposition" value={deal.callDisposition ? callDispoLabel.get(deal.callDisposition) : null} />
          <Field label="Lead source" value={deal.leadSource ? leadSourceLabel.get(deal.leadSource) : null} />
          <Field label="Weekly review" value={deal.weeklyOfferReview ? reviewLabel.get(deal.weeklyOfferReview) : null} />
          <Field label="Ready for review" value={bool(deal.readyForReview)} />
          <Field label="Closer last touch" value={deal.closerLastTouch?.toLocaleString()} />
          <Field label="Owner" value={owner ? `${owner.name} (${owner.email})` : null} />
          <Field label="Ops owner" value={opsOwner ? `${opsOwner.name} (${opsOwner.email})` : null} />
        </dl>
      </Section>

      <Section title="Park">
        {deal.parkAddress && (
          <div className="mb-4">
            <GoogleMap
              address={deal.parkAddress}
              city={deal.parkCity}
              state={deal.parkState}
              height={320}
            />
          </div>
        )}
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Address" value={deal.parkAddress} />
          <Field label="City / state" value={[deal.parkCity, deal.parkState].filter(Boolean).join(", ")} />
          <Field label="Park type" value={deal.parkType ? parkTypeLabel.get(deal.parkType) : null} />
          <Field label="Pads" value={deal.padsCount} />
          <Field label="Cabins" value={deal.cabinsCount} />
          <Field label="Tent sites" value={deal.tentSitesCount} />
          <Field label="Hotel/motel" value={deal.hotelMotelCount} />
          <Field label="Total units" value={deal.totalUnits} />
          <Field label="Acres" value={deal.acresCount} />
          <Field label="Occupancy %" value={deal.occupancyPct ? `${Number(deal.occupancyPct)}%` : null} />
          <Field label="Has restaurant" value={bool(deal.hasRestaurant)} />
          <Field label="Open to creative" value={bool(deal.openToCreative)} />
          <Field label="Water system" value={deal.waterSystemType} />
          <Field label="Septic system" value={deal.septicSystemType} />
        </dl>
        {deal.amenities && deal.amenities.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-widest text-muted font-medium">Amenities</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {deal.amenities.map((a) => (
                <Badge key={a}>{amenityLabel.get(a) ?? a}</Badge>
              ))}
            </div>
          </div>
        )}
        {deal.whatMakesThisSpecial && (
          <p className="mt-3 text-sm whitespace-pre-wrap"><span className="text-muted">What makes this special: </span>{deal.whatMakesThisSpecial}</p>
        )}
      </Section>

      <Section title="Financials">
        <dl className="grid sm:grid-cols-3 gap-4">
          <Field label="List price" value={money(deal.listPrice)} />
          <Field label="List NOI" value={money(deal.listNoi)} />
          <Field label="List cap rate" value={deal.listCapRate} />
          <Field label="Agreed price" value={money(deal.agreedPurchasePrice)} />
          <Field label="Agreed cap rate" value={deal.agreedCapRate} />
          <Field label="Cash offer" value={money(deal.cashOffer)} />
          <Field label="Hybrid price" value={money(deal.hybridPurchasePrice)} />
          <Field label="Hybrid DP" value={money(deal.hybridDownPayment)} />
          <Field label="Hybrid rate" value={deal.hybridInterestRate ? `${deal.hybridInterestRate}%` : null} />
        </dl>
      </Section>

      <Section title="Bird dog">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Bird dog (team)"
            value={bdRow ? (
              <Link href={`/bird-dogs/${bdRow.id}`} className="hover:underline">
                {[bdRow.firstName, bdRow.lastName].filter(Boolean).join(" ") || "(unnamed)"}
              </Link>
            ) : null}
          />
          <Field label="Bird dog (external)" value={[deal.birdDogFirstName, deal.birdDogLastName].filter(Boolean).join(" ") || null} />
          <Field label="Bird dog phone" value={deal.birdDogPhone} />
          <Field label="Bird dog email" value={deal.birdDogEmail} />
        </dl>
        {deal.birdDogAdditionalNotes && (
          <p className="mt-3 text-sm whitespace-pre-wrap"><span className="text-muted">Notes: </span>{deal.birdDogAdditionalNotes}</p>
        )}
      </Section>

      <Section title="Relations">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Seller / realtor"
            value={
              sellerCo ? (
                <Link href={`/companies/${sellerCo.id}`} className="hover:underline">
                  {sellerCo.name}
                </Link>
              ) : null
            }
          />
          <Field
            label="Confirmed buyer"
            value={
              confirmedBuyer ? (
                <Link href={`/contacts/${confirmedBuyer.id}`} className="hover:underline">
                  {[confirmedBuyer.firstName, confirmedBuyer.lastName].filter(Boolean).join(" ") || "(unnamed)"}
                </Link>
              ) : null
            }
          />
          <Field
            label="Secondary buyer"
            value={
              secondaryBuyer ? (
                <Link href={`/contacts/${secondaryBuyer.id}`} className="hover:underline">
                  {[secondaryBuyer.firstName, secondaryBuyer.lastName].filter(Boolean).join(" ") || "(unnamed)"}
                </Link>
              ) : null
            }
          />
        </dl>
      </Section>

      <Section title="Dates & escrow">
        <dl className="grid sm:grid-cols-3 gap-4">
          <Field label="EMD due" value={deal.emdDueDate} />
          <Field label="EMD amount" value={money(deal.emdAmount)} />
          <Field label="EMD deposited" value={deal.emdDeposited} />
          <Field label="Escrow opened" value={deal.escrowOpened} />
          <Field label="Inspection ends" value={deal.inspectionPeriodEnd} />
          <Field label="PSA COE" value={deal.psaCoeDate} />
          <Field label="Escrow fee" value={deal.escrowFeeResponsibility ? escrowFeeLabel.get(deal.escrowFeeResponsibility) : null} />
          <Field label="Transfer tax" value={deal.transferTaxResponsibility ? transferTaxLabel.get(deal.transferTaxResponsibility) : null} />
          <Field label="Title policy" value={deal.titlePolicyResponsibility ? titlePolicyLabel.get(deal.titlePolicyResponsibility) : null} />
        </dl>
      </Section>

      {(deal.marketingPackageUrl || deal.pAndLUrl || deal.appraisalUrl || deal.dataRoomUrl) && (
        <Section title="Documents">
          <ul className="space-y-1 text-sm">
            {deal.marketingPackageUrl && <li><a href={deal.marketingPackageUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Marketing package</a></li>}
            {deal.pAndLUrl && <li><a href={deal.pAndLUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">P&L</a></li>}
            {deal.appraisalUrl && <li><a href={deal.appraisalUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Appraisal</a></li>}
            {deal.rvxOnePagerUrl && <li><a href={deal.rvxOnePagerUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">RVX one-pager</a></li>}
            {deal.rvxFivePagerUrl && <li><a href={deal.rvxFivePagerUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">RVX five-pager</a></li>}
            {deal.dataRoomUrl && <li><a href={deal.dataRoomUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Data room</a></li>}
          </ul>
        </Section>
      )}

      <MatchedBuyers dealId={deal.id} />
      <TaskList parentTable="deals" parentId={deal.id} currentUserId={session?.user.id} />
      <ActivityTimeline parentTable="deals" parentId={deal.id} currentUserId={session?.user.id} />

      {(deal.acquisitionManagerNotes || deal.offerDeliveryInternalNotes || deal.closerFinalNotes) && (
        <Section title="Internal notes" description="Team-only.">
          {deal.acquisitionManagerNotes && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Acquisition manager</div>
              {deal.acquisitionManagerNotes}
            </div>
          )}
          {deal.offerDeliveryInternalNotes && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Offer delivery</div>
              {deal.offerDeliveryInternalNotes}
            </div>
          )}
          {deal.closerFinalNotes && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Closer final</div>
              {deal.closerFinalNotes}
            </div>
          )}
        </Section>
      )}
    </PageShell>
  );
}
