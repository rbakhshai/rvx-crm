/**
 * Success — recently closed deals + brokerage wins.
 *
 * Pulls 6 most-recent deals whose status indicates a closed sale.
 * Editable narrative sections above the list for context/wins log.
 */
import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, SectionLabel, AccentCard } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { fmtDate } from "@/lib/date-format";

const REVALIDATE = "/ops/success";

export default async function SuccessPage() {
  const blocks = await getOpsBlocks("success.");

  const recentClosed = await db
    .select()
    .from(deals)
    .where(
      and(
        isNull(deals.deletedAt),
        or(eq(deals.statusCode, "psa_accepted"), eq(deals.statusCode, "tc_dd_in_escrow")),
      ),
    )
    .orderBy(desc(deals.updatedAt))
    .limit(6);

  return (
    <>
      <OpsHeader eyebrow="What's Working" title="Success" />

      <SectionLabel tone="lime">This Quarter</SectionLabel>
      <AccentCard accent="lime" className="p-5 mb-8">
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat
            label="Closed deals"
            scope="success.stat.closed.value"
            defaultValue="3"
            blocks={blocks}
            sub="(target: 6)"
          />
          <Stat
            label="Buyer-side commissions"
            scope="success.stat.commissions.value"
            defaultValue="$240K"
            blocks={blocks}
            sub="(target: $500K)"
          />
          <Stat
            label="Avg. days to close"
            scope="success.stat.days.value"
            defaultValue="73"
            blocks={blocks}
            sub="(target: 60)"
          />
        </div>
      </AccentCard>

      <SectionLabel tone="lime">Recent Closes</SectionLabel>
      <div className="space-y-2 mb-10">
        {recentClosed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center text-sm text-muted">
            No closes yet this quarter. Push the pipeline — first one's on the way.
          </div>
        ) : (
          recentClosed.map((d) => (
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
                    {" · closed "}{fmtDate(d.updatedAt)}
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

      <SectionLabel tone="lime">
        <span className="mt-10 block">Customer Testimonials</span>
      </SectionLabel>
      <div className="rounded-xl border border-border bg-background p-5">
        <EditableBlock
          scope="success.testimonials.body"
          initial={blocks.get("success.testimonials.body") ?? "Click to paste quotes from sellers and buyers we've worked with. Pull screenshots into a doc and link them here."}
          revalidate={REVALIDATE}
          multiline
          variant="block"
          className="text-sm leading-relaxed"
        />
      </div>
    </>
  );
}

function Stat({
  label,
  scope,
  defaultValue,
  sub,
  blocks,
}: {
  label: string;
  scope: string;
  defaultValue: string;
  sub: string;
  blocks: Map<string, string>;
}) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] dark:bg-foreground/[0.06] p-4 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">{label}</div>
      <div className="text-3xl font-bold tabular-nums">
        <EditableBlock
          scope={scope}
          initial={blocks.get(scope) ?? defaultValue}
          revalidate="/ops/success"
        />
      </div>
      <div className="text-[11px] text-muted mt-1">{sub}</div>
    </div>
  );
}
