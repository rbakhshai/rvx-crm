import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { ContactForm } from "../../contact-form";
import { updateContactAction } from "../../actions";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) notFound();

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(unnamed buyer)";

  // .bind() preserves the server-action marker — arrow wrappers do not.
  const bound = updateContactAction.bind(null, id);

  return (
    <PageShell title={`Edit · ${name}`} subtitle="Update buyer details.">
      <ContactForm action={bound} contact={contact} cancelHref={`/contacts/${id}`} submitLabel="Save changes" />
    </PageShell>
  );
}
