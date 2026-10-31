# SQLite uses synchronous transactions, not row locks

The application stores its data in one SQLite file per environment (`SQLITE_PATH`), accessed through `better-sqlite3`. Concurrency control that used Postgres row locks (`SELECT … FOR UPDATE`) is replaced by synchronous transactions: Drizzle's `better-sqlite3` driver commits a transaction when its callback returns, so a synchronous callback executes as one indivisible block in the one process that serves every request.

## Context

Booking and Closure creation rely on check-then-write sequences: "does this Apartment already have an active Booking?", "is this date closed?", then insert or delete. On Postgres these were protected with `FOR UPDATE` on the `user` and `time_block` rows. SQLite has no row locking and no `SELECT … FOR UPDATE`, so the code has to rely on a different serialization mechanism.

## Decision

- Every transaction callback passed to `db.transaction()` is synchronous. Query builders inside it use `.get()`, `.all()`, and `.run()` rather than `await`.
- The check-then-write sequences (`bookSlot`, `cancelBooking`, `createClosure`, reminder preference updates) live entirely inside such a transaction.
- Values needed by the transaction that require an async lookup (for example time-block hours) are precomputed before the transaction starts.
- Unique constraints remain the last line of defence against duplicate slots; SQLite constraint errors (`SQLITE_CONSTRAINT_UNIQUE` / `SQLITE_CONSTRAINT_PRIMARYKEY`) map to the same `slot_taken` result Postgres's `23505` did.

## Consequences

- **Single-process deployment is load-bearing.** Synchronous transactions serialize writers only within one Node process. Running more than one container against the same SQLite file would reintroduce races (and invite `SQLITE_BUSY`), so the CapRover app must stay at one replica. This is the same constraint ADR-0002 records for the in-process booking event bus.
- **Do not `await` inside a transaction callback.** An `async` callback returns a Promise at its first `await`; `better-sqlite3` then commits immediately and the rest of the work runs outside the transaction. This is a silent correctness failure, not an error, so review any new transaction code for stray `await`s.
- **`foreign_keys` must be enabled per connection.** SQLite defaults it off, which would silently disable every `onDelete: 'cascade'`. `src/lib/server/db/index.ts` sets `PRAGMA foreign_keys = ON`, WAL, `busy_timeout = 5000`, and `synchronous = NORMAL` on every connection.
- **WAL sidecars exist.** SQLite creates `<file>-wal` and `<file>-shm` next to the database. Whole-machine snapshots are safe; copying the `.db` file by itself while the app runs is not. Tests copy the template only after a checkpoint and close.
