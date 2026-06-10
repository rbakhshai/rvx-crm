/**
 * /my-leads — per-BD "status of leads I've submitted" board.
 *
 * Answers four questions a BD asks Reza/Erica every week:
 *   1. What happened to the leads I worked? (current lead status)
 *   2. Did the closer touch the ones I qualified? (closerLastTouch on deals)
 *   3. What's their pipeline stage now? (PIPELINE_STAGES bucket)
 *   4. When do I need to follow up next? (next_follow_up_at)
 *
 * Three sections: Due now (overdue + due today), Upcoming, History.
 * History collapses "qualified → converted to deal" + "dead" + leads
 * with no scheduled follow-up.
 *
 * Closes feedback items #10000 (Annie), #20000 (Kevin), #18000 (Cordtz),
 * #14000 (Annie), and contributes to #23000 (Charlotte).
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { getMyLeads, followUpBand, outcomeLabel, leadStatusLabel } from "@/lib/my-leads";
import { labelForStage } from "@/lib/pipeline-stages";
import { fmtRelative } from "@/lib/date-format";
import { FollowUpPicker } from "./follow-up-picker";
import { cn } from "@/lib/cn";

export default async function MyLeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const rows = await getMyLeads(session.user.id);
  const now = new Date();

  // Bucket rows into three sections.
  const dueNow = rows.filter((r) => {
    const b = followUpBand(r.nextFollowUpAt, now);
    return b === "overdue" || b === "due_today";
  });
  const upcoming = rows.filter((r) => followUpBand(r.nextFollowUpAt, now) === "upcoming");
  const history = rows.filter((r) => {
    const b = followUpBand(r.nextFollowUpAt, now);
    return b === "none";
  });

  const total = rows.length;
  const overdueCount = rows.filter((r) => followUpBand(r.nextFollowUpAt, now) === "overdue").length;
  const dueTodayCount = rows.filter((r) => followUpBand(r.nextFollowUpAt, now) === "due_today").length;
  const upcomingCount = upcoming.length;
  const convertedCount = rows.filter((r) => r.leadStatus === "converted").length;

  return (
    <PageShell
      title="My Leads"
      subtitle={`Every lead you've worked — current status, deal stage if it converted, and your next follow-up.`}
      width="default"
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
        <Kpi label="Touched" value={total} />
        <Kpi label="Overdue"  value={overdueCount}  tone={overdueCount > 0 ? "red" : "neutral"} />
        <Kpi label="Today"    value={dueTodayCount} tone={dueTodayCount > 0 ? "amber" : "neutral"} />
        <Kpi label="Upcoming" value={upcomingCount} />
        <Kpi label="Converted" value={convertedCount} tone={convertedCount > 0 ? "green" : "neutral"} />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center text-sm text-muted">
          You haven&apos;t worked any leads yet. Head over to{" "}
          <Link href="/bd-triage" className="text-foreground hover:underline">/bd-triage</Link>{" "}
          to claim your first one.
        </div>
      ) : (
        <div className="space-y-7">
          {dueNow.length > 0 && (
            <Section title="Due now" tone="red" count={dueNow.length}>
              <LeadTable rows={dueNow} now={now} />
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" tone="amber" count={upcoming.length}>
              <LeadTable rows={upcoming} now={now} />
            </Section>
          )}
          {history.length > 0 && (
            <Section title="History" tone="muted" count={history.length}>
              <LeadTable rows={history} now={now} />
            </Section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "red" | "amber" | "green" }) {
  const tones: Record<string, string> = {
    neutral: "bg-foreground/[0.02] text-foreground",
    red:     "bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
    amber:   "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
    green:   "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  };
  return (
    <div className={cn("rounded-xl border border-border px-3.5 py-2.5", tones[tone])}>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div>
      <div className="text-2xl font-bold tabular-nums leading-none mt-1">{value}</div>
    </div>
  );
}

function Section({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: "red" | "amber" | "muted";
  count: number;
  children: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    red:   "bg-rose-500",
    amber: "bg-amber-500",
    muted: "bg-foreground/30",
  };
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={cn("inline-block size-2 rounded-full", dot[tone])} />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <span className="text-xs text-muted tabular-nums">· {count}</span>
      </div>
      {children}
    </section>
  );
}

function LeadTable({
  rows,
  now,
}: {
  rows: Awaited<ReturnType<typeof getMyLeads>>;
  now: Date;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full text-sm">
        <thead className="bg-foreground/[0.02]">
          <tr>
            <Th>Park</Th>
            <Th>Owner</Th>
            <Th>Last outcome</Th>
            <Th>Status</Th>
            <Th>Deal stage</Th>
            <Th>Next follow-up</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.leadId} row={r} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  now,
}: {
  row: Awaited<ReturnType<typeof getMyLeads>>[number];
  now: Date;
}) {
  const band = followUpBand(row.nextFollowUpAt, now);
  const dealStageLabel = row.dealStage ? labelForStage(row.dealStage) : null;
  const closerTouched = row.closerLastTouchAt != null;

  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-3">
        <div className="font-semibold text-sm">{row.parkName ?? "—"}</div>
        <div className="text-[11px] text-muted mt-0.5">
          {[row.city, row.state].filter(Boolean).join(", ") || "—"}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-sm">{row.ownerName ?? "—"}</div>
        {row.ownerPhone && (
          <a href={`tel:${row.ownerPhone}`} className="text-[11px] text-foreground/70 hover:text-foreground tabular-nums">
            {row.ownerPhone}
          </a>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="text-sm">{outcomeLabel(row.lastOutcome)}</div>
        <div className="text-[11px] text-muted mt-0.5">
          {row.lastDispositionAt ? fmtRelative(row.lastDispositionAt) : "—"}
          {row.myAttempts > 1 && <span className="ml-1.5">· {row.myAttempts} touches</span>}
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusPill status={row.leadStatus} />
      </td>
      <td className="px-3 py-3">
        {row.dealId ? (
          <Link href={`/deals/${row.dealId}`} className="group">
            <div className="text-sm font-semibold text-foreground group-hover:underline">
              {dealStageLabel ?? row.dealStatusCode ?? "—"}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {closerTouched
                ? <>Closer touched {fmtRelative(row.closerLastTouchAt!)}</>
                : <span className="text-rose-700 dark:text-rose-400">Closer hasn&apos;t touched yet</span>}
            </div>
          </Link>
        ) : (
          <span className="text-[11px] text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <FollowUpPicker
          leadId={row.leadId}
          currentAt={row.nextFollowUpAt?.toISOString() ?? null}
          cadenceDays={row.followUpCadenceDays}
          band={band}
        />
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pool:      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
    claimed:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    converted: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    dead:      "bg-foreground/[0.05] text-foreground/60 border-border",
    duplicate: "bg-foreground/[0.05] text-foreground/60 border-border",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
      tones[status] ?? tones.pool,
    )}>
      {leadStatusLabel(status)}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap">
      {children}
    </th>
  );
}
