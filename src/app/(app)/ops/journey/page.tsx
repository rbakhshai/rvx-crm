/**
 * Journey — four team-specific journeys you asked for:
 *   Acquisitions · Closing · DD · Operations
 *
 * Each renders a vertical timeline with green dot markers, title + one
 * descriptive sentence per stage. All stage titles + descriptions are
 * click-to-edit.
 */
import Link from "next/link";
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { cn } from "@/lib/cn";

const REVALIDATE = "/ops/journey";

type Team = "acquisitions" | "closing" | "dd" | "operations" | "dispo";

const TEAMS: Array<{ key: Team; label: string; tagline: string }> = [
  { key: "acquisitions", label: "Acquisitions", tagline: "Bird-dog → first contact → qualified" },
  { key: "closing",      label: "Closing",      tagline: "First call → LOI → PSA signed" },
  { key: "dd",           label: "DD",           tagline: "Inspection → underwriting → cleared to close" },
  { key: "operations",   label: "Operations",   tagline: "RVX takes down — we acquire + operate" },
  { key: "dispo",        label: "Dispo",        tagline: "Disposing to an end buyer — we broker" },
];

/**
 * A stage can carry an optional `accent` that recolors its timeline
 * dot — useful for flagging recurring touchpoints (e.g. monthly
 * investor reports) so they stand out from the main one-time stages.
 */
type StageAccent = "lime" | "sky" | "rose" | "amber";

