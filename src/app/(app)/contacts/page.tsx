import { and, desc, eq, ilike, isNull, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { contacts, user } from "@/db/schema";
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
import {
  BUYER_STATUS_OPTIONS,
  QUALIFICATION_TIER_OPTIONS,
  US_STATES,
} from "@/lib/options";
import { fmtDate } from "@/lib/date-format";

const statusLabel = new Map(BUYER_STATUS_OPTIONS.map((o) => [o.value, o.label]));
const tierLabel = new Map(QUALIFICATION_TIER_OPTIONS.map((o) => [o.value, o.label.replace(/^\[\d\] /, "")]));

type Row = typeof contacts.$inferSelect & { ownerName?: string | null };

const columns: Column<Row>[] = [
  {
    key: "created",
    header: "Added",
    sortKey: "created",
    className: "w-24 text-muted tabular-nums",
    render: (r) => <span title={r.createdAt.toLocaleString()}>{fmtDate(r.createdAt)}</span>,
  },
  { key: "fresh", header: "", className: "w-6", render: (r) => <StaleDot since={r.updatedAt} /> },
  {
    key: "name",
    header: "Name",
    sortKey: "name",
    render: (r) => [r.firstName, r.lastName].filter(Boolean).join(" ") || "(unnamed)",
  },
  { key: "email", header: "Email", sortKey: "email", className: "text-muted", render: (r) => r.email ?? "—" },
  {
    key: "tier",
    header: "Tier",
    sortKey: "tier",
    render: (r) =>
      r.qualificationTier ? <Badge tone="info">{tierLabel.get(r.qualificationTier) ?? r.qualificationTier}</Badge> : <span className="text-muted">—</span>,
  },
  {
    key: "status",
    header: "Status",
    sortKey: "status",
    render: (r) =>
      r.status ? (
        <Badge tone={r.status === "active_looking_hot" ? "warning" : "default"}>{statusLabel.get(r.status) ?? r.status}</Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "pof",
    header: "POF",
    sortKey: "pof",
    className: "text-right tabular-nums",
    render: (r) => (r.pofAmount ? `$${Number(r.pofAmount).toLocaleString()}` : <span className="text-muted">—</span>),
  },
  { key: "state", header: "State", sortKey: "state", render: (r) => r.state ?? <span className="text-muted">—</span> },
  {
    key: "owner",
    header: "Owner",
    className: "w-12",
    render: (r) => (r.ownerId ? <Avatar name={r.ownerName ?? "?"} id={r.ownerId} /> : <span className="text-muted">—</span>),
  },
];

const SORT_COLUMNS: Record<string, SQLWrapper> = {
  created: contacts.createdAt,
  name: contacts.firstName,    // primary sort by first name; works well for A-Z
  email: contacts.email,
  tier: contacts.qualificationTier,
  status: contacts.status,
  pof: contacts.pofAmount,
  state: contacts.state,
};

type SearchParams = Promise<{ q?: string; status?: string; tier?: string; state?: string; owner?: string; sort?: string; dir?: string }>;

export default async function ContactsListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { q, status, tier, state, owner } = params;

  const filters: SQL[] = [isNull(contacts.deletedAt)];
  if (q) {
    const pat = `%${q}%`;
    const cond = or(ilike(contacts.firstName, pat), ilike(contacts.lastName, pat), ilike(contacts.email, pat), ilike(contacts.phone, pat));
    if (cond) filters.push(cond);
  }
  if (status) filters.push(eq(contacts.status, status as never));
  if (tier) filters.push(eq(contacts.qualificationTier, tier as never));
  if (state) filters.push(eq(contacts.state, state));
  if (owner) filters.push(eq(contacts.ownerId, owner));

  const where = filters.length ? and(...filters) : undefined;

  // Sort: ?sort=created|name|email|tier|status|pof|state, ?dir=asc|desc.
  // Default: newest first.
  const sortKey = params.sort && SORT_COLUMNS[params.sort] ? params.sort : null;
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : "asc";
  const orderBy = sortKey
    ? (sortDir === "asc" ? asc(SORT_COLUMNS[sortKey]) : desc(SORT_COLUMNS[sortKey]))
    : desc(contacts.createdAt);

  const session = await auth.api.getSession({ headers: await headers() });
  const [rawRows, [{ count }], users, savedViews] = await Promise.all([
    db.select().from(contacts).where(where).orderBy(orderBy).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(where),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    session ? listSavedViews("contacts", session.user.id) : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: Row[] = rawRows.map((r) => ({
    ...r,
    ownerName: r.ownerId ? userMap.get(r.ownerId) ?? null : null,
  }));

  const pathname = "/contacts";
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
      title="Buyers"
      subtitle={`${count} buyer${count === 1 ? "" : "s"}${q || status || tier || state || owner ? " (filtered)" : ""}`}
      width="wide"
      action={<LinkButton href="/contacts/new" size="sm">+ New buyer</LinkButton>}
    >
      <div className="space-y-3 mb-5">
        <SavedViewsBar scope="contacts" views={savedViews} />
        <SearchInput scope="scoped" placeholder="Search buyers by name, email, phone…" />
        <FilterChips label="Status" paramKey="status" current={status} pathname={pathname} searchParams={params} options={BUYER_STATUS_OPTIONS} />
        <FilterChips label="Tier" paramKey="tier" current={tier} pathname={pathname} searchParams={params}
          options={QUALIFICATION_TIER_OPTIONS.map((o) => ({ value: o.value, label: o.label.replace(/^\[\d\] /, "") }))}
        />
        <FilterChips label="State" paramKey="state" current={state} pathname={pathname} searchParams={params} options={US_STATES} />
        {users.length > 1 && (
          <FilterChips label="Owner" paramKey="owner" current={owner} pathname={pathname} searchParams={params} options={ownerOptions} />
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/contacts/${r.id}`}
        sort={{ current: sortKey, dir: sortDir, hrefFor: buildSortHref }}
        empty={
          <EmptyState
            icon="👤"
            title="No buyers match"
            description="Try clearing filters or adding a buyer."
            ctaLabel="+ New buyer"
            ctaHref="/contacts/new"
          />
        }
      />
    </PageShell>
  );
}
