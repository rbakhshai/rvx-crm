/**
 * Level 10 — Monday Leadership Meeting structure.
 * Six sections with EOS time budgets. Issues section embeds /issues by link.
 */
import Link from "next/link";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, deals } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Status-code mapping for the scorecard, based on Reza's L10 spec.
 *
 *   - Active bird dogs:        bird_dogs with status_code = "active"
 *   - Total new leads:         deals created within window (week here)
 *   - Qualified leads:         deals that reached negotiation, doc-
 *                              gathering, or any stage past that — i.e.
 *                              didn't get drip'd or kicked back to BD
 *   - LOIs submitted (total):  deals at LOI stage or beyond
 *   - PSAs signed (month):     deals updated to psa_accepted this month
 *   - In progress (PSAs):      tc_writing_psa | tc_psa_submitted | psa_accepted
 *   - Dispo:                   dm_dispo_initiated
 *   - DD:                      tc_dd_in_escrow | dd_completed_in_escrow
 */
const QUALIFIED_OR_BEYOND = [
  "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted",
  "psa_accepted", "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const LOI_OR_BEYOND = [
  "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted",
  "psa_accepted", "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const IN_PROGRESS_PSAS  = ["tc_writing_psa", "tc_psa_submitted", "psa_accepted"];
const IN_DD             = ["tc_dd_in_escrow", "dd_completed_in_escrow"];
const CLOSED_RVX        = ["closed_rvx_acquired", "closed_rvx_network"];

type Tone = "on_track" | "off_track" | "behind" | "ahead";

/** Compare actual against target to derive the status pill tone. */
function toneFor(actual: number, target: number): Tone {
  if (target <= 0) return "on_track";
  const pct = actual / target;
  if (pct >= 1) return "on_track";
  if (pct >= 0.8) return "behind";
  return "off_track";
}

const REVALIDATE = "/ops/level10";

// Default metric NAMES + TARGETS (both still click-to-edit per L10).
// Actuals are computed live from the CRM — see the queries in
// computeScorecardActuals() below.
const SCORECARD_METRICS: Array<{
  metric: string;
  target: number;
  /** How to display the target: "n" | "pct" | "$" */
  format: "n" | "pct";
}> = [
  { metric: "Active bird dogs",                  target: 10, format: "n"   },
  { metric: "Total new leads submitted (week)",  target: 50, format: "n"   },
  { metric: "Qualified leads submitted (total)", target: 20, format: "n"   },
  { metric: "Close rate",                        target: 25, format: "pct" },
  { metric: "LOIs submitted (total)",            target: 15, format: "n"   },
  { metric: "Signed PSAs (this month)",          target:  3, format: "n"   },
  { metric: "Deals in progress (assigned PSAs)", target:  8, format: "n"   },
  { metric: "Deals in dispo",                    target:  4, format: "n"   },
  { metric: "Deals in due diligence",            target:  3, format: "n"   },
];

async function computeScorecardActuals(): Promise<number[]> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Inline COUNT(*) helper — drizzle returns rows so we destructure.
  const count = async (where: ReturnType<typeof and> | undefined): Promise<number> => {
    const [row] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(deals)
      .where(where);
    return row?.c ?? 0;
  };

  const [
    activeBd,
    newLeadsWeek,
    qualifiedTotal,
    loisTotal,
    psasMonth,
    inProgress,
    inDispo,
    inDd,
    closedRvxTotal,
  ] = await Promise.all([
    // Bird dogs flagged "active" by lookup status code
    db.select({ c: sql<number>`COUNT(*)::int` }).from(birdDogs)
      .where(and(isNull(birdDogs.deletedAt), eq(birdDogs.statusCode, "active")))
      .then((r) => r[0]?.c ?? 0),
    count(and(isNull(deals.deletedAt), gte(deals.createdAt, weekAgo))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, QUALIFIED_OR_BEYOND))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, LOI_OR_BEYOND))),
    // PSAs signed this month: status flipped to psa_accepted with updatedAt in month
    count(and(
      isNull(deals.deletedAt),
      eq(deals.statusCode, "psa_accepted"),
      gte(deals.updatedAt, monthStart),
    )),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, IN_PROGRESS_PSAS))),
    count(and(isNull(deals.deletedAt), eq(deals.statusCode, "dm_dispo_initiated"))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, IN_DD))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, CLOSED_RVX))),
  ]);

  // Close rate = closed / (closed + qualified currently in pipeline). Crude
  // first pass — tune with you once we have meaningful volume.
  const closeRate = qualifiedTotal + closedRvxTotal > 0
    ? Math.round((closedRvxTotal / (qualifiedTotal + closedRvxTotal)) * 100)
    : 0;

  return [
    activeBd,
    newLeadsWeek,
    qualifiedTotal,
    closeRate,
    loisTotal,
    psasMonth,
    inProgress,
    inDispo,
    inDd,
  ];
}