const JOURNEYS: Record<Team, { intro: string; stages: Array<{ title: string; description: string; accent?: StageAccent }> }> = {
  acquisitions: {
    intro:
      "The Acquisitions Team owns sourcing. Bird dogs hunt deals in the field, the BD manager qualifies the intake, and clean leads get handed to a closer. Goal: every qualified lead in front of a closer within 48 hours.",
    stages: [
      { title: "Day 0: Bird dog spots a deal",       description: "Scout walks a park, talks to an owner, identifies a potential seller. Submits the lead via /bird-dog/apply or the portal." },
      { title: "Day 0: Intake form submitted",        description: "Park address, owner contact, occupancy, asking price, lease type. CRM creates a new contact + company automatically." },
      { title: "Day 1: BD manager reviews",           description: "Erica checks the submission. Tier 1 / 2 / 3 quality score assigned. Bad submissions get coaching back to the bird dog." },
      { title: "Day 2: Owner verified + qualified",   description: "Quick call: confirm ownership, motivation, asking price. Park added to the active sourcing list with tier + reason." },
      { title: "Day 2: Closer assigned",              description: "Tier 1/2 leads go to Marco. Tier 3 goes to nurture sequence. Handoff package: address, contact, BD notes, comps." },
      { title: "Ongoing: Bird-dog scoreboard",        description: "Weekly leaderboard: leads submitted, qualified, advanced. Top BD eats. Bottom-tier coached or churned." },
    ],
  },
  closing: {
    intro:
      "The Closing Team works the qualified queue end-to-end: first contact through LOI through signed PSA. Goal: 25% close rate on qualified leads, average 14 days from first contact to LOI.",
    stages: [
      { title: "Day 0: First contact attempted",       description: "Closer reaches out within 24 hours of receiving a qualified lead. Phone first, email backup. Logged in CRM." },
      { title: "Day 1-3: Discovery call",              description: "60-90 min call: motivation, comps, lease structure, current occupancy, capital needs. Triage cockpit captures everything." },
      { title: "Day 3-7: Cap rate + LOI math",         description: "Pull market comps, build cap-rate model, decide on opening LOI number. Internal review with Reza if >$2M." },
      { title: "Day 7-10: LOI submitted",              description: "LOI sent to seller. Terms: price, due diligence window, financing contingency, closing date. CRM tracks status." },
      { title: "Day 10-21: Negotiation",               description: "Counter-offers logged. Closer holds the line. Reza sits in if it's heading sideways." },
      { title: "Day 21-28: PSA written",               description: "Once LOI is accepted, TC writes the PSA. Closer hands off to TC + DD team." },
    ],
  },
  dd: {
    intro:
      "The Due Diligence Team validates every PSA-signed deal end-to-end before close. Goal: zero post-close surprises. If something is wrong, kill the deal here, not at the closing table.",
    stages: [
      { title: "Day 0: PSA accepted",                  description: "Kerry receives the package: PSA, BD intake, closer notes, comps. DD clock starts." },
      { title: "Day 1-3: Document request sent",       description: "Rent roll, lease abstracts, P&L statements, tax returns, environmental reports, title commitment, surveys." },
      { title: "Day 7-14: On-site inspection",         description: "Physical walk-through: pads, hookups, infrastructure, occupancy verification. Photos + report in CRM." },
      { title: "Day 14-21: Financial underwriting",    description: "UW team rebuilds the seller's P&L using actual rent roll. Stress-test cap rate. Compare to LOI assumptions." },
      { title: "Day 21-28: Title + survey review",     description: "Title commitment cleared. Easements + setbacks confirmed. Environmental Phase I reviewed." },
      { title: "Day 28-30: Cleared to close",          description: "DD checklist 100%. Final report to Reza + closer. Green light to fund. If red flags surface, kill the deal." },
    ],
  },
  operations: {
    intro:
      "The Operations Team takes the keys when RVX is the buyer. Deal cleared DD, we wired funds, we own the park. Now we run it — stand up the operating playbook, get cash flowing, stabilize, and integrate the park into the portfolio. Goal: every owned park is at 90%+ stabilized occupancy within 12 months.",
    stages: [
      { title: "Day 0: Funded + recorded",             description: "Wire sent, deed recorded. Park is on the books. DD's final report hands over to Operations with the operating gaps map." },
      { title: "Day 1-7: Possession + key transfer",   description: "Walk every utility hookup. Change locks. Get on-site contacts for water/sewer/electric. Existing tenant rent roll verified against bank deposits." },
      { title: "Day 7-30: On-site manager installed",  description: "Hire / reassign. Train on rent collection, hookup repairs, vendor management. Set monthly cadence with HQ." },
      { title: "Day 14-60: Operating playbook live",   description: "Pricing model, rent-bump letters, online listings on Hipcamp + Campendium + RoverPass, lease standardization. Vendor list locked (plumber, HVAC, lawn)." },
      { title: "Month 2-6: Stabilization",             description: "Drive occupancy. Address rent collection delinquencies. Inspect every pad quarterly. P&L reviewed monthly against the UW model." },
      { title: "Month 6-12: Portfolio integration",    description: "Park reports up to Kevin's portfolio dashboard. Refinance if leverage makes sense. Document SOPs so the next take-down ramps faster." },
      { title: "Monthly: Report to investors",          description: "Provide updated reports to investors and partners for review — occupancy, P&L, NOI vs UW model, capex, stabilization milestones. Built off Kevin's portfolio dashboard, signed off by Reza before send.", accent: "sky" },
    ],
  },
  dispo: {
    intro:
      "The Dispo Team brokers the park to an end buyer. We don't own it — we list it, match it, and close the buyer side for a commission. Goal: every closed-on-our-side park goes under contract to a buyer within 60 days.",
    stages: [
      { title: "Day 0: Listing package built",         description: "Photos, marketing flyer, financials packet, video walk-through. Listed on rvparkexchange.com + sent to the buyer network." },
      { title: "Day 1-7: Buyer match run",             description: "Buyer-matching engine surfaces 10-30 buyers whose criteria fit. Personalized email blast with the listing + financial snapshot." },
      { title: "Day 7-21: Buyer triage",               description: "Inbound buyer interest funneled to the dispo manager. Tour requests scheduled. NDAs signed. Qualified buyers move to LOI conversation." },
      { title: "Day 21-45: LOI from buyer",            description: "Best offer surfaces. Counter, negotiate, accept. Buyer PSA signed. Earnest money to escrow." },
      { title: "Day 45-60: Buyer DD + close",          description: "Buyer runs their own DD. We support docs + access. Close, hand keys, collect commission. Park out of inventory." },
      { title: "Post-close: Buyer retention",          description: "Buyer added to the 'recent close' list. 60-day check-in call. Goal: they refer one new buyer to the list within 6 months." },
    ],
  },
};

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const activeKey: Team = (TEAMS.find((t) => t.key === params.t)?.key ?? "acquisitions") as Team;
  const blocks = await getOpsBlocks(`journey.${activeKey}.`);
  const journey = JOURNEYS[activeKey];

  return (
    <>
      <OpsHeader eyebrow="Team Playbooks" title="Journey" />

      {/* Team toggle */}
      <div className="inline-flex rounded-full border border-border bg-background p-1 mb-2 flex-wrap">
        {TEAMS.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <Link
              key={t.key}
              href={(`/ops/journey?t=${t.key}` as never)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs transition",
                isActive
                  ? "bg-foreground text-background font-semibold"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted mb-6">{TEAMS.find((t) => t.key === activeKey)?.tagline}</p>

      {/* Intro paragraph */}
      <div className="rounded-xl border border-border bg-background p-5 mb-6">
        <EditableBlock
          scope={`journey.${activeKey}.intro`}
          initial={blocks.get(`journey.${activeKey}.intro`) ?? journey.intro}
          revalidate={REVALIDATE}
          multiline
          variant="block"
          className="text-sm leading-relaxed text-foreground/85"
        />
      </div>

      {/* Vertical timeline */}
      <div className="text-[11px] uppercase tracking-widest text-lime-700 dark:text-lime-400 font-semibold mb-3">
        {labelForKey(activeKey)}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-foreground/[0.12]" aria-hidden />
        <ol className="space-y-5">
          {journey.stages.map((s, i) => {
            const titleScope = `journey.${activeKey}.stage.${i}.title`;
            const descScope  = `journey.${activeKey}.stage.${i}.description`;
            return (
              <li key={i} className="relative pl-10">
                <span
                  className={cn(
                    "absolute left-1.5 top-1.5 size-3 rounded-full ring-4 ring-background",
                    accentDotClass(s.accent),
                  )}
                  aria-hidden
                />
                <div className="text-sm font-semibold">
                  <EditableBlock
                    scope={titleScope}
                    initial={blocks.get(titleScope) ?? s.title}
                    revalidate={REVALIDATE}
                  />
                </div>
                <div className="text-[13px] text-muted leading-relaxed mt-0.5">
                  <EditableBlock
                    scope={descScope}
                    initial={blocks.get(descScope) ?? s.description}
                    revalidate={REVALIDATE}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

/** Map a per-stage accent to its tailwind dot color. */
function accentDotClass(a: StageAccent | undefined): string {
  switch (a) {
    case "sky":   return "bg-sky-500";
    case "rose":  return "bg-rose-500";
    case "amber": return "bg-amber-500";
    case "lime":
    default:      return "bg-lime-400";
  }
}

function labelForKey(k: Team): string {
  switch (k) {
    case "acquisitions": return "Acquisitions Team Journey";
    case "closing":      return "Closing Team Journey";
    case "dd":           return "DD Team Journey";
    case "operations":   return "Operations Team Journey · RVX takes down";
    case "dispo":        return "Dispo Team Journey · Brokered to end buyer";
  }
}
