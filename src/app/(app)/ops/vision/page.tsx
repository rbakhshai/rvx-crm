/**
 * Vision — Team / Brand toggle. Mirrors the Founder OS Vision page:
 * top section, "FOR THE TEAM" / "FOR THE BRAND" block, then the
 * dark "THE VISION" callout, then numbered "HOW WE OPERATE" principles.
 */
import Link from "next/link";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { cn } from "@/lib/cn";

const REVALIDATE = "/ops/vision";

const TEAM_DEFAULTS = {
  forTeam:
    "We are building the operating system for RV-park brokers who want their business to run without them.",
  problem:
    "Most brokers are stuck. They have great deals. They work hard. They get results. But every deal still needs their personal touch — they can't take a week off, they can't hire scale, they can't sell the business. The brokerage runs on their personality, not their system.",
  model:
    "We replace the founder's personality with a system. Triage cockpit replaces gut calls. Buyer-matching engine replaces the rolodex. Bird-dog network replaces cold outbound. The CRM is the brokerage.",
  vision:
    "To be the standard. The reference point. The brand every serious RV-park broker is proud to be associated with — the system they credit when they hit $1M, $5M, $10M in annual commissions.",
};

const BRAND_DEFAULTS = {
  forBrand:
    "We do not look like a brokerage. We look like a tech company that happens to broker parks. That gap is the moat.",
  problem:
    "Every other RV-park brokerage looks the same: clip-art logos, Wix sites, gmail.com email addresses. Sellers can't tell them apart. Buyers don't trust any of them. The category looks dated, low-trust, and commoditized.",
  model:
    "We invest in brand the way a SaaS company does. Tight visual system. Sharp writing. Public content showing the work. Every artifact (CRM, marketing site, intake forms, buyer-match emails) feels like one premium product, not a brokerage Frankenstein.",
  vision:
    "The Apple of RV-park transactions. When a seller picks up the phone to sell a park, ours is the only call they make. When a buyer wants to buy a park, ours is the only list they want on.",
};

const OPERATING_PRINCIPLES = [
  "We do less. We do it better. Obsession beats volume every time.",
  "Every person on this team delivers the product. Leadership is not exempt.",
  "Quality is built into the system, not dependent on any individual.",
  "AI is not a shortcut. It is the infrastructure that makes excellence affordable and scalable.",
  "We stay buyer-first. Always. The list is the moat.",
];

export default async function VisionPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const params = await searchParams;
  const active = params.v === "brand" ? "brand" : "team";
  const blocks = await getOpsBlocks("vision.");

  const defaults = active === "brand"
    ? {
        head: BRAND_DEFAULTS.forBrand,
        problem: BRAND_DEFAULTS.problem,
        model: BRAND_DEFAULTS.model,
        visionStatement: BRAND_DEFAULTS.vision,
      }
    : {
        head: TEAM_DEFAULTS.forTeam,
        problem: TEAM_DEFAULTS.problem,
        model: TEAM_DEFAULTS.model,
        visionStatement: TEAM_DEFAULTS.vision,
      };

  return (
    <>
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-widest text-lime-700 dark:text-lime-400 font-semibold mb-2">
          Founder OS
        </div>
        <OpsHeader eyebrow="" title="The Vision" />
        <p className="text-sm text-muted -mt-3">What we are building and why it matters.</p>
      </div>

      {/* Team / Brand toggle */}
      <div className="grid place-items-center mb-8">
        <div className="inline-flex rounded-full border border-border bg-background p-1">
          <Link
            href={"/ops/vision" as never}
            className={cn(
              "rounded-full px-5 py-1.5 text-xs transition",
              active === "team"
                ? "bg-foreground text-background font-semibold"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            TEAM
          </Link>
          <Link
            href={"/ops/vision?v=brand" as never}
            className={cn(
              "rounded-full px-5 py-1.5 text-xs transition",
              active === "brand"
                ? "bg-foreground text-background font-semibold"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            BRAND
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Headline statement */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="text-[10px] uppercase tracking-widest text-lime-700 dark:text-lime-400 font-semibold mb-3">
            {active === "brand" ? "For the brand" : "For the team"}
          </div>
          <p className="text-2xl font-bold leading-tight">
            <EditableBlock
              scope={`vision.${active}.head`}
              initial={blocks.get(`vision.${active}.head`) ?? defaults.head}
              revalidate={REVALIDATE}
              multiline
            />
          </p>
        </div>

        {/* Problem */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">
            The problem we solve
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            <EditableBlock
              scope={`vision.${active}.problem`}
              initial={blocks.get(`vision.${active}.problem`) ?? defaults.problem}
              revalidate={REVALIDATE}
              multiline
            />
          </p>
        </div>

        {/* Model */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">
            The model
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            <EditableBlock
              scope={`vision.${active}.model`}
              initial={blocks.get(`vision.${active}.model`) ?? defaults.model}
              revalidate={REVALIDATE}
              multiline
            />
          </p>
        </div>

        {/* Vision callout (dark) — gold eyebrow */}
        <div className="rounded-2xl bg-foreground text-background p-6">
          <div className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold mb-3">
            The vision
          </div>
          <p className="text-xl font-bold leading-snug">
            <EditableBlock
              scope={`vision.${active}.vision`}
              initial={blocks.get(`vision.${active}.vision`) ?? defaults.visionStatement}
              revalidate={REVALIDATE}
              multiline
              className="text-background"
            />
          </p>
        </div>

        {/* How We Operate (5 principles) */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-4">
            How we operate
          </div>
          <ol className="space-y-3">
            {OPERATING_PRINCIPLES.map((p, i) => {
              const scope = `vision.principle.${i + 1}`;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid place-items-center shrink-0 size-6 rounded bg-foreground text-background text-[10px] font-bold tabular-nums leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90 flex-1">
                    <EditableBlock
                      scope={scope}
                      initial={blocks.get(scope) ?? p}
                      revalidate={REVALIDATE}
                      multiline
                    />
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}
