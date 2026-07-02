---
name: Areacodes
description: Support Local. Spend Less.
colors:
  black: "oklch(0 0 0)"
  white: "oklch(0.985 0 0)"
  ink-dim: "oklch(0.65 0 0)"
  surface-raised: "oklch(0.07 0 0)"
  surface-secondary: "oklch(0.13 0 0)"
  border: "oklch(0.18 0 0)"
  ring: "oklch(0.55 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  none: "0rem"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "60px"
  2xl: "100px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "oklch(0.985 0 0 / 0.9)"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "24px"
  input:
    backgroundColor: "oklch(0.18 0 0 / 0.3)"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
---

# Design System: Areacodes

## 1. Overview

**Creative North Star: "The Street Press"**

Areacodes is a platform built around independent print energy - photocopied gig flyers, hand-billed market stalls, pirate radio schedules pinned to lamp posts. The visual system does not simulate this; it *embodies* it. True black. True white. Zero radius. Poppins Bold rendered in tight uppercase blocks that function like rubber stamps, stickers, or typeset letterpress text. Every element looks like it was intentionally placed, not generated.

This is a system that practices what it preaches. The brand champions local character over corporate polish - so the design system itself refuses corporate polish. No softening. No gradients. No blurs. No warm-tinted surfaces trying to feel "artisanal." Colour comes from photography - from the real, unfiltered city. The interface stays monochrome and gives photography room to breathe.

The system rejects: the 2024-2026 AI SaaS cream/sand aesthetic (warm-tinted near-white surfaces with soft card grids), FAANG product UI polish (Material Design, Fluent, overengineered interaction patterns), and anything that reads as AI-generated or inauthentic. If it could have been made by a product team trying to appear relatable, it's wrong for this brand.

**Key Characteristics:**
- True black/white foundation (no warm or cool tints)
- Zero border radius throughout - every element is a sharp-edged stamp
- All headings rendered as filled rectangular label blocks (the "stamp" motif)
- Poppins Bold, uppercase, tight tracking as the single typographic voice
- Colour from photography, not from the palette
- Flat elevation - depth via background alternation between black and white sections
- Bold, direct, no ornament

---

## 2. Colors: The Monochrome Press

The palette is two inks: black and white. There is no third colour. Contrast IS the design.

