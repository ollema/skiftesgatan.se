# Booking real-time updates use an in-process event bus

Real-time updates to the booking calendar (so all 32 Apartments see Bookings appear and disappear without reloading) are driven by a singleton in-process `EventEmitter` in `src/lib/server/booking.ts`. The `book` and `cancelBooking` commands emit a `change` event for the affected Resource, and the `getBookingData` live query subscribes to that bus and yields a fresh payload on each event. We chose this over Postgres `LISTEN/NOTIFY` because the deployment is single-instance and dev/test runs on PGlite (in-process WASM Postgres), where `LISTEN/NOTIFY` is meaningfully weaker.

## Context

The booking pages need to reflect Bookings made by other Apartments without a manual reload. SvelteKit's `query.live` provides the transport (server-side `AsyncIterable`, SSE-ish to the client), but does not provide the signal — the server has to know when to yield. That signal source is what this ADR pins down.

The system writes Bookings from exactly two places (`book`, `cancelBooking`); there are no out-of-band writers (no admin UI, no cron). The deployment target is one Node instance behind `@sveltejs/adapter-node`. Dev/test uses PGlite via `PGLITE_PATH`.

## Considered options

- **Postgres `LISTEN/NOTIFY` from app code.** Commands issue `NOTIFY booking_changed, '<resource>'`; the live-query generator opens a `LISTEN` and yields on each notification. Rejected: works in production but PGlite's pub/sub story is weak and would force a dev/prod split or a fallback abstraction. The cross-instance benefit is moot — we're single-instance.
- **DB triggers + `LISTEN/NOTIFY`.** Same as above but the NOTIFY is fired by a trigger on the `booking` table. Rejected: catches out-of-band writers we don't have, at the cost of trigger plumbing in migrations.
- **Server-side polling inside the generator.** `while (true) { yield ...; await sleep(10s) }`. Rejected: a strict regression versus the current client-side 10s poll, since every open page now also holds a live SSE connection that polls the DB.
- **In-process `EventEmitter` (chosen).** ~10 lines, no infra, immediate push, works identically in PGlite and Postgres.

## Consequences

- **Single-instance is now load-bearing.** If we ever run more than one Node instance, an Apartment on instance 1 booking a Slot will not be reflected on instance 2 until the second instance happens to re-yield for some other reason. Swap the bus for a `LISTEN/NOTIFY`-backed implementation at that point — the call sites (`bookingEvents.emit` / `bookingEvents.on`) don't have to change.
- **Out-of-band writes don't propagate.** Any future code path that writes to the `booking` table without going through `book`/`cancelBooking` must also `bookingEvents.emit('change', resource)`, or live clients won't see the change until they reconnect. The DB-trigger option would have been resilient to this; the chosen design is not.
- **The actor's own update goes through `query.live().reconnect()` from inside the command** (single-flight mutation), in addition to the bus emit. Other Apartments learn via the bus. This keeps the click→update path synchronous with the mutation response and independent of bus latency.
