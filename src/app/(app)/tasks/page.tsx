import Link from "next/link";
import { headers } from "next/headers";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { tasks, user, contacts, deals, companies, birdDogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { TaskRow } from "@/components/task-row";
import { EmptyState } from "@/components/empty-state";
import { requirePagePermission } from "@/lib/page-guard";

type SearchParams = Promise<{ view?: string }>;

const VIEWS = [
  { key: "mine_open",     label: "My open" },
  { key: "mine_overdue",  label: "My overdue" },
  { key: "all_open",      label: "Everyone open" },
  { key: "completed",     label: "Completed" },
  { key: "all",           label: "All" },
] as const;

function parentPath(table: string, id: string): string {
  const map: Record<string, string> = {
    contacts: "/contacts",
    deals: "/deals",
    companies: "/companies",
    bird_dogs: "/bird-dogs",
  };
  return `${map[table] ?? ""}/${id}`;
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePagePermission("view_tasks");
  const { view: rawView } = await searchParams;
  const view = (VIEWS.find((v) => v.key === rawView)?.key ?? "mine_open") as typeof VIEWS[number]["key"];

  const session = await auth.api.getSession({ headers: await headers() });
  const me = session?.user.id;
  if (!me) return null;

  const filters = [];
  if (view === "mine_open") filters.push(eq(tasks.assigneeId, me), isNull(tasks.completedAt));
  if (view === "mine_overdue") filters.push(eq(tasks.assigneeId, me), isNull(tasks.completedAt), lt(tasks.dueAt, new Date()));
  if (view === "all_open") filters.push(isNull(tasks.completedAt));
  if (view === "completed") filters.push(isNotNull(tasks.completedAt));

  const where = filters.length ? and(...filters) : undefined;

  const taskRows = await db
    .select()
    .from(tasks)
    .where(where)
    .orderBy(view === "completed" ? desc(tasks.completedAt) : asc(tasks.dueAt))
    .limit(200);

  const userIds = [...new Set(taskRows.map((t) => t.assigneeId).filter((x): x is string => !!x))];
  const users = userIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Fetch parent labels in batches per table
  const byTable = new Map<string, string[]>();
  for (const t of taskRows) {
    const arr = byTable.get(t.parentTable) ?? [];
    arr.push(t.parentId);
    byTable.set(t.parentTable, arr);
  }
  const parentLabels = new Map<string, string>(); // `${table}:${id}` → label
  const fetches = [];
  if (byTable.get("contacts")?.length) {
    fetches.push(
      db.select({ id: contacts.id, fn: contacts.firstName, ln: contacts.lastName }).from(contacts).where(inArray(contacts.id, byTable.get("contacts")!)).then((rows) => {
        rows.forEach((r) => parentLabels.set(`contacts:${r.id}`, [r.fn, r.ln].filter(Boolean).join(" ") || "(unnamed buyer)"));
      }),
    );
  }
  if (byTable.get("deals")?.length) {
    fetches.push(
      db.select({ id: deals.id, name: deals.name, addr: deals.parkAddress }).from(deals).where(inArray(deals.id, byTable.get("deals")!)).then((rows) => {
        rows.forEach((r) => parentLabels.set(`deals:${r.id}`, r.name || r.addr || "(unnamed deal)"));
      }),
    );
  }
  if (byTable.get("companies")?.length) {
    fetches.push(
      db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, byTable.get("companies")!)).then((rows) => {
        rows.forEach((r) => parentLabels.set(`companies:${r.id}`, r.name));
      }),
    );
  }
  if (byTable.get("bird_dogs")?.length) {
    fetches.push(
      db.select({ id: birdDogs.id, fn: birdDogs.firstName, ln: birdDogs.lastName }).from(birdDogs).where(inArray(birdDogs.id, byTable.get("bird_dogs")!)).then((rows) => {
        rows.forEach((r) => parentLabels.set(`bird_dogs:${r.id}`, [r.fn, r.ln].filter(Boolean).join(" ") || "(unnamed)"));
      }),
    );
  }
  await Promise.all(fetches);

  return (
    <PageShell title="Tasks" subtitle="Your work queue across every record." width="wide">
      <div className="mb-4 flex items-center gap-2 text-xs flex-wrap">
        {VIEWS.map((v) => {
          const active = view === v.key;
          return (
            <Link
              key={v.key}
              href={`/tasks?view=${v.key}`}
              className={
                "rounded-full px-2.5 py-0.5 border " +
                (active ? "bg-foreground/[0.06] border-foreground/20" : "border-border text-muted hover:bg-foreground/[0.03]")
              }
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      {taskRows.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No tasks in this view"
          description="Add tasks from any buyer / deal / seller / bird dog detail page. They show up here grouped by your filters."
        />
      ) : (
        <ol className="space-y-2">
          {taskRows.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              assigneeName={t.assigneeId ? userMap.get(t.assigneeId)?.name ?? null : null}
              parentLabel={parentLabels.get(`${t.parentTable}:${t.parentId}`)}
              parentHref={parentPath(t.parentTable, t.parentId)}
            />
          ))}
        </ol>
      )}
    </PageShell>
  );
}
