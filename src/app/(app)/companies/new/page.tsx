import { PageShell } from "../../page-shell";
import { CompanyForm } from "../company-form";
import { createCompanyAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";

export default async function NewCompanyPage() {
  const ownerOptions = await getUserOptions();
  return (
    <PageShell title="New seller" subtitle="Add an owner, realtor, or broker.">
      <CompanyForm
        action={createCompanyAction}
        ownerOptions={ownerOptions}
        cancelHref="/companies"
        submitLabel="Create seller"
      />
    </PageShell>
  );
}
