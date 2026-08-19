import { PageShell } from "../../page-shell";
import { CompanyForm } from "../company-form";
import { createCompanyAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";
import { requirePagePermission } from "@/lib/page-guard";

export default async function NewCompanyPage() {
  await requirePagePermission("view_contacts");
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
