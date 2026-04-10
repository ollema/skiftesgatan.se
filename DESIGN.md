# Design Guidelines — BRF Skiftesgatan 4

## Identity

A housing association website for **residents** (booking, news, updates) and **prospective buyers** (polished property brochure). The design is calm, established, and quietly confident — like a well-maintained Swedish building. Think architectural pamphlet: serene, print-like, unhurried. The building sells itself; the site stays out of the way.

---

## Color Palette

Use CSS custom properties throughout. Warm neutrals with a structural green and earthy accents.

```css
:root {
	/* surfaces */
	--color-bg: #f5f0e8; /* warm cream — primary background */
	--color-bg-alt: #ede7db; /* sand — alternate sections, subtle contrast */
	--color-surface: #fdfbf7; /* off-white — elevated content areas if needed */

	/* text */
	--color-text-primary: #2c2a25; /* warm near-black — body text */
	--color-text-secondary: #6b6560; /* warm gray — supporting text, metadata */
	--color-text-muted: #9c9590; /* stone — captions, timestamps */

	/* accent (background/structural use only — never as text color) */
	--color-accent: #4a6741; /* muted forest green — navbar, buttons, filled slots */
	--color-accent-hover: #3b5334; /* darker green — hover states on green backgrounds */
	--color-accent-subtle: #e8eedf; /* pale sage — input focus outline */

	/* links */
	--color-link: #8b7355; /* warm brown — link text */
	--color-link-hover: #725f47; /* darker warm brown — link hover */

	/* borders */
	--color-border: #ddd7cc; /* warm light gray — structural borders */
	--color-border-subtle: #e8e3da; /* barely-there — gentle separation */

	/* functional */
	--color-error: #a0413c;
	--color-success: #4a6741; /* reuse accent green */

	/* booking slots */
	--color-slot-occupied: #4a6741; /* green — booked by others */
	--color-slot-mine: #b8634b; /* terracotta — user's own booking */
}
```

### Rules

- Never use pure white (`#FFF`) or pure black (`#000`)
- Background variation via `--color-bg` vs `--color-bg-alt`, not shadows or cards
- **Green is a background/structural color only** — navbar, buttons, filled booking slots, success states, input focus rings. Never used as text color.
- Links use `--color-link` (warm brown) with underline — never green
- `--color-link` doubles as `--color-warm` for occasional emphasis

---

## Typography

Serif-driven, classic, with a sense of permanence.

```css
:root {
	--font-heading: 'DM Serif Display', 'Georgia', serif;
	--font-body: 'Source Serif 4', 'Georgia', serif;
	--font-mono: 'JetBrains Mono', monospace;

	--text-xs: 0.75rem; /* 12px — timestamps, fine print */
	--text-sm: 0.875rem; /* 14px — captions, metadata */
	--text-base: 1rem; /* 16px — body text */
	--text-lg: 1.125rem; /* 18px — lead paragraphs */
	--text-xl: 1.5rem; /* 24px — section headings */
	--text-2xl: 2rem; /* 32px — page titles */
	--text-3xl: 2.75rem; /* 44px — hero/display text */
}
```

### Rules

- Headings: `--font-heading`, regular weight — never bold
- Body: `--font-body` at `--text-base` with generous line-height (1.6–1.8)
- All-caps only for small labels/metadata, always with wide letter-spacing
- Avoid font weights heavier than `600`
- Font imports: Google Fonts for DM Serif Display and Source Serif 4

---

## Spacing & Layout

Generous whitespace is the primary compositional tool.

- Sections separated by large whitespace (`4–6rem`) — no lines, no borders, no horizontal rules
- Within sections, `1.5–2.5rem` between elements
- Page padding: minimum `2.5rem` on sides, more on larger screens
- Content max-width: `680px` for text-heavy pages, `960px` for wider/interactive layouts
- **Flat and structural.** No card-heavy layouts. Content sits directly on the background.
- **Single-column default.** Two-column only for genuinely parallel information.
- No containers with shadows. If differentiation needed, use `--color-bg-alt` background or `--color-border-subtle` border — never both at once.