function formatVal(n: number, fmt: "n" | "pct"): string {
  if (fmt === "pct") return `${n}%`;
  return String(n);
}

const ROCKS_DEFAULTS = [
  { title: "Brokerage flywheel documented", owner: "Reza / Q4",       progress: 40, status: "on_track" as const },
  { title: "Hire 2 more closers",           owner: "Erica / Q4",      progress: 25, status: "behind"   as const },
  { title: "Migrate fully off Ontraport",   owner: "Reza / Q4",       progress: 80, status: "on_track" as const },
  { title: "Buyer network to 500 active",   owner: "Erica / Q4",      progress: 35, status: "behind"   as const },
];

export default async function Level10Page() {
  const [blocks, actuals] = await Promise.all([
    getOpsBlocks("level10."),
    computeScorecardActuals(),
  ]);

  return (
    <>
      <OpsHeader
        eyebrow="Monday Leadership Meeting"
        title="Level 10"
        right={<span className="text-xs text-muted">Reza, Marco, Erica, Kevin, Kerry</span>}
      />

      <Section title="Segue" minutes={5}>
        <p className="text-sm text-muted mb-2">
          Share personal and professional good news. Connect as humans before diving into business.
        </p>
        <div className="rounded-lg bg-foreground/[0.03] border border-border p-3">
          <EditableBlock
            scope="level10.segue.notes"
            initial={blocks.get("level10.segue.notes") ?? ""}
            revalidate={REVALIDATE}
            multiline
            variant="block"
            placeholder="Notes from segue…"
            className="text-sm"
          />
        </div>
      </Section>

      <Section title="Scorecard" minutes={5}>
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
              {SCORECARD_METRICS.map((m, i) => {
                const metricScope = `level10.scorecard.${i}.metric`;
                const targetScope = `level10.scorecard.${i}.target`;
                const targetStr = blocks.get(targetScope) ?? formatVal(m.target, m.format);
                const targetNum = parseFloat(targetStr.replace(/[^\d.]/g, "")) || m.target;
                const actualNum = actuals[i] ?? 0;
                const tone = toneFor(actualNum, targetNum);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <EditableBlock scope={metricScope} initial={blocks.get(metricScope) ?? m.metric} revalidate={REVALIDATE} />
                    </td>
                    <td className="px-3 py-2.5">
                      <EditableBlock scope={targetScope} initial={targetStr} revalidate={REVALIDATE} className="tabular-nums" />
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-medium" title="Live from CRM data">
                      {formatVal(actualNum, m.format)}
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
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <span
              key={n}
              className="size-8 rounded-full border border-border bg-background grid place-items-center text-xs font-medium hover:bg-foreground/[0.04] cursor-pointer"
            >
              {n}
            </span>
          ))}
        </div>
        <div className="rounded-lg bg-foreground/[0.03] border border-border p-3">
          <EditableBlock
            scope="level10.conclude.notes"
            initial={blocks.get("level10.conclude.notes") ?? ""}
            revalidate={REVALIDATE}
            multiline
            variant="block"
            placeholder="Meeting notes and action items…"
            className="text-sm"
          />
        </div>
      </Section>
    </>
  );
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
