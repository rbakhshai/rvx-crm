import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, birdDogStatuses, user } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
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
import { BD_ACQUISITION_LEVEL_OPTIONS } from "@/lib/options";
import { fmtDate } from "@/lib/date-format";

type Row = typeof birdDogs.$inferSelect & { ownerName?: string | null };

const columns: Column<Row>[] = [
  {
    key: "created",
    header: "Added",
    sortKey: "created",
    className: "w-28 text-muted tabular-nums whitespace-nowrap",
    render: (r) => <span title={r.createdAt.toLocaleString()}>{fmtDate(r.createdAt)}</span>,
  },
  { key: "fresh", header: "", className: "w-6", render: (r) => <StaleDot since={r.updatedAt} /> },
  {
    key: "name",
    header: "Name",
    sortKey: "name",
    className: "font-medium",
    render: (r) => [r.firstName, r.lastName].filter(Boolean).join(" ") || "(unnamed)",
  },
  { key: "email", header: "Email", sortKey: "email", className: "text-muted", render: (r) => r.email ?? "—" },
  {
    key: "level",
    header: "Level",
    sortKey: "level",
    render: (r) => (r.acquisitionLevel ? <Badge>{r.acquisitionLevel}</Badge> : <span className="text-muted">—</span>),
  },
  { key: "status", header: "Status", sortKey: "status", className: "text-muted", render: (r) => r.statusCode ?? "—" },
  { key: "discord", header: "Discord", render: (r) => (r.isInDiscord ? <Badge tone="success">In</Badge> : <span className="text-muted">—</span>) },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) => (r.ownerId ? <Avatar name={r.ownerName ?? "?"} id={r.ownerId} /> : <span className="text-muted">—</span>),
  },
];

const SORT_COLUMNS: Record<string, SQLWrapper> = {
  created: birdDogs.createdAt,
  name: birdDogs.firstName,
  email: birdDogs.email,
  level: birdDogs.acquisitionLevel,
  status: birdDogs.statusCode,
};

type SearchParams = Promise<{ q?: string; status?: string; level?: string; owner?: string; sort?: string; dir?: string }>;

export default async function BirdDogsListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { q, status, level, owner } = params;

  const filters: SQL[] = [isNull(birdDogs.deletedAt)];
  if (q) {
    const pat = `%${q}%`;
    const cond = or(ilike(birdDogs.firstName, pat), ilike(birdDogs.lastName, pat), ilike(birdDogs.email, pat));
    if (cond) filters.push(cond);
  }
  if (status) filters.push(eq(birdDogs.statusCode, status));
  if (level) filters.push(eq(birdDogs.acquisitionLevel, level as never));
  if (owner) filters.push(eq(birdDogs.ownerId, owner));

  const where = filters.length ? and(...filters) : undefined;

  // Sort: ?sort=created|name|email|level|status, ?dir=asc|desc.
  // Default: newest first.
  const sortKey = params.sort && SORT_COLUMNS[params.sort] ? params.sort : null;
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : "asc";
  const orderBy = sortKey
    ? (sortDir === "asc" ? asc(SORT_COLUMNS[sortKey]) : desc(SORT_COLUMNS[sortKey]))
    : desc(birdDogs.createdAt);

  const session = await auth.api.getSession({ headers: await headers() });
  const [rawRows, [{ count }], statuses, users, savedViews] = await Promise.all([
    db.select().from(birdDogs).where(where).orderBy(orderBy).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(birdDogs).where(where),
    db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder)),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    session ? listSavedViews("bird_dogs", session.user.id) : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/bird-dogs";
  const statusOptions = statuses.map((s) => ({ value: s.code, label: s.label }));
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  function buildSortHref(key: string, nextDir: "asc" | "desc"): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "sort" || k === "dir") continue;
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
    }
    qs.set("sort", key);
    qs.set("dir", nextDir);
    return `${pathname}?${qs.toString()}`;
  }

  return (
    <PageShell
      title="Bird Dogs"
      subtitle={`${count} scout${count === 1 ? "" : "s"}${q || status || level || owner ? " (filtered)" : ""}`}
      width="wide"
      action={<LinkButton href="/bird-dogs/new" size="sm">+ New bird dog</LinkButton>}
    >
      <div className="space-y-3 mb-5">
        <SavedViewsBar scope="bird_dogs" views={savedViews} />
        <SearchInput scope="scoped" placeholder="Search bird dogs by name, email…" />
        <FilterChips label="Level" paramKey="level" current={level} pathname={pathname} searchParams={params} options={BD_ACQUISITION_LEVEL_OPTIONS} />
        <FilterChips label="Status" paramKey="status" current={status} pathname={pathname} searchParams={params} options={statusOptions} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/bird-dogs/${r.id}`}
        sort={{ current: sortKey, dir: sortDir, hrefFor: buildSortHref }}
        empty={
          <EmptyState
            icon="🦅"
            title="No bird dogs match"
            description="Try clearing filters or adding a bird dog."
            ctaLabel="+ New bird dog"
            ctaHref="/bird-dogs/new"
          />
        }
      />
    </PageShell>
  );
}
