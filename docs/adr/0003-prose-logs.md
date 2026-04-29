# Logs are domain-prose sentences, not key=value pairs

Server logs are written as natural-language sentences in the project's domain vocabulary — `[booking] apartment A1001 booked the laundry_room 2026-05-04 10:00-13:00` — rather than the structured `key=value` form previously used. Domain-event logs name the **Apartment** as the subject and use CONTEXT.md terms (Apartment, Facility, Slot, Booking, Reminder, Calendar Subscription, Display Name, Admin Apartment) as nouns. Operational logs without an Apartment actor (scheduler, rate-limit, internal failures) take an action-first form. Snake_case enum values (`laundry_room`, `outdoor_area`) are kept literal in prose.

## Context

The logger at `src/lib/server/log.ts` is a thin wrapper around `console.*` — single-instance deployment, no aggregator, logs are read by the developer and (eventually) the board. The previous format leaked CONTEXT.md _Avoid_ vocabulary throughout: `username=A1001` (CONTEXT.md: "the apartment number is the username; avoid"), `resource=laundry_room` (CONTEXT.md: "Resource — used in the DB enum but not in domain prose"), `name changed` instead of "Display Name", `userId` instead of an Apartment reference. Replacements were also being logged as two separate `cancelled` + `created` lines, obscuring the atomic-swap guarantee that CONTEXT.md goes out of its way to spell out.

If logs were going into a structured pipeline (Loki, Elastic, BigQuery), `key=value` would be load-bearing — you'd grep on parsed fields. They aren't. They're read by humans, in a terminal, after something happened.

## Considered options

- **Strict key=value with renamed keys.** Keep the structured shape, only fix the keys (`username=` → `apartment=`, `resource=` → `facility=`). Smallest diff. Rejected: the keys still read like a debug dump, not like the domain. The whole exercise was prompted by logs not _reading_ like CONTEXT.md, and renaming the keys alone doesn't fix that — `apartment=A1001 facility=laundry_room date=… startHour=10` is still implementation prose, just less wrong.
- **Pragmatic mixed (rename keys, keep DB-shaped values).** Same as above plus value translation. Rejected for the same reason — the shape is still wrong even if every token is.
- **Domain-prose sentences (chosen).** Subject-verb-object reads like CONTEXT.md, the Apartment is the subject of its own actions, and Booking Replacement gets one line ("apartment A1001 moved their laundry_room booking from … to …") that matches its atomic semantics. Loses structured grep — accepted because there is no structured consumer.

## Consequences

- **No more `grep facility=…`.** Filter by the prose token instead (`grep 'the laundry_room'`, `grep 'apartment A1001'`). Adequate at this scale.
- **A small phrasing helper is needed.** Facility enum + start hour render as "the laundry_room 2026-05-04 10:00-13:00" — the end time is computed from the facility's Time Block table. Lives next to the logger or as a tiny utility.
- **Snake_case enums stay literal in prose** ("the laundry_room", not "the laundry room"). Deliberate trade: avoids a translation dictionary and keeps log values greppable against DB values. Reads slightly oddly; we accept it.
- **Admin actions name the Admin Apartment as subject.** `[admin] apartment B2001 changed display name for apartment A1001`. Audit clarity is the point of admin logs; passive voice would erase the actor.
- **Failed logins use the bare claimed identifier**, not "apartment X" — calling an unauthenticated brute-forcer "apartment A1001" credits them with an identity they haven't proven.
- **Operational logs (scheduler, rate-limit, internal errors) drop the Apartment-as-subject form.** They take action-first prose: "[scheduler] started (interval 60s)", "[rate-limit] login exceeded for IP …, retry after 30s". CONTEXT.md has no vocabulary for these and shouldn't be forced to.
- **Calendar Subscription gains lifecycle logs** (create / regenerate / remove). Previously the only domain entity with no observability. iCal-feed fetches stay unlogged — phones poll every few minutes and would drown the log.
- **If a structured log pipeline ever lands**, this decision needs revisiting. The call sites would have to be re-mechanised (or wrapped with a structured-emit helper that also formats prose). Captured here so that's an informed choice, not a surprise.
