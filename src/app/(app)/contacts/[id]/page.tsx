import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { DeleteButton } from "@/components/delete-button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { MatchingDeals } from "@/components/matching-deals";
import { deleteContactAction } from "../actions";
import { Badge } from "@/components/badge";
import { Section } from "@/components/section";
import {
  BUYER_STATUS_OPTIONS,
  QUALIFICATION_TIER_OPTIONS,
  BUYER_LEAD_SOURCE_OPTIONS,
  DEPLOYABLE_CASH_OPTIONS,
  MAX_DEAL_SIZE_OPTIONS,
  PARK_TYPE_OPTIONS,
  FINANCING_OPTIONS_OPTIONS,
  FASTEST_TURNAROUND_OPTIONS,
  GP_LP_OPTIONS,
  REI_EXPERIENCE_OPTIONS,
  VALUABLE_SKILLS_OPTIONS,
} from "@/lib/options";

const lookups: Record<string, Map<string, string>> = {
  status: new Map(BUYER_STATUS_OPTIONS.map((o) => [o.value, o.label])),
  qualificationTier: new Map(QUALIFICATION_TIER_OPTIONS.map((o) => [o.value, o.label])),
  buyerLeadSource: new Map(BUYER_LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label])),
  deployableCash: new Map(DEPLOYABLE_CASH_OPTIONS.map((o) => [o.value, o.label])),
  maxDealSize: new Map(MAX_DEAL_SIZE_OPTIONS.map((o) => [o.value, o.label])),
  financingOptions: new Map(FINANCING_OPTIONS_OPTIONS.map((o) => [o.value, o.label])),
  fastestTurnaround: new Map(FASTEST_TURNAROUND_OPTIONS.map((o) => [o.value, o.label])),
  gpLp: new Map(GP_LP_OPTIONS.map((o) => [o.value, o.label])),
};

