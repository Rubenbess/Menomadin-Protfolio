---
name: Menomadin
description: VC portfolio management platform for fund managers and analyst teams
colors:
  primary: "#5a7fa8"
  primary-dark: "#4a6a8f"
  primary-deep: "#1a2b44"
  neutral-bg: "#fafbfc"
  neutral-surface: "#f4f6f8"
  neutral-border: "#e8ecf0"
  neutral-divider: "#dce2e8"
  neutral-muted: "#8c96a2"
  neutral-secondary: "#707a88"
  neutral-text: "#384854"
  status-active: "#15803d"
  status-watchlist: "#b45309"
  status-critical: "#ef4444"
  status-exited: "#1d4ed8"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary-dark}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "#dc2626"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "24px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Menomadin

## 1. Overview

**Creative North Star: "The Portfolio Room"**

This is the private, well-ordered room where serious decisions happen. The aesthetic is one of quiet authority: every element has a reason to be there, nothing decorates for its own sake, and the whole system projects the confidence of a fund that has done its homework. Think a well-organized investment office — precise, structured, unhurried.

The platform resists the impulse toward visual novelty. There are no gradient accents, no hero-metric vanity cards, no decorative chart animations. What replaces them is disciplined typographic hierarchy, calibrated spacing, and a color system that uses restraint as its signal of sophistication. When something is highlighted, it means something. The rarity of emphasis is the point.

