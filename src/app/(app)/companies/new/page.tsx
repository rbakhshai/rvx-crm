import { PageShell } from "../../page-shell";
import { CompanyForm } from "../company-form";
import { createCompanyAction } from "../actions";

export default function NewCompanyPage() {
  return (
    <PageShell title="New seller" subtitle="Add an owner, realtor, or broker.">
      <CompanyForm action={createCompanyAction} cancelHref="/companies" submitLabel="Create seller" />
    </PageShell>
  );
}
