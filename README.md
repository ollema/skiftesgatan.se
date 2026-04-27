# skiftesgatan.se

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A-D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book shared facilities, read association news, and access member information such as bylaws, finances, renovation plans, and board details.

There is no self-registration. Accounts are pre-created by an admin via Drizzle Studio against the production database (`pnpm db:tunnel` + `pnpm db:studio:prod`). Emails are marked as verified at creation time. Each resident can then log in and reset their password via email.

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Production Database](#production-database)
- [Design](#design)
- [TODO](#todo)

## Features

- **Closed user system** -- no self-registration; accounts are provisioned by admin for each of the 32 apartments. Username is the apartment number (e.g. A1001). Supports password reset via email, email address changes with re-verification, and customizable display names.
- **Laundry room booking** -- calendar with 5 daily timeslots (3-hour blocks, 07-22), one active booking per user
- **Outdoor area booking** -- calendar with 1 all-day slot (07-22), one active booking per user
- **Booking constraints** -- 30-day advance window, concurrent booking protection via database unique constraint, replace-or-cancel flow
- **Calendar subscription** -- per-user iCal feed URL (`/kalender/{token}.ics`) that syncs bookings to iPhone Calendar or any app supporting webcal subscriptions; manage from account page
- **Member information** -- markdown pages for bylaws (stadgar), finances, renovations, and board members, compiled at build time
- **News** -- markdown articles for association updates, shown on the home page and in a dedicated listing

## Tech Stack

- **Svelte 5 + SvelteKit 2** -- runes, async, remote functions, node adapter
- **Drizzle ORM** -- PostgreSQL everywhere (public dev/test instance + CapRover-internal prod)
- **Better Auth** -- email/password with custom username plugin for apartment-based login, sign-up disabled
- **Tailwind CSS 4** -- with Bits UI for headless components (dialogs, menus)
- **Content Collections** -- markdown to HTML at build time for news and information pages
- **Resend** -- email delivery for verification and password reset (file-based mock in dev)
- **Valibot** -- schema validation for form inputs
- **@internationalized/date** -- timezone-aware calendar date handling

## Getting Started

**Prerequisites:** Node.js 22, pnpm, access to the public dev/test Postgres host.

```sh
pnpm install
cp .env.example .env
# Fill in DATABASE_URL and DATABASE_URL_ADMIN with the values from the team password manager
pnpm db:reset:dev
pnpm dev
```

`db:reset:dev` drops the `dev` database, pushes the schema, and seeds 32 dummy accounts (A1001–D1302) with one laundry booking each plus a few outdoor bookings. The default password for each account is `password-{username}` — e.g. `password-A1001`. `B1001` is admin.

## Project Structure

```
src/
  lib/
    server/
      db/
        auth.schema.ts         # Better Auth tables (user, session, account, verification)
        booking.schema.ts      # Booking domain (timeslot, booking)
        calendar.schema.ts     # iCal subscription tokens
        notification.schema.ts # Notification preferences and scheduled reminders
        schema.ts              # Re-exports all schemas for Drizzle
        index.ts               # Database client (postgres.js + drizzle)
      auth.ts                  # Better Auth server config
      auth.config.ts           # Username plugin, apartment validation
      booking.ts               # Booking queries and business logic
      calendar.ts              # iCal feed generation and token management
      notification.ts          # Notification preferences and reminder scheduling
      notification.scheduler.ts # Periodic worker that sends due reminders
      notification.email.ts    # Reminder email template variables
      email.ts                 # Resend integration with file-based fallback
      email.templates.ts       # Email template aliases
      hints.ts                 # Setup-hint helpers (notifications, calendar)
      env.ts                   # Required-env-var validation at startup
      log.ts                   # Console-based logger
    api/
      auth.remote.ts           # Auth remote functions (login, password reset, etc.)
      booking.remote.ts        # Booking remote functions (get slots, book, cancel)
      admin.remote.ts          # Admin-only remote functions
      calendar.remote.ts       # iCal token regeneration / removal
      contact.remote.ts        # Contact form submission
      hints.remote.ts          # Onboarding-hint state
      notification.remote.ts   # Notification preference toggles
    components/
      Button.svelte            # Primary/destructive button variants
      Calendar.svelte          # Month-view calendar with availability dots
      ConfirmDialog.svelte     # Modal confirmation (cancel, replace, login prompt)
      EditDialog.svelte        # Generic edit-in-dialog wrapper
      Navbar.svelte            # Desktop navigation with dropdowns
      MobileMenu.svelte        # Slide-out mobile navigation
      BookingPage.svelte       # Shared layout for laundry/outdoor booking pages
      TimeSlots.svelte         # Time-slot grid with book/cancel/replace flow
      SetupHints.svelte        # Dismissible onboarding hints
  routes/
    +layout.svelte             # Global layout (navbar, toaster, user state)
    +page.svelte               # Home page (hero, about, latest news, services)
    +error.svelte              # Custom error page
    sitemap.xml/               # Generated sitemap
    konto/                     # Account management (profile, password, email)
    admin/                     # Admin dashboard (per-user views)
    tvattstuga/                # Laundry room booking page
    uteplats/                  # Outdoor area booking page
    kalender/[token].ics/      # Per-user iCal feed
    nyheter/                   # News listing and [slug] detail pages
    information/               # Markdown information pages
    kontakt/                   # Contact page
content/
  news/                        # Markdown news articles
  information/                 # Markdown info pages (stadgar, ekonomi, styrelsen, etc.)
scripts/
  db/                          # db:push:*, db:reset:*, db:seed:dev, db:studio:*, db:tunnel
  generate-icons.ts            # Generates favicons / PWA icons
  sync-email-templates.ts      # Syncs email templates to Resend
e2e/                           # Playwright E2E tests
```

## Scripts

| Script                | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `pnpm dev`            | Start dev server                                                      |
| `pnpm build`          | Production build                                                      |
| `pnpm preview`        | Preview production build                                              |
| `pnpm check`          | SvelteKit sync + svelte-check                                         |
| `pnpm lint`           | Prettier + ESLint                                                     |
| `pnpm format`         | Auto-format code                                                      |
| `pnpm knip`           | Detect unused files/dependencies                                      |
| `pnpm test`           | Run all tests (unit + E2E)                                            |
| `pnpm test:unit`      | Vitest                                                                |
| `pnpm test:e2e`       | Playwright E2E tests                                                  |
| `pnpm db:push:dev`    | Push schema to dev (force)                                            |
| `pnpm db:push:prod`   | Push schema to prod via tunnel (interactive on destructive)           |
| `pnpm db:reset:dev`   | DROP + CREATE dev, push schema, seed                                  |
| `pnpm db:reset:test`  | Rebuild test_template (drop, push, seed, bake auth, mark IS_TEMPLATE) |
| `pnpm db:seed:dev`    | Re-seed dev (idempotent)                                              |
| `pnpm db:studio:dev`  | Drizzle Studio against dev                                            |
| `pnpm db:studio:prod` | Drizzle Studio against prod via tunnel                                |
| `pnpm db:tunnel`      | Open SSH tunnel to production database                                |
| `pnpm auth:schema`    | Generate Better Auth schema                                           |
| `pnpm icons`          | Generate favicons and PWA icons                                       |
| `pnpm email:sync`     | Sync email templates to Resend                                        |

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

**`.env`** -- local development:

| Variable             | Required | Description                                                          |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL`       | Yes      | Postgres connection string for the `dev` database                    |
| `DATABASE_URL_ADMIN` | Yes      | Admin connection (to `postgres` DB) for db:reset:dev / db:reset:test |
| `ORIGIN`             | Yes      | Application origin URL (e.g. `http://localhost:5173`)                |
| `BETTER_AUTH_SECRET` | Yes      | 32-character high-entropy secret for session signing                 |
| `RESEND_API_KEY`     | Prod     | Resend API key for email delivery (file mock in dev)                 |
| `EMAIL_FROM`         | Yes      | Sender email address                                                 |
| `CONTACT_MANAGER_*`  | Prod     | Property manager name, phone, and email                              |

**`.env.prod`** -- production database commands (copy from `.env.prod.example`):

| Variable        | Description                                     |
| --------------- | ----------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string (via tunnel)       |
| `PROD_SSH_HOST` | SSH target for tunnel (e.g. `root@your-vps-ip`) |
| `PROD_SSH_PORT` | SSH port (default 4646)                         |

## Testing

**Unit tests** (Vitest): pure-logic tests with the database module mocked via `vi.mock`. No real DB required.

**E2E tests** (Playwright, 4 workers): each worker gets its own database cloned from `test_template`. The template is built by `pnpm db:reset:test` (drop, push schema, seed, bake 32 storageState JSONs into `e2e/.auth/`, mark `IS_TEMPLATE=true`). On every `pnpm test:e2e`:

1. globalSetup connects to `DATABASE_URL_ADMIN`, drops `test_*` DBs older than 1h, generates a `runId`, creates one fresh DB per worker via `CREATE DATABASE … TEMPLATE test_template`.
2. Each worker runs its own `pnpm preview` with its own `DATABASE_URL`.
3. globalTeardown is empty — cleanup-on-start handles leaks naturally.

`test_template` and `e2e/.auth/*.json` are provisioned **manually** and committed (the JSONs only contain session cookies for dummy users on the public test DB). CI never touches the template — it just clones from it. This keeps CI fast and keeps cookie/session-row coupling under your control.

**Workflow when changing `src/lib/server/db/schema.ts` (or seed/auth config):**

```sh
# 1. Migrate dev in place
pnpm db:push:dev

# 2. Iterate against dev
pnpm dev

# 3. Rebuild test_template + re-bake e2e/.auth/*.json
pnpm db:reset:test

# 4. Run the suite
pnpm test

# 5. Commit the regenerated e2e/.auth/*.json so CI picks them up
git add e2e/.auth && git commit -m "rebake e2e auth JSONs"

# 6. After merge, push to prod
pnpm db:tunnel        # in one terminal
pnpm db:push:prod     # in another (with .env.prod loaded)
```

The auth JSONs are signed with a fixed `BETTER_AUTH_SECRET` baked into `e2e/test-server.ts` — CI uses the same value, so the cookies validate everywhere.

**CI** (GitHub Actions): lint + typecheck + knip, unit tests, e2e tests. The e2e job uses `DATABASE_URL` and `DATABASE_URL_ADMIN` from repository secrets — `DATABASE_URL_ADMIN` is only used to clone per-worker DBs, never to rebuild the template.

## Production Database

Production uses PostgreSQL on a CapRover VPS. The database is not publicly accessible -- you connect via SSH tunnel.

**One-time CapRover setup:**

1. Open CapRover UI > Apps > `skiftesgatan-prod-db` > App Config
2. Add port mapping: Server Port `54321` → Container Port `5432`
3. Save & Update

**Local setup:**

1. Copy `.env.prod.example` to `.env.prod` and fill in `PROD_SSH_HOST`, `PROD_SSH_PORT`, and `DATABASE_URL`
2. Open the tunnel in one terminal: `pnpm db:tunnel`
3. In another terminal, run prod commands: `pnpm db:push:prod` (apply schema changes) or `pnpm db:studio:prod` (browse data).

`pnpm db:push:prod` requires you to type the database name to confirm, then runs `drizzle-kit push` interactively so you can review and approve any destructive diffs (dropped columns, etc.).

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing layout rules, booking calendar colors, and anti-patterns.

## TODO

Code quality improvements identified during codebase review, ordered by impact.

### High

- [ ] **Redirect skiftesgatan.com → skiftesgatan.se and set up Search Console** -- both domains are currently owned. Configure a 301 redirect from the .com to the .se (canonical) so any inbound links/typed traffic land in one place, then verify the .se in Google Search Console and submit `sitemap.xml` for SEO coverage. Worth doing while we still control both names.

- [ ] **PWA readyness** -- add manifest.json, icons, and service worker for offline support and installability.

- [ ] **Theming** -- favicons and PWA theme colors or whatever those attributes are called should match the new color scheme.

### Low

- [ ] **Auto-refresh booking calendar** -- if a user leaves the tab open, slot availability can go stale. Consider periodic re-fetch or visibility-change refresh. Better yet, let's use SSE!
