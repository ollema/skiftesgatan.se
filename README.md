# Skiftesgatan

Booking system for shared spaces (laundry room, outdoor area) at Skiftesgatan.

## Development

```sh
pnpm install
pnpm dev
```

## Database

Uses PGLite locally (no external database needed). For production, set `DATABASE_URL` to a PostgreSQL connection string.

```sh
pnpm db:push             # push Drizzle schema to database
pnpm db:seed:timeslots   # seed timeslots
pnpm db:seed:accounts    # seed 32 dev accounts (password-{username})
pnpm db:seed:bookings    # seed random bookings for local dev
pnpm db:reset            # delete local PGLite database
pnpm db:studio           # open Drizzle Studio
```

To fully reset and set up from scratch:

```sh
pnpm db:reset && pnpm db:push && pnpm db:seed:timeslots && pnpm db:seed:accounts && pnpm db:seed:bookings
```
