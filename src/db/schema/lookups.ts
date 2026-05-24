import { pgEnum, pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Functional role a deal status belongs to. Drives per-role dashboards
 * (e.g., closer sees their stages; UW sees Phase 1/2 review).
 */
export const dealStatusRole = pgEnum("deal_status_role", [
  "am",       // Acquisitions Manager — new lead intake
  "uw",       // Underwriter — phase 1/2 review
  "closer",   // First contact, negotiation, gathering docs
  "pm",       // Project Mgmt — LOI rounds
  "tc",       // Transaction Coordinator — PSA, escrow, DD
  "dm",       // Dispo Manager — sending to buyers
  "drip",     // 7/14/30/45/90-day follow-up cadence
  "parked",   // Pending revisit
  "closed",   // Deal closed (acquired or routed)
  "dead",     // Not pursuing
  "misc",     // Edge cases (incomplete file, etc.)
]);

/**
 * Pipeline stages for deals. Replaces Ontraport's 40+ dropdown values.
 * Seeded from audit findings. Adding a stage = INSERT into this table,
 * not a schema migration.
 */
export const dealStatuses = pgTable("deal_statuses", {
  code: text("code").primaryKey(),               // "lead_new", "loi_submitted", etc.
  label: text("label").notNull(),                // "1. New Lead Received"
  role: dealStatusRole("role").notNull(),
  sortOrder: integer("sort_order").notNull(),    // for kanban column ordering
  isActive: boolean("is_active").notNull().default(true),
  legacyOntraportValue: text("legacy_ontraport_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Bird Dog onboarding statuses. Maps the 25+ stages in Ontraport.
 */
export const birdDogStatusGroup = pgEnum("bird_dog_status_group", [
  "intake",       // Application received, awaiting interview
  "interviewing", // Email/zoom interview phase
  "agreement",    // Sending and following up on agreement
  "onboarding",   // Packet sent, training in progress
  "active",       // Full-time producing scout
  "active_half",  // Half-time commitment
  "on_watch",     // Performance concern
  "paused",       // Voluntary break
  "executive",    // Promoted to executive team
  "inactive",     // No longer producing
  "denied",       // Application denied
]);

export const birdDogStatuses = pgTable("bird_dog_statuses", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  group: birdDogStatusGroup("group").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  legacyOntraportValue: text("legacy_ontraport_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DealStatus = typeof dealStatuses.$inferSelect;
export type BirdDogStatus = typeof birdDogStatuses.$inferSelect;
