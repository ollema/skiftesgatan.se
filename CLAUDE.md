# Important

There is an hook setup to call `pnpm format`, `pnpm lint`, `pnpm knip` and `pnpm check`.

But you **MUST** call `pnpm test` manually before committing files!

## Commands

| Command       | Description                      |
| ------------- | -------------------------------- |
| `pnpm format` | Auto-format code                 |
| `pnpm lint`   | Lint code                        |
| `pnpm knip`   | Detect unused files/dependencies |
| `pnpm check`  | SvelteKit sync + svelte-check    |
| `pnpm test`   | Run all tests (unit + E2E)       |

## Conventions

- Use `pnpx`, not `npx`, for package binaries.
- Run Playwright via `pnpm test:e2e`, never `pnpx playwright` (version mismatch).
- Use `@internationalized/date` (`CalendarDate`, `CalendarDateTime`, `toZoned`) for all date/time work — never the native `Date` API.
- Avoid `+page.ts` / `+layout.ts` load functions; use remote functions or inline data.
- In `.svelte` files, consume remote queries with `let x = $derived(await someQuery())` — top-level `const/let x = await ...` is not reactive to refreshes.
- Read `DESIGN.md` before any UI/design change.

## Available MCP Tools:

### Svelte

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### Better Auth

Documentation server for Better Auth. Use when working on authentication, sessions, or the auth configuration (`src/lib/server/auth.ts`, `src/lib/server/auth.config.ts`).

#### 1. search_docs

Search for relevant Better Auth documentation pages. Call this first to find pages related to your task.

#### 2. get_doc

Retrieve full content of a specific documentation page. Use after search_docs to read the details you need.

### Resend

Documentation server for the Resend email API. Use when working on email delivery (`src/lib/server/email.ts`).

#### 1. search_resend

Search Resend documentation for topics like sending emails, templates, domains, and API usage.

## Database and real-time invariants

- **Transactions must be synchronous.** Never `await` inside a `db.transaction()` callback — better-sqlite3 commits when the callback returns, so an async callback silently commits early. Synchronous transactions are the only concurrency control (SQLite has no `SELECT … FOR UPDATE`).
- **`time_block` rows are a historical record.** Never delete or mutate a row referenced by a Booking. A schedule change is additive: insert the new rows, update `TIME_BLOCKS`, and leave historic rows alone. Resolve hours for an existing Booking via `getTimeBlockHours` or a join, never `findTimeBlock`.
- **Emit booking changes.** Any code that writes to `booking` outside `bookSlot` / `cancelBooking` must call `bookingEvents.emit(resource)` for each affected Facility, or live booking calendars won't refresh.
