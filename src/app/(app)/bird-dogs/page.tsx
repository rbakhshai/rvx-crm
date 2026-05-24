import { PageShell, ComingSoon } from "../page-shell";

export default function BirdDogsPage() {
  return (
    <PageShell
      title="Bird Dogs"
      subtitle="Initial deal finders — your scout team"
    >
      <ComingSoon
        phase="Phase 1"
        description="Full migration of your Ontraport Bird Dogs (~131 scouts) with the 25-stage onboarding pipeline."
        features={[
          "Onboarding kanban: HOLD → Email interview → Agreement → Packet → Active",
          "Background fields: hospitality, business ops, W2, RV class",
          "Community memberships (Subto, Gator, Top Tier, Owners Club)",
          "Agreement file, W9, training completion tracking",
          "Performance leaderboard: submissions, qualified rate, closes (Phase 2)",
        ]}
      />
    </PageShell>
  );
}
