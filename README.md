# skiftesgatan.se

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A-D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book shared facilities, read association news, and access member information such as bylaws, finances, renovation plans, and board details.

There is no self-registration. Accounts are pre-created by an admin using a CSV of apartment numbers and email addresses (`pnpm db:seed prod`). Emails are marked as verified at creation time. Each resident can then log in and reset their password via email.

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

## Project Structure

```
src/
  lib/
    server/
      db/
        auth.schema.ts         # Better Auth tables (user, session, account, verification)
        booking.schema.ts      # Booking domain (timeslot, booking)
        index.ts               # Database client (auto-detects PGLite vs PostgreSQL)
        seed/                  # Seed scripts for timeslots, accounts, bookings
      auth.ts                  # Better Auth server config
      auth.config.ts           # Username plugin, apartment validation
      booking.ts               # Booking queries and business logic
      email.ts                 # Resend integration with file-based fallback
    api/
      auth.remote.ts           # Auth remote functions (login, signup, password reset, etc.)
      booking.remote.ts        # Booking remote functions (get slots, book, cancel)
    components/
      Button.svelte            # Primary/destructive button variants
      Calendar.svelte          # Month-view calendar with availability dots
      ConfirmDialog.svelte     # Modal confirmation (cancel, replace, login prompt)
      Navbar.svelte            # Desktop navigation with dropdowns
      MobileMenu.svelte        # Slide-out mobile navigation
  routes/
    +layout.svelte             # Global layout (navbar, toaster, user state)
    +page.svelte               # Home page (hero, about, latest news, services)
    konto/                     # Account management
      +page.svelte             # Profile, change email/password, logout
      login/                   # Login form
      forgot-password/         # Password reset request + confirmation
      reset-password/          # Token-based password reset
    tvattstuga/                # Laundry room booking page
    uteplats/                  # Outdoor area booking page
    nyheter/                   # News listing and [slug] detail pages
    information/               # Markdown information pages
    kontakt/                   # Contact page
content/
  news/                        # Markdown news articles
  information/                 # Markdown info pages (stadgar, ekonomi, styrelsen, etc.)
e2e/                           # Playwright E2E tests
```

## Getting Started

**Prerequisites:** Node.js 22, pnpm

```sh
pnpm install
pnpm dev
```

### Database Setup

PGLite runs in-process locally -- no external database needed.

```sh
pnpm db:reset dev             # delete, push schema
pnpm db:seed dev              # seed timeslots, accounts, bookings
```

Both commands accept `-y` to skip confirmation: `pnpm db:reset dev -- -y`.

Dev accounts use apartment numbers A1001 through D1302. Password for each is `password-{username}`, e.g. `password-A1001`. Each dev account has a fictional display name that can be changed on the /konto page.

### Production Database

Production uses PostgreSQL on a CapRover VPS. The database is not publicly accessible -- you connect via SSH tunnel.

**One-time CapRover setup:**

1. Open CapRover UI > Apps > `skiftesgatan-prod-db` > App Config
2. Add port mapping: Server Port `54321` → Container Port `5432`
3. Save & Update

**Local setup:**

1. Copy `.env.prod.example` to `.env.prod` and fill in your VPS SSH details and database password
2. Open the tunnel in one terminal: `pnpm db:tunnel`
3. Run prod commands in another terminal: `pnpm db:reset prod`, `pnpm db:seed prod`

Destructive prod commands require you to type the database name to confirm.

## Scripts

| Script                 | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `pnpm dev`             | Start dev server                                            |
| `pnpm build`           | Production build                                            |
| `pnpm preview`         | Preview production build                                    |
| `pnpm check`           | SvelteKit sync + svelte-check                               |
| `pnpm lint`            | Prettier + ESLint                                           |
| `pnpm format`          | Auto-format code                                            |
| `pnpm knip`            | Detect unused files/dependencies                            |
| `pnpm test`            | Run all tests (unit + E2E)                                  |
| `pnpm test:unit`       | Vitest (unit + integration)                                 |
| `pnpm test:e2e`        | Playwright E2E tests                                        |
| `pnpm db:reset <env>`  | Clean slate + push schema (env: test, dev, prod)            |
| `pnpm db:seed <env>`   | Seed timeslots + accounts + bookings (env: test, dev, prod) |
| `pnpm db:studio <env>` | Open Drizzle Studio GUI (env: dev, prod)                    |
| `pnpm db:tunnel`       | Open SSH tunnel to production database                      |
| `pnpm db:generate`     | Generate Drizzle migration files                            |
| `pnpm auth:schema`     | Generate Better Auth schema                                 |

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

**`.env`** -- local development (copy from `.env.example`):

| Variable             | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `ORIGIN`             | Yes      | Application origin URL (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | Yes      | 32-character high-entropy secret for session signing  |
| `RESEND_API_KEY`     | Prod     | Resend API key for email delivery (file mock in dev)  |
| `EMAIL_FROM`         | Yes      | Sender email address                                  |

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

## TODO

Code quality improvements identified during codebase review, ordered by impact.

### High

- [ ] **Use actual content and proper facts** -- Currently we have a lot of incorrect placeholder content.

- [ ] **PWA readyness** -- add manifest.json, icons, and service worker for offline support and installability.

- [ ] **Updated color scheme** -- current palette is a bit dull. Consider refreshing with more vibrant colors while maintaining accessibility.

- [ ] **Theming** -- favicons and PWA theme colors or whatever those attributes are called should mathc the new color scheme.

### Medium

- [x] **~~Investigate future needs for schema changes~~** -- Notification system implemented: schema (`notification_preference`, `booking_notification`), scheduler (60s interval via `init` hook), email templates, preference UI on `/konto`.

- [ ] **Consolidate Drizzle relations** -- `relations()` for the `user` table is declared in three files (`auth.schema.ts`, `booking.schema.ts`, `notification.schema.ts`). Drizzle only supports one `relations()` per table -- the last one wins. This doesn't cause issues today (no code uses Drizzle relational queries), but should be merged into a single file before using `.query.user.findMany({ with: ... })`.

- [ ] **Safer error type checking in booking conflict handler** -- `src/lib/api/booking.remote.ts` uses an unsafe cast `(e as { code: string }).code === '23505'` to detect unique constraint violations. Use a proper type guard.

- [ ] **Add database index on booking table** -- `(userId, resource)` composite index for the `hasExistingFutureBooking` query in `src/lib/server/booking.ts`.

- [ ] **Booking page accessibility** -- add `aria-live="polite"` to error message containers and descriptive `aria-label` attributes to timeslot buttons (currently just show time text).

- [ ] **Environment variable validation at startup** -- fail fast if required variables (`BETTER_AUTH_SECRET`, `EMAIL_FROM`) are missing in production, rather than failing on first use.

### Low

- [ ] **Extract inline onclick handlers** -- booking pages have multi-line async functions inlined in `onclick`. Extract to named functions for readability.

- [ ] **Unit tests for auth form validation** -- auth remote functions have Valibot schemas but no dedicated unit tests for validation edge cases.

- [ ] **Auto-refresh booking calendar** -- if a user leaves the tab open, slot availability can go stale. Consider periodic re-fetch or visibility-change refresh. Better yet, let's use SSE!

- [ ] **Better logging** -- log actual apartment numbers and timeslot start hours and so on instead of IDs.

- [ ] **Use intelligent status texts** -- If the user's name contains & then use "Ni" instead of "Du"

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing, layout rules, booking calendar colors, and anti-patterns.
