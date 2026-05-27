"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { contacts, notes } from "@/db/schema";
import { sendNotification } from "@/lib/email";

const LEAD_NOTIFY_EMAIL = process.env.SELLER_LEAD_NOTIFY_EMAIL ?? "leads@rvparkexchange.com";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(1, "Tell us what's on your mind"),
});

export type ContactFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const v = parsed.data;
  const [first, ...rest] = v.name.split(" ");
  const last = rest.join(" ") || null;

  const [c] = await db
    .insert(contacts)
    .values({
      firstName: first,
      lastName: last,
      email: v.email,
      phone: v.phone,
      status: "new_waiting_to_connect",
      openToLeasedLand: false,
    })
    .returning({ id: contacts.id });

  await db.insert(notes).values({
    parentTable: "contacts",
    parentId: c.id,
    type: "form_submission",
    body: `📨 Contact form submission from homepage\n\n${v.message}`,
  });

  await sendNotification({
    kind: "new_lead",
    to: LEAD_NOTIFY_EMAIL,
    subject: `New homepage contact — ${v.name}`,
    bodyMd: [
      `New contact via the homepage form.`,
      ``,
      `Name:    ${v.name}`,
      `Email:   ${v.email}`,
      v.phone ? `Phone:   ${v.phone}` : `Phone:   (not provided)`,
      ``,
      `Message:`,
      v.message,
    ].join("\n"),
    payload: { contactId: c.id, source: "homepage-contact" },
  });

  redirect("/?contacted=1");
}
