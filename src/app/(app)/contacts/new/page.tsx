import { PageShell } from "../../page-shell";
import { ContactForm } from "../contact-form";
import { createContactAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";

export default async function NewContactPage() {
  const ownerOptions = await getUserOptions();
  return (
    <PageShell title="New buyer" subtitle="Add a buyer to your private book.">
      <ContactForm
        action={createContactAction}
        ownerOptions={ownerOptions}
        cancelHref="/contacts"
        submitLabel="Create buyer"
      />
    </PageShell>
  );
}
