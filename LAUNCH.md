# Launch Checklist — RVX CRM

Pre-launch hardening pass completed 2026-06-13 (commits `9603fa9`, `a5c495a`, `df3f29f`).
Three sections: what got fixed, what a human must do before go-live, what was
found but deliberately left.

---

## A. Fixed in this pass

### Security — server actions now enforce permissions (was: login-only)
Server actions are network-callable by anyone signed in, regardless of what
the UI shows. These all enforced nothing but authentication:

| Action | Now requires |
|---|---|
| Feedback queue: reorder / set-status / set-notes / **hard-delete** | `manage_users` |
| `saveOpsBlockAction` (all Mission Control / onboarding / meeting copy) | leadership role |
| Lead pool: CSV upload / batch-delete / soft-delete | `manage_users` |
| Level 10 meeting writes (notes, ratings, action items) | leadership + DD |
| Issue delete | admin + Sales & Marketing |
| `sendDispoAction` (**emails real buyers**) | `dispo_to_buyers` |
| All ~20 due-diligence mutations | `edit_deals` |
| `triageDealAction` | `use_triage_cockpit` |
| Create/update on deals, contacts, companies, bird dogs | `create_*` / `edit_*` (the /settings/roles matrix now actually binds) |
| Daily brief | pinned to session user (ignored caller-supplied userId) |

### Security — pages
- `/trash` had **no gate** — any signed-in user could browse every soft-deleted
  record. Now requires `view_trash`.
- `/ops/*` (all nine tabs) gated on `view_mission_control` at the layout.
- **Public signup disabled** (was open on the login page — anyone could create
  a viewer-role account). Login form is sign-in only; accounts come from
  /settings/users.

### Bugs found in the live walkthrough
- **`/bd-leaderboard` crashed for everyone** (`raw_lead_outcome = text` enum
  cast error). Fixed; verified rendering.
- **Daily brief race**: two simultaneous /today loads → duplicate-key error,
  brief dropped. Now conflict-safe.
- **Stale claims**: a lead claimed >24h ago now auto-recycles to the pool on
  the next claim (self-healing; previously stranded forever if a BD walked away).
- **Converted leads kept nagging**: converting a lead now clears its follow-up
  schedule so /today stops showing callbacks for won leads.

### Walkthrough results (QA users created → walked → deleted)
- BD first login → /onboarding redirect → Skip → /today: ✓
- BD sidebar shows no leadership tabs: ✓
- BD deep-links to /hires, /reimbursements, /trash, /admin/leads,
  /admin/revenue, /settings/users: all denied ✓
- BD /bd-triage (empty-pool state), /my-leads (empty state), /bd-leaderboard: ✓
- Admin: all 8 leadership surfaces render; Derek's hire detail shows stepper +
  chore list + advance button: ✓
- Mobile (375px): no horizontal overflow, tables scroll in their wrappers ✓
- Dark mode: applies correctly on new pages ✓
- Data integrity sweep: 13 checks, all clean (one expected finding — see B1)

---

## B. Human to-do before go-live

1. **Lyn can't log in.** Her account exists (rockgritweb@gmail.com, Park
   Manager) but has no password. Go to **/settings/users → Reset password**
   and send it to her.
2. **Rewrite the /onboarding copy.** The 4 steps are Claude-drafted
   placeholders. You or Erica: click any text on /onboarding to edit in place.
   Check step 2's team list and step 4's meeting details especially.
3. **Revoke the old Ontraport API key.** The migration is done; the key in
   your Ontraport account should be revoked so it can't be used.
4. **Resend integration (task #47) is half-done.** Email still goes through
   Gmail SMTP. Decide: finish the swap or drop the task and stay on Gmail.
   Gmail works but has daily sending limits (~500/day) — fine for now, a
   problem if dispo blasts grow.
5. **Create the ~10 BD accounts** in /settings/users with role BD level 1/2/3.
   Each gets the orientation walkthrough automatically on first login.
6. **Upload a lead CSV.** The pool is currently empty — BDs will hit "No fresh
   leads" on day one unless /admin/leads has inventory.
7. **Manual 10-minute walkthrough** (only you can do this — real accounts):
   - Log in as yourself: advance Derek's hire one step, then send it back.
   - Have Kevin log in: confirm Derek shows in "On your desk" on /today.
   - Have one BD do a real call + disposition end-to-end.
8. ~~Decide: should BDs see Mission Control?~~ **DONE (2026-06-11)** — BDs
   locked to need-to-know: Today (their hub), Lead Work, My Leads,
   Leaderboard. Everything else hidden AND server-gated.

## C. Found, deliberately not fixed

- **Task delete is open to all staff** (any user can delete any task).
  Tasks are lightweight workflow items; restricting felt like overkill. Flag
  if you disagree.
- **EditableBlock fails silently for non-leadership.** A BD who clicks
  Mission Control text can still type; the save now fails server-side but the
  UI doesn't show an error until refresh. Cosmetic; fix later by passing
  canEdit down (the /onboarding page already does this properly).
- **No notifications on hire/reimbursement transitions.** Kevin finds out
  Derek is waiting via the /today widget, not email. Next iteration: wire
  sendNotification into advanceHireStatusAction.
- **`listQueue` / `listSavedViews` accept a userId param** (read-only,
  low-sensitivity). Harmless; tightening would touch several call sites.
- **Kerry (DD) can't edit ops content** — leadership-only now. She CAN write
  L10 action items. Widen `OPS_EDITOR_ROLES` in src/app/actions/ops.ts if she
  needs more.
- **Two stale tasks in the session task list** (#47 Resend, #66 Today
  mockups) — see B4; #66 is abandoned, close it.
