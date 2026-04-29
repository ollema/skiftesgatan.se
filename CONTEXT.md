# BRF Skiftesgatan 4

Domain language for the housing association website. The system serves 32 apartments at Skiftesgatan 4 in Gothenburg: residents book shared facilities, read news, and access member information.

## Language

**Apartment**:
The unit of identity in the system. One Apartment per login; a single Apartment represents the household, not an individual person. Identified by an apartment number like `A1001` (stairwell + floor + unit).
_Avoid_: User (implementation detail), account, household, member, resident — when referring to the actor.

**Stairwell**:
One of the four physical entrances to the building, labelled A–D. Each Stairwell contains 8 Apartments (4 floors × 2 per floor).
_Avoid_: Entrance, staircase, uppgång (Swedish — fine in UI copy, not in specs).

**Facility**:
A shared physical amenity of the building that Apartments can book. There are exactly two: the **Laundry Room** and the **Outdoor Area**. The set is closed — adding a new Facility is a real domain change, not a config tweak.
_Avoid_: Resource (used in the DB enum but not in domain prose), amenity, shared space.

**Laundry Room** (_tvättstuga_):
The shared laundry Facility. Bookable in fixed time blocks during the day.

**Outdoor Area** (_uteplats_):
The shared outdoor Facility. Bookable as a single all-day block.

**Time Block**:
A fixed time-of-day template attached to a Facility. The Laundry Room has 5 Time Blocks (07–10, 10–13, 13–16, 16–19, 19–22); the Outdoor Area has 1 (07–22). The set is closed — changing or adding a Time Block is a real domain change. A Time Block is _not_ a date.
_Avoid_: time window, schedule entry.

**Slot**:
A Time Block on a specific date — the bookable cell in the calendar UI. A Slot is either free, booked by another Apartment, or "mine". The 10–13 Time Block, taken on 2026-05-04, is one Slot.

**Booking**:
The act and record of an Apartment claiming a Slot. One Apartment may hold at most one Active Booking per Facility at a time.
_Avoid_: Reservation, claim.

**Active Booking**:
A Booking whose Slot has not yet ended in real time. Concretely: `date + endHour` is still in the future (Europe/Stockholm). Once the Slot's end hour passes, the Booking becomes Historical and no longer counts toward the one-per-Facility limit.
_Avoid_: Open booking, current booking, future booking (these are vaguer or wrong: a Booking that started 30 minutes ago is still active).

