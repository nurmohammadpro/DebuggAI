---
name: DeBuggAI
description: AI-powered debugging and code generation tool
colors:
  neutral-bg: "#0A0D0A"
  neutral-surface: "#111411"
  neutral-surface2: "#171C17"
  neutral-surface3: "#1E261E"
  neutral-border: "#1F2B1F"
  neutral-border2: "#283228"
  neutral-text: "#E8F5E9"
  neutral-text2: "#8BAD8B"
  neutral-text3: "#4D6B4D"
  accent-green: "#00C853"
  accent-green-bright: "#00E676"
  accent-red: "#FF5252"
  accent-amber: "#FFAB00"
  accent-blue: "#40C4FF"
  accent-purple: "#CE93D8"
typography:
  display:
    fontFamily: Inter, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.5px
  headline:
    fontFamily: Inter, sans-serif
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.3px
  title:
    fontFamily: Inter, sans-serif
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Inter, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Inter, sans-serif
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
  stat:
    fontFamily: Inter, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: 6px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  section: 48px
components:
  button-primary:
    backgroundColor: "{colors.accent-green}"
    textColor: "#000000"
    rounded: 6px
    padding: 0 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.accent-green-bright}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.neutral-text}"
    rounded: 6px
    border: 1px solid "{colors.neutral-border2}"
    padding: 0 20px
    height: 40px
  button-destructive:
    backgroundColor: transparent
    textColor: "{colors.accent-red}"
    rounded: 6px
    border: 1px solid rgba(255,82,82,0.35)
    padding: 0 20px
    height: 40px
  input-default:
    backgroundColor: "{colors.neutral-surface2}"
    textColor: "{colors.neutral-text}"
    rounded: 6px
    border: 1px solid "{colors.neutral-border2}"
    padding: 0 12px
    height: 38px
  card-default:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text2}"
    rounded: 6px
    border: 1px solid "{colors.neutral-border}"
    padding: 20px
  badge-default:
    backgroundColor: rgba(0,200,83,0.15)
    textColor: "{colors.accent-green-bright}"
    rounded: 6px
    padding: 2px 8px
---

# Design System: DeBuggAI

## 1. Overview

**Creative North Star: "The Workbench"**

A physical toolbench — flat surfaces, crisp edges, everything in reach. No ornament, no clutter. Every surface exists because a tool needs a place to rest. The aesthetic is a well-organized workshop: precise alignment, clean separation of work areas, and a quiet confidence that comes from purpose-built design.

This system explicitly rejects trendy SaaS clichés: no gradient accents, no glassmorphism, no heavy shadows, no animated flourishes. It leans into its developer-tool DNA — dark by default, type-driven, with green as the sole accent signal. The user is here to work; the interface steps aside.

