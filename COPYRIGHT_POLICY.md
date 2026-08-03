# Copyright & Licensing Policy — Rune Script Marketplace

_Owner directive (2026-08-03): "make sure that we follow copyright and creative
commons limitations. I don't want to steal another designer's work." This policy
is a hard rule, not a guideline. It protects Rune Script legally and protects the
designers whose work we learn from._

## The one line that matters
**We do not resell other people's work.** Every asset listed or sold in the
marketplace — full template or mini-feature/component — must be **either**:
1. **Original** — authored fresh by us, the AI generator, or the submitting
   creator (their own work), **or**
2. **Under a license that explicitly permits redistribution/resale** — CC0,
   CC-BY, CC-BY-SA, MIT, Apache-2.0, BSD-3-Clause, or an asset for which the
   owner has **purchased redistribution rights** (`owner-licensed`).

Anything that is proprietary / all-rights-reserved / another creator's paid
component **cannot be listed** — there is no valid license value to select for it
(that's the enforced guardrail, see `SUPABASE_FINAL.sql` §9).

## The crucial distinction: DNA vs. expression
This is what makes the "learn from the libraries" strategy legal:

- **Design patterns, techniques, and ideas are NOT copyrightable.** Studying how
  the best sites handle a sticky nav, a pricing table, motion easing, or layout
  rhythm — and then **writing our own clean implementation** — is legitimate and
  is the core of our generation strategy. This is "extracting the DNA."
- **A specific creator's expression IS copyrightable.** Copy-pasting a particular
  component's code/markup/exact visual design and selling it is infringement,
  even if you rename it.

Rule of thumb: **we take the lesson, not the file.** Everything that lands in the
marketplace as a sellable asset is a fresh, original implementation (or properly
licensed), never a lifted copy.

## Sourced libraries — how each may be used
The owner has sourced: 21st.dev (MCP), shadcn / skiper-ui, Spline, motion-ai,
ui-ux-pro-max skill (MIT). Treat them as **references and tools for us**, not as
inventory to copy:
- **ui-ux-pro-max skill — MIT.** Free to use as a design-intelligence tool.
- **shadcn/ui — MIT.** Its primitives may be reimplemented/adapted; but
  **skiper-ui** and other third-party registry components have their **own**
  licenses — check each before using its code, and never resell it as-is.
- **21st.dev components** — creators on 21st retain rights; many are for use in
  *your own* projects, **not** for repackaging into a competing marketplace.
  Use 21st as inspiration/tooling to help *us author originals*, not as a source
  to copy sellable assets from.
- **Spline** — the `react-spline` / viewer libraries are MIT, but **3D scenes
  belong to whoever made them.** Only embed scenes we created or that are
  CC0/CC-licensed for reuse.
- **motion-ai** — a tool to help author motion; its output we write is ours.

## What we record on every asset (enforced in the schema)
- `license` — one of the allow-listed redistributable licenses (or the listing is
  blocked).
- `license_source_url` — provenance/audit trail if a pattern was reference-derived.
- `attribution` — the credit line, **required** for CC-BY / CC-BY-SA (legally
  mandatory) and shown to buyers.

## For creator submissions
The submit form requires the creator to pick a license and attest that the work
is theirs or properly licensed. We surface this policy at submission. When Stripe
Connect payouts go live, this attestation is also our basis for a takedown/refund
if an asset is later found to be infringing.

## For AI-generated components
When the generator produces a mini-feature for the database, it is `original` by
construction — a fresh implementation of a common pattern. It must not reproduce a
specific third-party component verbatim.
