/**
 * Email utility. Sends via Resend if RESEND_API_KEY is set; otherwise logs
 * to console + records a `logged_only` notification so the workflow is
 * testable before a provider is wired up. Phase 4 will swap Resend for
 * Postmark and add Twilio for SMS.
 *
 * To enable real sending: sign up at https://resend.com (free, no card),
 * grab an API key, add to .env.local as RESEND_API_KEY=re_xxx, restart dev.
 */
import { db } from "@/db";
import { notifications, type NewNotification } from "@/db/schema";

type SendArgs = {
  to: string;
  subject: string;
  bodyMd: string;
  kind: NewNotification["kind"];
  payload?: Record<string, unknown>;
  /** Override the "from" address. Defaults to onboarding@resend.dev (sandbox). */
  from?: string;
};

const DEFAULT_FROM = process.env.EMAIL_FROM ?? "RVX CRM <onboarding@resend.dev>";

export async function sendNotification(args: SendArgs): Promise<{ status: "sent" | "logged_only" | "failed"; id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const baseRow: NewNotification = {
    kind: args.kind,
    recipientEmail: args.to,
    subject: args.subject,
    bodyMd: args.bodyMd,
    payload: args.payload ?? {},
    status: "pending",
  };

  if (!apiKey) {
    const [row] = await db.insert(notifications).values({ ...baseRow, status: "logged_only" }).returning({ id: notifications.id });
    console.log(
      `[email] no RESEND_API_KEY — logged-only. to=${args.to} subject="${args.subject}" id=${row.id}`,
    );
    return { status: "logged_only", id: row.id };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from ?? DEFAULT_FROM,
        to: args.to,
        subject: args.subject,
        text: args.bodyMd,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const [row] = await db
        .insert(notifications)
        .values({ ...baseRow, status: "failed", errorMessage: `${res.status} ${errText}` })
        .returning({ id: notifications.id });
      console.error(`[email] send failed (${res.status}): ${errText}`);
      return { status: "failed", id: row.id };
    }

    const data = (await res.json()) as { id?: string };
    const [row] = await db
      .insert(notifications)
      .values({ ...baseRow, status: "sent", providerMessageId: data.id, sentAt: new Date() })
      .returning({ id: notifications.id });
    return { status: "sent", id: row.id };
  } catch (err) {
    const [row] = await db
      .insert(notifications)
      .values({ ...baseRow, status: "failed", errorMessage: err instanceof Error ? err.message : String(err) })
      .returning({ id: notifications.id });
    console.error(`[email] send threw:`, err);
    return { status: "failed", id: row.id };
  }
}
