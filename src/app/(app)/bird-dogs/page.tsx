import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs } from "@/db/schema";
import { PageShell } from "../page-shell";
import { LinkButton } from "@/components/button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";

type Row = typeof birdDogs.$inferSelect;

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Name",
    render: (r) => [r.firstName, r.lastName].filter(Boolean).join(" ") || "(unnamed)",
  },
  {
    key: "email",
    header: "Email",
    className: "text-muted",
    render: (r) => r.email ?? "—",
  },
  {
    key: "level",
    header: "Level",
    render: (r) =>
      r.acquisitionLevel ? <Badge>{r.acquisitionLevel}</Badge> : <span className="text-muted">—</span>,
  },
  {
    key: "status",
    header: "Status",
    className: "text-muted",
    render: (r) => r.statusCode ?? "—",
  },
  {
    key: "discord",
    header: "Discord",
    render: (r) =>
      r.isInDiscord ? <Badge tone="success">In</Badge> : <span className="text-muted">—</span>,
  },
];

export default async function BirdDogsListPage() {
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(birdDogs).orderBy(desc(birdDogs.createdAt)).limit(100),
    db.select({ count: sql<number>`count(*)::int` }).from(birdDogs),
  ]);

  return (
    <PageShell
      title="Bird Dogs"
      subtitle={`${count} scout${count === 1 ? "" : "s"} on the team`}
      action={
        <LinkButton href="/bird-dogs/new" size="sm">
          + New bird dog
        </LinkButton>
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowHref={(r) => `/bird-dogs/${r.id}`}
        empty={
          <EmptyState
            title="No bird dogs yet"
            description="Onboard your first scout. The 21 seeded statuses (HOLD → interview → agreement → onboarding → active) are already wired into the form."
            ctaLabel="+ New bird dog"
            ctaHref="/bird-dogs/new"
          />
        }
      />
    </PageShell>
  );
}
