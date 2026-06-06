/**
 * Command Center — quarterly priorities + people view.
 *
 * Priority titles are editable inline. The PEOPLE roster is pulled
 * from the active CRM user list; their open-task counts come from the
 * existing tasks table.
 */
import { headers } from "next/headers";
import { and, asc, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, AccentCard, TimeToggle, parsePeriod, periodDays } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { fmtDate } from "@/lib/date-format";

const REVALIDATE = "/ops/command";
const PATHNAME = "/ops/command";

const DEFAULT_PRIORITIES = [
  "Migrate fully off Ontraport",
  "Hire 2 more closers (Marco + 2)",
  "Buyer network to 500 active",
  "Close $5M in parks",
  "Brokerage flywheel documented",
] as const;

export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const period = parsePeriod(params.period);

  const blocks = await getOpsBlocks("command.");

  // People + their open task counts
  const teammates = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(and(isNull(user.suspendedAt), isNull(user.deletedAt), ne(user.role, "bird_dog")))
    .orderBy(asc(user.name));

  // Period window: now → now + N days. Tasks with no due date are always
  // included (they're either always-on or someone hasn't scoped them yet).
  const now = new Date();
  const windowEnd = new Date(now.getTime() + periodDays(period) * 24 * 60 * 60 * 1000);

  const inPeriod = or(
    isNull(tasks.dueAt),
    and(gte(tasks.dueAt, now), lte(tasks.dueAt, windowEnd)),
  );

  const taskCounts = await db
    .select({
      assigneeId: tasks.assigneeId,
      open: sql<number>`COUNT(*) FILTER (WHERE ${tasks.completedAt} IS NULL)::int`,
      done: sql<number>`COUNT(*) FILTER (WHERE ${tasks.completedAt} IS NOT NULL)::int`,
    })
    .from(tasks)
    .where(inPeriod)
    .groupBy(tasks.assigneeId);
  const counts = new Map(taskCounts.map((c) => [c.assigneeId, { open: c.open, done: c.done }]));

  // Pull each teammate's 5 next-due open tasks within the period.
  const tasksByUser = new Map<string, Array<{ id: string; subject: string; dueAt: Date | null; parentTable: string; parentId: string }>>();
  for (const t of teammates) {
    const rows = await db
      .select({ id: tasks.id, subject: tasks.subject, dueAt: tasks.dueAt, parentTable: tasks.parentTable, parentId: tasks.parentId })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, t.id), isNull(tasks.completedAt), inPeriod))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(5);
    tasksByUser.set(t.id, rows);
  }

  return (
    <>
      <OpsHeader
        eyebrow="Command Center"
        title="Command"
        right={
          <div className="text-right">
            <div className="text-[11px] text-muted">Week of {fmtDate(new Date())}</div>
          </div>
        }
      />

      {/* Company Priorities */}
      <AccentCard accent="lime" className="p-5 mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-400 mb-3">
          Company Priorities · This Quarter
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DEFAULT_PRIORITIES.map((d, i) => {
            const scope = `command.priority.${i + 1}.title`;
            return (
              <div
                key={scope}
                className="rounded-lg bg-foreground/[0.04] dark:bg-foreground/[0.06] p-4 text-center"
              >
                <div className="text-2xl font-bold mb-1.5">{i + 1}</div>
                <EditableBlock
                  scope={scope}
                  initial={blocks.get(scope) ?? d}
                  revalidate={REVALIDATE}
                  className="text-xs font-medium leading-snug"
                />
              </div>
            );
          })}
        </div>
      </AccentCard>

      {/* Time toggle */}
      <div className="mb-4">
        <TimeToggle pathname={PATHNAME} period={period} />
      </div>

      <div className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">People</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teammates.map((t) => {
          const open = counts.get(t.id)?.open ?? 0;
          const done = counts.get(t.id)?.done ?? 0;
          const total = open + done;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const rowTasks = tasksByUser.get(t.id) ?? [];
          const profile = profileFor(t.name);
          const titleScope = `command.user.${t.id}.title`;
          const titleInitial = blocks.get(titleScope) ?? profile.title ?? labelRole(t.role);
          return (
            <div key={t.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={
                      "size-10 rounded-full grid place-items-center text-sm font-semibold shrink-0 " +
                      (profile.avatarBg ?? "bg-foreground/10") +
                      " " +
                      (profile.avatarText ?? "text-foreground")
                    }
                  >
                    {initials(t.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted font-medium">
                      <EditableBlock
                        scope={titleScope}
                        initial={titleInitial}
                        revalidate={REVALIDATE}
                      />
                    </div>
                  </div>
                </div>
                <ProgressRing pct={pct} />
              </div>
              <ul className="space-y-1.5">
                {rowTasks.length === 0 && (
                  <li className="text-xs text-muted py-2">No open tasks</li>
                )}
                {rowTasks.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <input type="checkbox" disabled className="size-3.5" />
                      <span className="truncate">{r.subject}</span>
                    </span>
                    {r.dueAt && (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
                        {fmtDate(r.dueAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function labelRole(role: string | null): string {
  const map: Record<string, string> = {
    admin: "ADMN",
    acquisitions_manager: "COS",
    bird_dog_manager: "COO",
    cfo: "CFO",
    closer: "Closer",
    underwriter: "UW",
    due_diligence: "DD",
    transaction_coord: "TC",
    dispo_manager: "Dispo",
    bd_level_1: "BD L1",
    bd_level_2: "BD L2",
    bd_level_3: "BD L3",
  };
  return role ? map[role] ?? role : "—";
}

/**
 * Per-person overrides for the Command Center avatar + title chip.
 * Keyed by lowercase first name so they survive a role change.
 *
 * Titles can still be edited per-user inline (scope: command.user.<id>
 * .title) — this map is just the starting value.
 */
const PROFILE_OVERRIDES: Record<
  string,
  { title?: string; avatarBg?: string; avatarText?: string }
> = {
  reza:  { title: "Cofounder / CEO", avatarBg: "bg-foreground", avatarText: "text-background" },
  erica: { title: "COS / Admin",     avatarBg: "bg-pink-400",   avatarText: "text-white" },
  marco: { title: "COO",             avatarBg: "bg-violet-800", avatarText: "text-white" },
  kerry: { title: "Due Diligence",   avatarBg: "bg-amber-800",  avatarText: "text-white" },
  kevin: { title: "CFO",             avatarBg: "bg-blue-500",   avatarText: "text-white" },
};

function profileFor(name: string) {
  const first = name.split(/\s+/)[0]?.toLowerCase() ?? "";
  return PROFILE_OVERRIDES[first] ?? {};
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative size-12">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/10" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          className="text-lime-400"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
