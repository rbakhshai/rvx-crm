import { PageShell, ComingSoon } from "../page-shell";

export default function DealsPage() {
  return (
    <PageShell
      title="Deals"
      subtitle="RV parks in your pipeline — from new lead to closed"
    >
      <ComingSoon
        phase="Phase 1"
        description="Full migration of your Ontraport deals (~349 parks) with the 40-stage pipeline, versioned LOI/PSA/AA tracking, financials, and documents."
        features={[
          "List view filterable by stage, closer, state, priority",
          "Kanban board across all pipeline stages (Phase 2)",
          "Detail page with LOI 1/2/3, PSA 1/2/3, AA rounds",
          "Financial editor (list, agreed, cash, hybrid, seller-finance, bank)",
          "Document storage (LOI contracts, PSAs, addendums, P&L, appraisal)",
          "Bird-dog attribution and per-deal data room URL",
        ]}
      />
    </PageShell>
  );
}
