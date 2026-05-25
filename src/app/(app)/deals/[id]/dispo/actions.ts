"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { contacts, deals, messageTemplates, notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/email";
import { render, type DispoContext } from "@/lib/template-render";

const APP_URL = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function fmtMoney(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString()}`;
}

export type DispoActionResult = {
  ok: boolean;
  sent?: number;
  failed?: number;
  logged_only?: number;
  message?: string;
};

export async function sendDispoAction(formData: FormData): Promise<DispoActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, message: "Not authenticated" };

  const dealId = String(formData.get("dealId") ?? "");
  const buyerIds = formData.getAll("buyerIds").map(String).filter(Boolean);
  const customSubject = String(formData.get("subject") ?? "").trim();
  const customBody = String(formData.get("body") ?? "").trim();

  if (!dealId) return { ok: false, message: "Missing deal id" };
  if (buyerIds.length === 0) return { ok: false, message: "Pick at least one buyer" };
  if (!customSubject || !customBody) return { ok: false, message: "Subject and body are required" };

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { ok: false, message: "Deal not found" };

  const buyers = await db.select().from(contacts).where(inArray(contacts.id, buyerIds));

  let sent = 0;
  let failed = 0;
  let logged_only = 0;

  for (const buyer of buyers) {
    if (!buyer.email) {
      failed++;
      continue;
    }

    const ctx: DispoContext = {
      buyer: {
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        qualificationTier: buyer.qualificationTier,
      },
      deal: {
        name: deal.name,
        parkAddress: deal.parkAddress,
        parkCity: deal.parkCity,
        parkState: deal.parkState,
        listPrice: fmtMoney(deal.listPrice),
        listNoi: fmtMoney(deal.listNoi),
        padsCount: deal.padsCount,
        listCapRate: deal.listCapRate,
        url: `${APP_URL()}/deals/${deal.id}`,
      },
      sender: {
        name: session.user.name,
        firstName: session.user.name?.split(" ")[0] ?? null,
        email: session.user.email,
      },
      appUrl: APP_URL(),
    };

    const subject = render(customSubject, ctx as never);
    const body = render(customBody, ctx as never);

    const result = await sendNotification({
      kind: "deal_status_changed", // reusing closest existing enum value; consider adding "dispo_email" later
      to: buyer.email,
      subject,
      bodyMd: body,
      fromName: session.user.name ?? undefined,
      payload: { dealId: deal.id, contactId: buyer.id, kind: "dispo" },
    });

    if (result.status === "sent") sent++;
    else if (result.status === "logged_only") logged_only++;
    else failed++;

    // Log to the buyer's activity timeline as a note
    await db.insert(notes).values({
      parentTable: "contacts",
      parentId: buyer.id,
      type: "manual",
      authorId: session.user.id,
      body: `📤 Dispo'd "${deal.name || deal.parkAddress}" — ${result.status}\nSubject: ${subject}`,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/notifications`);
  redirect(`/deals/${dealId}?dispoed=${sent + logged_only}&failed=${failed}`);
}
