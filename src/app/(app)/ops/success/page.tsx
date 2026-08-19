/**
 * Success — what's working. Three pipeline-stage feeds at the top
 * (Recent LOIs, Recent PSAs, Recent Closes), then the editable
 * Wins Log at the bottom.
 *
 * Deals surface based on their status code — see STAGE_BUCKETS below.
 */
import Link from "next/link";
import { and, desc, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, SectionLabel, AccentCard } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { fmtDate } from "@/lib/date-format";
import { requirePagePermission } from "@/lib/page-guard";

const REVALIDATE = "/ops/success";

/**
 * Which status codes count as each "stage" for the Success page lists.
 * Pulled directly from deal_statuses — see the EOS scorecard mapping
 * in /lib/level10-scorecard for sibling definitions.
 */
const LOI_STAGES = [
  "loi_submitted",
  "loi_in_negotiation",
  "loi_signed_by_seller",
  "loi_accepted_both_sides",
];

const PSA_STAGES = [
  "tc_writing_psa",
  "tc_psa_submitted",
  "psa_accepted",
];

const CLOSE_STAGES = [
  "closed_rvx_acquired",
  "closed_rvx_network",
];

async function fetchByStages(stages: string[], limit = 6) {
  return db
    .select()
    .from(deals)
    .where(and(isNull(deals.deletedAt), inArray(deals.statusCode, stages)))
    .orderBy(desc(deals.updatedAt))
    .limit(limit);
}

export default async function SuccessPage() {
  await requirePagePermission("view_mission_control");
  const [blocks, recentLois, recentPsas, recentCloses] = await Promise.all([
    getOpsBlocks("success."),
    fetchByStages(LOI_STAGES),
    fetchByStages(PSA_STAGES),
    fetchByStages(CLOSE_STAGES),
  ]);

  return (
    <>
      <OpsHeader eyebrow="What's Working" title="Success" />

      <SectionLabel tone="lime">This Quarter</SectionLabel>
      <AccentCard accent="lime" className="p-5 mb-10">
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat
            label="Closed deals"
            scope="success.stat.closed.value"
            defaultValue="3"
            targetScope="success.stat.closed.target"
            defaultTarget="6"
            blocks={blocks}
          />
          <Stat
            label="Buyer-side commissions"
            scope="success.stat.commissions.value"
            defaultValue="$240K"
            targetScope="success.stat.commissions.target"
            defaultTarget="$500K"
            blocks={blocks}
          />
          <Stat
            label="Avg. days to close"
            scope="success.stat.days.value"
            defaultValue="73"
            targetScope="success.stat.days.target"
            defaultTarget="60"
            blocks={blocks}
          />
        </div>
      </AccentCard>

      <DealFeed
        label="Recent LOIs"
        emptyMessage="No LOIs out yet. Push qualified leads through closing."
        deals={recentLois}
        stageVerb="LOI activity"
      />

      <DealFeed
        label="Recent PSAs"
        emptyMessage="No PSAs in motion yet. LOI accepted → TC writes the PSA."
        deals={recentPsas}
        stageVerb="PSA activity"
      />

      <DealFeed
        label="Recent Closes"
        emptyMessage="No closes yet this quarter. First one's on the way."
        deals={recentCloses}
        stageVerb="closed"
      />

      <SectionLabel tone="lime">Wins Log</SectionLabel>
      <div className="rounded-xl border border-border bg-background p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">
          What went right this week
        </p>
        <EditableBlock
          scope="success.wins.body"
          initial={blocks.get("success.wins.body") ?? "Click to log this week's wins — closes, big calls, breakthroughs.\n\n• \n• \n• "}
          revalidate={REVALIDATE}
          multiline
          variant="block"
          className="text-sm leading-relaxed whitespace-pre-wrap"
        />
      </div>
    </>
  );
}

type DealRow = typeof deals.$inferSelect;

function DealFeed({
  label,
  emptyMessage,
  deals: rows,
  stageVerb,
}: {
  label: string;
  emptyMessage: string;
  deals: DealRow[];
  /** Verb shown next to the timestamp, e.g. "LOI activity" or "closed". */
  stageVerb: string;
}) {
  return (
    <>
      <SectionLabel tone="lime">{label}</SectionLabel>
      <div className="space-y-2 mb-10">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted">
            {emptyMessage}
          </div>
        ) : (
          rows.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}` as never}
              className="block rounded-lg border border-border bg-background hover:bg-foreground/[0.02] transition p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{d.name ?? d.parkAddress ?? "(unnamed)"}</div>
                  <div className="text-[12px] text-muted">
                    {[d.parkCity, d.parkState].filter(Boolean).join(", ") || "no location"}
                    {d.padsCount && ` · ${d.padsCount} pads`}
                    {" · "}{stageVerb} {fmtDate(d.updatedAt)}
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  {d.agreedPurchasePrice ? (
                    <div className="text-sm font-semibold">${Number(d.agreedPurchasePrice).toLocaleString()}</div>
                  ) : d.listPrice ? (
                    <div className="text-sm text-muted">${Number(d.listPrice).toLocaleString()} ask</div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  scope,
  defaultValue,
  targetScope,
  defaultTarget,
  blocks,
}: {
  label: string;
  scope: string;
  defaultValue: string;
  /** ops_content scope for the editable target string under the big number. */
  targetScope: string;
  defaultTarget: string;
  blocks: Map<string, string>;
}) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] dark:bg-foreground/[0.06] p-4 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">{label}</div>
      <div className="text-3xl font-bold tabular-nums">
        <EditableBlock scope={scope} initial={blocks.get(scope) ?? defaultValue} revalidate="/ops/success" />
      </div>
      <div className="text-[11px] text-muted mt-1 inline-flex items-baseline gap-1">
        <span>(target:</span>
        <EditableBlock
          scope={targetScope}
          initial={blocks.get(targetScope) ?? defaultTarget}
          revalidate="/ops/success"
          className="tabular-nums"
        />
        <span>)</span>
      </div>
    </div>
  );
}