---

## Components

### Navbar

The navbar uses a green background with light text, anchoring the page visually.

```css
/* navbar */
background: var(--color-accent);

/* nav text */
color: var(--color-bg); /* cream on green */

/* inactive nav links: slightly muted cream */
opacity: 0.7;

/* active / hover nav links: full cream */
opacity: 1;
```

- No bottom border — the green-to-cream transition is sufficient
- Logo/site name: `--font-heading` in cream (`--color-bg`)
- Dropdown menus remain `bg-surface` (they float over page content, not the navbar)
- Links inside dropdowns use standard page text colors, not cream
- Mobile hamburger icon: cream on green background
- Mobile slide-out menu: `bg-surface` with standard page text colors

### Buttons

```css
/* primary */
background: var(--color-accent);
color: var(--color-surface);
border: none;
border-radius: var(--radius-sm);
padding: 0.5rem 1.5rem;
font-family: var(--font-body);
font-size: var(--text-sm);
letter-spacing: 0.05em;
text-transform: uppercase;

/* primary:hover */
background: var(--color-accent-hover);

/* secondary / ghost */
background: transparent;
color: var(--color-text-primary);
border: 1px solid var(--color-border);
```

- Buttons are understated — not large, not loud
- Max two styles: primary (green filled) and secondary (outlined)
- Secondary buttons use `--color-text-primary`, not green text

### Links

```css
color: var(--color-link); /* warm brown */
text-decoration: underline;
text-underline-offset: 3px;
text-decoration-thickness: 1px;
transition: color 120ms ease;

/* hover */
color: var(--color-link-hover); /* darker warm brown */
```

- Links are always underlined in body text
- In navigation, underline can be omitted but must appear on hover/active
- Never use green for link text

### Forms & Inputs

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
padding: 0.5rem 1rem;
font-family: var(--font-body);
font-size: var(--text-base);

/* focus */
border-color: var(--color-accent);
outline: 2px solid var(--color-accent-subtle);
outline-offset: 1px;
```

Focus rings use green — this is a structural indicator, not text color.

### Booking Slots

| Status | Fill                | Color                             | Signal                         |
| ------ | ------------------- | --------------------------------- | ------------------------------ |
| Free   | Outline only        | `--color-border` (#ddd7cc)        | Absence of weight = available  |
| Mine   | Filled — terracotta | `--color-slot-mine` (#b8634b)     | Your personal booking          |
| Booked | Filled — green      | `--color-slot-occupied` (#4a6741) | Taken (matches navbar/buttons) |

- Free slots are **outline only** — no fill means available
- Filled slots = taken. Green ties into the site's structural green system.
- Terracotta distinguishes "mine" from "others" at a glance
- Slot buttons show only time range (e.g. "10–16"), no action labels
- Use `--radius-sm` (3px), no shadow

---

## Visual Rules

**Corners:** Most elements have no border-radius. Buttons and inputs get `--radius-sm` (3px). Never use pills (`border-radius: 9999px`). Images are sharp, no rounding.

**Shadows:** None. This is a flat design. Use `border: 1px solid var(--color-border)` instead.

**Motion:** Almost none. Only color transitions on hover/focus (120ms ease). No entrance animations, scroll-triggered reveals, staggered loads, or skeleton loaders. The site should feel instant and paper-like.

**Imagery:** Text-driven site. When images are used: real photography of the building/surroundings, natural light, no stock photos. Full-width or column-width, no rounding.

**Logo:** Keep small and restrained in the header. Pairs with association name in `--font-heading`. On the navbar, both logo and name are cream-colored on the green background.

---

## Anti-Patterns

- Use shadows or elevation
- Use card-heavy layouts with bordered boxes
- Use gradient backgrounds
- Use rounded pill shapes
- Add entrance animations or scroll effects
- Use horizontal rules or divider lines
- Use bold/heavy font weights for headings
- Use stock photography or decorative illustrations
- Use pure white or pure black
- Use sans-serif fonts for headings or body
- **Use green as a text/foreground color** — green is for backgrounds only
- Make the design look like a SaaS product or tech startup
