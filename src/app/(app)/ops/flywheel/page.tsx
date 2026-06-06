/**
 * Flywheel — center concept + 5 numbered spokes.
 * Mirrors the Founder OS "Product-First Engine" layout but with
 * a buyer-network flywheel suited to an RV-park brokerage.
 */
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";

const REVALIDATE = "/ops/flywheel";

const SPOKES = [
  {
    title: "Recruit bird dogs",
    body: "Every active bird dog finds 2-5 qualified parks/quarter. Discord community + referrals.",
    accent: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  },
  {
    title: "Close qualified deals",
    body: "Marco + closing team run triage cockpit. 25% close rate, 14 days first contact → LOI.",
    accent: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    title: "Build buyer network",
    body: "Every closed park is matched to 10-30 buyers from our list. List grows 50+ buyers/month.",
    accent: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    title: "Buyers refer + return",
    body: "Sold once, they trust us. Repeat buyers + referrals reduce future acquisition cost to ~0.",
    accent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  {
    title: "Reputation funds growth",
    body: "Commission margin reinvested into BD recruiting, brand, owned-park acquisitions. Compounding moat.",
    accent: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
];

export default async function FlywheelPage() {
  const blocks = await getOpsBlocks("flywheel.");

  return (
    <>
      <OpsHeader eyebrow="The Engine" title="Flywheel" />

      {/* Center circle */}
      <div className="grid place-items-center my-8">
        <div className="size-56 rounded-full bg-foreground text-background grid place-items-center text-center px-6 ring-4 ring-lime-400/40">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-lime-400 font-semibold mb-1.5">
              <EditableBlock
                scope="flywheel.center.eyebrow"
                initial={blocks.get("flywheel.center.eyebrow") ?? "Buyer Network"}
                revalidate={REVALIDATE}
                className="text-lime-400"
              />
            </div>
            <div className="text-lg font-semibold leading-tight">
              <EditableBlock
                scope="flywheel.center.title"
                initial={blocks.get("flywheel.center.title") ?? "Our gravitational center"}
                revalidate={REVALIDATE}
                multiline
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtitle + thesis */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          <EditableBlock
            scope="flywheel.thesis.headline"
            initial={blocks.get("flywheel.thesis.headline") ?? "The brokerage that owns the buyers, owns the market."}
            revalidate={REVALIDATE}
          />
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          <EditableBlock
            scope="flywheel.thesis.body"
            initial={blocks.get("flywheel.thesis.body") ?? "Most RV-park brokerages chase sellers. We chase buyers. The 500-strong active buyer list is the asset every seller wants access to — which makes us the only call sellers need to make."}
            revalidate={REVALIDATE}
            multiline
            className="text-sm"
          />
        </p>
      </div>

      {/* 5 numbered spokes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SPOKES.map((s, i) => {
          const titleScope = `flywheel.spoke.${i + 1}.title`;
          const bodyScope = `flywheel.spoke.${i + 1}.body`;
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-background p-5 text-center"
            >
              <div className={`inline-flex size-7 items-center justify-center rounded-md text-sm font-bold tabular-nums mb-3 ${s.accent}`}>
                {i + 1}
              </div>
              <h3 className="text-sm font-bold mb-2">
                <EditableBlock
                  scope={titleScope}
                  initial={blocks.get(titleScope) ?? s.title}
                  revalidate={REVALIDATE}
                />
              </h3>
              <p className="text-[12px] text-muted leading-relaxed">
                <EditableBlock
                  scope={bodyScope}
                  initial={blocks.get(bodyScope) ?? s.body}
                  revalidate={REVALIDATE}
                  multiline
                />
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
