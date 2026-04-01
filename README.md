# skiftesgatan.se

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A-D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book shared facilities, read association news, and access member information such as bylaws, finances, renovation plans, and board details.

There is no self-registration. Accounts are pre-created by an admin using a CSV of apartment numbers and email addresses (`pnpm db:seed:prod`). Emails are marked as verified at creation time. Each resident can then log in and reset their password via email.

## Features

- **Closed user system** -- no self-registration; accounts are provisioned by admin for each of the 32 apartments. Username is the apartment number (e.g. A1001). Supports password reset via email, email address changes with re-verification, and customizable display names.
- **Laundry room booking** -- calendar with 5 daily timeslots (3-hour blocks, 07-22), one active booking per user
- **Outdoor area booking** -- calendar with 1 all-day slot (07-22), one active booking per user
- **Booking constraints** -- 30-day advance window, concurrent booking protection via database unique constraint, replace-or-cancel flow
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
pnpm db:push                  # apply Drizzle schema
pnpm db:seed:timeslots        # seed available timeslots
pnpm db:seed:accounts         # seed 32 dev accounts
pnpm db:seed:bookings         # seed random bookings
```

Full reset from scratch:

```sh
pnpm db:reset && pnpm db:push && pnpm db:seed:timeslots && pnpm db:seed:accounts && pnpm db:seed:bookings
```

Dev accounts use apartment numbers A1001 through D1302. Password for each is `password-{username}`, e.g. `password-A1001`. Each dev account has a fictional display name that can be changed on the /konto page.

## Scripts

| Script                   | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `pnpm dev`               | Start dev server                                        |
| `pnpm build`             | Production build                                        |
| `pnpm preview`           | Preview production build                                |
| `pnpm check`             | SvelteKit sync + svelte-check                           |
| `pnpm lint`              | Prettier + ESLint                                       |
| `pnpm format`            | Auto-format code                                        |
| `pnpm knip`              | Detect unused files/dependencies                        |
| `pnpm test`              | Run all tests (unit + E2E)                              |
| `pnpm test:unit`         | Vitest (unit + integration)                             |
| `pnpm test:e2e`          | Playwright E2E tests                                    |
| `pnpm db:push`           | Apply Drizzle schema to database                        |
| `pnpm db:reset`          | Delete local PGLite database                            |
| `pnpm db:generate`       | Generate Drizzle migrations                             |
| `pnpm db:migrate`        | Run Drizzle migrations                                  |
| `pnpm db:seed:timeslots` | Seed timeslots                                          |
| `pnpm db:seed:accounts`  | Seed 32 dev accounts                                    |
| `pnpm db:seed:bookings`  | Seed random bookings                                    |
| `pnpm db:seed:prod`      | Seed production accounts from CSV (username,email,name) |
| `pnpm db:studio`         | Open Drizzle Studio GUI                                 |
| `pnpm auth:schema`       | Generate Better Auth schema                             |

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

| Variable             | Required        | Description                                                     |
| -------------------- | --------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | Production only | PostgreSQL connection string (PGLite used automatically in dev) |
| `ORIGIN`             | Yes             | Application origin URL (e.g. `http://localhost:5173`)           |
| `BETTER_AUTH_SECRET` | Yes             | 32-character high-entropy secret for session signing            |
| `RESEND_API_KEY`     | Production only | Resend API key for email delivery (falls back to file mock)     |
| `EMAIL_FROM`         | Yes             | Sender email address                                            |

## Testing

**Unit & integration tests** (Vitest): booking validation logic, database operations with in-memory PGLite.

**E2E tests** (Playwright): auth flows, booking flows, concurrent booking race conditions, content rendering, email change, password reset, navigation.

E2E tests use a separate PGLite database (`.pglite-test`), empty `RESEND_API_KEY` to capture emails as files, and run sequentially (1 worker).

**CI pipeline** (GitHub Actions): lint + typecheck + knip, unit tests, E2E tests with artifact upload on failure.

## TODO

Code quality improvements identified during codebase review, ordered by impact.

### High

- [ ]

### Medium

- [ ] **Safer error type checking in booking conflict handler** -- `src/lib/api/booking.remote.ts` uses an unsafe cast `(e as { code: string }).code === '23505'` to detect unique constraint violations. Use a proper type guard.

- [ ] **Add database index on booking table** -- `(userId, resource)` composite index for the `hasExistingFutureBooking` query in `src/lib/server/booking.ts`.

- [ ] **Booking page accessibility** -- add `aria-live="polite"` to error message containers and descriptive `aria-label` attributes to timeslot buttons (currently just show time text).

- [ ] **Environment variable validation at startup** -- fail fast if required variables (`BETTER_AUTH_SECRET`, `EMAIL_FROM`) are missing in production, rather than failing on first use.

### Low

- [ ] **Extract inline onclick handlers** -- booking pages have multi-line async functions inlined in `onclick`. Extract to named functions for readability.

- [ ] **Unit tests for auth form validation** -- auth remote functions have Valibot schemas but no dedicated unit tests for validation edge cases.

- [ ] **Auto-refresh booking calendar** -- if a user leaves the tab open, slot availability can go stale. Consider periodic re-fetch or visibility-change refresh.

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing, layout rules, booking calendar colors, and anti-patterns.
