# skiftesgatan.se

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A-D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book shared facilities, read association news, and access member information such as bylaws, finances, renovation plans, and board details.

There is no self-registration. Accounts are pre-created by an admin. Each resident can then log in and reset their password via email.

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
- **Drizzle ORM** -- PostgreSQL for dev and prod; PGlite in-process for E2E tests
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
pnpm db:reset       # drop schema, push, seed dev fixtures
pnpm dev
```

Every `db:*` command prints the target `DATABASE_URL` and asks for confirmation before doing anything. Pass `-- -y` to skip the gate (e.g. `pnpm db:reset -- -y`). Re-run `db:reset` whenever you want fresh dev bookings -- the fixtures use `today + N days` so they stale out as time passes.

Dev accounts use apartment numbers A1001 through D1302. Password for each is `password-{username}`, e.g. `password-A1001`. Each dev account has a fictional display name that can be changed on the /konto page. `B1001` is admin.

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
        index.ts               # Database client (postgres.js for dev/prod, PGlite for E2E)
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
  db/                          # db:push, db:reset (dev only), db:studio, db:tunnel
  generate-icons.ts            # Generates favicons / PWA icons
  sync-email-templates.ts      # Syncs email templates to Resend
e2e/                           # Playwright E2E tests
```

## Scripts

| Script             | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `pnpm dev`         | Start dev server                                                  |
| `pnpm build`       | Production build                                                  |
| `pnpm preview`     | Preview production build                                          |
| `pnpm check`       | SvelteKit sync + svelte-check                                     |
| `pnpm lint`        | Prettier + ESLint                                                 |
| `pnpm format`      | Auto-format code                                                  |
| `pnpm knip`        | Detect unused files/dependencies                                  |
| `pnpm test`        | Run all tests (unit + E2E)                                        |
| `pnpm test:unit`   | Vitest (unit + integration)                                       |
| `pnpm test:e2e`    | Playwright E2E tests                                              |
| `pnpm db:push`     | Apply schema changes interactively (against `DATABASE_URL`)       |
| `pnpm db:reset`    | Drop schema, push, and seed dev fixtures (dev only; reset-dev.ts) |
| `pnpm db:studio`   | Open Drizzle Studio (against `DATABASE_URL`)                      |
| `pnpm db:tunnel`   | Open SSH tunnel to the production database host                   |
| `pnpm auth:schema` | Generate Better Auth schema                                       |
| `pnpm icons`       | Generate favicons and PWA icons                                   |
| `pnpm email:sync`  | Sync email templates to Resend                                    |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. The same shape applies whether you point at dev or prod -- to run a command against prod, open `pnpm db:tunnel` and override `DATABASE_URL` inline.

| Variable             | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL`       | Yes      | Postgres connection string                            |
| `ORIGIN`             | Yes      | Application origin URL (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | Yes      | 32-character high-entropy secret for session signing  |
| `RESEND_API_KEY`     | Prod     | Resend API key for email delivery (file mock in dev)  |
| `EMAIL_FROM`         | Yes      | Sender email address                                  |
| `CONTACT_MANAGER_*`  | Prod     | Property manager name, phone, and email               |

## Testing

**Unit & integration tests** (Vitest): booking validation logic, database operations with in-memory PGLite.

**E2E tests** (Playwright, 4 workers): each worker gets its own PGlite database file cloned from a freshly-built `.pglite-test-template`. Every `pnpm test:e2e` run rebuilds the template from scratch — no separate reset ritual, no committed fixtures. globalSetup pushes the schema, seeds 32 apartments, then bakes per-user storage state into `.auth/` for the suite to reuse. `RESEND_API_KEY` is empty so emails are captured as files in `.test-emails/`.

**CI pipeline** (GitHub Actions): lint + typecheck + knip, unit tests, E2E tests with artifact upload on failure.

## Production Database

Production runs the [CapRover Postgres one-click app](https://raw.githubusercontent.com/caprover/one-click-apps/refs/heads/master/public/v4/apps/postgres.yml), which provisions `user=postgres` / `db=postgres` with a password set at deploy time. The instance is not publicly reachable; you connect via SSH tunnel.

**Day-to-day:**

```sh
# Terminal 1
pnpm db:tunnel

# Terminal 2 -- anything against prod is just DATABASE_URL override
DATABASE_URL=postgres://postgres:<password>@localhost:5432/postgres pnpm db:studio
DATABASE_URL=postgres://postgres:<password>@localhost:5432/postgres pnpm db:push
```

Every `db:*` command prints the target `DATABASE_URL` and asks for confirmation before running. `db:push` is also interactive on destructive diffs (drizzle-kit's own prompt). `db:reset` is dev-only -- the file `scripts/db/reset-dev.ts` makes that explicit -- and never appropriate against prod.

**Starting from scratch:** redeploy the Postgres one-click app, point `DATABASE_URL` at the new instance, and run `pnpm db:push`. That's the whole sequence.

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
