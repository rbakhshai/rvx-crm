# Audit findings — Ontraport @ rvparkexchange.com

_What's in the account, what's working, what's broken, and what matters for the rebuild._

## TL;DR — the system in one paragraph

You're running a **multi-role commercial real-estate brokerage workflow** on top of a generic marketing CRM. The data model you've built is *more* sophisticated than what most real-estate CRMs ship out of the box: 6 functional roles (AM, UW, Closer, PM, TC, Dispo), a 40-stage pipeline with versioned LOIs/PSAs/AAs, a custom Bird Dog scout-management pipeline, full buy-box matching fields, NCNDA/POF compliance tracking, and per-deal blasting to a tiered buyer list. The cost of building all this on Ontraport: ~80% of your power is hacked together with **143 tags + 36 automations + 93 saved groups** simulating relational logic. The cost of rebuilding it properly: a real data model + a thin UI + 6 well-defined automations replaces almost all of that.

---

## 1. What's actually working

### Strong patterns worth preserving in the rebuild

- **Versioned LOI/PSA/AA dates** (LOI 1/2/3 → Sent/Accepted/Rejected/Contingent) — real-estate deals iterate; tracking each round is correct. Most generic CRMs only have "deal value" and "stage" — your model captures the messy reality.
- **Closer Last Touch as a REQUIRED field on deals** — enforces that closers timestamp follow-ups. Smart accountability mechanic.
- **Required field "Open to parks on Leased Land?" on contacts** — the one field you've made mandatory at intake. This filters disqualifying preferences early. Apply this pattern more.
- **Buy box → park matching dimensions** — your contact has 11 fields (park type, region, pads, max deal size, NOI floor, restaurant, leased land, financing options, 1031, etc.) that map cleanly to deal fields. The matching logic exists in your data even if you don't have a "show me buyers for this deal" button.
- **Auto-computed "Time Since Last Activity" buckets** (Today 🔥 / This Week / This Month / Cold) on both contacts and deals — perfect for prioritization. Rebuild as a derived view, not a stored field.
- **Bird-Dog object as separate pipeline** — your BD onboarding (25+ statuses, agreement/training/discord automation) is its own coherent system. Don't merge with contacts.
- **5-tier buyer qualification ([1] through [5])** + **A/B/C-quality segments** — clean, actionable scoring system. Beats opaque numeric scoring.
- **Per-deal blasting to tiered buyer list** with email + SMS — 55–70% open rates show buyers actually engage when you ping them on a deal. This is the **revenue mechanic**; the rest of the CRM exists to support it.

### Numeric wins
- **176 buyers carrying $27.17M proof-of-funds** — that's the real product. Concentrated, verified buyer base.
- **6,000+ logged email/landing-page activities in 30 days**, **1,000+ automation events in 14 days** — system is alive, not abandoned.

---

## 2. What's broken, drifting, or hacked

### Accumulated cruft (high signal — fix in rebuild)

