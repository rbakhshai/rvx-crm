import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";

type Row = typeof deals.$inferSelect;

const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Deal",
    render: (r) => r.name ?? r.parkAddress ?? "(unnamed deal)",
  },
  {
    key: "state",
    header: "State",
    render: (r) => r.parkState ?? <span className="text-muted">—</span>,
  },
  {
    key: "pads",
    header: "Pads",
    className: "text-right tabular-nums",
    render: (r) => r.padsCount ?? <span className="text-muted">—</span>,
  },
  {
    key: "price",
    header: "List price",
    className: "text-right tabular-nums",
    render: (r) =>
      r.listPrice ? `$${Number(r.listPrice).toLocaleString()}` : <span className="text-muted">—</span>,
  },
  {
    key: "priority",
    header: "Priority",
    render: (r) =>
      r.dealPriority ? (
        <Badge tone={priorityTone[r.dealPriority as keyof typeof priorityTone] ?? "default"}>
          {r.dealPriority}
        </Badge>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "status",
    header: "Stage",
    className: "text-muted",
    render: (r) => r.statusCode ?? <span className="text-muted">—</span>,
  },
];

export default async function DealsListPage() {
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(deals).orderBy(desc(deals.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(deals),
  ]);

  return (
    <PageShell
      title="Deals"
      subtitle={`${count} deal${count === 1 ? "" : "s"} in the pipeline`}
      action={
        <LinkButton href="/deals/new" size="sm">
          + New deal
        </LinkButton>
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/deals/${r.id}`}
        empty={
          <EmptyState
            title="No deals yet"
            description="Add a park to the pipeline. Kanban view across the 40 pipeline stages ships in Phase 2."
            ctaLabel="+ New deal"
            ctaHref="/deals/new"
          />
        }
      />
    </PageShell>
  );
}
