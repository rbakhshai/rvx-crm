/**
 * Email utility. Provider priority:
 *   1. Gmail SMTP (if GMAIL_USER + GMAIL_APP_PASSWORD set)
 *   2. Resend HTTP (if RESEND_API_KEY set)
 *   3. logged_only fallback — writes to notifications table + console
 *
 * The fallback keeps every workflow testable end-to-end even without a
 * provider configured.
 *
 * Gmail setup:
 *   - Turn on 2-Step Verification at https://myaccount.google.com/security
 *   - Create an App Password at https://myaccount.google.com/apppasswords
 *   - GMAIL_USER=you@yourdomain.com   (or @gmail.com for a personal account)
 *   - GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
 */
import { db } from "@/db";
import { notifications, type NewNotification } from "@/db/schema";

type SendArgs = {
  to: string;
  subject: string;
  bodyMd: string;
  kind: NewNotification["kind"];
  payload?: Record<string, unknown>;
  /** Override the From line. Defaults to GMAIL_USER or EMAIL_FROM env vars. */
  from?: string;
  /** Override the display name on the From line. */
  fromName?: string;
};

const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "RV Park Exchange";

async function sendViaGmail(args: SendArgs): Promise<{ id?: string }> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
  const fromAddr = args.from ?? process.env.GMAIL_USER!;
  const fromName = args.fromName ?? DEFAULT_FROM_NAME;
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to: args.to,
    subject: args.subject,
    text: args.bodyMd,
  });
  return { id: info.messageId };
}

async function sendViaResend(args: SendArgs): Promise<{ id?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from ?? process.env.EMAIL_FROM ?? "RVX CRM <onboarding@resend.dev>",
      to: args.to,
      subject: args.subject,
      text: args.bodyMd,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { id?: string };
  return { id: data.id };
}

export async function sendNotification(
  args: SendArgs,
): Promise<{ status: "sent" | "logged_only" | "failed"; id: string }> {
  const baseRow: NewNotification = {
    kind: args.kind,
    recipientEmail: args.to,
    subject: args.subject,
    bodyMd: args.bodyMd,
    payload: args.payload ?? {},
    status: "pending",
  };

  // Provider priority
  const useGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const useResend = !!process.env.RESEND_API_KEY;

  if (!useGmail && !useResend) {
    const [row] = await db
      .insert(notifications)
      .values({ ...baseRow, status: "logged_only" })
      .returning({ id: notifications.id });
    console.log(`[email] no provider configured — logged-only. to=${args.to} subject="${args.subject}" id=${row.id}`);
    return { status: "logged_only", id: row.id };
  }

  try {
    const { id: providerId } = useGmail ? await sendViaGmail(args) : await sendViaResend(args);
    const [row] = await db
      .insert(notifications)
      .values({ ...baseRow, status: "sent", providerMessageId: providerId, sentAt: new Date() })
      .returning({ id: notifications.id });
    return { status: "sent", id: row.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [row] = await db
      .insert(notifications)
      .values({ ...baseRow, status: "failed", errorMessage: message })
      .returning({ id: notifications.id });
    console.error(`[email] send failed:`, message);
    return { status: "failed", id: row.id };
  }
}
