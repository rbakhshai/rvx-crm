/**
 * Level 10 — Monday Leadership Meeting structure.
 * Six sections with EOS time budgets. Issues section embeds /issues by link.
 */
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, deals, level10Meetings, level10ScorecardSnapshots, user } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { MeetingTextarea, MeetingRating, RefreshSnapshotButton } from "./level10-widgets";
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

  // Live actuals for the current week; for past weeks we'll lean on
  // the snapshot rows instead (computed below).
  const [blocks, liveActuals, meetingRow, recentMeetings, snapshotRows] = await Promise.all([
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
            <div className="text-xs text-muted">{teammates.map((t) => t.name.split(" ")[0]).join(", ")}</div>
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

      <Section title="Segue" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Share personal and professional good news. Connect as humans before diving into business.
        </p>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="segue"
          initial={meetingRow?.segueNotes ?? ""}
          placeholder="Notes from segue…"
        />
      </Section>

      <Section title="Scorecard" minutes={5}>
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
                      {formatScoreVal(actualNum, snap?.format as "n" | "pct" ?? m.format)}
                    </td>
                    <td className="px-3 py-2.5"><StatusPill tone={tone}>{labelStatus(tone)}</StatusPill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Company Rocks" minutes={10}>
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

      <Section title="Issues" minutes={10}>
        <p className="text-sm text-muted mb-2">
          Live issues list lives in the CRM at{" "}
          <Link href="/issues" className="text-foreground hover:underline font-medium">/issues</Link>.
          That's where IDS happens — capture, discuss, solve. Reza + Marco see only Triage in
          Pipeline; everyone here works the Issues board.
        </p>
        <Link
          href="/issues"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-foreground/[0.04]"
        >
          Open Issues board →
        </Link>
      </Section>

      <Section title="Conclude" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Recap action items, cascading messages, rate the meeting.
        </p>
        <div className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1.5">Meeting Rating</div>
        <div className="mb-3">
          <MeetingRating meetingDate={weekMonday} initial={meetingRow?.rating ?? null} />
        </div>
        <MeetingTextarea
          meetingDate={weekMonday}
          field="conclude"
          initial={meetingRow?.concludeNotes ?? ""}
          placeholder="Meeting notes and action items…"
          rows={4}
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
          One row per Monday. Trend the rating, scan the notes, click in to read a prior week.
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
  title,
  minutes,
  children,
}: {
  title: string;
  minutes: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <span className="text-[10px] rounded-full bg-foreground/[0.06] px-2 py-0.5 text-muted font-medium tabular-nums">
          {minutes} min
        </span>
      </div>
      {children}
    </section>
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
