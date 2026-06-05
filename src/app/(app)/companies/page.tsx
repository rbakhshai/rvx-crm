import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, user } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";
import { SearchInput } from "@/components/search-input";
import { FilterChips } from "@/components/filter-chips";
import { Avatar } from "@/components/avatar";
import { StaleDot } from "@/components/stale-dot";
import { COMPANY_RELATIONSHIP_OPTIONS, US_STATES } from "@/lib/options";

type Row = typeof companies.$inferSelect & { ownerName?: string | null };

const relationshipLabel: Record<string, string> = {
  realtor: "Realtor",
  owner: "Owner",
  owner_realtor: "Owner + Realtor",
};

const columns: Column<Row>[] = [
  { key: "fresh", header: "", className: "w-6", render: (r) => <StaleDot since={r.updatedAt} /> },
  { key: "name", header: "Name", render: (r) => r.name },
  { key: "relationship", header: "Relationship", render: (r) => <Badge>{relationshipLabel[r.relationshipToPark] ?? r.relationshipToPark}</Badge> },
  {
    key: "seller",
    header: "Seller / broker",
    render: (r) => [r.sellerFirstName, r.sellerLastName].filter(Boolean).join(" ") || <span className="text-muted">—</span>,
  },
  { key: "email", header: "Email", className: "text-muted", render: (r) => r.email ?? "—" },
  { key: "phone", header: "Phone", className: "text-muted", render: (r) => r.phone ?? "—" },
  { key: "state", header: "State", render: (r) => r.state ?? <span className="text-muted">—</span> },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) => (r.ownerId ? <Avatar name={r.ownerName ?? "?"} id={r.ownerId} /> : <span className="text-muted">—</span>),
  },
];

type SearchParams = Promise<{ q?: string; relationship?: string; state?: string; owner?: string }>;

export default async function CompaniesListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { q, relationship, state, owner } = params;

  const filters: SQL[] = [isNull(companies.deletedAt)];
  if (q) {
    const pat = `%${q}%`;
    const cond = or(ilike(companies.name, pat), ilike(companies.sellerFirstName, pat), ilike(companies.sellerLastName, pat), ilike(companies.email, pat));
    if (cond) filters.push(cond);
  }
  if (relationship) filters.push(eq(companies.relationshipToPark, relationship as never));
  if (state) filters.push(eq(companies.state, state));
  if (owner) filters.push(eq(companies.ownerId, owner));

  const where = filters.length ? and(...filters) : undefined;

  const [rawRows, [{ count }], users] = await Promise.all([
    db.select().from(companies).where(where).orderBy(desc(companies.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(companies).where(where),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/companies";
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <PageShell
      title="Sellers"
      subtitle={`${count} seller${count === 1 ? "" : "s"}${q || relationship || state || owner ? " (filtered)" : ""}`}
      width="wide"
      action={<LinkButton href="/companies/new" size="sm">+ New seller</LinkButton>}
    >
      <div className="space-y-3 mb-5">
        <SearchInput scope="scoped" placeholder="Search sellers by company, broker name, email…" />
        <FilterChips label="Relationship" paramKey="relationship" current={relationship} pathname={pathname} searchParams={params} options={COMPANY_RELATIONSHIP_OPTIONS} />
        <FilterChips label="State" paramKey="state" current={state} pathname={pathname} searchParams={params} options={US_STATES} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/companies/${r.id}`}
        empty={
          <EmptyState
            title="No sellers match"
            description="Try clearing filters or adding a seller."
            ctaLabel="+ New seller"
            ctaHref="/companies/new"
          />
        }
      />
    </PageShell>
  );
}
