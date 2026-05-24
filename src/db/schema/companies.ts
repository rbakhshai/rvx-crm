import { pgEnum, pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const companyRelationshipToPark = pgEnum("company_relationship_to_park", [
  "realtor",
  "owner",
  "owner_realtor",
]);

export const companyRevenueBucket = pgEnum("company_revenue_bucket", [
  "under_1m",
  "1m_5m",
  "5m_20m",
  "20m_50m",
  "50m_100m",
  "100m_plus",
]);

export const companyEmployeeBucket = pgEnum("company_employee_bucket", [
  "under_10",
  "10_50",
  "50_200",
  "200_1000",
  "1000_plus",
]);

/**
 * Companies = sellers, realtors, and brokerage contacts on the deal side.
 * Mirrors Ontraport's companies object (319 records at migration time).
 */
export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  name: text("name").notNull(),
  relationshipToPark: companyRelationshipToPark("relationship_to_park").notNull(),
  sellerFirstName: text("seller_first_name"),
  sellerLastName: text("seller_last_name"),

  email: text("email"),
  phone: text("phone"),
  officePhone: text("office_phone"),

  // Address
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipcode: text("zipcode"),

  // Social
  facebookPage: text("facebook_page"),
  instagramName: text("instagram_name"),

  description: text("description"),
  annualRevenue: companyRevenueBucket("annual_revenue"),
  employeeCount: companyEmployeeBucket("employee_count"),

  profileImageUrl: text("profile_image_url"),
  ipAddress: text("ip_address"),

  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),

  bulkEmailOptedOut: boolean("bulk_email_opted_out").notNull().default(false),

  // Migration / audit
  legacyOntraportId: integer("legacy_ontraport_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
  lastEmailReceivedAt: timestamp("last_email_received_at"),
  lastEmailSentAt: timestamp("last_email_sent_at"),
  lastSmsReceivedAt: timestamp("last_sms_received_at"),
  lastSmsSentAt: timestamp("last_sms_sent_at"),
  lastCallLoggedAt: timestamp("last_call_logged_at"),
  lastNote: text("last_note"),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
