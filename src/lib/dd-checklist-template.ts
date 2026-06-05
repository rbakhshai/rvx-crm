/**
 * Default Due Diligence checklist — modeled after the master worksheet.
 * Each new deal gets this list seeded on first visit to /due-diligence.
 *
 * Owner edits in the worksheet should be reflected here. To bump existing
 * deals after a template change, call `syncDdChecklistTemplate(dealId)` from
 * the DD actions file — it only adds new template items, never deletes
 * user data.
 */
import type { ddChecklistSection } from "@/db/schema";

type Section = (typeof ddChecklistSection.enumValues)[number];

export type DdChecklistTemplateItem = {
  section: Section;
  label: string;
};

export const DD_SECTION_LABELS: Record<Section, string> = {
  contracts_legal: "Contracts, Legal & Third-Party Reports",
  quotes_needed: "Quotes Needed",
  financial_resident: "Financial & Resident",
  city_county_state: "City, County & State",
  market_demographics: "Market & Demographics",
  utilities_infra: "Utilities & Infrastructure",
  physical_inspections: "Physical Inspections",
  park_owned_homes: "Park-Owned Homes & Buildings",
  budgets_valuation: "Budgets & Valuation",
};

export const DD_CHECKLIST_TEMPLATE: DdChecklistTemplateItem[] = [
  // Contracts, Legal & Third-Party Reports
  { section: "contracts_legal", label: "Phase 1 Environmental Report ordered" },
  { section: "contracts_legal", label: "Property Survey ordered" },
  { section: "contracts_legal", label: "Title commitment / preliminary report received" },
  { section: "contracts_legal", label: "Appraisal ordered" },
  { section: "contracts_legal", label: "Purchase contract reviewed by attorney" },
  { section: "contracts_legal", label: "Existing service contracts collected (waste, landscaping, etc.)" },

  // Quotes Needed
  { section: "quotes_needed", label: "Property insurance quote" },
  { section: "quotes_needed", label: "General liability insurance quote" },
  { section: "quotes_needed", label: "Workers comp quote (if employees)" },

  // Financial & Resident
  { section: "financial_resident", label: "Trailing 12-month P&L received" },
  { section: "financial_resident", label: "Prior 2 years tax returns received" },
  { section: "financial_resident", label: "Current rent roll received" },
  { section: "financial_resident", label: "Utility bills (12 months) collected" },
  { section: "financial_resident", label: "Lot lease / rental agreement template reviewed" },
  { section: "financial_resident", label: "Resident files audited (deposits, delinquencies)" },
  { section: "financial_resident", label: "Bank statements (12 months) verified" },

  // City, County & State
  { section: "city_county_state", label: "Zoning verified with planning dept" },
  { section: "city_county_state", label: "Business licenses / permits confirmed current" },
  { section: "city_county_state", label: "Code compliance — no open violations" },
  { section: "city_county_state", label: "Rent control / stabilization ordinances reviewed" },
  { section: "city_county_state", label: "Eviction process & timeline researched" },
  { section: "city_county_state", label: "Property tax history pulled" },

  // Market & Demographics
  { section: "market_demographics", label: "Rent comparables (RV/MH parks) gathered" },
  { section: "market_demographics", label: "Rent comparables (apartments) gathered" },
  { section: "market_demographics", label: "Sale comparable: SFH median price pulled" },
  { section: "market_demographics", label: "Demographics (population, income, growth) collected" },
  { section: "market_demographics", label: "Test ad placed to gauge demand" },
  { section: "market_demographics", label: "Major employers within 30-min drive identified" },

  // Utilities & Infrastructure
  { section: "utilities_infra", label: "Water source verified (city / well)" },
  { section: "utilities_infra", label: "Sewer verified (city / septic / lagoon)" },
  { section: "utilities_infra", label: "Electric — master meter or sub-metered?" },
  { section: "utilities_infra", label: "Natural gas / propane situation documented" },
  { section: "utilities_infra", label: "Trash service contract reviewed" },
  { section: "utilities_infra", label: "Road condition / paving assessed" },

  // Physical Inspections
  { section: "physical_inspections", label: "Aerial / plat map collected" },
  { section: "physical_inspections", label: "Walk-through #1 completed with photos" },
  { section: "physical_inspections", label: "Walk-through #2 completed" },
  { section: "physical_inspections", label: "All buildings inspected (office, laundry, etc.)" },

  // Park-Owned Homes & Buildings
  { section: "park_owned_homes", label: "POH inventory listed with titles" },
  { section: "park_owned_homes", label: "POH condition assessment complete" },
  { section: "park_owned_homes", label: "POH market value estimate" },
  { section: "park_owned_homes", label: "Title transfer process confirmed (DMV)" },

  // Budgets & Valuation
  { section: "budgets_valuation", label: "Stabilized NOI projection built" },
  { section: "budgets_valuation", label: "NOI Maximization Plan drafted" },
  { section: "budgets_valuation", label: "CapEx budget finalized" },
  { section: "budgets_valuation", label: "Final purchase price model approved" },
];

// Sort order: section order from the template above, then within-section order
// as listed. Computed once and exported.
export const DD_CHECKLIST_TEMPLATE_WITH_ORDER = DD_CHECKLIST_TEMPLATE.map(
  (item, i) => ({ ...item, sortOrder: i }),
);
