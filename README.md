# RVX CRM

Self-hosted brokerage operating system for rvparkexchange.com. Replaces Ontraport.

See [spec/SPEC.md](spec/SPEC.md) for the full build doc and [audit/findings.md](audit/findings.md) for the audit that produced it.

## Stack

Next.js 15 · React 19 · TypeScript · Drizzle ORM · Postgres (Neon) · Better Auth · Tailwind v4 · Postmark · Twilio · Inngest · Cloudflare R2

## Local setup (one-time)

### 1. Install Node 20+

If you don't have it:

```bash
# Install nvm (Node version manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Restart your shell, then:
nvm install 20
nvm use 20
node --version  # should print v20.x
```

### 2. Get a free Neon Postgres database

- Sign up at https://neon.tech (free Launch tier is plenty for dev)
- Create a project named `rvx-crm`
- Copy the connection string (looks like `postgresql://...neon.tech/...?sslmode=require`)

### 3. Configure environment

```bash
cp .env.example .env.local
# Open .env.local and:
#  - Paste your Neon DATABASE_URL
#  - Generate a secret: openssl rand -base64 32  →  paste into BETTER_AUTH_SECRET
```

### 4. Install + push schema

```bash
npm install
npm run db:push       # creates tables in Neon
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000

You can sign up at /login → it creates a user with role `viewer` by default. To promote yourself to admin, see "Seeding admins" below.

## Seeding admins

The first run creates an empty users table. Sign up at `/login`, then in Neon's SQL editor (or `npm run db:studio`):

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

Future: a CLI seed script + magic-link invites.

## Project structure

```
src/
  app/                  Next.js App Router
    (app)/              Authenticated area
      dashboard/        Per-role dashboards (TODO)
      layout.tsx        Auth-gated layout
    api/auth/[...all]/  Better Auth handler
    login/              Login + signup
    layout.tsx          Root layout
    page.tsx            Marketing home (logged-out)
    globals.css         Tailwind v4
  db/
    index.ts            Postgres + Drizzle client
    schema.ts           All tables
  lib/
    auth.ts             Better Auth server config
    auth-client.ts      Better Auth client SDK
  middleware.ts         Auth gating

audit/                  Ontraport audit findings (read these)
spec/                   Build spec
raw/                    Raw data snapshots from Ontraport
drizzle/                Auto-generated migrations
```

## Deploy to Vercel + Neon (when ready)

1. Push this repo to GitHub.
2. https://vercel.com/new → import the repo.
3. Set env vars in Vercel (same as `.env.local`):
   - `DATABASE_URL` — Neon connection string
   - `BETTER_AUTH_SECRET` — same secret
   - `BETTER_AUTH_URL` — your production URL (e.g. `https://crm.rvparkexchange.com`)
4. Deploy. Run `npm run db:push` locally pointed at the prod DB to apply schema.

## Phase 0 (this version)

Phase 0 ships:
- ✅ Next.js + Tailwind v4 running
- ✅ Drizzle connected to Postgres with `user`, `session`, `account`, `verification` tables (Better Auth's schema) + a `role` enum
- ✅ Email/password signup + login via Better Auth
- ✅ Auth-gated `/dashboard` route
- ✅ Hello-world dashboard

What's next: Phase 1 — contacts, deals, companies, bird_dogs schema + CRUD. See [spec/SPEC.md](spec/SPEC.md) for full plan.
