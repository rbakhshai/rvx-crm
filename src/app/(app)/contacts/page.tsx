import { PageShell, ComingSoon } from "../page-shell";

export default function ContactsPage() {
  return (
    <PageShell
      title="Buyers"
      subtitle="Your tiered private buyer book — qualification, buy-box, NCNDA, POF"
    >
      <ComingSoon
        phase="Phase 1"
        description="Full migration of your Ontraport contacts (~176 buyers, $27.17M POF total) with the complete buy-box schema and qualification tiering."
        features={[
          "List view with filter by qualification tier, state, deal-size, POF",
          "Detail page with activity feed (emails, SMS, calls, notes)",
          "Buy-box editor (target states, park type, pads, NOI floor, financing)",
          "NCNDA / POF document tracking",
          "Matched-deals sidebar (Phase 3 wires this up)",
        ]}
      />
    </PageShell>
  );
}
