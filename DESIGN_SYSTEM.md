# Ultimate Design Engineering & Anti-Slop System

The design standard for Rune Script — both for **the app's own UI** (what we build)
and for **the AI's site generation** (what Runescript builds for users). The whole
point: stop producing generic "AI slop" and generate genuinely premium design, so
great generation complements the uploaded template library instead of depending on it.

## How it's wired
- **AI site generation:** the operational, vanilla-HTML translation of the rules
  below lives as `DESIGN_SYSTEM_PROMPT` in `src/App.jsx` and is prepended to every
  page-build and page-modify prompt in the Site Builder. (Runescript outputs one
  self-contained HTML doc with an inline `<style>` block — no Tailwind — so the
  in-app version restates Tailwind-specific rules like `tracking-wider` as their
  CSS equivalents: `letter-spacing`, `font-variant-numeric: tabular-nums`,
  `text-wrap: balance`, `scrollbar-gutter: stable`, etc.)
- **Our own work on the app:** these are the rules to follow when building or
  polishing Rune Script's UI. `/polish` (§2) and the Grill Protocol (§9) are
  behaviors for the assistant, not the generation prompt.
- Keep the two in sync: if this file changes, update `DESIGN_SYSTEM_PROMPT`.

---

## 1. Motion Execution (Emil Kowalski paradigm)
- **Hardware acceleration:** animate only `transform` and `opacity`. Never transition `width`, `height`, or `margin` (layout thrashing).
- **Restrained easing:** micro-interactions under 300ms; custom cubic-beziers or damped springs, never linear.
- **Physical anchors:** ban `scale(0)` entry; scale from `0.92`–`0.95` onward.
- **Accessibility overrides:** always provide `@media (prefers-reduced-motion)` fallbacks using crossfades, not eliminating transitions.

## 2. Layout Rhythm & Typography
- **Typographic caps:** body line length ~`65ch`; never full-width prose on large viewports.
- **Numeric alignment:** `tabular-nums` on charts, grids, price matrices.
- **Spacing constraints:** proportional system steps only; no random `px`.
- **`/polish`:** when asked to polish a page, evaluate font scaling, contrast, padding, edge alignment — without touching business logic.

## 3. Anti-Slop Constraint System (taste paradigm)
- **Ban generic layouts:** no centered hero of Inter over a basic dark gradient.
- **Visual affordance:** underlines only for links; emphasize with weight/color.
- **Composition variety:** asymmetry, editorial type shifts, multi-column grids — premium-tech feel.

## 4. Interactive States & Feedback (craft layer)
- **State exhaustion:** every clickable has cohesive `:hover`, `:focus-visible`, `:active`.
- **Focus rings:** tailored dual-ring offsets in brand color, not the default outline.
- **Click elasticity:** `:active` uses subtle `scale(0.98)` or dark tint (mechanical press).

## 5. Asset & Copy Authenticity (substance layer)
- **Ban AI clichés:** no "unleash," "streamline," "empower," "seamlessly," "revolutionize," "testament" (+ elevate, unlock, supercharge, game-changer, cutting-edge). Plain, hyper-direct language.
- **Icon restraint:** icons are functional labels, not filler beside every header.
- **Background integrity:** no purple/blue ambient blurs, `backdrop-blur`, or mesh gradients. Solid structural color, crisp 1px borders, editorial tones.

## 6. Micro-Typographic Hygiene (obsessive text layer)
- **Orphan prevention:** no lone trailing word in headings — `&nbsp;` the last two words or `text-wrap: balance`.
- **Punctuation kerning:** adjust spacing around inline quotes/symbols when a heavy font causes gaps.
- **Capitalization anchors:** `uppercase` text always gets explicit letter-spacing.

## 7. Layout Integrity & Anomalies (polish layer)
- **Border-collapse elimination:** 1px grids must not double to 2px where edges meet — flex/grid balancing or negative margins.
- **Dynamic content shifting:** dynamic-text containers need structural floors/height bounds to prevent shift on toggle.
- **Scrollbar layout leaks:** prevent the 16px jump when a page goes from short to scrollable (`scrollbar-gutter: stable`).

## 8. Deterministic Loading Patterns (perception layer)
- **Ban generic spinners:** no infinite spinning wheels.
- **Deterministic skeletons:** structural, non-shimmering skeletons matching the incoming layout footprint.

## 9. Design Thinking & Pre-Flight Audits (Grill Protocol)
- **Strategic pause:** before a massive code payload for a new page/view, ask 2–3 hyper-focused questions on constraints, audience, and the core "memorability vector."
- **Component blueprinting:** map layout relationships, state flows, and responsive behavior in text/pseudocode before generating UI.

## 10. Semantic Structure & Accessibility (web-standard core)
- **Div anti-pattern:** no `<div>`/`<span>` for structural containers or actionable targets — use `<main>`, `<header>`, `<nav>`, `<article>`, `<button>`.
- **ARIA mapping:** unlabeled buttons get `aria-label`; expandable areas get `aria-expanded`.

## 11. Deflationary Bug Fixing (refactoring minimizer)
- **Delete-first debugging:** fix bugs/anomalies by removing redundant code and simplifying, before adding wrappers or hacks.
