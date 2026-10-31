# skiftesgatan.se

[![CI](https://github.com/ollema/skiftesgatan.se/actions/workflows/ci.yml/badge.svg)](https://github.com/ollema/skiftesgatan.se/actions/workflows/ci.yml)

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
- **Laundry room booking** -- calendar with 5 daily 3-hour blocks (07-22), one active booking per user
- **Outdoor area booking** -- calendar with 1 all-day slot (07-22), one active booking per user
- **Booking constraints** -- 30-day advance window, concurrent booking protection via database unique constraint, replace-or-cancel flow
- **Calendar subscription** -- per-user iCal feed URL (`/kalender/{token}.ics`) that syncs bookings to iPhone Calendar or any app supporting webcal subscriptions; manage from account page
- **Member information** -- markdown pages for bylaws (stadgar), finances, renovations, and board members, compiled at build time
- **News** -- markdown articles for association updates, shown on the home page and in a dedicated listing

## Tech Stack

- **Svelte 5 + SvelteKit 2** -- runes, async, remote functions, node adapter
- **Drizzle ORM** -- SQLite via `better-sqlite3`; one database file per environment
- **Better Auth** -- email/password with custom username plugin for apartment-based login, sign-up disabled
- **Tailwind CSS 4** -- with Bits UI for headless components (dialogs, menus)
- **Content Collections** -- markdown to HTML at build time for news and information pages
- **Resend** -- email delivery for verification and password reset (file-based mock in dev)
- **Valibot** -- schema validation for form inputs
- **@internationalized/date** -- timezone-aware calendar date handling

## Getting Started

**Prerequisites:** Node.js 24, pnpm.

```sh
pnpm install
cp .env.example .env
pnpm db:reset       # delete the dev database, push schema, seed fixtures
pnpm dev
```

Dev uses a single SQLite file at `.data/skiftesgatan.db` by default; set `SQLITE_PATH` to point elsewhere. Every `db:*` command prints the target path and asks for confirmation before doing anything. Pass `-- -y` to skip the gate (e.g. `pnpm db:reset -- -y`). Re-run `db:reset` whenever you want fresh dev bookings -- the fixtures use `today + N days` so they stale out as time passes.

Dev accounts use apartment numbers A1001 through D1302. Password for each is `password-{username}`, e.g. `password-A1001`. Each dev account has a fictional display name that can be changed on the /konto page. `B1001` is admin.

## Project Structure

```
src/
  lib/
    server/
      db/
        auth.schema.ts         # Better Auth tables (user, session, account, verification)
        booking.schema.ts      # Booking domain (time_block, booking)
        calendar.schema.ts     # iCal subscription tokens
        reminder.schema.ts     # Reminder preferences and scheduled reminders
        schema.ts              # Re-exports all schemas for Drizzle
        index.ts               # SQLite client (better-sqlite3 + pragmas)
      auth.ts                  # Better Auth server config
      auth.config.ts           # Username plugin, apartment validation
      booking.ts               # Booking queries and business logic
      closure.ts               # Admin maintenance closures and booking cancellation
      calendar.ts              # iCal feed generation and token management
      reminder.ts              # Reminder preferences and scheduling
      reminder.scheduler.ts    # Periodic worker that sends due reminders
      reminder.email.ts        # Reminder email template variables
      email.ts                 # Resend integration with file-based fallback
      email.templates.ts       # Email template aliases
      hints.ts                 # Setup-hint helpers (reminders, calendar)
      env.ts                   # Required-env-var validation at startup
      log.ts                   # Console-based logger
    api/
      auth.remote.ts           # Auth remote functions (login, password reset, etc.)
      booking.remote.ts        # Booking remote functions (get slots, book, cancel)
      admin.remote.ts          # Admin-only remote functions
      closure.remote.ts        # Admin maintenance-closure remote functions
      calendar.remote.ts       # iCal token regeneration / removal
      contact.remote.ts        # Contact form submission
      hints.remote.ts          # Onboarding-hint state
      reminder.remote.ts       # Reminder preference toggles
    components/
      Button.svelte            # Primary/destructive button variants
      Calendar.svelte          # Month-view calendar with availability dots
      ConfirmDialog.svelte     # Modal confirmation (cancel, replace, login prompt)
      EditDialog.svelte        # Generic edit-in-dialog wrapper
      Navbar.svelte            # Desktop navigation with dropdowns
      MobileMenu.svelte        # Slide-out mobile navigation
      BookingPage.svelte       # Shared layout for laundry/outdoor booking pages
      Slots.svelte             # Slot grid with book/cancel/replace flow
      SetupHints.svelte        # Dismissible onboarding hints
  routes/
    +layout.svelte             # Global layout (navbar, toaster, user state)
    +page.svelte               # Home page (hero, about, latest news, services)
    +error.svelte              # Custom error page
    sitemap.xml/               # Generated sitemap
    konto/                     # Account management (profile, password, email)
    admin/                     # Admin dashboard (per-user views)
    admin/maintenance/         # Admin maintenance closures
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
  db/                          # db:push, db:reset (dev only), db:studio, one-off PG migration
  generate-icons.ts            # Generates favicons / PWA icons
  sync-email-templates.ts      # Syncs email templates to Resend
e2e/                           # Playwright E2E tests
```

## Scripts

| Script             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `pnpm dev`         | Start dev server                                            |
| `pnpm build`       | Production build                                            |
| `pnpm preview`     | Preview production build                                    |
| `pnpm check`       | SvelteKit sync + svelte-check                               |
| `pnpm lint`        | Prettier + ESLint                                           |
| `pnpm format`      | Auto-format code                                            |
| `pnpm knip`        | Detect unused files/dependencies                            |
| `pnpm test`        | Run all tests (unit + E2E)                                  |
| `pnpm test:unit`   | Vitest (unit + integration)                                 |
| `pnpm test:e2e`    | Playwright E2E tests                                        |
| `pnpm db:push`     | Apply schema changes interactively (against `SQLITE_PATH`)  |
| `pnpm db:reset`    | Delete the database, push, and seed dev fixtures (dev only) |
| `pnpm db:studio`   | Open Drizzle Studio (against `SQLITE_PATH`)                 |
| `pnpm auth:schema` | Generate Better Auth schema                                 |
| `pnpm icons`       | Generate favicons and PWA icons                             |
| `pnpm email:sync`  | Sync email templates to Resend                              |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. `SQLITE_PATH` is optional locally (defaults to `.data/skiftesgatan.db`) and required in production.

| Variable             | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `SQLITE_PATH`        | Prod     | Path to the SQLite database file                      |
| `ORIGIN`             | Yes      | Application origin URL (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | Yes      | 32-character high-entropy secret for session signing  |
| `RESEND_API_KEY`     | Prod     | Resend API key for email delivery (file mock in dev)  |
| `EMAIL_FROM`         | Yes      | Sender email address                                  |
| `CONTACT_MANAGER_*`  | Prod     | Property manager name, phone, and email               |

## Testing

**Unit & integration tests** (Vitest): booking validation logic and database operations against an in-memory SQLite database.

**E2E tests** (Playwright, 4 workers): each worker gets its own copy of a freshly-built `.sqlite-test-template.db` (SQLite database file plus WAL sidecars). Every `pnpm test:e2e` run rebuilds the template from scratch — no separate reset ritual, no committed fixtures. globalSetup pushes the schema, seeds 32 apartments, then bakes per-user storage state into `.auth/` for the suite to reuse. `RESEND_API_KEY` is empty so emails are captured as files in `.test-emails/`.

**CI pipeline** (GitHub Actions, `.github/workflows/ci.yml`): five jobs run in parallel on every push to `main` and every pull request. A `Deploy to CapRover` job then needs all of them to pass, and only runs on `main`:

| Job              | What it does                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Security Scan    | [zizmor](https://github.com/zizmorcore/zizmor) audits the workflow files themselves        |
| Lint & Typecheck | generates the content collections, then `pnpm lint`, `pnpm knip`, `pnpm check`             |
| Unit Tests       | Vitest, inside the pinned Playwright container (the client project drives a real Chromium) |
| E2E Tests        | full Playwright suite; traces and the HTML report are uploaded as artifacts                |
| Build and push   | multi-stage Docker build, pushed to GHCR as `ghcr.io/<repo>:sha-<commit>`                  |

`pnpm playwright:check` guards the one thing that cannot be expressed in YAML: the Playwright container image tag in the workflow must match `@playwright/test` in `package.json`. Bump both together.

Images are tagged by commit only, never `latest`, so a deploy can neither race ahead of nor resurrect an untested build. `main` runs do not cancel each other, which keeps deploys in commit order.

## Production Database

Production uses a single SQLite file at `/data/skiftesgatan.db`, on a CapRover persistent directory mounted at `/data`. The app must run as exactly one replica: SQLite allows one writer, and the code relies on synchronous transactions within one process for serialization. Whole-VM snapshots are the backup mechanism; do not copy the file while the app is running because of the `-wal`/`-shm` sidecars.

**Day-to-day:** run `pnpm db:push` or `pnpm db:studio` with `SQLITE_PATH` pointing at the file you want (locally that defaults to `.data/skiftesgatan.db`). Every `db:*` command prints the target and asks for confirmation before running. `db:push` is also interactive on destructive diffs (drizzle-kit's own prompt). `db:reset` is dev-only -- the file `scripts/db/reset-dev.ts` makes that explicit -- and never appropriate against prod.

**Starting from scratch:** create an empty file, then run `SQLITE_PATH=/path/to/file pnpm db:push`. That's the whole sequence.

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing layout rules, booking calendar colors, and anti-patterns.

## TODO

Code quality improvements identified during codebase review, ordered by impact.

### High

- [ ] **PWA readyness** -- add manifest.json, icons, and service worker for offline support and installability.

- [ ] **Theming** -- favicons and PWA theme colors or whatever those attributes are called should match the new color scheme.

### Low

- [ ] **Auto-refresh booking calendar** -- if a user leaves the tab open, slot availability can go stale. Consider periodic re-fetch or visibility-change refresh. Better yet, let's use SSE!
