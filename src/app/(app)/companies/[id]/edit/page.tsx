import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { CompanyForm } from "../../company-form";
import { updateCompanyAction } from "../../actions";
import { getUserOptions } from "@/lib/validation/shared";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) notFound();
  const ownerOptions = await getUserOptions();
  const bound = updateCompanyAction.bind(null, id);
  return (
    <PageShell title={`Edit · ${company.name}`} subtitle="Update seller details.">
      <CompanyForm
        action={bound}
        company={company}
        ownerOptions={ownerOptions}
        cancelHref={`/companies/${id}`}
        submitLabel="Save changes"
      />
    </PageShell>
  );
}
