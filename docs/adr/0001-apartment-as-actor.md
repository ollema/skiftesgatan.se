# Apartment as the actor, not Person

The system models the **Apartment** — not an individual person — as the unit of identity. There is exactly one login per apartment, the username _is_ the apartment number (`A1001` … `D1302`), and rules like "one Active Booking per Facility" apply per-Apartment, not per-person. A household with two adults shares a single login by design.

## Context

In an ordinary webapp, the actor is a person and apartments would be a separate entity that people belong to (or a multi-tenant household model). We deliberately fused them. The association has 32 fixed apartments, the booking rules and member communications are naturally addressed to "the apartment", and accounts are pre-provisioned by an admin (no self-registration). Modelling per-person identity would introduce household-membership plumbing, ambiguity about which person "owns" a Booking, and a meaningfully larger surface area — without changing any user-visible behaviour.

## Considered options

- **Per-person identity, apartments as a separate entity.** Standard webapp shape. Rejected: introduces household-membership modelling and per-person/per-apartment booking-rule ambiguity for no behavioural gain.
- **One designated person per apartment, others invisible.** A pragmatic middle ground. Rejected: still pretends the actor is a person, which leaks into every spec, while the system has no way to represent the others.
- **Apartment-as-actor (chosen).** Honest about what the system actually models. Domain language collapses cleanly: "the Apartment booked the laundry," not "the user-of-the-apartment booked the laundry."

## Consequences

- The Better Auth `user` table is an _implementation detail_; it has one row per Apartment. CONTEXT.md treats "user" as non-domain vocabulary.
- Display Name covers the social-facing identity ("Familjen Andersson") without the system needing to know who lives there.
- If a future requirement demands per-person identity (e.g. audit "which adult cancelled this booking"), this decision will need to be revisited — it is structurally load-bearing.
