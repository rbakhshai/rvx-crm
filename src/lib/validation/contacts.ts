import { z } from "zod";

/**
 * Zod schema for contact (buyer) form. Mirrors the contacts DB schema but
 * lenient with empty strings (HTML forms post "" for empty fields).
 */
const emptyToUndefined = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? undefined : v));

const optionalText = emptyToUndefined;
const optionalNumeric = emptyToUndefined.pipe(
  z
    .union([z.string(), z.undefined()])
    .transform((v) => (v === undefined ? undefined : v))
    .refine((v) => v === undefined || !isNaN(Number(v)), { message: "Must be a number" }),
);

const checkboxBool = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((v) => v === "on" || v === "true" || v === true);

const optionalDate = emptyToUndefined.pipe(
  z
    .union([z.string(), z.undefined()])
    .transform((v) => (v === undefined ? undefined : v))
    .refine((v) => v === undefined || !isNaN(Date.parse(v)), { message: "Invalid date" }),
);

export const contactFormSchema = z.object({
  // Identity
  firstName: optionalText,
  lastName: optionalText,
  email: emptyToUndefined.pipe(z.string().email("Invalid email").optional()),
  phone: optionalText,
  smsNumber: optionalText,
  officePhone: optionalText,
  title: optionalText,
  timezone: optionalText,
  birthday: optionalDate,

  // Address
  address: optionalText,
  address2: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  country: optionalText,

  // Social
  website: optionalText,
  facebookLink: optionalText,
  instagramLink: optionalText,
  linkedinLink: optionalText,
  twitterLink: optionalText,
  blinqProfile: optionalText,

  // Status & qualification
  status: optionalText,
  qualificationTier: optionalText,
  buyerNumber: optionalNumeric,
  topTier: checkboxBool,

  // Buy box
  parkTypePreferences: z.array(z.string()).optional(),
  targetStates: z.array(z.string()).optional(),
  strictStates: checkboxBool,
  padsDesiredMin: optionalNumeric,
  amountOfPadsDesiredBucket: optionalText,
  maxDealSize: optionalText,
  minNoiUsd: optionalNumeric,
  parkWithRestaurant: checkboxBool,
  openToLeasedLand: checkboxBool,

  // Capital
  deployableCash: optionalText,
  willUse1031: checkboxBool,
  using1031Amount: optionalText,
  pofAmount: optionalNumeric,
  canProducePof: checkboxBool,
  financingOptions: optionalText,
  currentFinancingResources: z.array(z.string()).optional(),
  fastestTurnaround: optionalText,
  investorType: z.array(z.string()).optional(),
  gpLp: optionalText,

  // Experience
  reiExperienceOutsideRvp: z.array(z.string()).optional(),
  rvpClosedInPastBucket: optionalText,
  twelveMonthGoalsBucket: optionalText,
  buyersValuableSkills: z.array(z.string()).optional(),
  describeSkillExperience: optionalText,

  // Compliance
  signedNcnda: checkboxBool,
  smsPermission: checkboxBool,
  bulkSmsOptedOut: checkboxBool,

  // Community
  subtoMember: checkboxBool,
  ownersClubMember: checkboxBool,
  gatorMember: checkboxBool,
  topTierMember: checkboxBool,
  subtoMemberSince: optionalText,

  // Intake details
  nameOfLlc: optionalText,
  buyersAdditionalComments: optionalText,
  minReturnRequired: optionalText,

  // Attribution
  buyerLeadSource: optionalText,

  // Internal
  internalNotesBuyerContact: optionalText,
  internalNotesBuyerCriteria: optionalText,
  internalNotesQualifyCredibility: optionalText,
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** Parse FormData into a form-shaped object (handles multi-select arrays). */
export function parseContactFormData(formData: FormData): unknown {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    obj[key] = values.length > 1 ? values : values[0];
  }
  // Multi-select fields: always coerce to array
  const arrayFields = [
    "parkTypePreferences",
    "targetStates",
    "currentFinancingResources",
    "investorType",
    "reiExperienceOutsideRvp",
    "buyersValuableSkills",
  ];
  for (const f of arrayFields) {
    const v = obj[f];
    if (v === undefined) obj[f] = [];
    else if (!Array.isArray(v)) obj[f] = [v];
  }
  return obj;
}