Dark mode is a first-class citizen, not an afterthought. The dark surface (#384854 and below) carries the same structure and precision as the light surface — same contrast ratios, same spatial logic. A fund manager switching modes between a bright boardroom and a late-night analysis session should see the same system, not a different product.

**Key Characteristics:**
- Serif display type (Georgia) for page-level headings; clean system sans for all operational text
- Steel-blue primary acting as a precise signal, never a flood
- Borders and backgrounds create hierarchy before shadows are needed
- Four shadow tiers reserved for genuine structural depth (cards, modals, hover states)
- Status colors communicate facts, not aesthetics — green means active, red means critical
- Section labels in uppercase, wide-tracked, muted — a consistent wayfinding register throughout

## 2. Colors: The Institutional Palette

A restrained palette built around one trustworthy accent and a full neutral scale. Color signals state and structure; it does not decorate.

### Primary
- **Institutional Steel** (`#5a7fa8`): The system's single accent hue. Used for interactive elements, links, focus rings, and selected states. A cool, mid-tone blue that reads as composed and authoritative — never excitable.
- **Institutional Steel Active** (`#4a6a8f`): Button backgrounds and pressed states. Slightly deeper, maintains contrast against white text.
- **Deep Portfolio Navy** (`#1a2b44`): Darkest primary tone. Used for high-emphasis text on light backgrounds and as the backdrop for elevated surfaces in dark mode.

### Neutral
- **Canvas White** (`#fafbfc`): Default page background in light mode. Slightly cool-tinted, not pure white — reduces harshness on bright displays.
- **Surface Lift** (`#f4f6f8`): Secondary backgrounds — table headers, input fields, hover rows. Perceptible step above canvas without introducing color.
- **Structural Border** (`#e8ecf0`): Primary border for cards, inputs, and dividers. The dividing line between surfaces at rest.
- **Subtle Divider** (`#dce2e8`): Lighter partition — inner cell borders, soft separators.
- **Muted Text** (`#8c96a2`): Secondary labels, metadata, timestamps. Does not compete with body text.
- **Secondary Text** (`#707a88`): Form labels, column headers. Readable without pulling focus.
- **Portfolio Charcoal** (`#384854`): Primary text in light mode; default background in dark mode. A warm-cold balanced dark tone.

### Status
Status colors are diagnostic. They appear in badges, sparklines, and health indicators — never in decorative elements.
- **Active** (`#15803d`): Portfolio company active status; positive trend indicators.
- **Watchlist** (`#b45309`): Caution, monitoring needed; amber warning register.
- **Critical / Exited Loss** (`#ef4444`): Written-off, critical alert, negative delta.
- **Exited** (`#1d4ed8`): Successful exit; blue (not green) to distinguish from operational active status.

### Named Rules
**The One Signal Rule.** The primary steel-blue appears on ≤15% of any given screen surface. Its presence marks interaction or selection. If everything is blue, nothing is.

**The Status-Only Rule.** Emerald, amber, and red are reserved for status indicators. They do not appear as decorative accents, chart colors, or background fills. Using emerald on a non-status element creates false urgency.

## 3. Typography

**Display Font:** Georgia, 'Times New Roman', serif
**Body Font:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica Neue, sans-serif
**Label / Data Font:** System sans at small sizes, wide-tracked uppercase

**Character:** The pairing is deliberately institutional — Georgia's serif authority for the titles that anchor a screen, system sans for the operational density that fills it. The contrast is intentional: serif headings signal that a judgment is being framed; sans body signals that data follows.

### Hierarchy
- **Display** (Georgia, 700, clamp(2rem–3rem), lh 1.2, ls -0.025em): Page-level titles. Reserved for dashboard section anchors and company name headers in detail views.
- **Headline** (Georgia, 700, 1.5rem, lh 1.3, ls -0.02em): Section headers within a page — "Portfolio Overview", "Pipeline by Stage". Two display-class steps per page maximum.
- **Title** (System sans, 600, 1rem, lh 1.4): Card headings, modal titles, sidebar section labels. The workhorse of the information hierarchy.
- **Body** (System sans, 400, 0.875rem, lh 1.5): All running text, table cells, form content. Max line length 70ch in reading contexts; unrestricted in data tables.
- **Label** (System sans, 600, 0.75rem, lh 1, ls 0.08em, uppercase): Section titles, column headers, metadata tags. Wide-tracked caps create a consistent wayfinding register across all screens.

### Named Rules
**The Serif Anchor Rule.** Georgia appears only at display and headline level. Never in body text, table cells, form fields, or badge labels. When every heading is serif but every cell is sans, the visual hierarchy writes itself.

**The Label Uniformity Rule.** Section labels (`section-title` class) are always 0.75rem, semibold, uppercase, tracked at 0.08em, in `neutral-muted` (`#8c96a2`). They are the consistent wayfinding voice throughout the app. Deviating from this pattern — even once — breaks the rhythm.

## 4. Elevation

Elevation is structural, not decorative. Shadows mark genuine depth — surfaces that sit above the canvas, not surfaces that want to look interesting. A card at rest does not need to announce itself.

The system uses four shadow tiers. Each tier has a specific structural meaning; using a deeper tier without that structural meaning is a violation.

### Shadow Vocabulary
- **Refined** (`0 2px 8px rgba(0, 0, 0, 0.08)`): Baseline card elevation. Separates a content surface from the page canvas. The default state for cards and panels.
- **Card** (`0 4px 16px rgba(0, 0, 0, 0.12)`): Interactive cards in hover state; selected items. One step above canvas rest.
- **Elevated** (`0 12px 32px rgba(0, 0, 0, 0.16)`): Floating panels, dropdowns, date pickers. Denotes a surface that has left the document flow.
- **Hover** (`0 16px 48px rgba(0, 0, 0, 0.20)`): Dragged kanban cards; modals at peak elevation. Reserved for interaction in progress.

### Named Rules
**The Structural-Only Rule.** Shadows mark depth, not importance. An important piece of data inside a card does not get its own shadow — the card already has one. Nested shadows are prohibited.

**The Flat-Text Rule.** Text, badges, icons, and labels cast no shadows. `text-shadow` is not part of this system.

## 5. Components

### Buttons
Clean, medium-weight, and consistent. No uppercase. No wide tracking. No gradient fills.

- **Shape:** Gently curved corners (8px radius, `rounded-lg` / `rounded.sm`)
- **Primary:** Deep steel-blue background (`#4a6a8f`), white text, `shadow-md`. Padding 10px 16px (sm), padding 10px 16px (md). Hover deepens to `#1a2b44`.
- **Secondary:** Neutral surface background (`#f4f6f8`), charcoal text, 1px structural border. Used for non-destructive secondary actions.
- **Ghost:** Transparent background, steel-blue text, no border at rest. Hover reveals a faint primary tint (`primary-50/20`). Used for low-hierarchy tertiary actions.
- **Danger:** Red-600 background, white text. Same shape and padding as primary. Used only for destructive actions (delete, remove).
- **Disabled:** 50% opacity across all variants. Cursor `not-allowed`.
- **Focus:** `focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2`. Visible at WCAG AA contrast against all surface colors.
- **Loading:** Inline spinner replaces or precedes label. Button remains full-width to prevent layout shift.

### Cards / Containers
Cards define the primary content surface. They are used when a group of related information needs a boundary — not as a default wrapper for everything.

- **Corner Style:** 8px radius — firm enough to read as contained, soft enough not to feel playful
- **Background:** White (`#ffffff`) in light mode; `neutral-800` in dark mode
- **Shadow:** `shadow-refined` at rest (`0 2px 8px rgba(0,0,0,0.08)`). Hover lifts to `shadow-card`.
- **Border:** 1px `neutral-border` (`#e8ecf0`) all sides. The border does the containment work; the shadow adds perceived depth.
- **Internal Padding:** 24px. Section headers within the card use a 1px bottom border + `px-6 py-4` header zone.
- **Accent Tops:** The metric card supports an optional 2px `border-top` in a semantic color (primary, emerald, blue, amber). Use only when the semantic color is meaningful — not as decoration.

### Inputs / Fields
- **Style:** Neutral surface background (`#f4f6f8`), 1px `neutral-300` border, 8px radius
- **Focus:** 2px primary ring at 40% opacity, border shifts to `primary-500`. Subtle, not loud.
- **Labels:** `field-label` class — 0.875rem, semibold, charcoal. Always above the field, never placeholder-only.
- **Error:** Red border, red label text, brief error message below. No icons inside the field.
- **Disabled:** 50% opacity; background remains surface to avoid a grayed-out "dead" look.

### Badges / Status Chips
Round-pill badges carry semantic meaning. They are not decorative tags.

- **Shape:** Fully rounded (`rounded-full`), 0.75rem text, 600 weight, capitalize
- **Border:** 1px ring at the status color (e.g. `ring-1 ring-emerald-200`) — gives definition without a solid background
- **Status Active:** Emerald-50 bg, emerald-700 text
- **Status Watchlist:** Amber-50 bg, amber-700 text
- **Status Critical / Written Off:** Red-50 bg, red-600 text
- **Status Exited:** Blue-50 bg, blue-700 text
- **Strategy (fund type):** Same shape; emerald for Impact fund, blue for Catalyst fund

### Data Tables
The workhorse surface. Dense but not compressed.

- **Header row:** `neutral-surface` background, uppercase labels (0.75rem, semibold, wide-tracked), `neutral-700` text
- **Row padding:** `px-6 py-4` — enough breathing room for scanning without wasting vertical space
- **Hover state:** `neutral-50` background tint; 200ms transition
- **Borders:** 1px `neutral-100` row dividers, 1px `neutral-200` header separator
- **Alignment:** Left-align text; right-align numeric columns

### Navigation (Sidebar)
- **Collapsed/expanded:** Collapsible sidebar, desktop and mobile drawer variants
- **Active item:** `primary-50` background, `primary-700` text; 1px `primary-200` left border (1px — within spec)
- **Inactive item:** Transparent, `neutral-600` text; hover adds `neutral-100` background tint
- **Section labels:** Uppercase, 0.7rem, tracked, `neutral-400` — the same label register used throughout

### Health Score (Signature Component)
The portfolio health score is a 0-100 numeric indicator displayed at company level. It is the platform's most distinctive data primitive.

- **Display:** 3-digit number at `text-3xl font-bold`, paired with a small `text-xs` label
- **Color encoding:** ≥70 maps to emerald; 40-69 maps to amber; <40 maps to red
- **No ring charts, no radial fills** — the number itself carries the meaning. Decoration would dilute the signal.

## 6. Do's and Don'ts

### Do:
- **Do** use Georgia exclusively for display and headline level (`text-3xl` and above). System sans handles everything below.
- **Do** use the `section-title` pattern (uppercase, 0.75rem, semibold, wide-tracked, `neutral-muted`) consistently for all section labels throughout the app.
- **Do** use status colors (emerald, amber, red, blue) only when they are communicating portfolio status. Never as decorative fills.
- **Do** keep the steel-blue primary accent below 15% of any screen surface. It marks interaction and selection; its rarity is its power.
- **Do** use the four shadow tiers with structural intent: `refined` for cards at rest, `card` for hover, `elevated` for floating panels, `hover` for dragged elements and modals.
- **Do** use 1px borders (all sides) on cards. The border does the containment work; it should not be omitted in favor of shadow-only depth.
- **Do** size buttons consistently: `px-4 py-2.5 text-sm` (md) or `px-3 py-2 text-xs` (sm). No other size variants.
- **Do** left-align text columns and right-align numeric columns in data tables.
- **Do** respect `prefers-reduced-motion`. Fade-in and slide-up transitions must be wrapped: `@media (prefers-reduced-motion: reduce) { animation: none; }`.

### Don't:
- **Don't** use purple/teal gradients, gradient text (`background-clip: text`), or gradient accent fills anywhere in the platform. This is the primary anti-reference: the generic SaaS look that makes every tool indistinguishable.
- **Don't** build hero-metric cards: big number, small label, gradient top accent. The pattern is a cliché in VC dashboards and conflicts with the "data earns the space" principle from PRODUCT.md.
- **Don't** use identical icon-heading-text card grids. If multiple cards appear in a row, they must carry distinct data structures — not the same template repeated.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts. If a card needs color identity, use a semantic background tint or a border-top at 2px maximum (and only when the color is meaningful).
- **Don't** use `text-shadow` or nested shadows. Shadows belong to surfaces, not text or icons.
- **Don't** add decorative chart animations. Charts transition once on load; they do not loop, pulse, or re-animate on scroll.
- **Don't** apply `shadow-elevated` or `shadow-hover` to cards at rest. These are interaction-state and floating-panel tiers — not "make this card feel important" tools.
- **Don't** put rounded-full pills, pastel illustrations, or playful micro-copy anywhere in the product. The platform is used in board meetings and late-night analysis sessions. Consumer-app aesthetics break the trust register.
- **Don't** use Georgia below headline size. Serif body text in a data-dense dashboard reads as decorative, not authoritative.
- **Don't** introduce a new color outside the defined palette without explicitly assigning it a semantic role. Ad-hoc accent colors dilute the restraint that makes the system legible.
