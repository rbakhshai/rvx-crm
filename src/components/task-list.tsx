import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, user } from "@/db/schema";
import { Section } from "./section";
import { TaskComposer } from "./task-composer";
import { TaskRow } from "./task-row";

type ParentTable = "contacts" | "deals" | "companies" | "bird_dogs";

export async function TaskList({
  parentTable,
  parentId,
  currentUserId,
}: {
  parentTable: ParentTable;
  parentId: string;
  currentUserId?: string;
}) {
  const [openTasks, doneTasks, users] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTable, parentTable as never), eq(tasks.parentId, parentId), isNull(tasks.completedAt)))
      .orderBy(asc(tasks.dueAt)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTable, parentTable as never), eq(tasks.parentId, parentId), isNotNull(tasks.completedAt)))
      .orderBy(desc(tasks.completedAt))
      .limit(20),
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(asc(user.name)),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const assigneeOptions = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <Section title="Tasks" description={`${openTasks.length} open${doneTasks.length ? ` · ${doneTasks.length} completed` : ""}`}>
      <TaskComposer
        parentTable={parentTable}
        parentId={parentId}
        assigneeOptions={assigneeOptions}
        defaultAssigneeId={currentUserId}
      />

      {openTasks.length === 0 ? (
        <div className="text-xs text-muted text-center py-6">No open tasks.</div>
      ) : (
        <ol className="space-y-2">
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} assigneeName={t.assigneeId ? userMap.get(t.assigneeId)?.name ?? null : null} />
          ))}
        </ol>
      )}

      {doneTasks.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-muted cursor-pointer hover:text-foreground">
            Show {doneTasks.length} completed
          </summary>
          <ol className="mt-2 space-y-2">
            {doneTasks.map((t) => (
              <TaskRow key={t.id} task={t} assigneeName={t.assigneeId ? userMap.get(t.assigneeId)?.name ?? null : null} />
            ))}
          </ol>
        </details>
      )}
    </Section>
  );
}