**Booking Window**:
The range of dates an Apartment is allowed to book into. Earliest is today; latest is today plus one calendar month (Europe/Stockholm). Slots outside the Booking Window are not bookable, even if visible.
_Avoid_: 30-day window (incorrect — it's calendar-month, not day-count), advance window, booking horizon, lookahead.

**Reminder**:
A scheduled email sent to an Apartment ahead of one of its Bookings. Has a `notify_at` instant, a status (pending / sent / failed), and is tied to exactly one Booking. At most one Reminder exists per (Booking, offset) pair.
_Avoid_: Notification (overly generic — not all system emails are Reminders; password-reset and verification emails are not), alert.

**Reminder Preference**:
A per-Apartment, per-Facility setting that controls whether and how far ahead Reminders are scheduled for that Facility's Bookings. Disabling the Preference cancels pending Reminders for the Apartment's future Bookings on that Facility.
_Avoid_: Notification preference (DB name; planned rename).

**Calendar Subscription**:
An Apartment's iCal feed of its own Active Bookings, exposed at a secret URL. The Apartment subscribes once from their phone's Calendar app and Bookings sync automatically. An Apartment has zero or one Calendar Subscription; it can be created, regenerated (rotates the URL), or removed.
_Avoid_: Calendar (ambiguous — also refers to the booking month-view UI), iCal feed (the technical surface, not the domain concept), calendar token (implementation detail).

**Admin Apartment**:
An Apartment that has been granted administrative privileges, in addition to its ordinary Apartment capabilities. Used by the board / property manager to access the admin dashboard. The set is small (currently one) but not fixed — the role can be granted to additional Apartments.
_Avoid_: Admin user, admin account, board (the board is _whoever holds_ this role, not a tracked entity).

**News Article**:
A dated, time-stamped piece of association communication shown on the home page and at `/nyheter/`. Stored as markdown in `content/news/`, compiled at build time. Examples: annual meeting announcements, spring-cleaning notices, welcome posts.
_Avoid_: Post, blog post, article (alone — ambiguous with Information Page).

**Information Page**:
An evergreen reference page accessed by slug under `/information/`. Stored as markdown in `content/information/`, compiled at build time. Examples: bylaws (stadgar), house rules (trivselregler), board members (styrelsen), finances (ekonomi).
_Avoid_: Info page (informal — fine in conversation, not in specs), member info, static page.

**Display Name**:
The human-readable name an Apartment chooses to show to other Apartments. Defaults to the apartment number; customizable on the account page. Shown wherever an Apartment is publicly referenced (e.g. in another Apartment's view of who owns a Slot). Distinct from the apartment number, which is the immutable system identifier.
_Avoid_: Username (the apartment number is the username), display username, name.

## Relationships

- The building has 4 **Stairwells** (A, B, C, D)
- Each **Stairwell** contains 8 **Apartments**, for 32 total
- The building has exactly 2 **Facilities**: the **Laundry Room** and the **Outdoor Area**
- Any **Apartment** may book any **Facility**
- Each **Facility** defines a fixed set of **Time Blocks**
- A **Slot** is one **Time Block** on one date
- A **Booking** fills exactly one **Slot** for exactly one **Apartment**
- An **Apartment** holds at most one **Active Booking** per **Facility**
- A **Booking** must fall within the **Booking Window** (today through today + 1 month)
- Replacing a **Booking** is atomic: the old Booking is only cancelled if the new Slot is successfully claimed. An Apartment cannot lose its existing Booking by attempting to grab a Slot that turns out to be taken.
- An **Apartment** has at most one **Reminder Preference** per **Facility** per offset
- A **Booking** may have zero or more **Reminders**, one per Reminder Preference offset that was enabled at the time the Booking was created
- An **Apartment** has zero or one **Calendar Subscription**, which exposes only that Apartment's own Active Bookings

## Example dialogue

> **Dev:** "If an **Apartment** has an **Active Booking** for the 10–13 **Time Block** today, and it's now 13:30, can they book another **Slot** for the **Laundry Room**?"
> **Domain expert:** "Yes — the **Slot** ended at 13:00, so the **Booking** is no longer Active. The one-Active-Booking-per-**Facility** rule frees up immediately when the Slot's end hour passes, not at midnight."
>
> **Dev:** "What if they try to book a Slot two months out?"
> **Domain expert:** "Rejected. The **Booking Window** is today through today + 1 calendar month. Slots outside the Window are visible but not bookable."
>
> **Dev:** "And **Reminders** — if the **Apartment** disables their **Reminder Preference** for the Laundry Room, what happens to a Reminder already scheduled for tomorrow's Booking?"
> **Domain expert:** "It's cancelled. Disabling the Preference removes pending Reminders for that Apartment's future Bookings on that Facility. Already-sent Reminders aren't affected — you can't unsend an email."
>
> **Dev:** "Does the **Calendar Subscription** show other Apartments' Bookings?"
> **Domain expert:** "No. The Calendar Subscription is per-Apartment and exposes only that Apartment's own Active Bookings. Other Apartments' Bookings are visible in the booking calendar UI on the website, but never in the iCal feed."

## Flagged ambiguities

- "User", "resident", and "member" were used interchangeably in early docs. Resolved: the actor is the **Apartment**. "Resident" remains acceptable in human-facing prose ("residents log in to book…") but is not a domain term in code or specs.
- "Notification" was used for both the reminder concept and the DB tables. Resolved: domain term is **Reminder** / **Reminder Preference**. The DB tables `notification_preference` and `booking_notification`, files `notification*.ts`, and remote functions are to be renamed accordingly. Tracked as planned work.
- "Calendar" was used for three different things: the iCal feed, the booking-page month-view UI, and (loosely) the Booking Window. Resolved: the iCal feed is the **Calendar Subscription**; the month-view is "the booking calendar UI" (not a domain term); the Booking Window is its own term. Avoid bare "Calendar" as a domain noun.
- `content/laundry/about.md` is a one-off explainer for the Laundry Room booking page, not a content type. It does not constitute a "Facility Page" concept. Planned cleanup: inline this copy into the laundry `+page.svelte` and remove `content/laundry/` so the content collection has only News Articles and Information Pages.
