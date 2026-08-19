import { PageShell } from "../../page-shell";
import { ContactForm } from "../contact-form";
import { createContactAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";
import { requirePagePermission } from "@/lib/page-guard";

export default async function NewContactPage() {
  await requirePagePermission("view_contacts");
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
