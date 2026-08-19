/**
 * /mission-control — THE company page, standalone (out of the Ops
 * Machine tab strip per Reza's consolidation decisions, 2026-06-12).
 *
 * Layout, top to bottom:
 *   1. Reza's six tiles — dials today · leads today · leads 7d ·
 *      closer-qualified 7d · LOIs out · in escrow — plus two small
 *      context tiles (parks owned X/10 → /pool, BD apps → /bd-team)
 *   2. Pipeline value + funnel
 *   3. USA deal map (below the fold by design)
 *   4. Live activity pulse (now includes BD dials)
 *   5. The EOS command sheet — company priorities + per-person rocks
 *
 * Replaces both /ops/command and the old /dashboard (now redirects).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandRocks, tasks, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { getOpsBlocks } from "@/lib/ops-content";
import { getMissionTiles } from "@/lib/mission-control";
import { fetchActiveDealsForMap, fetchPipelineFunnel, fetchRecentActivity } from "@/lib/dashboard-queries";
import { PipelineFunnel } from "@/components/pipeline-funnel";
import { ActivityPulse } from "@/components/activity-pulse";
import { DealsMap } from "@/components/deals-map";
import { PageShell } from "../page-shell";
import { AccentCard, TimeToggle, parsePeriod, periodDays } from "../ops/ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { fmtDate } from "@/lib/date-format";
import { RocksBlock } from "./rocks-block";

const REVALIDATE = "/mission-control";
const PATHNAME = "/mission-control";

const DEFAULT_PRIORITIES = [
  "Migrate fully off Ontraport",
  "Hire 2 more closers (Marco + 2)",
  "Buyer network to 500 active",
  "Close $5M in parks",
  "Brokerage flywheel documented",
] as const;

export default async function MissionControlPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();
  const canEditRocks = (session.user as { role?: string }).role === "admin";

  const params = await searchParams;
  const rawPeriod = parsePeriod(params.period);
  const period = rawPeriod === "month" ? "quarter" : rawPeriod;

  const [tiles, funnel, mapPins, activity, blocks] = await Promise.all([
    getMissionTiles().catch(() => null),
    fetchPipelineFunnel().catch(() => null),
    fetchActiveDealsForMap().catch(() => []),
    fetchRecentActivity(25).catch(() => []),
    getOpsBlocks("command."),
  ]);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  // ---- EOS sheet data (lifted from the old /ops/command) ----
  const teammatesRaw = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(and(isNull(user.suspendedAt), isNull(user.deletedAt), ne(user.role, "bird_dog")))
    .orderBy(asc(user.name));

  const PEOPLE_RANK: Record<string, number> = { reza: 1, erica: 2, marco: 3, kevin: 4, kerry: 5 };
  const teammates = [...teammatesRaw].sort((a, b) => {
    const ra = PEOPLE_RANK[a.name.split(/\s+/)[0]?.toLowerCase() ?? ""] ?? 100;
    const rb = PEOPLE_RANK[b.name.split(/\s+/)[0]?.toLowerCase() ?? ""] ?? 100;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  const now = new Date();
  const windowEnd = new Date(now.getTime() + periodDays(period) * 24 * 60 * 60 * 1000);
  const inPeriod = or(isNull(tasks.dueAt), and(gte(tasks.dueAt, now), lte(tasks.dueAt, windowEnd)));

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

  const tasksByUser = new Map<string, Array<{ id: string; subject: string; dueAt: Date | null }>>();
  for (const t of teammates) {
    const rows = await db
      .select({ id: tasks.id, subject: tasks.subject, dueAt: tasks.dueAt })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, t.id), isNull(tasks.completedAt), inPeriod))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(5);
    tasksByUser.set(t.id, rows);
  }

  const allRocks = await db
    .select()
    .from(commandRocks)
    .where(eq(commandRocks.period, period))
    .orderBy(asc(commandRocks.position), asc(commandRocks.createdAt));
  const rocksByUser = new Map<string, typeof allRocks>();
  for (const r of allRocks) {
    const arr = rocksByUser.get(r.assigneeId) ?? [];
    arr.push(r);
    rocksByUser.set(r.assigneeId, arr);
  }

  return (
    <PageShell
      title="Mission Control"
      subtitle={`The whole company on one page — week of ${fmtDate(new Date())}.`}
      width="wide"
    >
      {/* 1 — Reza's six tiles + two context tiles */}
      {tiles && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
          <Tile value={tiles.dialsToday} label="BD dials today" />
          <Tile value={tiles.leadsToday} label="Leads today" />
          <Tile value={tiles.leadsWeek} label="Leads · 7d" />
          <Tile value={tiles.closerQualifiedWeek} label="Closer-qualified · 7d" hint="connected + open to selling" />
          <Tile value={tiles.loisOut} label="LOIs out" />
          <Tile value={tiles.inEscrow} label="In escrow" />
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/[0.06] px-3 py-2.5">
            <div className="text-2xl font-bold tabular-nums leading-none">
              {tiles.parksOwned}<span className="text-sm text-muted font-medium">/{tiles.targetParks}</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">Parks owned</div>
          </div>
          <Link href="/bd-team" className="rounded-xl border border-border bg-foreground/[0.02] px-3 py-2.5 hover:bg-foreground/[0.04] transition">
            <div className="text-2xl font-bold tabular-nums leading-none">{tiles.bdAppsPending}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">BD applications</div>
          </Link>
        </div>
      )}

      {/* 2 — Pipeline value + funnel */}
      {funnel && (
        <div className="mb-5">
          <PipelineFunnel
            stages={funnel.stages}
            totalActiveValueCents={funnel.activeValueCents}
            totalActiveCount={funnel.activeCount}
            closedValueCents={funnel.closedValueCents}
            closedCount={funnel.closedCount}
          />
        </div>
      )}

      {/* 3 — USA map */}
      {mapPins.length > 0 && (
        <section className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm uppercase tracking-widest text-muted font-medium">
              Active pipeline — coast to coast
            </h2>
            <span className="text-[11px] text-muted">{mapPins.length} active parks</span>
          </div>
          <DealsMap pins={mapPins} apiKey={mapsApiKey} />
        </section>
      )}

      {/* 4 — Live activity pulse (incl. BD dials) */}
      {activity.length > 0 && (
        <div className="mb-8">
          <ActivityPulse events={activity} />
        </div>
      )}

      {/* 5 — EOS command sheet */}
      <AccentCard accent="lime" className="p-5 mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-400 mb-3">
          Company Priorities · {periodLabel(period)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DEFAULT_PRIORITIES.map((d, i) => {
            const scope = `command.priority.${i + 1}.title`;
            return (
              <div key={scope} className="rounded-lg bg-foreground/[0.04] dark:bg-foreground/[0.06] p-4 text-center">
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

      <div className="mb-4">
        <TimeToggle pathname={PATHNAME} period={period} omit={["month"]} />
      </div>

      <div className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">
        People · Tasks due this {periodLabel(period).replace("This ", "")}
      </div>
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
                      (profile.avatarBg ?? "bg-foreground/10") + " " + (profile.avatarText ?? "text-foreground")
                    }
                  >
                    {initials(t.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted font-medium">
                      <EditableBlock scope={titleScope} initial={titleInitial} revalidate={REVALIDATE} />
                    </div>
                  </div>
                </div>
                <ProgressRing pct={pct} />
              </div>
              <RocksBlock
                assigneeId={t.id}
                period={period}
                initialRocks={(rocksByUser.get(t.id) ?? []).map((r) => ({
                  id: r.id,
                  title: r.title,
                  doneAt: r.doneAt?.toISOString() ?? null,
                }))}
                canEdit={canEditRocks}
              />
              <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-3 mb-1.5">
                Tasks
              </div>
              <ul className="space-y-1.5">
                {rowTasks.length === 0 && <li className="text-xs text-muted py-2">No open tasks</li>}
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
    </PageShell>
  );
}

function Tile({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5" title={hint}>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1 leading-tight">{label}</div>
    </div>
  );
}

function periodLabel(p: "week" | "month" | "quarter"): string {
  return p === "week" ? "This Week" : p === "month" ? "This Month" : "This Quarter";
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function labelRole(role: string | null): string {
  const map: Record<string, string> = {
    admin: "CEO",
    acquisitions_manager: "Sales & Marketing",
    bird_dog_manager: "Operations",
    cfo: "Finance",
    park_manager: "Park Manager",
    closer: "Closer",
    underwriter: "UW",
    due_diligence: "DD",
    transaction_coord: "TC",
    dispo_manager: "Dispo",
    bd_level_1: "Acq L1",
    bd_level_2: "Acq L2",
    bd_level_3: "Acq L3",
  };
  return role ? map[role] ?? role : "—";
}

const PROFILE_OVERRIDES: Record<string, { title?: string; avatarBg?: string; avatarText?: string }> = {
  reza:  { title: "Cofounder / CEO",   avatarBg: "bg-foreground",  avatarText: "text-background" },
  erica: { title: "Sales & Marketing", avatarBg: "bg-pink-400",    avatarText: "text-white" },
  marco: { title: "Operations",        avatarBg: "bg-emerald-600", avatarText: "text-white" },
  kerry: { title: "Due Diligence",     avatarBg: "bg-amber-800",   avatarText: "text-white" },
  kevin: { title: "Finance",           avatarBg: "bg-blue-500",    avatarText: "text-white" },
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
          cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          className="text-lime-400"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