- **Field duplication from renames**: `Deployable Cash Range (archived)` and `Deployable Cash (new)` both exist on contacts. `Updated COE Date 2` and `Updated COE Date 3` on deals (where's #1?). Ontraport doesn't let you rename without leaving the old field. → Rebuild gets clean migrations.
- **Untitled automations**: 2× literal "Untitled Automation MM/DD/YYYY" entries. → Naming discipline lives in code/PRs, not Ops habit.
- **Dropdown sort hacks**: Deal Status options like `000 - Incomplete`, `001 - Pace Leads`, `0100 - Sent back to BD`, `1064`, `1136`, `1172`, `1217` — these are insertion-order IDs (Ontraport sorts by ID, so they prefix to control display order, and renumber when they want a stage between two existing ones). → Rebuild uses explicit `sort_order` integers, not embedded prefixes.
- **Status duplication across systems**: same lifecycle states are encoded as (a) dropdown value on Deal Status, (b) `SYSTEM:` tag, AND (c) one of 93 saved groups. Three places to keep in sync. The "SYSTEM: Tags > Status Update" automation exists precisely to paper over this. → Rebuild: status is one column, tags are user-facing only, groups are SQL views.
- **143 tags is too many** — most are `SYSTEM:` machine tags written by automations to drive *other* automations. This is Ontraport's way of saying "we lack a real state machine." → Rebuild has a state column with transitions, not flag tags.
- **State-explosion automation**: `SYSTEM: Tags > Automated REGION and State` fires one tag-add event per state in the buyer's target list. Real example from your log: buyer #288 just got **30+ tag changes logged** in 4 seconds for their target states. Works, but it's the wrong abstraction. → Rebuild: target_states is an array column, region tagging is a derived view.
- **Reza custom object** is an off-spec experiment (SFH wholesaling, not RV park brokerage). Worth confirming whether to port, retire, or fork into a separate app.
- **OP Training (3 records)** is barely used — a Notion page would do this better. Consider not porting.

### Funnel leaks (top revenue impact)

| Page | The bleed | Fix priority |
|---|---|---|
| `/sellyourpark` — Direct Seller intake | **0.51% conversion** (392 sellers landed, 2 converted) | 🔴 P0 |
| Home page (`/`) | 0.24% conversion — but it's not a form page, expected | 🟢 OK |
| `/birddog` Bird Dog intake | 17.9% — fine but could be 30%+ with a one-step form | 🟡 P2 |

**Sellers are the harder side** in a brokerage — buyers chase deals, sellers need handholding. A 0.51% conversion on the seller intake is almost certainly the single biggest revenue lever you have. The rebuild can ship a better seller-intake flow on day one.

### Operational debt
- **329 open tasks in 30 days, many auto-generated "BD: Previous Week Report" with `contact_id=0`** — these are scheduled report tasks that nobody is completing. Either auto-close on send or move to a dashboard widget, not a task.
- **No scheduled broadcasts** queued — broadcasts are all manual, fired per-deal. Worth confirming if any newsletter / weekly buyer digest exists or could.
- **Zero sequences** — you migrated to automations, but lost the simple drip primitive. The "SYSTEM: Seller > Drip Emails" + the 80–84 status values (7/14/30/45/90 day) reimplement drips inside the status field. Rebuild can have proper scheduled-message queues.

---

## 3. What's NOT in your Ontraport that should be (the gaps)

This is the part where the audit pays off — features competitor CRMs ship that you've either coded around or done without.

### Missing — high value
1. **Buyer ↔ Deal matching engine.** You have all the inputs (buy-box on contacts + dimensions on deals). What you DON'T have: a one-click "show me which of my 176 buyers match this deal." Today this is a saved-group query you re-run. **Rebuild: this is the core feature.** Match scoring, ranked list per deal, ranked list per buyer.
2. **Deal-room / shareable buyer portal.** You're using individual landing pages per park (`/6C3C045` AURORA) — works but each one is a manual build. A real estate CRM (e.g. Buildout, Crexi for the listing side) generates a deal data room per deal automatically with access tracking. You already have a "Create Data Room URL" field — make it real.
3. **Reporting / dashboard for the team.** No mention of any reporting beyond saved groups. With 6 roles + per-BD performance tracking, you need: leads-per-source by week, conversion rate per stage (AM → UW → LOI → PSA → close), time-in-stage averages, closer activity heatmap, BD production leaderboard. Today you reconstruct this by eyeballing groups.
4. **Document storage / contract automation.** You're attaching files to deal fields (LOI Contract, PSA Contract, Addendum 1/2/3, Marketing Package, P&L, Appraisal). Fine for storage, but no e-signature integration, no auto-generated LOI templates with merge fields, no audit trail. DocuSign + a template engine in the rebuild = massive time savings for the closer/TC roles.
5. **Commission / payout tracking.** No commission fields on deals (you have "Total Assignment Payout" but no per-party split, no payout state). For a growing team you'll want per-deal commission splits between BD, closer, TC, house.
6. **Inbox / unified communications.** Ontraport has an inbox view for emails (Chrome walkthrough needed to confirm) but no unified inbox for SMS + email + calls per contact/deal. Real-estate CRMs (FUB especially) win on this — the rep opens the deal and sees every interaction in one threaded feed.
7. **Call recording + transcription.** Notes are manual today (e.g. Marco's notes like "Got wife on phone, not husband"). A modern CRM auto-transcribes calls, summarizes, and writes to the note field. Twilio + Whisper + the buyer record. This is where AI actually pays off in your flow.
8. **Calendar / scheduling for discovery calls.** Bird Dog "Follow Up Meeting" + Buyer "Intake Interview Date" are timestamp fields you set manually. A booking link integration (Cal.com / SavvyCal / Calendly) writing back to the record = no copy-paste.

### Missing — medium value
9. **Email deliverability monitoring.** Your dispo emails are getting 0.7–1.6 spam scores (visible in the message data). Worth tracking per-domain.
10. **Bird Dog production analytics.** You have per-BD stat segments but no aggregated "Bird Dog leaderboard with submissions / qualified rate / close rate / earnings." This is a 2-hour build in a real database.
11. **Lead-source attribution dashboard.** You track UTM fields (first/last source/medium/term/content/campaign) but I see no built report. Where are leads coming from? Which sources convert to closed deals?
12. **Outbound SMS compliance per state.** Your "SYSTEM: Don't send text messages to Texas" automation is a single rule. Other states (Washington, California, NY) have similar issues. Rebuild: structured opt-in/compliance log, not a state-name check.

### Missing — low value (skip in MVP)
13. Affiliate program (partners/commissions objects exist but unused).
14. Product / invoice / payment flow (objects exist; usage suggests you don't sell digital products through Ontraport — billing is offline).

---

## 4. Competitive teardown (preview — full version in `audit/competitive.md`)

I'm pulling fresh data on Follow Up Boss, kvCORE, BoomTown, HubSpot, GoHighLevel, Buildout, LandGate, and Crexi for the full teardown. Two findings already obvious:

- **None of the consumer-real-estate CRMs (FUB, kvCORE, BoomTown) model your workflow well.** They're residential, agent-centric, MLS-integrated. Your 40-stage commercial pipeline with LOI versioning + Bird Dog scouts + buyer NCNDA gates doesn't fit their schema. You'd shoehorn it the same way you've shoehorned it onto Ontraport.
- **The closest commercial real-estate CRMs (Buildout, Crexi CRM, Apto) cost $200–500/user/month** and still wouldn't have the Bird Dog pipeline. You'd be paying enterprise prices for 70% fit.
- **GoHighLevel** is genuinely the closest thing to a drop-in Ontraport replacement, with white-label upside if you ever want to resell. But the lock-in is the same — you'd just be switching landlords.

**Recommendation forming:** the rebuild has the cleanest payoff of any option. Your workflow is differentiated enough that you'd be paying for "generic CRM + custom fields" anywhere you go. May as well own the codebase.

---

## 5. What the rebuild MVP needs to ship

Listed in order of revenue impact, smallest viable first.

1. **Contacts + Deals + Companies + Bird Dogs + Activities** — the four core entities. Skip Reza/OP Training in MVP.
2. **Custom fields preserved** — full migration of buyer buy-box, deal pipeline fields, BD onboarding fields.
3. **State machines for Deal Status and BD Status** — proper transitions, audit log, can't skip stages.
4. **Buyer ↔ Deal match engine** — the killer feature you don't have today.
5. **Activity feed per record** — unified email/SMS/call/note timeline.
6. **The 6 automations that matter** (replacing 36): new lead → AM, AM approve → UW, UW pass → Closer, status change → tag/email, drip on dead leads (7/14/30/45/90), BD onboarding email cadence.
7. **Seller intake page rebuild** (the 0.51% bleed page).
8. **Per-role dashboards** (Marco, Reza, Erica, Graham each see their tasks/deals/contacts in one screen).
9. **Auth + roles** — Acquisitions, UW, Closer, TC, Dispo, Admin.
10. **Email + SMS provider integration** (Postmark/SendGrid + Twilio) — outgoing.
11. **Form builder OR Typeform/Tally embed** for the intake funnels.
12. **Data import** from Ontraport export — you'll need a one-time migration script.

Phase-2 (post-MVP):
- Document e-sign integration
- Call recording + AI summary
- Commission tracking
- Calendar embed for discovery calls
- AI-assisted note → field extraction (already evidenced — "Shareable AI Summary" URL field on deals)
- Compliance log (SMS opt-in / state rules)

---

## 6. Open questions for you

Before writing the spec I want to resolve:

1. **What's "ATM" in `ATM: On Boarding Check Box Automations`?** Acquisitions Team Member? Active Team Member? Affects naming on the BD object.
2. **The Reza custom object** — keep, retire, or fork? Looks like SFH wholesaling, not RVP. Doesn't match the brokerage model.
3. **Where do you store contracts today?** The deal-record file fields hold LOI/PSA copies — is there also a Google Drive / Dropbox structure?
4. **Email sending — current volume?** Per-deal blasts hit ~50–130 buyers. Daily total is small. Affects which email provider tier you need.
5. **SMS volume?** I see per-deal SMS blasts of 36–137 messages. Twilio at this volume is ~$15–30/month — trivial. Confirms you don't need a "SaaS" rate.
6. **Pace Morby / Subto ecosystem dependency** — your buyer pool comes heavily from Pace Zoom Calls, Subto/Gator/Top Tier/Owners Club communities. Is that integration a roadmap item or just a tagging system?
7. **Self-hosted vs cloud** for the rebuild — do you have any infra preference (DigitalOcean droplet? Fly.io? Vercel + a managed Postgres? Bare metal at home?). Affects stack recommendation.
8. **Team using the CRM today** — how many seats? Names + roles I've inferred: Marco (Closer), Reza (AM), Erica (BD mgr), Graham (Closer). Anyone else?
