import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { birdDogStatuses } from "./lookups";

export const birdDogAcquisitionLevel = pgEnum("bird_dog_acquisition_level", [
  "onboarding",
  "junior",
  "senior",
]);

export const trainingStatus = pgEnum("training_status", [
  "no",
  "in_progress",
  "yes",
]);

/**
 * Bird Dogs = the scout team that sources RV park leads. 131 records in
 * Ontraport at migration time. Has its own 25-stage onboarding pipeline
 * (intake → interview → agreement → onboarding → active).
 */
export const birdDogs = pgTable(
  "bird_dogs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // Identity
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    cellPhone: text("cell_phone"),
    facebookUrl: text("facebook_url"),
    profileImageUrl: text("profile_image_url"),

    // Status / level
    statusCode: text("status_code").references(() => birdDogStatuses.code, { onDelete: "set null" }),
    acquisitionLevel: birdDogAcquisitionLevel("acquisition_level"),

    // Application qualification (Bird Dog spec Phase 1): true only when
    // the applicant checked all five program acknowledgments. False →
    // they were offered the Referral Partner path instead.
    applicationQualified: boolean("application_qualified"),
    // Which acknowledgments they checked, e.g. ["cold_calling","hours",…].
    applicationAcks: text("application_acks"),

    // Lifecycle dates
    startDate: date("start_date"),
    agreementSignDate: date("agreement_sign_date"),
    followUpMeetingAt: timestamp("follow_up_meeting_at"),

    // Onboarding trigger flags (these fire automations)
    sendAgreement: boolean("send_agreement").notNull().default(false),
    sendOnboardingPacket: boolean("send_onboarding_packet").notNull().default(false),
    sendTrainingVideos: boolean("send_training_videos").notNull().default(false),
    rvxAgreementSigned: boolean("rvx_agreement_signed").notNull().default(false),
    autoSendTerminationEmail: boolean("auto_send_termination_email").notNull().default(false),
    manuallyRemoveFromTracker: boolean("manually_remove_from_tracker").notNull().default(false),

    // Discord
    isInDiscord: boolean("is_in_discord").notNull().default(false),
    kickedFromDiscord: boolean("kicked_from_discord").notNull().default(false),
    giveAccessToTracker: boolean("give_access_to_tracker").notNull().default(false),

    // Files
    resumeUrl: text("resume_url"),
    w9Url: text("w9_url"),
    signedAgreementUrl: text("signed_agreement_url"),

    // Training
    completedTraining: boolean("completed_training").notNull().default(false),
    ethicsTrainingStatus: trainingStatus("ethics_training_status"),

    // Background / qualifying
    whyJoinRvx: text("why_join_rvx"),
    howHeardAboutRvx: text("how_heard_about_rvx"),
    currentW2: text("current_w2"),
    priorW2: text("prior_w2"),
    w2Goals: text("w2_goals"),
    hospitalityBackground: text("hospitality_background"),
    businessOpsBackground: text("business_ops_background"),
    weeklyExecutionPlan: text("weekly_execution_plan"),
    gamePlanForward: text("game_plan_forward"),

    // RV lifestyle
    rvClass: text("rv_class"),
    rvRig: text("rv_rig"),
    yearsFullTimeTraveling: text("years_full_time_traveling"),

    // Community memberships
    subtoMember: boolean("subto_member").notNull().default(false),
    subtoSince: text("subto_since"),
    gatorMember: boolean("gator_member").notNull().default(false),
    gatorSince: text("gator_since"),
    topTierMember: boolean("top_tier_member").notNull().default(false),
    topTierSince: text("top_tier_since"),
    ownersClubMember: boolean("owners_club_member").notNull().default(false),
    ownersClubSince: text("owners_club_since"),
    zeroDownMember: boolean("zero_down_member").notNull().default(false),
    zeroDownSince: text("zero_down_since"),

    // Marketing prefs
    bulkEmailOptedOut: boolean("bulk_email_opted_out").notNull().default(false),

    // Relations
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),

    // Portal access — set when a user signs up with a matching email, or
    // wired manually by an admin from the BD detail page.
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
    lastPortalVisitAt: timestamp("last_portal_visit_at"),

    // Migration / audit
    legacyOntraportId: integer("legacy_ontraport_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedById: text("deleted_by_id").references(() => user.id, { onDelete: "set null" }),
    lastActivityAt: timestamp("last_activity_at"),
    lastEmailReceivedAt: timestamp("last_email_received_at"),
    lastEmailSentAt: timestamp("last_email_sent_at"),
    lastSmsReceivedAt: timestamp("last_sms_received_at"),
    lastSmsSentAt: timestamp("last_sms_sent_at"),
    lastCallLoggedAt: timestamp("last_call_logged_at"),
    lastNote: text("last_note"),
    ipAddress: text("ip_address"),
  },
  (t) => ({
    emailIdx: index("bird_dogs_email_idx").on(t.email),
    statusIdx: index("bird_dogs_status_idx").on(t.statusCode),
    ownerIdx: index("bird_dogs_owner_idx").on(t.ownerId),
    legacyIdx: index("bird_dogs_legacy_idx").on(t.legacyOntraportId),
  }),
);

export type BirdDog = typeof birdDogs.$inferSelect;
export type NewBirdDog = typeof birdDogs.$inferInsert;
