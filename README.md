# South Florida Simchah Initiative — floridasimchah.org

Next.js 14 (App Router) site with a **family portal** and an **operator back office**.

- **Public site:** home, about, packages, venues & vendors, get involved, donate, partners, contact. Packages, venues, and vendors are managed in the back office, and every form saves to the Inquiries inbox.
- **Live impact numbers** on the home page (see `/admin/settings`):
  - *Families hosted*: distinct families with a completed event, plus a configurable count from before the portal.
  - *Average savings*: an out-of-state cost-per-guest benchmark × guests, minus each booked event's accepted quote.
  - *Approved venues & vendors*: active venues plus approved vendors.

  A number stays hidden until there's real data behind it.
- **Family portal** (`/portal`): families register, create an event, request services and equipment from the catalog, request catering quotes, submit for review, accept quotes online, follow their payment plan (pay online through Stripe, or offline), message their coordinator, and see the day-of timeline.
- **Event intake** (shared by both sides):
  - type (Wedding, Bar Mitzvah, Bris Milah), date and expected guests;
  - venue with address and on-site contact (families never see a listed venue's internal contact);
  - for weddings: chosson and kallah, their parents, and a responsible party for each side;
  - party planner;
  - key times: venue access/setup, Kabbalas Panim/cocktails, Chuppah/ceremony, dessert, must-be-out.

  Families edit it in the portal until office staff **lock** it. Operators can create events for families without accounts; the event links to the family when they register with the contact email.
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

## Sign in with Google and Microsoft

Optional. Each button appears on the sign-in and sign-up pages once its keys are set. Families who sign up this way have no password until they add one on their Account page, where they can also connect the other provider.

**Google**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Authorized redirect URI: `https://floridasimchah.org/api/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Netlify.

**Microsoft**
1. Azure portal → Microsoft Entra ID → App registrations → New registration. Supported account types: *any organizational directory and personal Microsoft accounts*.
2. Redirect URI (Web): `https://floridasimchah.org/api/auth/microsoft/callback`.
3. Certificates & secrets → New client secret.
4. Token configuration → Add optional claims (ID token): `email` and `xms_edov`.
5. Set `MICROSOFT_CLIENT_ID` (the Application ID), `MICROSOFT_CLIENT_SECRET` and `MICROSOFT_TENANT_ID=common` in Netlify.

**How accounts are matched:** a returning Google/Microsoft identity always signs into the account it was first linked to. A new identity links to an existing account by email only when the provider vouches for the email: Google's `email_verified`, or for Microsoft a personal account or a verified domain (`xms_edov`). Work and school tenants can otherwise put any address in the email claim, so unverified Microsoft emails can't create or take over accounts. Those users sign in with email and password, then connect Microsoft from their Account page.

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

1. Create a Postgres database (Neon or Supabase both work well with Netlify) and copy its connection string. Neon's default string works as-is; libpq-only options like `channel_binding` are stripped automatically.
2. In Netlify → Site settings → Environment variables, set the variables from `.env.example`: at minimum `DATABASE_URL`, `AUTH_SECRET`, `SITE_URL`, plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` for your first login.
3. Deploy. The production build command (`netlify.toml`) runs migrations, then the seed, then `next build`. The seed only fills empty tables, and makes `ADMIN_EMAIL` an admin whose password is `ADMIN_PASSWORD` (creating the account if needed), so it's safe on every deploy. The build log shows an `Admin:` line saying what happened. Make sure both variables are available to **Builds** in Netlify. After your first sign-in, remove `ADMIN_PASSWORD` so later deploys stop resetting it.
   Deploy previews and branch deploys only run `next build`, never migrations or the seed, so unmerged code can't change the production database. Previews have no database unless you give the Deploy Previews context its own `DATABASE_URL` (for example a Neon branch).
4. In `/admin/settings`, set the out-of-state cost per guest and any families hosted before the portal.
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