### Primary
- **Pressroom Black** (`oklch(0 0 0)` / #000000): The primary surface. Marketing sections alternate between black and white backgrounds to create rhythm. Business app background. The ink in the stamp.
- **Paper White** (`oklch(0.985 0 0)` / approx #f9f9f9): Primary foreground text on black surfaces. Also used as the inverted surface background in alternating sections and as the fill of label chips on dark backgrounds.

### Neutral
- **Dim Ink** (`oklch(0.65 0 0)` / approx #a3a3a3): Secondary and muted body text. Used for supporting copy where full-white would overpower. Never used for headings.
- **Raised Surface** (`oklch(0.07 0 0)` / approx #111111): Card and popover backgrounds in the product (business) app. Elevated but not lifted - almost-black, distinguishable from the base only at close range.
- **Secondary Surface** (`oklch(0.13 0 0)` / approx #1f1f1f): Secondary button fills, muted backgrounds, chip containers in the product app.
- **Border Ink** (`oklch(0.18 0 0)` / approx #2d2d2d): All borders and dividers. A dark-gray separation line; never a colored accent.
- **Ring** (`oklch(0.55 0 0)` / approx #888888): Focus ring color. Visible against black backgrounds; paired with 3px ring offset.
- **Destructive Red** (`oklch(0.577 0.245 27.325)` / approx #e03316): Error states, destructive actions only. The one chromatic exception in the palette. Never decorative.

### Named Rules
**The Photo Accent Rule.** There is no accent color. Photography provides all chromatic life. Do not introduce a brand accent color, a highlight hue, or any tint outside this palette. The vibrancy of the city is in the images; the interface stays out of the way.

**The No-Tint Rule.** Black is `oklch(0 0 0)`. White is `oklch(0.985 0 0)`. Neither surface is warm-tinted or cool-tinted. Warmth is conveyed by brand voice and photography, not by surface color.

---

## 3. Typography

**Primary Font:** Poppins (Google Fonts, weights 400/500/600/700)
**Secondary Font:** none

**Character:** A single-family system run at extreme weights. Poppins Bold in uppercase is the loudest, most recognizable voice - authoritative without being ornate. Regular weight handles body copy without introducing a separate humanist or serif, keeping the system deliberately unified and utilitarian.

### Hierarchy
- **Display** (700, clamp(2.5rem–5rem), line-height 1, tracking -0.025em, UPPERCASE): Hero headings only. Always rendered inside a label chip (filled background block). Scale is aggressive; never exceed 5rem. Used on marketing hero and major section titles.
- **Headline** (700, clamp(1.75rem–3rem), line-height 1.1, tracking -0.02em, UPPERCASE): Section headings on marketing pages. Also rendered inside label chips. On white sections: chip is black-filled. On black sections: chip is white-filled.
- **Title** (700, 1.25rem, line-height 1.15, tracking -0.01em, UPPERCASE): Sub-headings, card titles, step labels. May appear as label chips or as plain inline text depending on context.
- **Body** (400, 1rem, line-height 1.6, tracking normal): All descriptive prose. White at 80% opacity (`text-white/80`) on black backgrounds for slightly lower hierarchy than headings. Cap at 65-75ch per line.
- **Label** (700, 0.875rem, line-height 1, tracking -0.01em, UPPERCASE): UI labels, navigation items, metadata chips (step numbers like "01", "02", "03"), badge text. The smallest application of the stamp motif.

### Named Rules
**The Stamp Rule.** Headings are not typeset freely - they are rendered as filled rectangular blocks. Every display- and headline-level heading must use the label chip pattern: `display: inline-block; padding: 4px 8px; background: [contrast color]; color: [base color]; line-height: 1`. This is the defining visual motif of the system. Never place a large heading as bare floating text.

**The One Family Rule.** Poppins only. Do not introduce a display serif, a secondary sans, or a monospace pairing. The system's voice is singular. Variation comes from weight and scale, not from mixing typefaces.

---

## 4. Elevation

This system is flat. There are no shadows for spatial depth. Depth is achieved exclusively through background alternation - sections shift between Pressroom Black and Paper White to create rhythm and hierarchy without any z-axis simulation.

The product app (business dashboard) has one exception: `shadow-sm` is applied to Card components from the shared UI library. This is a residual shadow from the shadcn base layer - it is functionally negligible at the near-black surface color and may be removed in a future pass.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Do not introduce box-shadows, drop-shadows, or backdrop-filters for decorative depth. If hierarchy is needed between two surfaces, use background color (Raised Surface vs. base) or a Border Ink border, not a shadow.

---

## 5. Components

### Buttons

The button inherits the stamp aesthetic: sharp edges, no radius, immediate.

- **Shape:** No border radius (0rem). Square-cornered everywhere.
- **Primary:** Paper White background (`oklch(0.985 0 0)`), Pressroom Black text. Padding 12px 24px (default), 24px all sides (CTA/hero size). Font: Poppins 600, tracking-wide, uppercase in hero contexts.
- **Hover:** Background at 90% opacity. No scale, no lift, no shadow. The change is color-only, consistent with the flat doctrine.
- **Focus:** 2px ring in Ring color (`oklch(0.55 0 0)`), 2px offset. No outline border-shift.
- **Destructive:** Destructive Red background, Paper White text. Same shape and padding as primary.
- **Secondary/Ghost:** Secondary Surface background (`oklch(0.13 0 0)`), Paper White text. Used in the product app for lower-hierarchy actions.
- **Disabled:** 50% opacity on any variant. No pointer events.

### Label Chip (Signature Component)

The most distinctive element of the system. A rectangular filled text block that functions as a heading, label, step marker, or section identifier. Every major heading on the marketing site is a label chip.

- **On black backgrounds:** Paper White fill (`oklch(0.985 0 0)`), Pressroom Black text
- **On white backgrounds:** Pressroom Black fill (`oklch(0 0 0)`), Paper White text
- **Padding:** 4px top/bottom, 8px left/right (`px-2 py-1` in Tailwind)
- **Typography:** Poppins 700, uppercase, line-height 1, tracking -0.01em
- **Sizes:** 14px (step labels/metadata), 19-28px (titles), 28-48px (headlines), 40-80px (display). Always `display: inline-block; width: fit-content`.
- **Never** give a label chip a border radius, a drop shadow, or a gradient fill. It is a stamp: flat, sharp, decisive.

### Cards / Containers

Used in the product app (business dashboard), not on the marketing site.

- **Corner Style:** No radius (0rem). Sharp-edged.
- **Background:** Raised Surface (`oklch(0.07 0 0)`). Distinguishable from the base black without introducing a tint.
- **Border:** Border Ink (`oklch(0.18 0 0)`), 1px.
- **Elevation:** Flat by default. The `shadow-sm` from the shadcn base is present but visually inert.
- **Internal Padding:** 24px (py-6 / px-6).

### Inputs / Fields

Used in the business app and auth forms.

- **Style:** Near-transparent dark fill (`oklch(0.18 0 0)` at 30% / `bg-input/30`). 1px border in Border Ink. No radius.
- **Focus:** 3px ring in Ring color, border shifts to ring color. Consistent with button focus treatment.
- **Placeholder:** Muted foreground (Dim Ink, `oklch(0.65 0 0)`). Must hit 4.5:1 contrast - verify against the input background.
- **Error:** Border shifts to Destructive Red. 20% opacity ring in destructive color.
- **Disabled:** 50% opacity, no pointer events.

### Navigation

- **Marketing site:** Full-width top navigation with logo left and CTA or auth link right. Black background. Paper White logo SVG. Transparent or black at scroll.
- **Business app:** `container-app` (87.5% width, capped at 980px) navbar. Logo link left, avatar/menu right. Border-bottom in Border Ink separates from page content. Avatar is a circular white element (the only circular element in the system - an intentional exception for identity representation) showing user initial.
- **Active/Hover states:** Subdued; no underlines, no animated indicators. The system prioritises content over navigation decoration.

---

## 6. Do's and Don'ts

### Do:
- **Do** render all display and headline text as filled label chips - `display: inline-block; width: fit-content; padding: 4px 8px; background: [contrast color]; line-height: 1`. This is non-negotiable.
- **Do** keep all border radii at 0rem. Every element is a stamp, a tag, a sticker - never rounded.
- **Do** use real, locally-shot photography as the only source of colour. Let images carry the chromatic weight; keep the interface monochrome.
- **Do** maintain WCAG 2.1 AA contrast (4.5:1 for body text, 3:1 for large text) at all times. The black/white palette makes this achievable without compromise.
- **Do** include `@media (prefers-reduced-motion: reduce)` overrides on all animations. The global CSS handles it; do not skip it in component-scoped styles.
- **Do** use Pressroom Black and Paper White as literal surface backgrounds. Alternating sections between the two creates rhythm without any additional tooling.
- **Do** keep tone direct, punchy, and lowercase-or-uppercase only - never mixed case for headings.

### Don't:
- **Don't** use any warm-tinted or cool-tinted surface background. The AI SaaS cream/sand aesthetic - any `oklch(L C H)` with chroma > 0.01 toward warm or cool on background surfaces - is explicitly prohibited. If the brief says "warm", the warmth comes from photography, not from a sand-colored `bg`.
- **Don't** introduce any colour outside the Pressroom Black / Paper White / Destructive Red palette. No brand accent. No highlight hue. No chart colour on UI elements. Photography provides all chromatic life.
- **Don't** use border-radius anywhere. `rounded-sm`, `rounded-md`, `rounded-lg` are all wrong for this system. The only exceptions are avatar circles for user identity.
- **Don't** use box-shadows, drop-shadows, backdrop-filters, or glassmorphism for depth or decoration. Flat-by-default is the rule.
- **Don't** use gradient text (`background-clip: text` + gradient). Never. Single solid color only.
- **Don't** use side-stripe borders (`border-left` > 1px as colored accent on cards or list items). Use a full border in Border Ink or a background tint.
- **Don't** use the FAANG / Google / Microsoft product UI aesthetic - no Material Design motion, no Fluent surfaces, no overengineered hover cards with secondary actions.
- **Don't** use stock photography. Real, local, unfiltered images of the city only.
- **Don't** write headings as free-floating bare text at display scale. No heading without the stamp treatment.
- **Don't** add a second typeface. Poppins in multiple weights handles the full hierarchy.
