import { pgEnum, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const notificationKind = pgEnum("notification_kind", [
  "deal_ready_for_review",
  "deal_status_changed",
  "new_lead",
  "bird_dog_application",
  "team_invite",
  "password_reset",
  "bd_exit",
]);

export const notificationStatus = pgEnum("notification_status", [
  "pending",      // queued, waiting for email provider
  "sent",         // sent via provider
  "failed",       // provider returned an error
  "logged_only",  // no email provider configured; logged to DB + console
]);

/**
 * Queue + audit log of outbound notifications. Phase 4 wires Postmark/Resend
 * to drain the queue; for now this lets us record intent even without a
 * provider, so the workflow is testable end-to-end.
 */
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: notificationKind("kind").notNull(),
  status: notificationStatus("status").notNull().default("pending"),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyMd: text("body_md").notNull(),
  payload: jsonb("payload"),                       // deal id, contact id, etc.
  providerMessageId: text("provider_message_id"),  // set after send
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
