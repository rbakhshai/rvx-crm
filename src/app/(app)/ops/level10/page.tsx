/**
 * Level 10 — Monday Leadership Meeting structure.
 *
 * Mirrors the classic EOS 90-minute agenda (Segue → Scorecard → Rock
 * Review → Headlines → To-Do List → IDS → Conclude). The AgendaTimer
 * card at the top runs live per-section countdowns so the team can SEE
 * when a section is eating the IDS hour.
 */
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { level10ActionItems, level10Meetings, level10ScorecardSnapshots, user } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { MeetingTextarea, MeetingRating, RefreshSnapshotButton, ActionItemsBlock } from "./level10-widgets";
import { AgendaTimer, type AgendaSection } from "./agenda-timer";
import { ScorecardActualsButton } from "./scorecard-actuals-modal";
import { mondayOf } from "@/lib/level10-week";
import { fmtDate } from "@/lib/date-format";
import {
  SCORECARD_DEFINITIONS,
  computeScorecardActuals,
  formatScoreVal,
  scoreTone,
} from "@/lib/level10-scorecard";

const REVALIDATE = "/ops/level10";

// Scorecard metric defs + live-actual query live in @/lib/level10-scorecard
// so the snapshot server action can reuse them.

/**
 * EOS definitions for the ⓘ hover cards — straight from the Rock vs.
 * To-Do vs. Issue framework, so nobody has to ask "what counts as a
 * rock?" mid-meeting.
 */
const EOS_DEFINITIONS: Record<"rock" | "todo" | "issue", { title: string; points: string[] }> = {
  rock: {
    title: "What's a Rock?",
    points: [
      "A priority that takes MORE than 14 days and must get done this quarter",
      "30–90 days of sustained effort",
      "One owner, due at the quarterly reset",
      "Reviewed on/off track every Level 10",
      "Broken down into weekly To-Dos",
      "3–7 per person max — less is more",
    ],
  },
  todo: {
    title: "What's a To-Do?",
    points: [
      "One person, one action",
      "Anything committed to that must get done in the next 7 days (worst case 14)",
      "Completed by next week's Level 10 — confirmed in that meeting",
      "The weekly execution engine",
    ],
  },
  issue: {
    title: "What's an Issue?",
    points: [
      "Bring your top 3 issues to this meeting with priority ranked",
      "Identify, Discuss, Solve the highest priority issue into a To-Do",
      "If time permits, resolve more issues with the team",
      "Park long-term items (not this quarter) on your parking lot",
    ],
  },
};

/** The classic EOS 90-minute agenda — order, budgets, and anchors. */
const AGENDA: AgendaSection[] = [
  { key: "segue",           title: "Segue",                        minutes: 5,  anchorId: "l10-segue",           emoji: "👥" },
  { key: "headlines",       title: "Headlines",                    minutes: 5,  anchorId: "l10-headlines",       emoji: "📣" },
  { key: "scorecard",       title: "Scorecard",                    minutes: 5,  anchorId: "l10-scorecard",       emoji: "📈" },
  { key: "rocks",           title: "Rock Review",                  minutes: 5,  anchorId: "l10-rocks",           emoji: "🔺" },
  { key: "empl-headline",   title: "Employee/Customer Headline",   minutes: 5,  anchorId: "l10-empl-headline",   emoji: "👤" },
  { key: "todos",           title: "To-Do List",                   minutes: 5,  anchorId: "l10-todos",           emoji: "📝" },
  { key: "ids",             title: "IDS",                          minutes: 60, anchorId: "l10-ids",             emoji: "💡" },
  { key: "conclude",        title: "Conclude",                     minutes: 5,  anchorId: "l10-conclude",        emoji: "🏁" },
];

