# Design Guidelines — Bostadsrättsförening Site

## Purpose & Audience

This is a housing association (bostadsrättsförening) website serving two audiences:

1. **Residents** — booking the laundry room, reading news and association updates
2. **Prospective buyers** — browsing via realtors or directly; the site should feel like a polished, trustworthy property brochure

The design must be functional for everyday resident use while leaving a strong impression on visitors evaluating the building.

---

## Brand Identity

**Personality:** Calm, established, quietly confident. The site should feel like a well-maintained Swedish building — nothing shouts, everything is considered. Think architectural pamphlet or heritage property brochure, not tech product.

**One-liner:** Serene, print-like, unhurried.

---

## Color Palette

Use CSS custom properties throughout. The palette is warm neutrals with earthy accents.

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

	/* accent */
	--color-accent: #4a6741; /* muted forest green — primary actions, links */
	--color-accent-hover: #3b5334; /* darker green — hover states */
	--color-accent-subtle: #e8eedf; /* pale sage — tags, badges, soft highlights */

	/* warm accent (use very sparingly) */
	--color-warm: #8b7355; /* warm brown — occasional emphasis */

	/* borders (used instead of shadows for separation) */
	--color-border: #ddd7cc; /* warm light gray — structural borders */
	--color-border-subtle: #e8e3da; /* barely-there border — gentle separation */

	/* functional */
	--color-error: #a0413c;
	--color-success: #4a6741; /* reuse accent green */
}
```

### Rules

- Never use pure white (`#FFF`) or pure black (`#000`)
- Background variation is achieved through `--color-bg` vs `--color-bg-alt`, not through shadows or cards
- Green accent is reserved for actionable elements: links, buttons, selected states
- Warm brown (`--color-warm`) is an occasional highlight, not a layout color

---

## Typography

Serif-driven, classic, with a sense of permanence.

```css
:root {
	--font-heading: 'DM Serif Display', 'Georgia', serif;
	--font-body: 'Source Serif 4', 'Georgia', serif;
	--font-ui: 'Source Serif 4', 'Georgia', serif;
	--font-mono: 'JetBrains Mono', monospace; /* if code/data is ever needed */

	--text-xs: 0.75rem; /* 12px — timestamps, fine print */
	--text-sm: 0.875rem; /* 14px — captions, metadata */
	--text-base: 1rem; /* 16px — body text */
	--text-lg: 1.125rem; /* 18px — lead paragraphs */
	--text-xl: 1.5rem; /* 24px — section headings */
	--text-2xl: 2rem; /* 32px — page titles */
	--text-3xl: 2.75rem; /* 44px — hero/display text */

	--leading-tight: 1.25;
	--leading-normal: 1.6;
	--leading-loose: 1.8;

	--tracking-tight: -0.01em; /* headings */
	--tracking-normal: 0;
	--tracking-wide: 0.05em; /* uppercase labels, small text */
}
```

### Rules

- Headings use `--font-heading` in regular or medium weight — never bold
- Body text uses `--font-body` at `--text-base` with `--leading-normal` or `--leading-loose`
- All-caps text is used sparingly and only for small labels/metadata, always with `--tracking-wide`
- Avoid font weights heavier than `600` anywhere
- Font imports: use Google Fonts for DM Serif Display and Source Serif 4

---

## Spacing

Generous whitespace is the primary compositional tool.

```css
:root {
	--space-xs: 0.25rem; /* 4px */
	--space-sm: 0.5rem; /* 8px */
	--space-md: 1rem; /* 16px */
	--space-lg: 1.5rem; /* 24px */
	--space-xl: 2.5rem; /* 40px */
	--space-2xl: 4rem; /* 64px */
	--space-3xl: 6rem; /* 96px */
	--space-4xl: 8rem; /* 128px */
}
```

### Rules

- Sections are separated by `--space-3xl` or `--space-4xl` — whitespace is the only divider, no lines, no borders, no horizontal rules
- Within sections, use `--space-lg` to `--space-xl` between elements
- Page padding: minimum `--space-xl` on sides, more on larger screens
- Content max-width: `680px` for text-heavy pages, `960px` for wider layouts

---

## Layout

- **Flat and structural.** No card-heavy layouts. Content sits directly on the page background.
- **Single-column** is the default for text content. Use two-column layouts only when showing genuinely parallel information (e.g., a sidebar with quick links alongside news).
- **No cards with shadows.** If a container is needed, differentiate with `--color-bg-alt` background or a `--color-border-subtle` border — never both at once.
- **No divider lines** between sections. Whitespace handles rhythm.
- **Grid-breaking is not appropriate here.** Keep layouts orderly, aligned, predictable.

---

## Corners & Edges

```css
:root {
	--radius-sm: 3px; /* buttons, inputs, small interactive elements */
	--radius-md: 5px; /* containers if ever needed */
	--radius-none: 0; /* default — most elements */
}
```

### Rules

