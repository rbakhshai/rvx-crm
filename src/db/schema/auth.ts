import { pgEnum, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * User roles — drives per-role dashboards and permissions.
 * Maps to the team:
 *   Reza  → admin
 *   Erica → acquisitions_manager  (displayed as "Sales & Marketing")
 *   Marco → bird_dog_manager      (displayed as "Operations")
 *   Kevin → cfo                   (displayed as "Finance")
 *   Kerry → due_diligence
 *
 * The enum values are historical; display labels live in
 * src/lib/permissions.ts ROLES and can be renamed without a migration.
 *
 * `bd_level_1/2/3` are internal seats on the bird-dog sourcing side
 * (ranked tiers under Erica's Sales & Marketing function); they're
 * distinct from `bird_dog` which is the external portal account
 * assigned to scouts.
 *
 * Postgres enums can have values added but not dropped without a full
 * type rebuild — `viewer` is left here for back-compat but is no
 * longer shown as a pickable role.
 */
export const userRole = pgEnum("user_role", [
  "admin",
  "acquisitions_manager",
  "closer",
  "bird_dog_manager",
  "bird_dog",
  "transaction_coord",
  "underwriter",
  "dispo_manager",
  "cfo",
  "due_diligence",
  "viewer",
  "bd_level_1",
  "bd_level_2",
  "bd_level_3",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Admin-managed lifecycle
  suspendedAt: timestamp("suspended_at"),
  suspendedById: text("suspended_by_id"),
  deletedAt: timestamp("deleted_at"),
  deletedById: text("deleted_by_id"),
  // First-login orientation: NULL = hasn't completed yet, timestamp = done.
  // The /onboarding flow stamps this; layout middleware redirects BD-tier
  // users with NULL to /onboarding until they finish or skip. (#5000)
  onboardedAt: timestamp("onboarded_at"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
