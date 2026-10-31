# Booking real-time updates use an in-process event bus

Real-time updates to the booking calendar (so all 32 Apartments see Bookings appear and disappear without reloading) are driven by a singleton in-process `EventEmitter` in `src/lib/server/booking.ts`. The `book` and `cancelBooking` commands emit a `change` event for the affected Resource, and the `getBookingData` live query subscribes to that bus and yields a fresh payload on each event. We chose this over a database notification channel because the deployment is single-instance and SQLite has no `LISTEN/NOTIFY`.

## Context

The booking pages need to reflect Bookings made by other Apartments without a manual reload. SvelteKit's `query.live` provides the transport (server-side `AsyncIterable`, SSE-ish to the client), but does not provide the signal — the server has to know when to yield. That signal source is what this ADR pins down.

The system writes Bookings from exactly three places: the `book` and `cancelBooking` commands, and admin **Closure** creation, which deletes Bookings in the closed range (see ADR-0005). There are no other out-of-band writers (no cron). The deployment target is one Node instance behind `@sveltejs/adapter-node`, backed by a single SQLite file (`SQLITE_PATH`).

## Considered options

- **Database `LISTEN/NOTIFY` from app code.** Commands issue `NOTIFY booking_changed, '<resource>'`; the live-query generator opens a `LISTEN` and yields on each notification. Rejected: list/notify is Postgres-specific and unavailable in SQLite.
- **DB triggers + a notification channel.** Same as above but the notification is fired by a trigger on the `booking` table. Rejected: catches out-of-band writers we don't have, at the cost of trigger plumbing in migrations.
- **Server-side polling inside the generator.** `while (true) { yield ...; await sleep(10s) }`. Rejected: a strict regression versus the current client-side 10s poll, since every open page now also holds a live SSE connection that polls the DB.
- **In-process `EventEmitter` (chosen).** ~10 lines, no infra, immediate push, identical in dev, test, and production.

## Consequences

- **Single-instance is now load-bearing.** If we ever run more than one Node instance, an Apartment on instance 1 booking a Slot will not be reflected on instance 2 until the second instance happens to re-yield for some other reason. SQLite itself also enforces this: two containers must not write the same file. Swap the bus for a shared notification channel at that point — the call sites (`bookingEvents.emit` / `bookingEvents.on`) don't have to change.
- **Out-of-band writes don't propagate.** Any future code path that writes to the `booking` table without going through `book`/`cancelBooking` must also `bookingEvents.emit(resource)`, or live clients won't see the change until they reconnect. The DB-trigger option would have been resilient to this; the chosen design is not. Admin Closure creation and deletion follow this rule.
- **The actor's own update goes through `query.live().reconnect()` from inside the command** (single-flight mutation), in addition to the bus emit. Other Apartments learn via the bus. This keeps the click→update path synchronous with the mutation response and independent of bus latency.