const arrayLookups: Record<string, Map<string, string>> = {
  parkTypePreferences: new Map(PARK_TYPE_OPTIONS.map((o) => [o.value, o.label])),
  reiExperienceOutsideRvp: new Map(REI_EXPERIENCE_OPTIONS.map((o) => [o.value, o.label])),
  buyersValuableSkills: new Map(VALUABLE_SKILLS_OPTIONS.map((o) => [o.value, o.label])),
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">
        {value === null || value === undefined || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

function ArrayField({ label, value, lookup }: { label: string; value?: string[] | null; lookup?: Map<string, string> }) {
  if (!value || value.length === 0) return <Field label={label} value={undefined} />;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1">
        {value.map((v) => (
          <Badge key={v}>{lookup?.get(v) ?? v}</Badge>
        ))}
      </dd>
    </div>
  );
}

function money(v: string | null | undefined) {
  if (v == null || v === "") return undefined;
  return `$${Number(v).toLocaleString()}`;
}

function lookup(map: string, v: string | null | undefined) {
  if (!v) return undefined;
  return lookups[map]?.get(v) ?? v;
}

function bool(v: boolean | null | undefined) {
  if (v == null) return undefined;
  return v ? <Badge tone="success">Yes</Badge> : <Badge tone="muted">No</Badge>;
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = contact.ownerId
    ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, contact.ownerId)).limit(1)
    : [null];

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(unnamed buyer)";
  const deleteBound = deleteContactAction.bind(null, id);

  return (
    <PageShell
      title={name}
      subtitle={contact.email ?? "no email on file"}
      action={
        <div className="flex gap-2 items-center">
          <Link href="/contacts" className="text-sm text-muted hover:text-foreground self-center">
            ← Back
          </Link>
          <LinkButton href={`/contacts/${contact.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
          <DeleteButton
            action={deleteBound}
            confirmText={`Delete buyer "${name}"? This cannot be undone.`}
          />
        </div>
      }
    >
      <Section title="Identity">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" value={contact.firstName} />
          <Field label="Last name" value={contact.lastName} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone} />
          <Field label="SMS number" value={contact.smsNumber} />
          <Field label="Office phone" value={contact.officePhone} />
          <Field label="Title" value={contact.title} />
          <Field label="Birthday" value={contact.birthday} />
        </dl>
      </Section>

      <Section title="Status & qualification">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Status" value={lookup("status", contact.status)} />
          <Field label="Tier" value={lookup("qualificationTier", contact.qualificationTier)} />
          <Field label="Lead source" value={lookup("buyerLeadSource", contact.buyerLeadSource)} />
          <Field label="Buyer #" value={contact.buyerNumber} />
          <Field label="Top tier" value={bool(contact.topTier)} />
          <Field label="Owner" value={owner ? `${owner.name} (${owner.email})` : null} />
        </dl>
      </Section>

      <Section title="Buy box" description="Drives the matching engine.">
        <dl className="grid sm:grid-cols-2 gap-4">
          <ArrayField label="Park types" value={contact.parkTypePreferences} lookup={arrayLookups.parkTypePreferences} />
          <ArrayField label="Target states" value={contact.targetStates} />
          <Field label="Strict states" value={bool(contact.strictStates)} />
          <Field label="Pads desired" value={contact.amountOfPadsDesiredBucket ?? contact.padsDesiredMin} />
          <Field label="Max deal size" value={lookup("maxDealSize", contact.maxDealSize)} />
          <Field label="Min NOI" value={money(contact.minNoiUsd)} />
          <Field label="Restaurant OK" value={bool(contact.parkWithRestaurant)} />
          <Field label="Leased land OK" value={bool(contact.openToLeasedLand)} />
        </dl>
      </Section>

      <Section title="Capital & financing">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Deployable cash" value={lookup("deployableCash", contact.deployableCash)} />
          <Field label="POF amount" value={money(contact.pofAmount)} />
          <Field label="Can produce POF" value={bool(contact.canProducePof)} />
          <Field label="Using 1031" value={bool(contact.willUse1031)} />
          <Field label="Financing requirement" value={lookup("financingOptions", contact.financingOptions)} />
          <Field label="Fastest turnaround" value={lookup("fastestTurnaround", contact.fastestTurnaround)} />
          <Field label="GP / LP" value={lookup("gpLp", contact.gpLp)} />
        </dl>
      </Section>

      <Section title="Experience">
        <dl className="grid sm:grid-cols-2 gap-4">
          <ArrayField label="RE experience outside RVP" value={contact.reiExperienceOutsideRvp} lookup={arrayLookups.reiExperienceOutsideRvp} />
          <Field label="RVPs closed" value={contact.rvpClosedInPastBucket} />
          <Field label="12-month goals" value={contact.twelveMonthGoalsBucket} />
          <ArrayField label="Skills" value={contact.buyersValuableSkills} lookup={arrayLookups.buyersValuableSkills} />
        </dl>
        {contact.describeSkillExperience && (
          <div className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">
            {contact.describeSkillExperience}
          </div>
        )}
      </Section>

      <Section title="Community">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Subto" value={bool(contact.subtoMember)} />
          <Field label="Gator" value={bool(contact.gatorMember)} />
          <Field label="Top Tier" value={bool(contact.topTierMember)} />
          <Field label="Owners Club" value={bool(contact.ownersClubMember)} />
        </dl>
      </Section>

      <Section title="Compliance">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Signed NCNDA" value={bool(contact.signedNcnda)} />
          <Field label="SMS permission" value={bool(contact.smsPermission)} />
          <Field label="Opted out of bulk SMS" value={bool(contact.bulkSmsOptedOut)} />
        </dl>
      </Section>

      <MatchingDeals contactId={contact.id} />
      <TaskList parentTable="contacts" parentId={contact.id} currentUserId={session?.user.id} />
      <ActivityTimeline parentTable="contacts" parentId={contact.id} currentUserId={session?.user.id} />

      {(contact.internalNotesBuyerContact || contact.internalNotesBuyerCriteria || contact.internalNotesQualifyCredibility) && (
        <Section title="Internal notes" description="Team-only.">
          {contact.internalNotesBuyerContact && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Contact</div>
              {contact.internalNotesBuyerContact}
            </div>
          )}
          {contact.internalNotesBuyerCriteria && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Criteria</div>
              {contact.internalNotesBuyerCriteria}
            </div>
          )}
          {contact.internalNotesQualifyCredibility && (
            <div className="rounded-md border border-border bg-yellow-50 p-3 text-sm whitespace-pre-wrap">
              <div className="text-[11px] uppercase tracking-widest text-muted font-medium mb-1">Qualify / credibility</div>
              {contact.internalNotesQualifyCredibility}
            </div>
          )}
        </Section>
      )}
    </PageShell>
  );
}
