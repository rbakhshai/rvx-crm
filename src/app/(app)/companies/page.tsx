import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";

type Row = typeof companies.$inferSelect;

const relationshipLabel: Record<string, string> = {
  realtor: "Realtor",
  owner: "Owner",
  owner_realtor: "Owner + Realtor",
};

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    render: (r) => r.name,
  },
  {
    key: "relationship",
    header: "Relationship",
    render: (r) => <Badge>{relationshipLabel[r.relationshipToPark] ?? r.relationshipToPark}</Badge>,
  },
  {
    key: "seller",
    header: "Seller / broker",
    render: (r) => [r.sellerFirstName, r.sellerLastName].filter(Boolean).join(" ") || <span className="text-muted">—</span>,
  },
  {
    key: "email",
    header: "Email",
    className: "text-muted",
    render: (r) => r.email ?? "—",
  },
  {
    key: "phone",
    header: "Phone",
    className: "text-muted",
    render: (r) => r.phone ?? "—",
  },
  {
    key: "state",
    header: "State",
    render: (r) => r.state ?? <span className="text-muted">—</span>,
  },
];

export default async function CompaniesListPage() {
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(companies).orderBy(desc(companies.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(companies),
  ]);

  return (
    <PageShell
      title="Sellers"
      subtitle={`${count} seller${count === 1 ? "" : "s"} on file`}
      action={
        <LinkButton href="/companies/new" size="sm">
          + New seller
        </LinkButton>
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/companies/${r.id}`}
        empty={
          <EmptyState
            title="No sellers yet"
            description="Add an owner, realtor, or broker. Sellers tie back to deals via the deal-form's Relations section."
            ctaLabel="+ New seller"
            ctaHref="/companies/new"
          />
        }
      />
    </PageShell>
  );
}
