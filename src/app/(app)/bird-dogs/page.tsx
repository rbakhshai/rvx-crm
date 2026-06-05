import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
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
import { BD_ACQUISITION_LEVEL_OPTIONS } from "@/lib/options";

type Row = typeof birdDogs.$inferSelect & { ownerName?: string | null };

const columns: Column<Row>[] = [
  { key: "fresh", header: "", className: "w-6", render: (r) => <StaleDot since={r.updatedAt} /> },
  { key: "name", header: "Name", render: (r) => [r.firstName, r.lastName].filter(Boolean).join(" ") || "(unnamed)" },
  { key: "email", header: "Email", className: "text-muted", render: (r) => r.email ?? "—" },
  { key: "level", header: "Level", render: (r) => (r.acquisitionLevel ? <Badge>{r.acquisitionLevel}</Badge> : <span className="text-muted">—</span>) },
  { key: "status", header: "Status", className: "text-muted", render: (r) => r.statusCode ?? "—" },
  { key: "discord", header: "Discord", render: (r) => (r.isInDiscord ? <Badge tone="success">In</Badge> : <span className="text-muted">—</span>) },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) => (r.ownerId ? <Avatar name={r.ownerName ?? "?"} id={r.ownerId} /> : <span className="text-muted">—</span>),
  },
];

type SearchParams = Promise<{ q?: string; status?: string; level?: string; owner?: string }>;

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

  const [rawRows, [{ count }], statuses, users] = await Promise.all([
    db.select().from(birdDogs).where(where).orderBy(desc(birdDogs.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(birdDogs).where(where),
    db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder)),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/bird-dogs";
  const statusOptions = statuses.map((s) => ({ value: s.code, label: s.label }));
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <PageShell
      title="Bird Dogs"
      subtitle={`${count} scout${count === 1 ? "" : "s"}${q || status || level || owner ? " (filtered)" : ""}`}
      width="wide"
      action={<LinkButton href="/bird-dogs/new" size="sm">+ New bird dog</LinkButton>}
    >
      <div className="space-y-3 mb-5">
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
