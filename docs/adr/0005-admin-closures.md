# Admin Closures cancel Bookings in range

A **Closure** is a per-Facility date range during which no Booking can be made. An Admin Apartment creates one from `/admin/maintenance`, optionally recording a reason. Creating a Closure hard-deletes every Booking for that Facility inside the range, records how many were cancelled on the Closure row, and emits the existing in-process booking event so open Booking Calendars refresh. Affected Apartments are not emailed.

## Context

The association needs to take a Facility out of service for maintenance — for example, closing the Laundry Room for a weekend. Bookings already exist in the Booking Window, so blocking future bookings alone is not enough: the existing ones must go. The domain already has a closed **Time Block** set, so the new concept deliberately avoids "block" language and is called a Closure.

## Considered options

- **One row per closed date.** Simple to query for a single day, but a weekend or a week-long project becomes many rows, and the admin form has to explode a range into dates. Rejected: ranges are the natural unit of maintenance.
- **A global Closure applying to both Facilities.** Rejected: maintenance is usually specific to one Facility, and blocking the Outdoor Area during laundry maintenance would be wrong. The admin form can still select both.
- **Soft-delete Bookings (a `cancelled_at` column).** Preserves a per-Booking audit trail, but every read path (Booking Calendar, active-booking limit, iCal feed, reminders) would need to learn a new state. Rejected for now: hard deletion matches the existing `cancelBooking` behaviour, and the Closure's `cancelled_count` gives the board an aggregate audit.
- **Email affected Apartments.** Better communication, but adds a Resend template, delivery failures, and a new transactional boundary. Deferred: the board can announce maintenance through the existing News Article channel, and residents see the closed day in the calendar.
- **Per-Facility date range rows, hard-delete Bookings (chosen).** One row per selected Facility, inclusive `start_date`/`end_date`, with `reason` and `cancelled_count`.

## Race safety

Closure creation and `bookSlot` both lock the `time_block` rows for the affected Facility `FOR UPDATE`. Closure creation takes the lock, deletes affected Bookings, and inserts the Closure in one transaction; a concurrent booking waits, then sees the Closure and fails with `closed`. The closure check happens before the replace-booking delete, so a failed move into a closed day never removes the Apartment's original Booking.

## Consequences

- **Bookings cancelled by a Closure leave no per-Booking record.** Only `cancelled_count` survives. If per-Apartment audit becomes necessary, add a cancellation log table rather than resurrecting soft deletes.
- **Reminders are cascade-deleted** with their Booking, including already-sent Reminders. This matches the existing user-initiated cancellation path.
- **ADR-0002 gains a second writer.** Admin Closure creation deletes from `booking` outside the `book`/`cancelBooking` commands, so it must emit `bookingEvents` for each affected Facility. It does.
- **Deleting a Closure only reopens the days.** Cancelled Bookings are not restored; the admin list says so explicitly.
- **Overlapping Closures are allowed.** Two maintenance jobs may overlap; a day is closed if any Closure covers it. Removing one leaves the other in effect.
