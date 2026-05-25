import { asc } from "drizzle-orm";
import { db } from "@/db";
import { dealStatuses, contacts, companies, birdDogs } from "@/db/schema";
import { PageShell } from "../../page-shell";
import { DealForm } from "../deal-form";
import { createDealAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export default async function NewDealPage() {
  const [statuses, contactRows, companyRows, birdDogRows, ownerOptions] = await Promise.all([
    db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder)),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email }).from(contacts).orderBy(asc(contacts.lastName)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name)),
    db.select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName }).from(birdDogs).orderBy(asc(birdDogs.lastName)),
    getUserOptions(),
  ]);

  const contactOptions = contactRows.map((c) => ({
    value: c.id,
    label: nameOf(c.firstName, c.lastName) + (c.email ? ` · ${c.email}` : ""),
  }));
  const companyOptions = companyRows.map((c) => ({ value: c.id, label: c.name }));
  const birdDogOptions = birdDogRows.map((b) => ({ value: b.id, label: nameOf(b.firstName, b.lastName) }));

  return (
    <PageShell title="New deal" subtitle="Add an RV park to the pipeline.">
      <DealForm
        action={createDealAction}
        statuses={statuses}
        contactOptions={contactOptions}
        companyOptions={companyOptions}
        birdDogOptions={birdDogOptions}
        ownerOptions={ownerOptions}
        cancelHref="/deals"
        submitLabel="Create deal"
      />
    </PageShell>
  );
}