- Most elements have no border-radius — the flat, print-like feel depends on sharp structure
- Buttons and form inputs get `--radius-sm` for a touch of softness
- Never use fully rounded pills (`border-radius: 9999px`)
- Images are displayed without rounding unless specifically framed

---

## Shadows & Depth

**None.** This is a flat design. Depth is communicated through color contrast and whitespace, never shadows.

```css
/* no shadow variables — intentionally omitted */
```

If you are tempted to add `box-shadow`, use `border: 1px solid var(--color-border)` instead.

---

## Motion & Animation

**Almost none.** The site should feel instant and paper-like.

```css
:root {
	--transition-fast: 120ms ease;
}
```

### Rules

- The only transitions allowed: color changes on hover/focus (links, buttons) using `--transition-fast`
- No entrance animations, no scroll-triggered reveals, no staggered loads
- No skeleton loaders — use simple text placeholders or nothing
- Page transitions: instant (no fade-in/fade-out)

---

## Buttons

```css
/* primary */
background: var(--color-accent);
color: var(--color-surface);
border: none;
border-radius: var(--radius-sm);
padding: var(--space-sm) var(--space-lg);
font-family: var(--font-body);
font-size: var(--text-sm);
letter-spacing: var(--tracking-wide);
text-transform: uppercase;
transition: background var(--transition-fast);

/* primary:hover */
background: var(--color-accent-hover);

/* secondary / ghost */
background: transparent;
color: var(--color-accent);
border: 1px solid var(--color-accent);
```

### Rules

- Buttons are understated — not large, not loud
- Use uppercase + wide tracking for button labels
- Max two button styles: primary (filled) and secondary (outlined)
- Never use gradient backgrounds or shadow on buttons

---

## Links

```css
color: var(--color-accent);
text-decoration: underline;
text-underline-offset: 3px;
text-decoration-thickness: 1px;
transition: color var(--transition-fast);
```

Links are always underlined in body text. In navigation, underline can be omitted but must appear on hover.

---

## Forms & Inputs

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
padding: var(--space-sm) var(--space-md);
font-family: var(--font-body);
font-size: var(--text-base);

/* focus */
border-color: var(--color-accent);
outline: 2px solid var(--color-accent-subtle);
outline-offset: 1px;
```

---

## Functional Data Colors (Booking System)

The booking calendar uses status-indicator colors that must remain visually distinct from each other. These are functional, not decorative.

| Status | Color       | Hex       | Usage                                    |
| ------ | ----------- | --------- | ---------------------------------------- |
| Free   | Muted green | `#5a8a52` | Available time slots                     |
| Mine   | Warm brown  | `#8b7355` | User's own booking (matches warm accent) |
| Booked | Warm red    | `#b84a45` | Slots booked by others                   |

These colors appear as small slot buttons and calendar dots. They use white text for labels. The dots on the calendar are 6px circles.

### Rules

- These are the only places where saturated color fills are acceptable
- The slot buttons use `--radius-sm` (3px), not fully rounded
- Slot buttons should have no shadow, just the colored background

---

## Content Widths

- Content max-width: `680px` for text-heavy pages (news articles, information, contact)
- Wider layout max-width: `960px` for pages with interactive elements (booking pages, homepage)
- Responsive side padding: `1rem` on mobile, `2.5rem` on larger screens

---

## Imagery

- The site is **text-driven**. Images are not a primary design element.
- When used, photography should be of the actual building, courtyard, or surrounding area — real, unfiltered, natural light.
- No stock photography, no illustrations, no decorative icons.
- Images should be full-width or column-width, never floating or awkwardly sized.
- Use no border-radius on images. Let them sit flat and sharp.

---

## Logo & Wordmark

The association has an existing logo. When placing it:

- Keep it simple and small in the header — the logo should not dominate
- In the header, the logo pairs with the association name set in `--font-heading`
- Ensure sufficient clear space around the logo (minimum `--space-md`)
- On the landing/hero area, the logo may appear slightly larger but still restrained

---

## Anti-Patterns — Do NOT

- ❌ Use shadows or elevation of any kind
- ❌ Use card-heavy layouts with lots of bordered boxes
- ❌ Add gradient backgrounds
- ❌ Use rounded pill shapes for buttons or tags
- ❌ Add entrance animations or scroll-triggered effects
- ❌ Use horizontal rules or divider lines
- ❌ Use bold/heavy font weights for headings
- ❌ Use stock photography or decorative illustrations
- ❌ Use pure white or pure black
- ❌ Use sans-serif fonts for headings or body text
- ❌ Make the design look like a SaaS product or tech startup
- ❌ Over-use the green accent — it is for actions and links only

---

## Reference Mood

If you need to calibrate: think of the typography and layout sensibility of a high-end Scandinavian architecture firm's website, or a heritage hotel brochure. Flat, warm, text-forward, quietly luxurious. The building sells itself; the site just needs to not get in the way.
