import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { deals, dealStatuses, contacts, companies, birdDogs } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { DealForm } from "../../deal-form";
import { updateDealAction } from "../../actions";

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();

  const [statuses, contactRows, companyRows, birdDogRows] = await Promise.all([
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email }).from(contacts).orderBy(asc(contacts.lastName)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name)),
    db.select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName }).from(birdDogs).orderBy(asc(birdDogs.lastName)),
  ]);
  const contactOptions = contactRows.map((c) => ({
    value: c.id,
    label: nameOf(c.firstName, c.lastName) + (c.email ? ` · ${c.email}` : ""),
  }));
  const companyOptions = companyRows.map((c) => ({ value: c.id, label: c.name }));
  const birdDogOptions = birdDogRows.map((b) => ({ value: b.id, label: nameOf(b.firstName, b.lastName) }));

  const bound = updateDealAction.bind(null, id);
  const title = deal.name || deal.parkAddress || "(unnamed deal)";

  return (
    <PageShell title={`Edit · ${title}`} subtitle="Update deal details.">
      <DealForm
        action={bound}
        deal={deal}
        statuses={statuses}
        contactOptions={contactOptions}
        companyOptions={companyOptions}
        birdDogOptions={birdDogOptions}
        cancelHref={`/deals/${id}`}
        submitLabel="Save changes"
      />
    </PageShell>
  );
}