const ROCKS_DEFAULTS = [
  { title: "Brokerage flywheel documented", owner: "Reza / Q4",       progress: 40, status: "on_track" as const },
  { title: "Hire 2 more closers",           owner: "Erica / Q4",      progress: 25, status: "behind"   as const },
  { title: "Migrate fully off Ontraport",   owner: "Reza / Q4",       progress: 80, status: "on_track" as const },
  { title: "Buyer network to 500 active",   owner: "Erica / Q4",      progress: 35, status: "behind"   as const },
];

/** Helper for the optional ?w=YYYY-MM-DD week selector. */
function safeWeekParam(v: string | undefined): string {
  if (!v) return mondayOf(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return mondayOf(new Date());
  return v;
}

export default async function Level10Page({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const params = await searchParams;
  const weekMonday = safeWeekParam(params.w);
  const thisMonday = mondayOf(new Date());
  const isCurrentWeek = weekMonday === thisMonday;

  // Find the most recent meeting BEFORE this one — we use its open items
  // to populate the "review last week" panel.
  const [previousMeeting] = await db
    .select({ meetingDate: level10Meetings.meetingDate })
    .from(level10Meetings)
    .where(sql`${level10Meetings.meetingDate} < ${weekMonday}::date`)
    .orderBy(desc(level10Meetings.meetingDate))
    .limit(1);
  const previousMeetingDate: string | null = previousMeeting
    ? (typeof previousMeeting.meetingDate === "string"
        ? previousMeeting.meetingDate
        : (previousMeeting.meetingDate as Date).toISOString().slice(0, 10))
    : null;

  // Live actuals for the current week; for past weeks we'll lean on
  // the snapshot rows instead (computed below).
  const [blocks, liveActuals, meetingRow, recentMeetings, snapshotRows, thisMeetingItems, carryItems] = await Promise.all([
    getOpsBlocks("level10."),
    isCurrentWeek ? computeScorecardActuals() : Promise.resolve(null),
    db
      .select()
      .from(level10Meetings)
      .where(eq(level10Meetings.meetingDate, weekMonday))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        meetingDate: level10Meetings.meetingDate,
        rating: level10Meetings.rating,
        segueNotes: level10Meetings.segueNotes,
        concludeNotes: level10Meetings.concludeNotes,
        createdById: level10Meetings.createdById,
      })
      .from(level10Meetings)
      .orderBy(desc(level10Meetings.meetingDate))
      .limit(12),
    db
      .select()
      .from(level10ScorecardSnapshots)
      .where(eq(level10ScorecardSnapshots.meetingDate, weekMonday))
      .orderBy(asc(level10ScorecardSnapshots.position)),
    db
      .select()
      .from(level10ActionItems)
      .where(eq(level10ActionItems.meetingDate, weekMonday))
      .orderBy(asc(level10ActionItems.position)),
    isCurrentWeek && previousMeetingDate
      ? db
          .select()
          .from(level10ActionItems)
          .where(and(eq(level10ActionItems.meetingDate, previousMeetingDate), isNull(level10ActionItems.completedAt)))
          .orderBy(asc(level10ActionItems.position))
      : Promise.resolve([] as never[]),
  ]);

  // Decide whether the displayed scorecard comes from live counts or
  // a frozen snapshot — and stamp a "captured at" timestamp for the UI.
  const hasSnapshot = snapshotRows.length === SCORECARD_DEFINITIONS.length;
  const scorecardSource: "live" | "snapshot" | "stale" =
    isCurrentWeek ? "live" : hasSnapshot ? "snapshot" : "stale";
  const snapshotTakenAt = hasSnapshot ? snapshotRows[0]?.snapshotAt : null;

  // Roster for the attendees byline + history "logged by" labels.
  const teammates = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(isNull(user.suspendedAt), isNull(user.deletedAt), ne(user.role, "bird_dog")));

  const meetingDateLabel = formatMondayLabel(weekMonday);

  return (
    <>
      <OpsHeader
        eyebrow="Monday Leadership Meeting"
        title="Level 10"
        right={
          <div className="text-right">
            <div className="text-[11px] text-muted mt-0.5">
              {isCurrentWeek ? "This week · " : ""}
              {meetingDateLabel}
              {!isCurrentWeek && (
                <>
                  {" · "}
                  <Link href="/ops/level10" className="underline hover:text-foreground">
                    back to this week
                  </Link>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Live agenda + per-section timers — current week only (no point
          timing a past meeting you're just reading). */}
      {isCurrentWeek && <AgendaTimer sections={AGENDA} />}

      <Section id="l10-segue" title="Segue" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Share personal and professional good news. Connect as humans before diving into business.
        </p>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="segue"
          initial={meetingRow?.segueNotes ?? ""}
          initialSavedAt={meetingRow?.updatedAt ?? null}
          placeholder="Notes from segue…"
        />
      </Section>

      <Section id="l10-headlines" title="Headlines" minutes={5}>
        <p className="text-sm text-muted mb-2">
          One-liners only: customer + employee good news and bad news. Anything worth a
          discussion drops to the IDS list instead.
        </p>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="headlines"
          initial={meetingRow?.headlinesNotes ?? ""}
          initialSavedAt={meetingRow?.updatedAt ?? null}
          placeholder="• Seller in TX referred a neighbor…&#10;• New BD crushed week one…"
        />
      </Section>

      <Section id="l10-scorecard" title="Scorecard" minutes={5}>
        {/* Provenance banner — snapshot vs live vs stale */}
        <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
          {scorecardSource === "live" && (
            <p className="text-[11px] text-muted">
              Live numbers · auto-snapshotted on every save
            </p>
          )}
          {scorecardSource === "snapshot" && snapshotTakenAt && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              📸 Snapshot from {fmtDate(snapshotTakenAt)} — what the team saw at this meeting
            </p>
          )}
          {scorecardSource === "stale" && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              ⚠ No snapshot taken — showing today's live numbers (not this meeting's)
            </p>
          )}
          {!isCurrentWeek && (
            <RefreshSnapshotButton meetingDate={weekMonday} label="Refresh from current CRM data" />
          )}
          {isCurrentWeek && (
            <RefreshSnapshotButton meetingDate={weekMonday} label="📸 Lock in scorecard now" />
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-foreground/[0.02]">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Metric</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Target</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Actual</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {SCORECARD_DEFINITIONS.map((m, i) => {
                const metricScope = `level10.scorecard.${i}.metric`;
                const targetScope = `level10.scorecard.${i}.target`;
                const snap = snapshotRows[i];
                const liveActual = liveActuals ? liveActuals[i] ?? 0 : 0;
                // Choose displayed values based on source
                const displayMetric = scorecardSource === "snapshot" && snap
                  ? snap.metric
                  : blocks.get(metricScope) ?? m.metric;
                const displayTarget = scorecardSource === "snapshot" && snap
                  ? snap.target
                  : blocks.get(targetScope) ?? formatScoreVal(m.target, m.format);
                const actualNum = scorecardSource === "snapshot" && snap
                  ? snap.actualNum
                  : liveActual;
                const targetNum = parseFloat(displayTarget.replace(/[^\d.]/g, "")) || m.target;
                const tone = scoreTone(actualNum, targetNum);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      {scorecardSource === "snapshot" ? (
                        displayMetric
                      ) : (
                        <EditableBlock scope={metricScope} initial={displayMetric} revalidate={REVALIDATE} />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {scorecardSource === "snapshot" ? (
                        <span className="tabular-nums">{displayTarget}</span>
                      ) : (
                        <EditableBlock scope={targetScope} initial={displayTarget} revalidate={REVALIDATE} className="tabular-nums" />
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 tabular-nums font-medium"
                      title={scorecardSource === "snapshot" ? "Frozen at meeting time" : "Live from CRM data"}
                    >
                      <ScorecardActualsButton
                        metricIndex={i}
                        metricName={displayMetric}
                        actual={actualNum}
                        format={(snap?.format as "n" | "pct") ?? m.format}
                      >
                        {formatScoreVal(actualNum, snap?.format as "n" | "pct" ?? m.format)}
                      </ScorecardActualsButton>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill tone={tone}>{labelStatus(tone)}</StatusPill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="l10-rocks" title="Rock Review" minutes={5} info={EOS_DEFINITIONS.rock}>
        <div className="space-y-3">
          {ROCKS_DEFAULTS.map((r, i) => {
            const titleScope = `level10.rocks.${i}.title`;
            const ownerScope = `level10.rocks.${i}.owner`;
            return (
              <div key={i} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      <EditableBlock scope={titleScope} initial={blocks.get(titleScope) ?? r.title} revalidate={REVALIDATE} />
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      <EditableBlock scope={ownerScope} initial={blocks.get(ownerScope) ?? r.owner} revalidate={REVALIDATE} />
                    </div>
                  </div>
                  <StatusPill tone={r.status}>{labelStatus(r.status)}</StatusPill>
                </div>
                <ProgressBar pct={r.progress} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="l10-empl-headline" title="Employee/Customer Headline" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Employee wins and customer highlights — share the positive stories that matter to the team.
        </p>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="employeeHeadline"
          initial={meetingRow?.employeeHeadlineNotes ?? ""}
          initialSavedAt={meetingRow?.updatedAt ?? null}
          placeholder="• Employee milestone or recognition…&#10;• Customer success story…"
        />
      </Section>

      <Section id="l10-todos" title="To-Do List" minutes={5} info={EOS_DEFINITIONS.todo}>
        <p className="text-sm text-muted mb-2">
          Review last week's to-dos — done or not done. 90% done rate is the EOS bar. New
          to-dos get added here as they come up during the meeting.
        </p>
        <div className="rounded-lg border border-border bg-foreground/[0.015] p-4">
          <ActionItemsBlock
            meetingDate={weekMonday}
            items={thisMeetingItems.map((i) => ({
              id: i.id,
              body: i.body,
              assigneeId: i.assigneeId,
              completedAt: i.completedAt?.toISOString() ?? null,
              meetingDate: typeof i.meetingDate === "string" ? i.meetingDate : (i.meetingDate as Date).toISOString().slice(0, 10),
            }))}
            carryFromPrevious={carryItems.map((i) => ({
              id: i.id,
              body: i.body,
              assigneeId: i.assigneeId,
              completedAt: i.completedAt?.toISOString() ?? null,
              meetingDate: typeof i.meetingDate === "string" ? i.meetingDate : (i.meetingDate as Date).toISOString().slice(0, 10),
            }))}
            teammates={teammates.map((t) => ({ id: t.id, name: t.name }))}
            isCurrentWeek={isCurrentWeek}
          />
        </div>
      </Section>

      <Section id="l10-ids" title="IDS" minutes={60} info={EOS_DEFINITIONS.issue}>
        <p className="text-sm text-muted mb-2">
          The heart of the meeting — Identify, Discuss, Solve. The live list is the{" "}
          <Link href="/issues" className="text-foreground hover:underline font-medium">Issues board</Link>:
          rank the list, take the top issue, IDS it to a to-do, repeat.
        </p>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-foreground/[0.04]"
        >
          Open Issues board →
        </Link>
      </Section>

      <Section id="l10-conclude" title="Conclude" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Recap to-dos, cascading messages, rate the meeting 1–10.
        </p>
        <div className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1.5">Meeting Rating</div>
        <div className="mb-3">
          <MeetingRating meetingDate={weekMonday} initial={meetingRow?.rating ?? null} />
        </div>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="conclude"
          initial={meetingRow?.concludeNotes ?? ""}
          initialSavedAt={meetingRow?.updatedAt ?? null}
          placeholder="Meeting recap / cascading messages…"
          rows={3}
        />
      </Section>

      {/* History — last 12 meetings, newest first */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold tracking-tight">Past meetings</h2>
          <span className="text-[10px] rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted font-medium tabular-nums">
            log
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          One row per Monday. Trend the rating, scan the notes, click any row to open + edit a prior week.
        </p>
        {recentMeetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted">
            No meetings logged yet. Start one above and it'll show here next week.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold w-32">Week of</th>
                  <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold w-16">Rating</th>
                  <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Segue snippet</th>
                  <th className="text-left px-3 py-2 text-[11px] uppercase tracking-widest text-muted font-semibold">Conclude snippet</th>
                </tr>
              </thead>
              <tbody>
                {recentMeetings.map((m) => {
                  const dateStr = typeof m.meetingDate === "string" ? m.meetingDate : (m.meetingDate as Date).toISOString().slice(0, 10);
                  const isThis = dateStr === weekMonday;
                  return (
                    <tr key={dateStr} className={`border-t border-border ${isThis ? "bg-lime-50 dark:bg-lime-500/[0.06]" : ""}`}>
                      <td className="px-3 py-2.5">
                        <Link href={`/ops/level10?w=${dateStr}` as never} className="text-foreground font-medium hover:underline">
                          {formatMondayLabel(dateStr)}
                        </Link>
                        {isThis && <span className="ml-2 text-[10px] text-lime-700 dark:text-lime-400 font-semibold tracking-widest uppercase">Open</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.rating != null ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-foreground text-background text-[11px] font-semibold tabular-nums">
                            {m.rating}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground/75 truncate max-w-xs">
                        {(m.segueNotes ?? "").slice(0, 80) || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground/75 truncate max-w-xs">
                        {(m.concludeNotes ?? "").slice(0, 80) || <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/** Pretty-print a Monday-anchored meeting date, e.g. "Jun 1 '26". */
function formatMondayLabel(d: string): string {
  // Parse as local midnight to avoid TZ shifts.
  const [y, m, day] = d.split("-").map(Number);
  return fmtDate(new Date(y, m - 1, day));
}

function Section({
  id,
  title,
  minutes,
  info,
  children,
}: {
  /** Anchor for the AgendaTimer's scroll-to-section. */
  id?: string;
  title: string;
  minutes: number;
  /** EOS definition shown in the ⓘ hover card next to the title. */
  info?: { title: string; points: string[] };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <span className="text-[10px] rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted font-medium tabular-nums">
          {minutes} min
        </span>
        {info && <InfoTip title={info.title} points={info.points} />}
      </div>
      {children}
    </section>
  );
}

/**
 * Pure-CSS hover/focus card behind a small ⓘ icon — no client JS.
 * Tab-focusable so keyboard users get it too.
 */
function InfoTip({ title, points }: { title: string; points: string[] }) {
  return (
    <span className="relative inline-block group" tabIndex={0}>
      <span
        aria-label={title}
        className="flex items-center justify-center size-4.5 rounded-full border border-border text-[10px] font-serif italic font-bold text-muted cursor-help select-none group-hover:border-foreground/40 group-hover:text-foreground transition"
      >
        i
      </span>
      <span className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-80 rounded-xl border border-border bg-background shadow-xl p-4 text-left">
        <span className="block text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">
          {title}
        </span>
        <span className="block space-y-1.5">
          {points.map((p, i) => (
            <span key={i} className="flex items-start gap-2 text-xs leading-snug text-foreground/85">
              <span className="text-muted mt-0.5 shrink-0">•</span>
              <span>{p}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
        <div className="h-full bg-lime-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted tabular-nums w-9 text-right">{pct}%</span>
    </div>
  );
}

function labelStatus(s: "on_track" | "off_track" | "behind" | "ahead"): string {
  const map = { on_track: "ON TRACK", off_track: "OFF TRACK", behind: "BEHIND", ahead: "AHEAD" };
  return map[s];
}
