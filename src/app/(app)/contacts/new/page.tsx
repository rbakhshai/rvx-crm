import { PageShell } from "../../page-shell";
import { ContactForm } from "../contact-form";
import { createContactAction } from "../actions";

export default function NewContactPage() {
  return (
    <PageShell title="New buyer" subtitle="Add a buyer to your private book.">
      <ContactForm action={createContactAction} cancelHref="/contacts" submitLabel="Create buyer" />
    </PageShell>
  );
}
