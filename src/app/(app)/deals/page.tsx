import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealStatuses, user } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";
import { SearchInput } from "@/components/search-input";
import { FilterChips } from "@/components/filter-chips";
import { DEAL_PRIORITY_OPTIONS, US_STATES } from "@/lib/options";

type Row = typeof deals.$inferSelect;

const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;

const columns: Column<Row>[] = [
  { key: "name", header: "Deal", render: (r) => r.name ?? r.parkAddress ?? "(unnamed deal)" },
  { key: "state", header: "State", render: (r) => r.parkState ?? <span className="text-muted">—</span> },
  { key: "pads", header: "Pads", className: "text-right tabular-nums", render: (r) => r.padsCount ?? <span className="text-muted">—</span> },
  {
    key: "price",
    header: "List price",
    className: "text-right tabular-nums",
    render: (r) => (r.listPrice ? `$${Number(r.listPrice).toLocaleString()}` : <span className="text-muted">—</span>),
  },
  {
    key: "priority",
    header: "Priority",
    render: (r) =>
      r.dealPriority ? (
        <Badge tone={priorityTone[r.dealPriority as keyof typeof priorityTone] ?? "default"}>{r.dealPriority}</Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  { key: "status", header: "Stage", className: "text-muted", render: (r) => r.statusCode ?? <span className="text-muted">—</span> },
];

type SearchParams = Promise<{ q?: string; status?: string; priority?: string; state?: string; owner?: string }>;

export default async function DealsListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { q, status, priority, state, owner } = params;

  const filters: SQL[] = [];
  if (q) {
    const pat = `%${q}%`;
    const cond = or(ilike(deals.name, pat), ilike(deals.parkAddress, pat), ilike(deals.parkCity, pat));
    if (cond) filters.push(cond);
  }
  if (status) filters.push(eq(deals.statusCode, status));
  if (priority) filters.push(eq(deals.dealPriority, priority as never));
  if (state) filters.push(eq(deals.parkState, state));
  if (owner) filters.push(eq(deals.ownerId, owner));

  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ count }], statuses, users] = await Promise.all([
    db.select().from(deals).where(where).orderBy(desc(deals.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(deals).where(where),
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
  ]);

  const pathname = "/deals";
  const statusOptions = statuses.map((s) => ({ value: s.code, label: s.label }));
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <PageShell
      title="Deals"
      subtitle={`${count} deal${count === 1 ? "" : "s"}${q || status || priority || state || owner ? " (filtered)" : ""}`}
      action={
        <div className="flex gap-2 items-center">
          <LinkButton href="/deals/board" variant="secondary" size="sm">Board view</LinkButton>
          <LinkButton href="/deals/new" size="sm">+ New deal</LinkButton>
        </div>
      }
    >
      <div className="space-y-3 mb-5">
        <SearchInput scope="scoped" placeholder="Search deals by name, address, city…" />
        <FilterChips label="Priority" paramKey="priority" current={priority} pathname={pathname} searchParams={params} options={DEAL_PRIORITY_OPTIONS} />
        <FilterChips label="State" paramKey="state" current={state} pathname={pathname} searchParams={params} options={US_STATES} />
        <FilterChips label="Stage" paramKey="status" current={status} pathname={pathname} searchParams={params} options={statusOptions} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/deals/${r.id}`}
        empty={
          <EmptyState
            title="No deals match"
            description="Try clearing filters or adding a deal."
            ctaLabel="+ New deal"
            ctaHref="/deals/new"
          />
        }
      />
    </PageShell>
  );
}
