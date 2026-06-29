import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { deals, dealStatuses, user } from "@/db/schema";
// kept as a separate import so the subquery use below reads cleanly
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { GroupedTables, buildGroups } from "@/components/grouped-table";
import { Pagination, parsePage, DEFAULT_PAGE_SIZE } from "@/components/pagination";
import { ViewToggle } from "@/components/view-toggle";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";
import { SearchInput } from "@/components/search-input";
import { FilterChips } from "@/components/filter-chips";
import { Avatar } from "@/components/avatar";
import { StaleDot } from "@/components/stale-dot";
import { SavedViewsBar } from "@/components/saved-views";
import { listSavedViews } from "@/app/actions/saved-views";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DEAL_PRIORITY_OPTIONS, US_STATES } from "@/lib/options";
import { DEAL_PHASE_ROLES, isDealPhaseRole, isPipelineStageKey, labelForStage, statusesForStage } from "@/lib/pipeline-stages";
import { buildColumnPreferences, buildSortHref } from "@/lib/list-prefs";
import { ColumnButton } from "@/components/column-button";

type Row = typeof deals.$inferSelect & { ownerName?: string | null };

const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;

const columns: Column<Row>[] = [
  {
    key: "fresh",
    header: "",
    className: "w-6",
    render: (r) => <StaleDot since={r.closerLastTouch ?? r.updatedAt} />,
  },
  {
    key: "name",
    header: "Deal",
    sortKey: "name",
    className: "font-medium",
    render: (r) => r.name ?? r.parkAddress ?? "(unnamed deal)",
  },
  { key: "state", header: "State", sortKey: "state", render: (r) => r.parkState ?? <span className="text-muted">—</span> },
  { key: "pads", header: "Pads", sortKey: "pads", className: "text-right tabular-nums", render: (r) => r.padsCount ?? <span className="text-muted">—</span> },
  {
    key: "price",
    header: "List price",
    sortKey: "price",
    className: "text-right tabular-nums",
    render: (r) => (r.listPrice ? `$${Number(r.listPrice).toLocaleString()}` : <span className="text-muted">—</span>),
  },
  {
    key: "priority",
    header: "Priority",
    sortKey: "priority",
    render: (r) =>
      r.dealPriority ? (
        <Badge tone={priorityTone[r.dealPriority as keyof typeof priorityTone] ?? "default"}>{r.dealPriority}</Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  { key: "status", header: "Stage", sortKey: "status", className: "text-muted", render: (r) => r.statusCode ?? <span className="text-muted">—</span> },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) =>
      r.ownerId ? (
        <Avatar name={r.ownerName ?? "?"} id={r.ownerId} />
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

const SORT_COLUMNS: Record<string, SQLWrapper> = {
  name: deals.name,
  state: deals.parkState,
  pads: deals.padsCount,
  price: deals.listPrice,
  priority: deals.dealPriority,
  status: deals.statusCode,
};

type SearchParams = Promise<{ q?: string; status?: string; phase?: string; priority?: string; state?: string; owner?: string; stage?: string; bird_dog?: string; sort?: string; dir?: string; view?: string; groupBy?: string; page?: string }>;

export default async function DealsListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { q, status, priority, state, owner, stage, phase } = params;
  const birdDogId = params.bird_dog;
  const isGroup = params.view === "group";
  const groupBy = params.groupBy === "owner" ? "owner" : "status";

  // Flat view paginates; grouped view loads a (capped) set to bucket.
  const page = parsePage(params.page);
  const queryLimit = isGroup ? 500 : DEFAULT_PAGE_SIZE;
  const queryOffset = isGroup ? 0 : (page - 1) * DEFAULT_PAGE_SIZE;

  // Load the user's saved column layout (falls back to all columns).
  const { displayColumns, allColumnConfigs, selectedColumnConfigs } = await buildColumnPreferences("deals", columns);

  const stageKey = isPipelineStageKey(stage) ? stage : null;
  const phaseKey = isDealPhaseRole(phase) ? phase : null;

  const filters: SQL[] = [isNull(deals.deletedAt)];
  if (q) {
    const pat = `%${q}%`;
    const cond = or(ilike(deals.name, pat), ilike(deals.parkAddress, pat), ilike(deals.parkCity, pat));
    if (cond) filters.push(cond);
  }
  if (stageKey) {
    filters.push(inArray(deals.statusCode, statusesForStage(stageKey)));
  }
  if (phaseKey) {
    // Subquery: every status code whose role equals the selected phase.
    filters.push(
      inArray(
        deals.statusCode,
        db.select({ code: dealStatuses.code }).from(dealStatuses).where(eq(dealStatuses.role, phaseKey as never)),
      ),
    );
  }
  if (status) filters.push(eq(deals.statusCode, status));
  if (priority) filters.push(eq(deals.dealPriority, priority as never));
  if (state) filters.push(eq(deals.parkState, state));
  if (owner) filters.push(eq(deals.ownerId, owner));
  if (birdDogId) filters.push(eq(deals.birdDogId, birdDogId));

  const where = filters.length ? and(...filters) : undefined;

  // Sort
  const sortKey = params.sort && SORT_COLUMNS[params.sort] ? params.sort : null;
  const sortDir: "asc" | "desc" = params.dir === "asc" ? "asc" : params.dir === "desc" ? "desc" : "asc";
  const orderBy = sortKey
    ? (sortDir === "asc" ? asc(SORT_COLUMNS[sortKey]) : desc(SORT_COLUMNS[sortKey]))
    : desc(deals.createdAt);

  const session = await auth.api.getSession({ headers: await headers() });
  const [rawRows, [{ count }], statuses, users, phaseCounts, savedViews] = await Promise.all([
    db.select().from(deals).where(where).orderBy(orderBy).limit(queryLimit).offset(queryOffset),
    db.select({ count: sql<number>`count(*)::int` }).from(deals).where(where),
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    // Count deals per phase role — drives the "Closer · 12" chip labels
    db
      .select({ role: dealStatuses.role, n: sql<number>`count(${deals.id})::int` })
      .from(dealStatuses)
      .leftJoin(deals, eq(deals.statusCode, dealStatuses.code))
      .groupBy(dealStatuses.role),
    session ? listSavedViews("deals", session.user.id) : Promise.resolve([]),
  ]);
  const phaseCountMap = new Map<string, number>(phaseCounts.map((p) => [p.role, p.n]));

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/deals";

  const statusOptions = statuses.map((s) => ({ value: s.code, label: s.label }));
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));
  // Phase chips with counts: skip empty phases ("Misc · 0" is just noise).
  const phaseOptions = DEAL_PHASE_ROLES
    .map((p) => ({ ...p, n: phaseCountMap.get(p.value) ?? 0 }))
    .filter((p) => p.n > 0)
    .map((p) => ({ value: p.value, label: `${p.label} · ${p.n}` }));

  // Grouped view buckets — by workflow stage or by owner.
  const statusMap = new Map(statuses.map((s) => [s.code, s.label]));
  const dealGroups = isGroup
    ? groupBy === "owner"
      ? buildGroups(rows, (r) => r.ownerId ?? null, (id) => userMap.get(id) ?? "Unknown", users.map((u) => u.id), "Unassigned")
      : buildGroups(rows, (r) => r.statusCode ?? null, (code) => statusMap.get(code) ?? code, statuses.map((s) => s.code), "No stage")
    : [];

  return (
    <PageShell
      title="Deals"
      subtitle={`${count} deal${count === 1 ? "" : "s"}${q || status || phase || priority || state || owner ? " (filtered)" : ""}`}
      width="wide"
      action={
        <div className="flex gap-2 items-center">
          <ColumnButton scope="deals" allColumns={allColumnConfigs} selectedColumns={selectedColumnConfigs} />
          <ViewToggle current={params.view} pathname={pathname} searchParams={params} />
          <LinkButton href="/deals/board" variant="secondary" size="sm">Board view</LinkButton>
          <LinkButton href="/deals/new" size="sm">+ New deal</LinkButton>
        </div>
      }
    >
      <div className="space-y-3 mb-5">
        <SavedViewsBar scope="deals" views={savedViews} />
        {stageKey && (
          <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 text-sm">
            <span>
              Filtered to pipeline stage:{" "}
              <span className="font-semibold">{labelForStage(stageKey)}</span>
              <span className="text-muted ml-2">({count} deal{count === 1 ? "" : "s"})</span>
            </span>
            <Link href="/deals" className="text-xs text-muted hover:text-foreground">
              Clear ×
            </Link>
          </div>
        )}
        <SearchInput scope="scoped" placeholder="Search deals by name, address, city…" />
        <FilterChips label="Phase" paramKey="phase" current={phase} pathname={pathname} searchParams={params} options={phaseOptions} />
        <FilterChips label="Priority" paramKey="priority" current={priority} pathname={pathname} searchParams={params} options={DEAL_PRIORITY_OPTIONS} />
        <FilterChips label="State" paramKey="state" current={state} pathname={pathname} searchParams={params} options={US_STATES} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted hover:text-foreground select-none inline-flex items-center gap-1 list-none">
            <span className="transition-transform group-open:rotate-90">›</span>
            <span>{status ? "Detailed stage (filtered)" : "Filter by exact stage"}</span>
          </summary>
          <div className="mt-2 pl-3 border-l-2 border-border">
            <FilterChips label="Stage" paramKey="status" current={status} pathname={pathname} searchParams={params} options={statusOptions} />
          </div>
        </details>
        {isGroup && (
          <FilterChips
            label="Group by"
            paramKey="groupBy"
            current={groupBy}
            pathname={pathname}
            searchParams={params}
            includeAll={false}
            options={[{ value: "status", label: "Stage" }, { value: "owner", label: "Owner" }]}
          />
        )}
      </div>

      {isGroup ? (
        <GroupedTables
          groups={dealGroups}
          columns={displayColumns}
          rowHref={(r) => `/deals/${r.id}`}
          emptyLabel="No deals match"
        />
      ) : (
        <DataTable
          rows={rows}
          columns={displayColumns}
          rowHref={(r) => `/deals/${r.id}`}
          sort={{
            current: sortKey,
            dir: sortDir,
            hrefFor: (key, dir) => buildSortHref(pathname, params, key, dir),
          }}
          empty={
            <EmptyState
              icon="🏞"
              title="No deals match"
              description="Try clearing filters or adding a deal."
              ctaLabel="+ New deal"
              ctaHref="/deals/new"
            />
          }
        />
      )}

      {!isGroup && (
        <Pagination pathname={pathname} params={params} page={page} pageSize={DEFAULT_PAGE_SIZE} total={count} />
      )}
    </PageShell>
  );
}
