import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
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
import { SavedViewsBar } from "@/components/saved-views";
import { listSavedViews } from "@/app/actions/saved-views";
import { headers } from "next/headers";
import { loadColumnPreferences } from "@/app/actions/list-preferences";
import { CompanyColumnButton } from "./column-button";
import type { ColumnConfig } from "@/components/column-editor";
import { auth } from "@/lib/auth";
import { COMPANY_RELATIONSHIP_OPTIONS, US_STATES } from "@/lib/options";
import { fmtDate } from "@/lib/date-format";

type Row = typeof companies.$inferSelect & { ownerName?: string | null };

const relationshipLabel: Record<string, string> = {
  realtor: "Realtor",
  owner: "Owner",
  owner_realtor: "Owner + Realtor",
};

const columns: Column<Row>[] = [
  {
    key: "created",
    header: "Added",
    sortKey: "created",
    className: "w-28 text-muted tabular-nums whitespace-nowrap",
    render: (r) => <span title={r.createdAt.toLocaleString()}>{fmtDate(r.createdAt)}</span>,
  },
  { key: "fresh", header: "", className: "w-6", render: (r) => <StaleDot since={r.updatedAt} /> },
  { key: "name", header: "Name", sortKey: "name", className: "font-medium", render: (r) => r.name },
  {
    key: "relationship",
    header: "Relationship",
    sortKey: "relationship",
    render: (r) => <Badge>{relationshipLabel[r.relationshipToPark] ?? r.relationshipToPark}</Badge>,
  },
  {
    key: "seller",
    header: "Seller / broker",
    sortKey: "seller",
    render: (r) => [r.sellerFirstName, r.sellerLastName].filter(Boolean).join(" ") || <span className="text-muted">—</span>,
  },
  { key: "email", header: "Email", sortKey: "email", className: "text-muted", render: (r) => r.email ?? "—" },
  { key: "phone", header: "Phone", sortKey: "phone", className: "text-muted", render: (r) => r.phone ?? "—" },
  { key: "state", header: "State", sortKey: "state", render: (r) => r.state ?? <span className="text-muted">—</span> },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) => (r.ownerId ? <Avatar name={r.ownerName ?? "?"} id={r.ownerId} /> : <span className="text-muted">—</span>),
  },
];

const SORT_COLUMNS: Record<string, SQLWrapper> = {
  created: companies.createdAt,
  name: companies.name,
  relationship: companies.relationshipToPark,
  seller: companies.sellerFirstName,
  email: companies.email,
  phone: companies.phone,
  state: companies.state,
};

type SearchParams = Promise<{ q?: string; relationship?: string; state?: string; owner?: string; sort?: string; dir?: string }>;

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

  // Sort: ?sort=created|name|relationship|seller|email|phone|state, ?dir=asc|desc.
  // Default: newest first.
  const sortKey = params.sort && SORT_COLUMNS[params.sort] ? params.sort : null;
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : "asc";
  const orderBy = sortKey
    ? (sortDir === "asc" ? asc(SORT_COLUMNS[sortKey]) : desc(SORT_COLUMNS[sortKey]))
    : desc(companies.createdAt);

  const session = await auth.api.getSession({ headers: await headers() });
  const [rawRows, [{ count }], users, savedViews] = await Promise.all([
    db.select().from(companies).where(where).orderBy(orderBy).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(companies).where(where),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    session ? listSavedViews("companies", session.user.id) : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/companies";
  const ownerOptions = users.map((u) => ({ value: u.id, label: u.name }));

  // Load column preferences and build display columns
  const prefs = await loadColumnPreferences("companies");
  const allColumnConfigs: ColumnConfig[] = columns.map((col, i) => ({
    key: col.key,
    label: col.header || col.key,
    visible: true,
    order: i,
  }));

  let displayColumns = columns;
  let selectedColumnConfigs = allColumnConfigs;

  if (prefs?.columns) {
    // Filter to visible columns and reorder
    const visibleKeys = prefs.columns.filter((c) => c.visible).sort((a, b) => a.order - b.order).map((c) => c.key);
    displayColumns = visibleKeys
      .map((key) => columns.find((col) => col.key === key))
      .filter((col) => col !== undefined) as Column<Row>[];

    // Rebuild selectedColumnConfigs with labels from allColumnConfigs
    selectedColumnConfigs = prefs.columns.map((pref) => ({
      ...pref,
      label: allColumnConfigs.find((c) => c.key === pref.key)?.label || pref.key,
    }));
  }

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
      title="Sellers"
      subtitle={`${count} seller${count === 1 ? "" : "s"}${q || relationship || state || owner ? " (filtered)" : ""}`}
      width="wide"
      action={
        <div className="flex gap-2 items-center">
          <CompanyColumnButton allColumns={allColumnConfigs} selectedColumns={selectedColumnConfigs} />
          <LinkButton href="/companies/new" size="sm">+ New seller</LinkButton>
        </div>
      }
    >
      <div className="space-y-3 mb-5">
        <SavedViewsBar scope="companies" views={savedViews} />
        <SearchInput scope="scoped" placeholder="Search sellers by company, broker name, email…" />
        <FilterChips label="Relationship" paramKey="relationship" current={relationship} pathname={pathname} searchParams={params} options={COMPANY_RELATIONSHIP_OPTIONS} />
        <FilterChips label="State" paramKey="state" current={state} pathname={pathname} searchParams={params} options={US_STATES} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
      </div>

      <DataTable
        rows={rows}
        columns={displayColumns}
        rowHref={(r) => `/companies/${r.id}`}
        sort={{ current: sortKey, dir: sortDir, hrefFor: buildSortHref }}
        empty={
          <EmptyState
            icon="🏢"
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
