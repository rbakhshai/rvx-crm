import Link from "next/link";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealStatuses, user } from "@/db/schema";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { DndBoard, type DealCard, type Lane } from "./board-client";

type SearchParams = Promise<{ owner?: string }>;

/** Display order for kanban lanes — left to right, intake to closed/dead. */
const LANES: Lane[] = [
  { key: "am",      label: "Acquisitions",  subtitle: "New intake" },
  { key: "uw",      label: "Underwriting",  subtitle: "Phase 1 / 2 review" },
  { key: "closer",  label: "Closer",        subtitle: "Contact + negotiation" },
  { key: "pm",      label: "LOI",           subtitle: "Letter of intent" },
  { key: "tc",      label: "PSA / Escrow",  subtitle: "Contract + DD" },
  { key: "dm",      label: "Dispo",         subtitle: "Send to buyers" },
  { key: "closed",  label: "Closed",        subtitle: "Won deals" },
  { key: "drip",    label: "Drip",          subtitle: "7 / 14 / 30 / 45 / 90 day" },
  { key: "parked",  label: "Parked",        subtitle: "Pending revisit" },
  { key: "dead",    label: "Dead",          subtitle: "Not pursuing" },
  { key: "misc",    label: "Misc",          subtitle: "Edge cases" },
];

export default async function DealsBoardPage({ searchParams }: { searchParams: SearchParams }) {
  const { owner: ownerFilter } = await searchParams;
  const ownerWhere = ownerFilter
    ? and(eq(deals.ownerId, ownerFilter), isNull(deals.deletedAt))
    : isNull(deals.deletedAt);

  const [allStatuses, dealRows, userRows, totalCount] = await Promise.all([
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    db
      .select({
        id: deals.id,
        name: deals.name,
        parkAddress: deals.parkAddress,
        parkCity: deals.parkCity,
        parkState: deals.parkState,
        padsCount: deals.padsCount,
        listPrice: deals.listPrice,
        agreedPurchasePrice: deals.agreedPurchasePrice,
        statusCode: deals.statusCode,
        dealPriority: deals.dealPriority,
        ownerId: deals.ownerId,
        closerLastTouch: deals.closerLastTouch,
      })
      .from(deals)
      .where(ownerWhere)
      .orderBy(desc(deals.closerLastTouch), desc(deals.createdAt))
      .limit(500),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    db.select({ count: sql<number>`count(*)::int` }).from(deals).where(ownerWhere),
  ]);

  const statusByCode = new Map(allStatuses.map((s) => [s.code, s]));
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));
  const count = totalCount[0]?.count ?? 0;

  const cards: DealCard[] = dealRows.map((d) => {
    const status = d.statusCode ? statusByCode.get(d.statusCode) : null;
    return {
      id: d.id,
      name: d.name,
      parkAddress: d.parkAddress,
      parkCity: d.parkCity,
      parkState: d.parkState,
      padsCount: d.padsCount,
      listPrice: d.listPrice,
      agreedPurchasePrice: d.agreedPurchasePrice,
      statusCode: d.statusCode,
      statusLabel: status?.label ?? null,
      dealPriority: d.dealPriority,
      role: status?.role ?? "misc",
      ownerId: d.ownerId,
      ownerName: d.ownerId ? userMap.get(d.ownerId) ?? null : null,
      lastTouch: d.closerLastTouch,
    };
  });

  return (
    <PageShell
      title="Deal pipeline"
      subtitle={`${count} deal${count === 1 ? "" : "s"}${ownerFilter ? " · filtered" : ""} · drag cards across lanes to change status`}
      action={
        <div className="flex gap-2 items-center">
          <Link href="/deals" className="text-sm text-muted hover:text-foreground self-center">
            ↩ Table view
          </Link>
          <LinkButton href="/deals/new" size="sm">+ New deal</LinkButton>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-2 text-xs flex-wrap">
        <span className="text-muted">Owner:</span>
        <Link
          href="/deals/board"
          className={
            "rounded-full px-2.5 py-0.5 border " +
            (!ownerFilter ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
          }
        >
          All
        </Link>
        {userRows.map((u) => {
          const active = ownerFilter === u.id;
          return (
            <Link
              key={u.id}
              href={`/deals/board?owner=${u.id}`}
              className={
                "rounded-full px-2.5 py-0.5 border " +
                (active ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
              }
            >
              {u.name}
            </Link>
          );
        })}
      </div>

      {count === 0 ? (
        <EmptyState
          title="No deals in the pipeline yet"
          description="Add a deal to see it land in the right lane based on its status."
          ctaLabel="+ New deal"
          ctaHref="/deals/new"
        />
      ) : (
        <DndBoard initialDeals={cards} lanes={LANES} />
      )}
    </PageShell>
  );
}
