/**
 * Intercepted route: clicking a deal row anywhere in the app opens the deal
 * in a side drawer instead of navigating away. Direct URL navigation still
 * lands on the full /deals/[id] page.
 *
 * The drawer shows a condensed, scrollable view of the deal — vital stats,
 * map, financial snapshot, recent activity, tasks. "Open full" link goes to
 * the full detail page when the user wants every field.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq, asc, inArray } from "drizzle-orm";
import { HardRedirect } from "@/components/hard-redirect";

// Sub-routes that look like an [id] but are actually static pages —
// the intercept must bail out so the real route can render.
const RESERVED_SUB_ROUTES = new Set(["board", "new"]);
import { db } from "@/db";
import { deals, dealStatuses, contacts, companies, birdDogs, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Drawer } from "@/components/drawer";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { LinkButton } from "@/components/button";
import { GoogleMap } from "@/components/google-map";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { MatchedBuyers } from "@/components/matched-buyers";
import {
  DEAL_PRIORITY_OPTIONS,
  PARK_TYPE_DEAL_OPTIONS,
} from "@/lib/options";

const priorityLabel = new Map(DEAL_PRIORITY_OPTIONS.map((o) => [o.value, o.label]));
const parkTypeLabel = new Map(PARK_TYPE_DEAL_OPTIONS.map((o) => [o.value, o.label]));
const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;

function money(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return `$${Number(v).toLocaleString()}`;
}

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

export default async function DealDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // /deals/board and /deals/new look like dynamic [id] paths and the
  // intercept caught them by mistake. Force a hard browser navigation so
  // the real /deals/board page loads outside the intercept.
  if (RESERVED_SUB_ROUTES.has(id)) {
    return <HardRedirect to={`/deals/${id}`} />;
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  const [statuses, [confirmedBuyer], [sellerCo], [bdRow]] = await Promise.all([
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    deal.confirmedBuyerId
      ? db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(eq(contacts.id, deal.confirmedBuyerId)).limit(1)
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
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ownerIds))
    : [];
  const ownerMap = new Map(ownerRows.map((u) => [u.id, u.name]));

  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const subtitle = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");

  return (
    <Drawer
      title={title}
      subtitle={subtitle || undefined}
      fullHref={`/deals/${id}`}
      width="640px"
    >
      <div className="space-y-5">
        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/deals/${id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
          <LinkButton href={`/deals/${id}/dispo`} variant="gold" size="sm">Dispo to buyers →</LinkButton>
          <LinkButton href={`/deals/${id}/due-diligence`} variant="secondary" size="sm">DD</LinkButton>
          {deal.dealPriority && (
            <Badge tone={priorityTone[deal.dealPriority as keyof typeof priorityTone] ?? "default"}>
              {priorityLabel.get(deal.dealPriority)}
            </Badge>
          )}
        </div>

        {/* Map */}
        {deal.parkAddress && (
          <GoogleMap address={deal.parkAddress} city={deal.parkCity} state={deal.parkState} height={200} />
        )}

        {/* Vital stats */}
        <dl className="grid grid-cols-3 gap-4">
          <Field label="Stage" value={deal.statusCode ? statusLabel.get(deal.statusCode) ?? deal.statusCode : null} />
          <Field label="Pads" value={deal.padsCount} />
          <Field label="Park type" value={deal.parkType ? parkTypeLabel.get(deal.parkType) : null} />
          <Field label="List price" value={money(deal.listPrice)} />
          <Field label="List NOI" value={money(deal.listNoi)} />
          <Field label="Cap rate" value={deal.listCapRate} />
        </dl>

        {/* Relations */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium">Relations</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted text-xs w-16 shrink-0">Owner:</span>
              {deal.ownerId ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={ownerMap.get(deal.ownerId) ?? "?"} id={deal.ownerId} size="xs" />
                  <span className="truncate">{ownerMap.get(deal.ownerId)}</span>
                </span>
              ) : <span className="text-muted">unassigned</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted text-xs w-16 shrink-0">Ops:</span>
              {deal.opsOwnerId ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={ownerMap.get(deal.opsOwnerId) ?? "?"} id={deal.opsOwnerId} size="xs" />
                  <span className="truncate">{ownerMap.get(deal.opsOwnerId)}</span>
                </span>
              ) : <span className="text-muted">—</span>}
            </div>
            <div className="text-sm">
              <span className="text-muted text-xs">Seller: </span>
              {sellerCo ? <Link href={`/companies/${sellerCo.id}` as never} className="hover:underline">{sellerCo.name}</Link> : <span className="text-muted">—</span>}
            </div>
            <div className="text-sm">
              <span className="text-muted text-xs">Buyer: </span>
              {confirmedBuyer ? <Link href={`/contacts/${confirmedBuyer.id}` as never} className="hover:underline">{[confirmedBuyer.firstName, confirmedBuyer.lastName].filter(Boolean).join(" ")}</Link> : <span className="text-muted">—</span>}
            </div>
            <div className="text-sm col-span-2">
              <span className="text-muted text-xs">Bird dog: </span>
              {bdRow ? <Link href={`/bird-dogs/${bdRow.id}` as never} className="hover:underline">{[bdRow.firstName, bdRow.lastName].filter(Boolean).join(" ")}</Link> : (
                [deal.birdDogFirstName, deal.birdDogLastName].filter(Boolean).join(" ") || <span className="text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Special note */}
        {deal.whatMakesThisSpecial && (
          <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">What makes this special</div>
            <p className="text-sm whitespace-pre-wrap">{deal.whatMakesThisSpecial}</p>
          </div>
        )}

        {/* Matched buyers, tasks, activity — same components as full page */}
        <MatchedBuyers dealId={deal.id} />
        <TaskList parentTable="deals" parentId={deal.id} currentUserId={session?.user.id} />
        <ActivityTimeline parentTable="deals" parentId={deal.id} currentUserId={session?.user.id} />
      </div>
    </Drawer>
  );
}
