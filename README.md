# South Florida Simchah Initiative — floridasimchah.org

Next.js 14 (App Router) site with a **family portal** and an **operator back office**.

- **Public site:** home, about, packages, venues & vendors, get involved, donate, partners, contact. Packages and venues are managed in the back office, and every form saves to the Inquiries inbox.
- **Family portal** (`/portal`): families register, create an event, request services and equipment from the catalog, request catering quotes, submit for review, accept quotes online, follow their payment plan (pay online through Stripe, or offline), message their coordinator, and see the day-of timeline.
- **Back office** (`/admin`, operators and admins): pipeline dashboard (awaiting quote, upcoming events, overdue payments, tasks due), quote builder prefilled from requests and catalog pricing (discount, community subsidy, tax), payment plans (deposit plus installments; record check/Zelle/cash; adjust or waive), provisioning (auto-generated checklist, staff assignments with double-booking hints, equipment allocation with inventory conflict detection, run of show), internal notes, catalog, staff roster, venues, packages, inquiries, and user roles.

## Workflow

```
draft ──submit──▶ submitted ──operator sends quote──▶ quoted ──family accepts──▶ booked ──▶ in_production ──▶ completed
                      ▲                                   │
                      └────── family requests changes ────┘           (cancelled from any stage)
```

When a family accepts a quote, the event is booked **automatically**:
1. A payment plan is created (default 25% deposit + 3 installments, paid off 14 days before the event).
2. Provisioning starts: tracked equipment is allocated from inventory, staffing, catering, and vendor lines become tasks, the standard run-up checklist is scheduled backward from the event date, and a draft run of show is added.
3. Operators are emailed.

Operators can rebuild the plan or adjust individual installments. A plan can't be rebuilt once a payment has been recorded.

## Stack

Next.js 14 server components and server actions · Postgres via Drizzle ORM · cookie sessions (signed JWT with `jose`, passwords hashed with `bcryptjs`) · Tailwind · optional Stripe Checkout and Resend email.

## Local development

```bash
cp .env.example .env.local      # set DATABASE_URL and AUTH_SECRET at minimum
npm install
npm run db:migrate
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me npm run db:seed   # add `-- --demo` for sample staff + a demo family
npm run dev
```

The seed loads the original three packages and two venues, plus a starter services and equipment catalog. **Catalog prices are placeholders.** Review them in `/admin/catalog` before launch. With `--demo`, sign in as `family@example.com` / `demo-password`.

Other scripts: `npm run typecheck`, `npm run lint`, `npm test` (payment schedule and quote math), `npm run db:generate` (after editing `lib/db/schema.ts`).

## Deploying to Netlify

1. Create a Postgres database (Neon or Supabase both work well with Netlify) and copy its **pooled** connection string.
2. In Netlify → Site settings → Environment variables, set the variables from `.env.example` (at minimum `DATABASE_URL`, `AUTH_SECRET`, `SITE_URL`).
3. Deploy. The build command (`netlify.toml`) runs migrations and then `next build`.
4. Run `npm run db:seed` once against the production `DATABASE_URL` to load reference data and create your admin.
5. Optional: add a Stripe webhook to `https://<site>/api/stripe/webhook` for `checkout.session.completed`, and set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.

## Project layout

```
app/(site)/        public pages, login, register
app/portal/        family portal
app/admin/         back office
app/actions/       server actions (auth, public, portal, admin), which re-check access on every call
app/api/stripe/    Stripe webhook
lib/db/            Drizzle schema + client
lib/               auth, quote math, payment schedules, provisioning, notifications
drizzle/           SQL migrations
scripts/           migrate + seed
```
