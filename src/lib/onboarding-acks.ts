/**
 * Expectation acknowledgments for BD onboarding — the "I get it" checklist.
 *
 * Items mirror the messaging on rvparkexchange.com/birddog (the public
 * recruiting funnel) so what a BD agreed to during recruiting is what
 * they re-acknowledge inside the platform. Server action validates that
 * every key here is checked before stamping onboardedAt for BD-tier
 * users; the checked keys + timestamp persist on user.onboarding_acks.
 *
 * Edit copy freely — keys are what's stored, so keep keys stable once
 * BDs start acknowledging (or historical acks won't match).
 */
export const ACK_ITEMS: ReadonlyArray<{ key: string; label: string }> = [
  {
    key: "takes_time",
    label:
      "Commercial deals take 60–120+ days to close. My first phase is building pipeline — consistency early creates income later.",
  },
  {
    key: "commercial_not_residential",
    label:
      "This is commercial real estate. It moves slower than residential, but individual deals are significantly larger.",
  },
  {
    key: "performance_pay",
    label:
      "Compensation is performance-based — a percentage of the acquisition or assignment fee, paid when a deal closes. No cap on earnings, and no salary.",
  },
  {
    key: "sourcing_not_closing",
    label:
      "My role is finding opportunities, not closing sales. I do the outreach, build the relationship, gather property info, and submit — the closing team takes it from there.",
  },
  {
    key: "weekly_activity",
    label:
      "I'm expected to perform outreach regularly during the week, submit owner-sourced opportunities, and stay engaged with the team and the weekly call.",
  },
  {
    key: "not_alone",
    label:
      "I'm not figuring this out alone — training, scripts, skip-traced lists, the CRM, and weekly deal feedback are provided. When I'm stuck, I ask.",
  },
];

export const ACK_KEYS: ReadonlyArray<string> = ACK_ITEMS.map((i) => i.key);
