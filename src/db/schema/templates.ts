import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const messageTemplateKind = pgEnum("message_template_kind", [
  "dispo",        // sent to buyers about a new deal
  "follow_up",    // generic follow-up to a buyer or seller
  "intro",        // first-touch outreach
  "ncnda_invite", // ask buyer to sign NCNDA
  "custom",
]);

/**
 * Reusable email templates with merge-variable substitution.
 * Variables use {{handlebars}} style. See src/lib/template-render.ts for
 * the list of available context fields (buyer.*, deal.*, sender.*, etc.).
 */
export const messageTemplates = pgTable("message_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  kind: messageTemplateKind("kind").notNull().default("custom"),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;
