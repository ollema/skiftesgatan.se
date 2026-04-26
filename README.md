# skiftesgatan.se

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A-D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book shared facilities, read association news, and access member information such as bylaws, finances, renovation plans, and board details.

There is no self-registration. Accounts are pre-created by an admin via Drizzle Studio against the production database (`pnpm db:tunnel` + `pnpm db:studio prod`). Emails are marked as verified at creation time. Each resident can then log in and reset their password via email.

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
- **Drizzle ORM** -- PGLite in-process for local dev, PostgreSQL in production
- **Better Auth** -- email/password with custom username plugin for apartment-based login, sign-up disabled
- **Tailwind CSS 4** -- with Bits UI for headless components (dialogs, menus)
- **Content Collections** -- markdown to HTML at build time for news and information pages
- **Resend** -- email delivery for verification and password reset (file-based mock in dev)
- **Valibot** -- schema validation for form inputs
- **@internationalized/date** -- timezone-aware calendar date handling

## Getting Started

**Prerequisites:** Node.js 22, pnpm

```sh
pnpm install
pnpm dev
```

PGLite runs in-process locally -- no external database needed.

```sh
pnpm db:reset dev             # delete, push schema
pnpm db:seed dev              # seed timeslots, accounts, bookings
```

Both commands accept `-y` to skip confirmation: `pnpm db:reset dev -- -y`.

Dev accounts use apartment numbers A1001 through D1302. Password for each is `password-{username}`, e.g. `password-A1001`. Each dev account has a fictional display name that can be changed on the /konto page.

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
        index.ts               # Database client (auto-detects PGLite vs PostgreSQL)
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
  db/                          # db:reset, db:seed, db:push, db:studio, db:tunnel
  generate-icons.ts            # Generates favicons / PWA icons
  sync-email-templates.ts      # Syncs email templates to Resend
e2e/                           # Playwright E2E tests
```

## Scripts

| Script                       | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                   | Start dev server                                             |
| `pnpm build`                 | Production build                                             |
| `pnpm preview`               | Preview production build                                     |
| `pnpm check`                 | SvelteKit sync + svelte-check                                |
| `pnpm lint`                  | Prettier + ESLint                                            |
| `pnpm format`                | Auto-format code                                             |
| `pnpm knip`                  | Detect unused files/dependencies                             |
| `pnpm test`                  | Run all tests (unit + E2E)                                   |
| `pnpm test:unit`             | Vitest (unit + integration)                                  |
| `pnpm test:e2e`              | Playwright E2E tests                                         |
| `pnpm db:reset <test\|dev>`  | Clear local DB + push schema                                 |
| `pnpm db:seed <test\|dev>`   | Seed timeslots; dev also seeds accounts + bookings           |
| `pnpm db:push <dev\|prod>`   | Push schema non-destructively (prompts on destructive diffs) |
| `pnpm db:studio <dev\|prod>` | Open Drizzle Studio GUI                                      |
| `pnpm db:tunnel`             | Open SSH tunnel to production database                       |
| `pnpm auth:schema`           | Generate Better Auth schema                                  |
| `pnpm icons`                 | Generate favicons and PWA icons                              |
| `pnpm email:sync`            | Sync email templates to Resend                               |

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

**`.env`** -- local development (copy from `.env.example`):

| Variable             | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `ORIGIN`             | Yes      | Application origin URL (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | Yes      | 32-character high-entropy secret for session signing  |
| `RESEND_API_KEY`     | Prod     | Resend API key for email delivery (file mock in dev)  |
| `EMAIL_FROM`         | Yes      | Sender email address                                  |
| `CONTACT_MANAGER_*`  | Prod     | Property manager name, phone, and email               |

**`.env.prod`** -- production database commands (copy from `.env.prod.example`):

| Variable           | Description                                     |
| ------------------ | ----------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string (via tunnel)       |
| `PROD_VPS_SSH`     | SSH target for tunnel (e.g. `root@your-vps-ip`) |
| `PROD_VPS_DB_PORT` | PostgreSQL port on VPS host (e.g. `54321`)      |

## Testing

**Unit & integration tests** (Vitest): booking validation logic, database operations with in-memory PGLite.

**E2E tests** (Playwright): auth flows, booking flows, concurrent booking race conditions, content rendering, email change, password reset, navigation.

E2E tests use a separate PGLite database (`.pglite-test`) via `pnpm db:reset test && pnpm db:seed test`, empty `RESEND_API_KEY` to capture emails as files, and run sequentially (1 worker).

**CI pipeline** (GitHub Actions): lint + typecheck + knip, unit tests, E2E tests with artifact upload on failure.

## Production Database

Production uses PostgreSQL on a CapRover VPS. The database is not publicly accessible -- you connect via SSH tunnel.

**One-time CapRover setup:**

1. Open CapRover UI > Apps > `skiftesgatan-prod-db` > App Config
2. Add port mapping: Server Port `54321` → Container Port `5432`
3. Save & Update

**Local setup:**

1. Copy `.env.prod.example` to `.env.prod` and fill in your VPS SSH details and database password
2. Open the tunnel in one terminal: `pnpm db:tunnel`
3. In another terminal, run prod commands: `pnpm db:push prod` (apply schema changes) or `pnpm db:studio prod` (browse data).

`pnpm db:push prod` requires you to type the database name to confirm, then runs `drizzle-kit push` interactively so you can review and approve any destructive diffs (dropped columns, etc.).

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing layout rules, booking calendar colors, and anti-patterns.

## TODO

Code quality improvements identified during codebase review, ordered by impact.

### High

- [ ] **Redirect skiftesgatan.com → skiftesgatan.se and set up Search Console** -- both domains are currently owned. Configure a 301 redirect from the .com to the .se (canonical) so any inbound links/typed traffic land in one place, then verify the .se in Google Search Console and submit `sitemap.xml` for SEO coverage. Worth doing while we still control both names.

- [ ] **PWA readyness** -- add manifest.json, icons, and service worker for offline support and installability.

- [ ] **Theming** -- favicons and PWA theme colors or whatever those attributes are called should match the new color scheme.

### Low

- [ ] **Service worker references missing `/offline.html`** -- `src/service-worker.ts:76` falls back to `/offline.html` on navigation failure, but the file doesn't exist in `static/`. Either add it or remove the navigate handler.

- [ ] **Auto-refresh booking calendar** -- if a user leaves the tab open, slot availability can go stale. Consider periodic re-fetch or visibility-change refresh. Better yet, let's use SSE!
