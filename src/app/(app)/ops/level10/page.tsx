/**
 * Level 10 — Monday Leadership Meeting structure.
 * Six sections with EOS time budgets. Issues section embeds /issues by link.
 */
import Link from "next/link";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, StatusPill } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const REVALIDATE = "/ops/level10";

const SCORECARD_DEFAULTS: Array<{ metric: string; target: string; actual: string; status: "on_track" | "off_track" | "behind" | "ahead" }> = [
  { metric: "Deals closed (month)",       target: "2",         actual: "1",      status: "behind"    },
  { metric: "New buyer leads (week)",     target: "10",        actual: "12",     status: "on_track"  },
  { metric: "LOIs submitted (week)",      target: "3",         actual: "2",      status: "behind"    },
  { metric: "Pipeline value (active)",    target: "$30M",      actual: "$24M",   status: "behind"    },
  { metric: "Close rate (rolling 90d)",   target: "25%",       actual: "22%",    status: "behind"    },
  { metric: "Active bird dogs",           target: "10",        actual: "6",      status: "off_track" },
  { metric: "Owned-park revenue (month)", target: "$50K",      actual: "$52K",   status: "on_track"  },
];

const ROCKS_DEFAULTS = [
  { title: "Brokerage flywheel documented", owner: "Reza / Q4",       progress: 40, status: "on_track" as const },
  { title: "Hire 2 more closers",           owner: "Erica / Q4",      progress: 25, status: "behind"   as const },
  { title: "Migrate fully off Ontraport",   owner: "Reza / Q4",       progress: 80, status: "on_track" as const },
  { title: "Buyer network to 500 active",   owner: "Erica / Q4",      progress: 35, status: "behind"   as const },
];

export default async function Level10Page() {
  const blocks = await getOpsBlocks("level10.");

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
              {SCORECARD_DEFAULTS.map((m, i) => {
                const metricScope = `level10.scorecard.${i}.metric`;
                const targetScope = `level10.scorecard.${i}.target`;
                const actualScope = `level10.scorecard.${i}.actual`;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <EditableBlock scope={metricScope} initial={blocks.get(metricScope) ?? m.metric} revalidate={REVALIDATE} />
                    </td>
                    <td className="px-3 py-2.5">
                      <EditableBlock scope={targetScope} initial={blocks.get(targetScope) ?? m.target} revalidate={REVALIDATE} className="tabular-nums" />
                    </td>
                    <td className="px-3 py-2.5">
                      <EditableBlock scope={actualScope} initial={blocks.get(actualScope) ?? m.actual} revalidate={REVALIDATE} className="tabular-nums" />
                    </td>
                    <td className="px-3 py-2.5"><StatusPill tone={m.status}>{labelStatus(m.status)}</StatusPill></td>
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
