# RVX CRM — Replacement Spec

_Self-hosted, owned-codebase CRM replacing Ontraport for rvparkexchange.com._

## Product in one paragraph

A purpose-built brokerage operating system for **RV-park acquisitions and dispositions**. It runs the full deal lifecycle from **bird-dog scout submission → underwriting → LOI → PSA → escrow → close**, while maintaining a tiered private **buyer book** (with NCNDA / POF gating) that's matched to deals automatically. Replaces Ontraport's role as system-of-record, marketing automation, and form host. Self-hosted on the team's own cloud account; no per-seat SaaS fees.

---

## Goals

1. **Own the data and the code.** Stop paying Ontraport. Add features without waiting for a vendor roadmap.
2. **Buyer ↔ Deal matching** as a first-class feature (the audit's #1 missing capability).
3. **Per-role daily dashboards** (Marco the closer should open the app and see his day, not reconstruct it from saved groups).
4. **Fix the `/sellyourpark` funnel leak.** Better seller intake = direct revenue.
5. **Be cheap to run.** Target <$100/mo all-in at current scale.
6. **Be cheap to evolve.** The data model and automations should be readable by a single engineer in an afternoon, not require 36-automation archaeology.

## Non-goals (don't build in MVP)

- Affiliate program (Ontraport partners/commissions). Not used today.
- Membership site / digital product sales. Not used today.
- Reza SFH wholesaling object. Skip; port later as separate module.
- Op Training resource library. 3 records → use Notion.
- Custom drag-drop email designer. Use markdown + a transactional template.
- Custom drag-drop landing-page builder. Use Next.js pages + headless forms (Typeform/Tally embed acceptable for intake).
- Generic-CRM ambitions (don't try to be HubSpot). Keep it brokerage-shaped.

---

## Tech stack

| Layer | Pick | Why |
|---|---|---|
| **Language** | TypeScript | Mainstream, type-safe, best AI tooling support. |
| **Framework** | **Next.js 15 (App Router)** | Fast iteration, SSR/RSC for dashboards, ships with API routes. |
| **UI** | **shadcn/ui + Tailwind v4** | Owned components (no vendor lock), accessible, themable, fast to extend. |
| **Database** | **Postgres 16** (managed: Neon or Supabase) | Brokerage data is highly relational. JSON columns for flexible fields. Cheap at this scale. |
| **ORM** | **Drizzle ORM** | SQL-first (you can read every query), type-safe, fast migrations, no codegen step. |
| **Auth** | **Better Auth** | Modern, owned (no NextAuth.js opacity), supports magic links, Google SSO, 2FA, sessions. |
| **Email transactional** | **Postmark** | Best deliverability for small-team transactional; $15/mo for 10k emails. |
| **Email broadcast (per-deal blasts)** | **Postmark broadcast streams** | Same provider, separate stream for marketing. |
| **SMS** | **Twilio** | Industry standard; $15–30/mo at your volume. |
| **File storage** | **Cloudflare R2** | S3-compatible, no egress fees; $0.015/GB/mo. |
| **Background jobs** | **Inngest** (free tier covers your volume) | Durable event-driven workflows — replaces Ontraport automations cleanly. |
| **Search** | Postgres full-text initially; **Typesense** later if needed | Defer complexity. |
| **Hosting** | **Vercel** for app, **Neon** for DB | Both have generous free tiers; production tier ~$20/mo each. |
| **Forms** | **react-hook-form + zod** | Owned forms, type-safe, no Tally/Typeform fees. |
| **Calendar** | **Cal.com** embed (self-hostable) | Replaces manual scheduling. |
| **AI** | **Anthropic Claude API** | For call summarization, deal-AI-summary field, note → field extraction. |
| **Monitoring** | **Sentry** + Vercel Analytics | Free tiers OK. |

### Why not GraphQL / tRPC

tRPC is fine if you want it, but **Next.js Server Actions + Drizzle** is simpler at this scale. No client/server schema duplication, fewer moving parts, and SSR dashboards don't need an API layer.

### Why Drizzle over Prisma

- SQL-first; you can `psql` into prod and the schema looks like the code.
- Faster, no generation step.
- Better migrations (SQL files you can review).
- Lighter bundle.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js app (Vercel)                    │
│  ┌────────────┬───────────────┬─────────────┬─────────────────┐ │
│  │  Inbound   │   Dashboards  │   Records   │   Settings      │ │
│  │  forms     │   (per role)  │   (CRUD)    │   (users, etc.) │ │
│  └────────────┴───────────────┴─────────────┴─────────────────┘ │
│                          Server Actions                          │
└──────┬─────────────┬─────────────┬────────────┬─────────────────┘
       │             │             │            │
   ┌───▼──────┐  ┌───▼──────┐  ┌───▼──────┐  ┌──▼──────────┐
   │  Neon    │  │ Postmark │  │  Twilio  │  │  Inngest    │
   │ Postgres │  │  email   │  │   SMS    │  │  jobs       │
   └──────────┘  └──────────┘  └──────────┘  └─────────────┘
                                                    │
                                              ┌─────▼──────┐
                                              │ Claude API │
                                              │ (AI ops)   │
                                              └────────────┘
```

**Patterns:**
- All mutations through **Server Actions** (validated by zod).
- All reads in **Server Components** by default — pages stream from DB directly.
- Heavy / scheduled work in **Inngest functions** — every automation is named code, version-controlled.
- Webhooks (Twilio, Postmark events) hit `/api/webhooks/*` route handlers.

---

## Data model (Drizzle schema sketch)

Full schema in `apps/web/src/db/schema.ts` once we scaffold. Key tables:

### `users` (team members)
`id, email, name, role, avatar_url, created_at, ...`
**Roles enum:** `admin | acquisitions_manager | underwriter | closer | transaction_coord | dispo_manager | bird_dog_manager | viewer`

### `contacts` (buyers)
Migrated 1:1 from Ontraport contacts. Big table — all the buyer buy-box fields go here:
- Identity: `firstname, lastname, email, phone, sms_number, timezone, instagram, linkedin, facebook, twitter, website`
- Status: `status` (active / disqualified / closed / etc.), `qualification_tier (1-5)`, `score`, `time_since_last_activity` (derived view)
- Buy box: `park_type_preferences (text[]), target_regions (text[]), target_states (text[]), pads_desired_min, max_deal_size_usd, min_noi_usd, park_with_restaurant, open_to_leased_land, financing_options, fastest_turnaround`
- Capital: `deployable_cash_bucket, will_use_1031, pof_amount_usd, can_produce_pof, current_financing_resources (text[])`
- Compliance: `signed_ncnda_at, signed_pof_auth_at, sms_permission, bulk_email_status`
- Community: `subto_member, gator_member, top_tier_member, owners_club_member`
- Attribution: `first_lead_source, first_medium, first_campaign, last_lead_source, last_medium, last_campaign`
- Internal: `internal_notes_contact, internal_notes_criteria, internal_notes_qualify` (longtext)
- Owner: `owner_id → users.id`
- Timestamps: `created_at, updated_at, last_activity_at`

### `companies` (sellers / realtors)
`id, name, relationship_to_park (realtor | owner | owner_realtor), seller_first_name, seller_last_name, email, phone, office_phone, address, city, state, zipcode, instagram, facebook_page, description, annual_revenue_bucket, employee_count_bucket, owner_id, created_at, updated_at`

### `deals` (parks)
The big one. Migrated from Ontraport deals:
- Property: `park_name, park_address, park_city, park_state, park_country, listing_link, property_website, park_type, pads_count, cabins_count, tent_sites_count, hotel_motel_count, total_units, acres, full_hookup_pads, septic_type, septic_count, electrical_30amp, electrical_50amp, separate_meters, amenities (text[]), occupancy_pct, mix_use, google_map_url`
- Financials list: `list_price, list_noi, list_cap_rate`
- Financials agreed: `agreed_purchase_price, agreed_cap_rate, cash_offer, hybrid_purchase_price, hybrid_down_payment, hybrid_interest_rate, hybrid_amort_years, seller_finance_down_payment, seller_finance_amount, seller_finance_interest_rate, seller_finance_amort_years, seller_finance_balloon_years, bank_interest_rate, bank_amort_years, equity_contribution, total_assignment_payout`
- Liabilities: `current_mortgage_debt, current_mortgage_payment, current_mortgage_interest, current_mortgage_balloon_date, other_debts_liens, taxes_current, other_income_streams`
- Workflow: `status (FK → deal_statuses), dispo_stage, deal_priority (cold|warm|hot), call_disposition, weekly_offer_review (pass|fail), ready_for_review, ready_for_uw, recent_activity (derived)`
- Lead intake: `lead_source (bird_dog|direct_seller_rvx|outside_source_rvx), motivation_to_sell, looking_to_retire, ideal_close_date, owns_other_parks, manager_in_place, special_terms, what_makes_special`
- Bird dog (denormalized for quick access; also FK to bird_dogs table): `bird_dog_id, bird_dog_first_name, bird_dog_last_name, bird_dog_phone, bird_dog_email, bird_dog_notes, bd_shared_drive_url, update_to_bird_dog`
- Relations: `confirmed_buyer_id → contacts.id, secondary_buyer_id → contacts.id, seller_company_id → companies.id, owner_id → users.id, ops_owner_id → users.id`
- Documents (URLs to R2): `marketing_package_url, p_and_l_url, additional_financials_url[], appraisal_url, addendum_urls[], rvx_one_pager_url, rvx_five_pager_url, buyer_l1_financials_url, buyer_full_dd_url, data_room_url`
- Dates: `emd_due_date, emd_amount, emd_deposited, escrow_opened, inspection_period_end, psa_coe_date, updated_coe_date_2, updated_coe_date_3, closer_last_touch (NOT NULL), created_at, updated_at, last_activity_at`
- AI: `ai_summary_md` (markdown content, regenerated periodically)
- Fees: `escrow_fee_responsibility, transfer_tax_responsibility, title_policy_responsibility`
- Notes: `acquisition_manager_notes, offer_delivery_notes, closer_final_notes, phase_4_notes, phase_5_notes`

### `deal_statuses` (lookup)
`id, code, label, sort_order, role (am|uw|closer|pm|tc|dm|drip|dead), is_active`
Seeded with the 40 stages from your Ontraport pipeline (clean, sort_order explicit instead of embedded prefixes).

### `loi_rounds`, `psa_rounds`, `aa_rounds` (one row per round, replaces LOI 1/2/3 sprawl)
`id, deal_id, round_number, sent_at, accepted_at, rejected_at, contingent_at, contract_url, notes`

### `bird_dogs`
- Identity: `first_name, last_name, email, cell_phone, facebook_url, resume_url, w9_url, signed_agreement_url`
- Status: `status (FK → bird_dog_statuses), acquisition_level (senior|junior|onboarding), is_in_discord, kicked_from_discord, completed_training, ethics_training_status, manually_remove_from_tracker, auto_send_termination_email`
- Background: `prior_w2, w2_goals, hospitality_background, business_ops_background, why_join_rvx, how_heard_about_rvx, weekly_execution_plan, prior_job_history`
- Community: `subto_member, gator_member, top_tier_member, owners_club_member, zero_down_member`
- Lifestyle: `rv_class, rv_rig, years_full_time_traveling`
- Workflow: `agreement_sign_date, follow_up_meeting_at, start_date, game_plan_forward`
- Owner: `owner_id`, timestamps

### `bird_dog_statuses` (lookup)
~25 statuses, seeded from your Ontraport options.

### `activities` (unified inbox + audit log)
One row per event. Replaces Ontraport's `logitems` + `automationlogitems` split.
`id, type (email|sms|call|note|task|form_submit|status_change|field_change|tag_change|file_upload|page_view|webhook), subject_table (contacts|deals|companies|bird_dogs), subject_id, actor_user_id, payload jsonb, occurred_at`

Indexed by `(subject_table, subject_id, occurred_at desc)` for fast "show me everything that happened on this deal."

### `tasks`
`id, subject, type (call|email|task|admin), assignee_id → users.id, due_at, completed_at, outcome, parent_table, parent_id, created_at`

### `notes`
`id, body, author_id → users.id, parent_table, parent_id, type (manual|call_log|form_submission), created_at`

### `tags`
`id, name, color, scope (contact|deal|company|bird_dog), is_system, created_at`

### `taggings` (junction)
`id, tag_id, taggable_table, taggable_id, applied_by, applied_at`

### `automations` (named workflows)
`id, name, slug, trigger_type, trigger_filter jsonb, action_chain jsonb, is_active, last_run_at`

Far fewer rows than Ontraport's 36 — see "Automations" section below.

### `forms` (intake forms)
`id, slug, name, fields jsonb, on_submit_action, conversion_count, view_count`

### `messages` (sent emails/SMS records)
`id, channel (email|sms), template_id, recipient_table, recipient_id, recipient_address, subject, body_md, provider_message_id, status, opens_count, clicks_count, sent_at, delivered_at, opened_at, clicked_at, optout_at, complaint_at`

### `message_templates`
`id, name, channel, subject_template, body_template_md, variables jsonb, created_at, updated_at`

### `files`
`id, key (R2 object key), filename, mime_type, size_bytes, uploaded_by, parent_table, parent_id, created_at`

### `match_scores` (cached buyer-deal match table)
`id, deal_id, contact_id, score (0-100), reasons jsonb (which buy-box criteria matched/missed), computed_at`
Recomputed on deal or contact field changes; surfaced in matching UI.

---

## Core features

### F1. Buyer ↔ Deal matching engine (the killer feature)

**Input:** A deal record's park attributes (state, type, pads, NOI, asking price, financing flexibility, leased land, etc.).
**Output:** Ranked list of contacts (buyers) with a 0–100 match score and the reasons.

**Score formula (v1, tunable):**
```
+30  state ∈ buyer.target_states
+15  park_type ∈ buyer.park_type_preferences
+15  pads_count >= buyer.pads_desired_min
+10  list_price <= buyer.max_deal_size_usd
+10  list_noi >= buyer.min_noi_usd
+10  leased_land matches buyer.open_to_leased_land
+5   has_restaurant matches buyer.park_with_restaurant
+5   creative_finance match (if deal.has_seller_finance and buyer.financing_options=must_be_creative)

Disqualifiers (score=0):
- buyer.status ∈ (disqualified, closed, unresponsive long-term)
- buyer hasn't signed NCNDA AND deal requires NCNDA
```

UI: On every deal detail page, a sidebar **"Matched Buyers"** with top 20, sortable by score. One click → opens the contact. One click → "Send dispo to buyer(s)" prefilled.

UI: On every contact detail page, a sidebar **"Matching Deals"** mirror.

### F2. Per-deal data room

A buyer-facing page at `/deal/[shortcode]` that shows:
- Hero image, key stats (price, NOI, cap rate, # pads, state)
- Park description, amenities
- Document downloads (gated by NCNDA: if buyer hasn't signed, show "Sign NCNDA to access financials")
- Inquiry form (logs to activities, notifies owner)
- Visit tracking (records views per buyer email)

Replaces the manual per-park landing pages (e.g. AURORA #6C3C045).

### F3. Per-role dashboards

Six dashboards keyed by `users.role`:

- **Acquisitions Manager (Reza):** New leads in last 7 days, BD intake queue, deals waiting for review, drip schedule
- **Underwriter:** Deals in Phase 1/2 review, deals returned for rework
- **Closer (Marco, Graham):** My deals by stage, deals stale > 7 days, today's call list (sorted by `closer_last_touch` asc)
- **Transaction Coordinator:** Deals in PSA/escrow, EMD due dates, COE this week
- **Dispo Manager:** Deals ready to dispo, dispo blasts in flight, top 10 matched buyers per ready deal
- **Bird Dog Manager (Erica):** BD applications in queue, BD performance leaderboard (submissions / qualified / closed), agreement-signing pipeline

Each dashboard is a Server Component that streams data from Postgres. No client-side state.

### F4. Inbox / unified communications per record

On every contact/deal/company/BD detail page, an **Activity feed** showing emails, SMS, calls, notes, tasks, status changes, in reverse chronological order. Replaces having to dig through Ontraport's separate Contact Log and Automation Log views.

Includes inline composers: send email, send SMS, log call, add note — all logged to the activities table.

### F5. Pipeline kanban (deals)

Drag-and-drop deal cards across stages. Each column = one deal_status. Filters by closer / state / priority / age. Replaces the saved-group reconstruction.

### F6. Bird-Dog pipeline

Same kanban pattern, but for `bird_dogs` table — applications flow through interview → agreement → onboarding → active.

### F7. Lead intake funnels (rebuild of landing pages)

Three Next.js form flows replacing the Ontraport landing pages:

- **`/buyer-intake`** — 3-step buyer onboarding (contact + commitment → buy box → qualifying + POF). Mirrors the existing `/private-1/2/3` flow but as one app with progress saving + double opt-in via Postmark.
- **`/bird-dog/apply`** — single page BD application. Mirrors `/birddog`.
- **`/sell-your-park`** ⚠️ **revenue priority** — rebuild to fix the 0.51% conversion. Plan below.

#### `/sell-your-park` rebuild plan
- Drop most of the friction. Page 1 today probably asks for too much. New v1: park address + name + email + phone + asking price + "tell me about your park" — 6 fields, 1 page.
- Auto-create a `deals` record with status `1. New Lead Received` and `lead_source = direct_seller_rvx`.
- Email confirmation to seller, Slack/email ping to Marco + Reza within 2 minutes.
- 24h follow-up automation → Reza assigned a task.

### F8. Automations (replacing 36 with ~8)

The 36 Ontraport automations were ~24 state-cleanup / tag-sync rules that disappear once we have a real schema. The ones that matter:

| Automation | Trigger | Action |
|---|---|---|
| `new_lead_routing` | Form submit on any lead-intake form | Create deal/contact, assign owner, notify Slack |
| `bird_dog_onboarding` | New BD app | Email greeting → 24h follow-up → agreement email → onboarding packet (multi-step Inngest workflow) |
| `deal_drip` | Deal status changes to 80/81/82/83/84 (drip statuses) | Schedule check-in email at +7/+14/+30/+45/+90 days; on response, move back to active |
| `closer_followup_reminder` | `closer_last_touch` > 7 days ago AND deal is active | Daily digest email to closer with stale deals |
| `dispo_blast` | Manual trigger on a deal | Send email + SMS to selected matched buyers, log to activities |
| `region_match_index` | Buyer target_states changes | Recompute affected match_scores |
| `compliance_sms_guard` | Outbound SMS attempt | Block if recipient state ∈ {TX, WA, CA} unless explicit opt-in present |
| `recent_activity_calc` | Cron nightly | Refresh `time_since_last_activity` derived views |

Each is a named Inngest function with code, version control, and observability. Code-as-config, not Ontraport's drag-drop builders.

### F9. Document management

- Files upload to R2 with metadata in `files` table.
- LOI/PSA/AA contracts stored against `loi_rounds` / `psa_rounds` / `aa_rounds`.
- Future (Phase 2): DocuSign integration for e-sign. LOI template auto-fill with deal + buyer merge fields.

### F10. AI integrations (lightweight, in MVP)

- **Deal AI Summary:** After PSA signed, call Claude with deal context → write a 3-paragraph summary to `deals.ai_summary_md`. Surfaced on the data room page.
- **Note extraction:** Closer types a free-text note → Claude extracts structured fields (call outcome, next action, mentioned dollar amounts) → suggests field updates the user can accept/reject.
- **Email draft assist:** "Reply to this seller" button on a deal → Claude drafts a contextual reply using the deal data, closer's writing style, and prior thread.

Phase 2: call recording (Twilio Voice → Whisper → Claude summary).

---

## Migration from Ontraport

### One-time data migration script

`scripts/migrate-from-ontraport.ts`:
1. Pull all contacts via MCP API → upsert into `contacts` (map fields per the audit doc; archive unused like `Deployable Cash Range (archived)`).
2. Pull all deals → `deals` (split LOI 1/2/3 across `loi_rounds` table; same for PSA, AA).
3. Pull all companies → `companies`.
4. Pull all bird-dogs custom object → `bird_dogs`.
5. Pull all tags → `tags`; create `taggings` for each subscriber.
6. Pull all messages → `messages` (status history only; no need to re-send).
7. Pull all notes → `notes`.
8. Pull all tasks → `tasks`.
9. Pull all activity log → `activities` (capped to last 12 months).
10. Skip: `reza`, `op_training`, `partners`, `commissions`, `purchases`, `invoices`, `payments`, `pages`.

### Dual-run period

For 2–4 weeks, both systems live. New leads go into RVX-CRM; existing deals continue on Ontraport until closed or migrated to RVX. Confirms parity before cutover.

### Cutover

1. Final delta sync from Ontraport (records changed since last migration run).
2. Switch DNS for `rvparkexchange.com/private`, `/birddog`, `/sellyourpark`, `/lead-submit` to point at new app.
3. Cancel Ontraport subscription 30 days later (keep read-only access during that window).

---

## Phase plan

### Phase 0 — Scaffolding (1 day)
Next.js app + Drizzle + Postgres + Better Auth + basic users table + login. Smoke test deployed to Vercel.

### Phase 1 — Core CRUD (1–2 weeks)
- All entities defined (contacts, deals, companies, bird_dogs, tasks, notes, activities, tags, files)
- Migrations + seed data
- Read-only list + detail views for each entity
- Field-level edit forms
- File upload to R2
- Basic search by name/email

**Deliverable:** A team member can log in, browse all buyers/deals/BDs, edit fields, upload files. Ontraport-equivalent on the data side, minus automations.

### Phase 2 — Workflows (1–2 weeks)
- Pipeline kanban for deals + bird-dogs
- Activity feed per record
- Inline composers (email via Postmark, SMS via Twilio, note, task)
- Tasks dashboard
- Per-role dashboards (read-only first version)
- Lead-intake forms (buyer, bird-dog, seller) replacing Ontraport landing pages

**Deliverable:** Team can run their day in the new app. Ontraport still on standby for historical data.

### Phase 3 — Matching & dispo (1 week)
- `match_scores` computation engine
- "Matched Buyers" sidebar on deals
- "Matching Deals" sidebar on contacts
- Per-deal data room page with NCNDA gating
- Dispo blast composer (send to matched buyers with templated email + SMS)

**Deliverable:** Marco closes a deal by picking matched buyers in one screen and clicking Send. The killer feature.

### Phase 4 — Automations (1 week)
- Inngest setup
- 8 named automations from F8 ported
- Compliance SMS guard
- Cron job for `recent_activity_calc`

**Deliverable:** No more daily manual nudges; the system runs itself.

### Phase 5 — Migration + cutover (1–2 weeks)
- Run migration script against Ontraport prod API
- Dual-run for 2 weeks
- Cutover; cancel Ontraport

### Phase 6 — AI + e-sign (1–2 weeks, post-MVP)
- Deal AI summary
- Note-extraction-to-fields
- DocuSign integration
- LOI template auto-fill

**Total estimated time to off Ontraport:** 6–10 weeks of focused build with one engineer (or me + you).

---

## Cost model

### MVP run-cost (monthly)
| Service | Plan | Cost |
|---|---|---|
| Vercel | Pro | $20 |
| Neon Postgres | Launch | $19 |
| Postmark | 10k emails | $15 |
| Twilio | ~1k SMS + 2 numbers | $20 |
| Cloudflare R2 | ~20GB | $5 |
| Inngest | Free tier (covers your event volume) | $0 |
| Better Auth | Self-hosted (free) | $0 |
| Sentry | Free tier | $0 |
| Anthropic | Pay-per-use, ~$30/mo at small volume | $30 |
| Domain (already owned) | — | $0 |
| **Total** | | **~$110/mo** |

vs. **Ontraport** at the Plus/Pro tier with your usage: **$147–$297/mo**, and growing per-contact.

Real savings are not the $100/mo — they're (a) shipping features Ontraport will never build, and (b) owning the data forever.

### One-time engineering cost
6–10 weeks at typical contractor rates is $30k–80k. The break-even at $200/mo savings is meaningless; the value is in the features, the optionality, and the ability to refactor without negotiating with a SaaS roadmap. **Do this for the features, not the SaaS savings.**

---

## Open issues / things to resolve

1. **Email deliverability domain.** Need to set up SPF/DKIM/DMARC on `rvparkexchange.com` for Postmark. Probably already done for Ontraport — we'll copy and add Postmark's keys.
2. **Twilio number provisioning.** Get 2 numbers — one for SMS sends, one for inbound (with SHAFT/state opt-in compliance flow).
3. **Cal.com integration.** Self-hosted or hosted? Hosted is $0 for one user, scales with team.
4. **Backup strategy.** Neon has point-in-time recovery on paid tiers. Plus nightly logical dump to R2.
5. **Team auth provisioning.** Initial users (Marco, Reza, Erica, Graham, you) — magic-link login + 2FA.
6. **SOC-style audit trail.** All field changes hit `activities` table — that's the audit log. Retention policy?
7. **What "ATM" stands for in Ontraport names** — I'll keep using "AM" (Acquisitions Manager) in the rebuild unless you tell me otherwise.
8. **Subto / Pace Morby ecosystem integration** — for now, just tag fields on contacts. No API integration in MVP.

---

## What's next

Once you sign off on this spec, I'll:
1. Scaffold the Next.js app, Drizzle schema, Better Auth, and a hello-world deploy on Vercel + Neon (Phase 0).
2. Wire up the contacts table + list/detail views (start of Phase 1).
3. Ship something you can click on within the first session.

You can shape direction inline as we build — schemas, UI, naming all changeable.