**Key Characteristics:**
- Dark-first, flat surfaces with tonal layering for depth
- Green (#00C853) as the single focus color — used for primary actions, active states, and indicators only
- Type-driven hierarchy: large headings, clean sans, generous letter-spacing
- Subtle rounded corners (4px–12px range), never exaggerated
- Sparse borders, relying on surface contrast for separation
- Consistent 6px radius on all interactive and container elements (Vercel/GitHub style)
- Color tone layering for panel separation: bg (darkest) → surface (medium) → surface2 (lightest)

## 2. Colors

A restrained palette anchored to the dark-green developer-tool axis. Green is the sole accent — used on ≤10% of any given screen.

### Primary (Accent)
- **Terminal Green** (#00C853 / oklch(65% 0.2 150)): Primary buttons, active nav items, focus rings, stat values, selection indicators. Never used for decoration.
- **Bright Green** (#00E676): Primary button hover state.

### Semantic
- **Alert Red** (#FF5252): Destructive actions, errors, danger zone boundaries.
- **Signal Amber** (#FFAB00): Warning states, pending indicators.
- **Link Blue** (#40C4FF): Information, link text, info badges.
- **Accent Purple** (#CE93D8): Experimental/labs features, special badges.

### Neutral
- **Workspace Black** (#0A0D0A): Page background. The deepest surface.
- **Cast Iron** (#111411): Card and panel surfaces. The primary work surface.
- **Ash** (#171C17): Secondary surfaces, toolbars, inputs.
- **Deep Moss** (#1E261E): Tertiary surfaces, hover backgrounds, subtle fills.
- **Vine Border** (#1F2B1F): Default border color. Subtle separation.
- **Thicker Vine** (#283228): Stronger borders for input outlines.
- **Light Text** (#E8F5E9): Primary text, headings.
- **Faded Text** (#8BAD8B): Secondary text, metadata.
- **Dim Text** (#4D6B4D): Placeholder text, disabled states.

### The Single-Accent Rule
Green is used on ≤10% of any given screen. Its rarity is the point. If green appears more than once per viewport (aside from the primary CTA), check whether the second instance can use a neutral treatment.

## 3. Typography

**Primary Font:** Inter (with system-sans fallback)
**Mono Font:** JetBrains Mono (for code, data, labels)

**Character:** Clean, precise, utilitarian. Inter's generous x-height and tight spacing keep dense UIs readable. No display fonts, no decorative pairings. One family carries everything.

### Hierarchy
- **Display** (600, 32px, 1.2): Page titles, hero sections. Letter-spacing: -0.5px.
- **Headline** (600, 22px, 1.3): Section headers. Letter-spacing: -0.3px.
- **Title** (600, 17px, 1.4): Card titles, panel headings. Letter-spacing: -0.2px.
- **Subtitle** (500, 14px, 1.5): Small headings, group labels.
- **Body** (400, 13px, 1.6): Primary reading text. Line length capped at 65–75ch for prose.
- **Caption** (400, 11px, 1.5): Metadata, timestamps, helper text. Color: Dim Text.
- **Stat** (600, 24px, 1.2): Numeric values, metrics. Color: Terminal Green.
- **Mono/Small** (400, 12px, 1.5): Code blocks, data displays, keyboard shortcuts.

### The Flat Scale Rule
Type hierarchy comes from weight (500/600 vs 400) and size ratio (≥1.25 between display-headline-body). Never add underlines, colored backgrounds, or decorative rules to headings. Contrast through weight alone.

## 4. Elevation

**Flat by default.** No drop shadows, no box-shadow elevation. Depth is conveyed exclusively through tonal layering: surfaces get progressively lighter (darker in dark mode) as they move toward the user.

- Page background: Workspace Black is the base (darkest).
- Primary panels (chat, input sections): Cast Iron layer — one step up.
- Secondary panels (code/preview, results): Ash layer — lightest.
- Active/hover surfaces: Deep Moss fills.

Floating elements (modals, dropdowns, tooltips) earn a single shadow at `0 4px 16px rgba(0,0,0,0.4)` to distinguish containment from the page. Nothing else gets shadow.

## 5. Components

### Buttons
- **Shape:** 6px rounded corners (`rounded-ds`). Clean and precise, like Vercel or GitHub.
- **Primary:** Terminal Green background, black text. Hover shifts to Bright Green. Height 44px, padding 0 24px, 15px font.
- **Ghost:** Transparent background, no border. Hover acquires green text with surface2 background. Standard size.
- **Destructive:** Transparent, no border, red text. Hover gets red tint fill.
- **Large:** 56px height, 17px font, 36px horizontal padding. For primary CTAs.
- **Small:** 34px height, 13px font, 16px padding.
- **Icon:** 40x40px square, surface2 background.

All buttons: active opacity to 85%, 100ms transition. No hover scale or translate transforms.

### Cards
- **Shape:** 6px rounded corners (`rounded-ds`). No border.
- **Background:** Cast Iron.
- **Shadow:** None. Cards sit flat on the page.
- **Padding:** 20px standard, 16px for compact.
- Cards are used sparingly — only when grouping related information.

### Inputs
- **Shape:** 6px rounded corners. 1px Thicker Vine border.
- **Background:** Ash fill.
- **Focus:** Border shifts to Terminal Green + 2px green glow ring.
- **Height:** 44px standard, 14px horizontal padding.
- **Error:** Red border + red focus ring.
- **Textarea:** 80px min-height, 14px padding.

### Badges
- **Shape:** 6px rounded corners. Compact (2px 8px padding).
- **Font:** JetBrains Mono, 12px, 500 weight.
- **Colors:** Green (default), Red, Amber, Blue, Purple, Gray variants.
- Badges are purely informational. No hover or interactive states.

### Navigation (Sidebar)
- **Style:** Left rail, full height. Cast Iron background, no border divider.
- **Items:** Text at 15px, Dim Text default, hover shifts to Faded Text background to Deep Moss.
- **Active:** Text color shifts to Terminal Green, background gets green muted fill (12% opacity).
- **Collapsed:** 68px narrow variant with icon-only items.

## 6. Do's and Don'ts

### Do:
- **Do** use green only for interactive elements and state indicators. Never for decoration.
- **Do** rely on surface contrast (tonal layers) for separation. Add borders only when layers don't provide enough distinction.
- **Do** use large type as the primary hierarchical signal. Headings at 22px+, body at 13px.
- **Do** keep cards flat. No shadows, no hover lift.
- **Do** use JetBrains Mono for code, data values, timestamps, and labels.
- **Do** use 150ms transitions for interactive elements. Fast enough to feel responsive, slow enough to perceive.
- **Do** use the single pill-shape for all buttons (999px radius).
- **Do** keep inputs simple: Ash background, Thicker Vine border, green focus ring.

### Don't:
- **Don't** use gradient text, glassmorphism, or decorative blur effects.
- **Don't** use box-shadow on cards or static surfaces. Shadows are for floating elements only.
- **Don't** add side-stripe borders (border-left/right > 1px as accent). Use full borders or tonal fill instead.
- **Don't** use em dashes. Use commas, colons, or periods.
- **Don't** animate layout properties (width, height, top, left). Animate transforms and opacity only.
- **Don't** add decorative illustrations, branded graphics, or animated mascots.
- **Don't** use multiple border-radius values. All elements use 6px (`rounded-ds`).
- **Don't** use display fonts or font pairings. Inter carries everything.
- **Don't** repeat the "hero-metric" pattern (big number, small label, gradient accent) — it's a SaaS cliché.
- **Don't** overlay green on green surfaces. Green needs dark or black backing for readability.
