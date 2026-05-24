import { PageShell, ComingSoon } from "../page-shell";

export default function CompaniesPage() {
  return (
    <PageShell
      title="Sellers"
      subtitle="Park owners, realtors, and brokerage contacts"
    >
      <ComingSoon
        phase="Phase 1"
        description="Full migration of your Ontraport companies (~319 sellers/realtors/brokers) with relationship tracking."
        features={[
          "Relationship type: Realtor · Owner · Owner Who Is Also a Realtor",
          "Tied to deals via the Seller/Realtor/Broker field",
          "Contact info, social links, description",
          "Activity history across all deals they're attached to",
        ]}
      />
    </PageShell>
  );
}
