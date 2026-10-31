# skiftesgatan.se

[![CI](https://github.com/ollema/skiftesgatan.se/actions/workflows/ci.yml/badge.svg)](https://github.com/ollema/skiftesgatan.se/actions/workflows/ci.yml)

Website for BRF Skiftesgatan 4, a housing association with 32 apartments in Gothenburg. The building has 4 stairwells (A–D), each with 4 floors and 2 apartments per floor.

Residents log in with their apartment number to book the laundry room and outdoor area, read association news, and access member information such as bylaws, finances, renovation plans, and board details. There is no self-registration — accounts are provisioned by an admin, and residents reset their password by email.

Bookings are limited to a one-calendar-month window, with one active booking per apartment per facility and a database unique constraint protecting against double-booking. An apartment can also subscribe to its own iCal feed at `/kalender/{token}.ics`, and enable reminders per facility. The board gets an admin dashboard for accounts and maintenance closures. News and information pages are markdown files in `content/`, compiled at build time.

## Getting started

Node.js 24 and pnpm are required.

```sh
pnpm install
cp .env.example .env
pnpm db:reset
pnpm dev
```

`pnpm db:reset` deletes the dev database, applies the schema, and seeds fixtures. Dev accounts run from `A1001` through `D1302` with the password `password-{username}` (for example `password-A1001`); `B1001` is the admin. Fixtures are dated relative to today, so re-run the reset when the seeded bookings have gone stale.

The database lives at `.data/skiftesgatan.db` locally; set `SQLITE_PATH` to use another file. Every `db:*` command prints its target and asks for confirmation, which `-- -y` skips.

Scripts, environment variables, and project layout live in `package.json`, `.env.example`, and the source tree.

## Production

Production uses a single SQLite file at `/data/skiftesgatan.db` on a CapRover persistent volume. Run exactly one replica: SQLite allows one writer, and the booking code relies on synchronous transactions within one process for serialization. Back up with whole-VM snapshots — never copy the `.db` file while the app is running, because the `-wal`/`-shm` sidecars matter.

Deploys run from `main` after CI passes, as commit-tagged images (`sha-<commit>`); there is no `latest`. To start from an empty database, create the file and run `SQLITE_PATH=/path/to/file pnpm db:push`.

## Design

See [DESIGN.md](DESIGN.md) for the full design system: color palette, typography, spacing and layout rules, booking calendar colors, and anti-patterns.
