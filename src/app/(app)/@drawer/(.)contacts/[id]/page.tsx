/**
 * Intercepted route: clicking a buyer row opens this drawer over the list.
 * Condensed view of the buyer with quick actions + activity timeline.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Drawer } from "@/components/drawer";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { LinkButton } from "@/components/button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { MatchingDeals } from "@/components/matching-deals";
import {
  BUYER_STATUS_OPTIONS,
  QUALIFICATION_TIER_OPTIONS,
  DEPLOYABLE_CASH_OPTIONS,
  MAX_DEAL_SIZE_OPTIONS,
} from "@/lib/options";

const statusLabel = new Map(BUYER_STATUS_OPTIONS.map((o) => [o.value, o.label]));
const tierLabel = new Map(QUALIFICATION_TIER_OPTIONS.map((o) => [o.value, o.label.replace(/^\[\d\] /, "")]));
const cashLabel = new Map(DEPLOYABLE_CASH_OPTIONS.map((o) => [o.value, o.label]));
const dealSizeLabel = new Map(MAX_DEAL_SIZE_OPTIONS.map((o) => [o.value, o.label]));

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value == null || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

export default async function ContactDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = contact.ownerId
    ? await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, contact.ownerId)).limit(1)
    : [null];

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(unnamed buyer)";
  const sub = [contact.email, contact.state].filter(Boolean).join(" · ");

  return (
    <Drawer title={name} subtitle={sub || undefined} fullHref={`/contacts/${id}`} width="600px">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/contacts/${id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
          {contact.qualificationTier && (
            <Badge tone="info">{tierLabel.get(contact.qualificationTier) ?? contact.qualificationTier}</Badge>
          )}
          {contact.status && (
            <Badge tone={contact.status === "active_looking_hot" ? "warning" : "default"}>
              {statusLabel.get(contact.status) ?? contact.status}
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Field label="Email" value={contact.email ?? null} />
          <Field label="Phone" value={contact.phone ?? null} />
          <Field label="State" value={contact.state ?? null} />
          <Field label="POF" value={contact.pofAmount ? `$${Number(contact.pofAmount).toLocaleString()}` : null} />
          <Field label="Deployable cash" value={contact.deployableCash ? cashLabel.get(contact.deployableCash) : null} />
          <Field label="Max deal size" value={contact.maxDealSize ? dealSizeLabel.get(contact.maxDealSize) : null} />
        </dl>

        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Owner</div>
          {owner ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={owner.name} id={owner.id} size="xs" />
              <span className="text-sm">{owner.name}</span>
            </span>
          ) : <span className="text-sm text-muted">unassigned</span>}
        </div>

        {contact.buyersAdditionalComments && (
          <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">Notes</div>
            <p className="text-sm whitespace-pre-wrap">{contact.buyersAdditionalComments}</p>
          </div>
        )}

        <MatchingDeals contactId={contact.id} />
        <TaskList parentTable="contacts" parentId={contact.id} currentUserId={session?.user.id} />
        <ActivityTimeline parentTable="contacts" parentId={contact.id} currentUserId={session?.user.id} />
      </div>
    </Drawer>
  );
}
