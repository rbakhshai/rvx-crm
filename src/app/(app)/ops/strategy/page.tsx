/**
 * Strategy — long-form narrative on bets, moats, and decisions.
 */
import { getOpsBlocks } from "@/lib/ops-content";
import { OpsHeader, SectionLabel } from "../ops-primitives";
import { EditableBlock } from "@/components/editable-block";
import { requirePagePermission } from "@/lib/page-guard";

const REVALIDATE = "/ops/strategy";

export default async function StrategyPage() {
  await requirePagePermission("view_mission_control");
  const blocks = await getOpsBlocks("strategy.");

  return (
    <>
      <OpsHeader eyebrow="How We Win" title="Strategy" />

      <Block
        section="The Bet"
        scope="strategy.bet.body"
        defaultValue={
          "We are betting the brokerage on three compounding moats:\n\n" +
          "1. The Buyer Network. Every closed deal grows the buyer list. The list itself becomes the asset every seller pays to access.\n\n" +
          "2. The Bird Dog Engine. We do not depend on cold outbound. Distributed scouts find the deals other brokers never see.\n\n" +
          "3. The Owned-CRM Advantage. Our triage cockpit + buyer-matching engine is the unfair advantage that lets us close 2x faster than the next competitor."
        }
        blocks={blocks}
      />

      <Block
        section="3-Year Vision"
        scope="strategy.vision.body"
        defaultValue={
          "By end of Year 3, RV Park Exchange is the default brokerage for any RV-park transaction over $1M. We close $20M+ in commissions annually, own 4-6 parks ourselves, and the CRM that powers all of it is licensed to 5 other brokerages as a standalone product."
        }
        blocks={blocks}
      />

      <Block
        section="What We Will Not Do"
        scope="strategy.wont.body"
        defaultValue={
          "We do not chase listings without buyers lined up. We do not take parks under $500K. We do not work with sellers who are not motivated. We do not give referral fees to anyone who is not a tracked, accountable bird dog. We do not hire closers who cannot run the triage cockpit solo within 30 days."
        }
        blocks={blocks}
      />

      <Block
        section="Decisions Log"
        scope="strategy.log.body"
        defaultValue={
          "Date / Decision / Why\n\n2026-01 / Build own CRM instead of staying on Ontraport / Triage workflow + buyer matching can't be done in OP\n\n2026-03 / Hire Marco as first dedicated closer / Reza no longer scaling with personal touch on every deal\n\n2026-06 / Move closer recruiting to RemotelyX / Direct hire pipeline too thin\n\nClick to add the next one →"
        }
        blocks={blocks}
      />
    </>
  );
}

function Block({
  section,
  scope,
  defaultValue,
  blocks,
}: {
  section: string;
  scope: string;
  defaultValue: string;
  blocks: Map<string, string>;
}) {
  return (
    <>
      <SectionLabel tone="lime">{section}</SectionLabel>
      <div className="rounded-xl border border-border bg-background p-5 mb-8">
        <EditableBlock
          scope={scope}
          initial={blocks.get(scope) ?? defaultValue}
          revalidate="/ops/strategy"
          multiline
          variant="block"
          className="text-sm leading-relaxed whitespace-pre-wrap"
        />
      </div>
    </>
  );
}
