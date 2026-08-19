import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { ContactForm } from "../../contact-form";
import { updateContactAction } from "../../actions";
import { getUserOptions } from "@/lib/validation/shared";
import { requirePagePermission } from "@/lib/page-guard";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("view_contacts");
  const { id } = await params;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) notFound();

  const ownerOptions = await getUserOptions();
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(unnamed buyer)";
  const bound = updateContactAction.bind(null, id);

  return (
    <PageShell title={`Edit · ${name}`} subtitle="Update buyer details.">
      <ContactForm
        action={bound}
        contact={contact}
        ownerOptions={ownerOptions}
        cancelHref={`/contacts/${id}`}
        submitLabel="Save changes"
      />
    </PageShell>
  );
}
