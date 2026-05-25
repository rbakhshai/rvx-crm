import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";
import {
  BUYER_STATUS_OPTIONS,
  QUALIFICATION_TIER_OPTIONS,
} from "@/lib/options";

const statusLabel = new Map(BUYER_STATUS_OPTIONS.map((o) => [o.value, o.label]));
const tierLabel = new Map(QUALIFICATION_TIER_OPTIONS.map((o) => [o.value, o.label.replace(/^\[\d\] /, "")]));

type Row = typeof contacts.$inferSelect;

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    render: (r) => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "(unnamed)";
      return <span>{name}</span>;
    },
  },
  {
    key: "email",
    header: "Email",
    className: "text-muted",
    render: (r) => r.email ?? "—",
  },
  {
    key: "tier",
    header: "Tier",
    render: (r) =>
      r.qualificationTier ? (
        <Badge tone="info">{tierLabel.get(r.qualificationTier) ?? r.qualificationTier}</Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) =>
      r.status ? (
        <Badge tone={r.status === "active_looking_hot" ? "warning" : "default"}>
          {statusLabel.get(r.status) ?? r.status}
        </Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "pof",
    header: "POF",
    className: "text-right tabular-nums",
    render: (r) => (r.pofAmount ? `$${Number(r.pofAmount).toLocaleString()}` : <span className="text-muted">—</span>),
  },
  {
    key: "state",
    header: "State",
    render: (r) => r.state ?? <span className="text-muted">—</span>,
  },
];

export default async function ContactsListPage() {
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(contacts),
  ]);

  return (
    <PageShell
      title="Buyers"
      subtitle={`${count} buyer${count === 1 ? "" : "s"} in the book`}
      action={
        <LinkButton href="/contacts/new" size="sm">
          + New buyer
        </LinkButton>
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/contacts/${r.id}`}
        empty={
          <EmptyState
            title="No buyers yet"
            description="Add your first buyer to start the book. Once Phase 5 ships, your full Ontraport list will be migrated here automatically."
            ctaLabel="+ New buyer"
            ctaHref="/contacts/new"
          />
        }
      />
    </PageShell>
  );
}
