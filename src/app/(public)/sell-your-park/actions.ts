"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { companies, deals } from "@/db/schema";
import { sendNotification } from "@/lib/email";

const SELLER_LEAD_NOTIFY_EMAIL = process.env.SELLER_LEAD_NOTIFY_EMAIL ?? "leads@rvparkexchange.com";

const sellerIntakeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number"),
  parkAddress: z.string().trim().min(5, "Enter the park address"),
  askingPrice: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.replace(/[^0-9.]/g, "") : undefined))
    .refine((v) => v === undefined || (!isNaN(Number(v)) && Number(v) > 0), { message: "Asking price should be a number" }),
  tellUsMore: z.string().trim().optional(),
});

export type IntakeFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitSellerIntakeAction(
  _prev: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = sellerIntakeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const v = parsed.data;

  // 1. Create a "company" record for the seller (Ontraport pattern: each
  //    seller is a Company with relationship='owner' and seller name fields)
  const sellerDisplayName = `${v.firstName} ${v.lastName} (Seller)`;
  const [company] = await db
    .insert(companies)
    .values({
      name: sellerDisplayName,
      relationshipToPark: "owner",
      sellerFirstName: v.firstName,
      sellerLastName: v.lastName,
      email: v.email,
      phone: v.phone,
    })
    .returning({ id: companies.id });

  // 2. Create the deal record
  const [deal] = await db
    .insert(deals)
    .values({
      name: `${v.parkAddress} — ${v.firstName} ${v.lastName}`,
      parkAddress: v.parkAddress,
      listPrice: v.askingPrice ?? null,
      sellerCompanyId: company.id,
      leadSource: "direct_seller_rvx_website",
      statusCode: "new_lead_received",
      acquisitionManagerNotes: v.tellUsMore
        ? `Submitted via /sell-your-park:\n\n${v.tellUsMore}`
        : "Submitted via /sell-your-park.",
    })
    .returning({ id: deals.id });

  // 3. Notify the team
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  await sendNotification({
    kind: "new_lead",
    to: SELLER_LEAD_NOTIFY_EMAIL,
    subject: `New seller lead — ${v.parkAddress}`,
    bodyMd: [
      `A new seller submitted /sell-your-park.`,
      ``,
      `Name:    ${v.firstName} ${v.lastName}`,
      `Email:   ${v.email}`,
      `Phone:   ${v.phone}`,
      `Park:    ${v.parkAddress}`,
      v.askingPrice ? `Asking:  $${Number(v.askingPrice).toLocaleString()}` : `Asking:  not provided`,
      ``,
      v.tellUsMore ? `Tell us more:\n${v.tellUsMore}\n` : ``,
      `Open in CRM: ${baseUrl}/deals/${deal.id}`,
    ].join("\n"),
    payload: { dealId: deal.id, companyId: company.id, source: "sell-your-park" },
  });

  redirect("/sell-your-park/thank-you");
}
