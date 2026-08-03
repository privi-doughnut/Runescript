# Marketplace v2 — Real Templates: Architecture & Build Plan

_Started 2026-08-03. The plan for replacing the 470 metadata-only "shadow"
templates with real uploaded templates (owner aiming for ~1000), tiered by plan,
usable by the AI as design references (the anti-"AI-slop" measure)._

## The vision (from the owner)
- Upload hundreds → ~1000 real, good templates. They **replace** the shadow catalog.
- Each **plan tier gets a set number** of templates its AI can build from.
- Everything else lives in the **marketplace**: buy individually, or unlock by
  upgrading to a higher plan.
- The **AI picks** which template to build from (based on the prompt + business),
  but **only from the user's unlocked set**.
- A **manual picker**: the user can see their templates and hand-pick one for the AI.
- **Creators** can upload their own designs + connect a payment portal; **Runescript
  takes 30%** (creator keeps 70% — confirmed, matches existing code).
- Overarching goal: **kill AI-slop design** by giving the AI real references.

## What existed before this work
- `MOCK_TEMPLATES` = **470 listings with NO html** (name/category/price/fake rating/
  fake seller). Pure decoration — the "shadow templates."
- A real `templates` table + `template_sales` + working creator-submit form
  (paste HTML), 70/30 split, manual payouts. Plumbing existed; catalog was empty.
- A clean **41-category taxonomy**.
- The AI build flow generated pages **from scratch** (or from ~5 hardcoded styles)
  and **never touched the marketplace** — this is the slop source.
- "Use in Builder" buttons were **dead stubs** (navigate only, load nothing) — which
  is what kept us safe from untrusted-HTML XSS until now.

## Data model (SQL — in SUPABASE_FINAL.sql §8, needs an owner re-run)
`templates` gains: `min_tier` (cheapest plan that includes it; null = buy-only),
`is_free`, `builtin` (owner catalog vs community), `style_tags[]`, `layout`,
`industry`, `thumbnail_url`.

**Paywall + security:** template HTML (the paid asset) moved OUT of the
world-readable `templates` row into a locked `template_html` table. It is served
**only** via `get_template_html(tid)` — a `security definer` function that returns
the html only if `user_has_template(tid)` (free / owned / purchased / included in
the caller's plan tier via `tier_rank`). A non-buyer literally cannot pull paid
source, no matter what the client does. `my_unlocked_template_ids()` returns the
caller's unlocked set (ids only) for the gallery and the AI's buildable set.

## Security model for untrusted template HTML (DONE + tested)
Two display paths, two defenses:
1. **Read-only preview** → `<SandboxedPreview>`: a **cross-origin** sandbox
   (`sandbox="allow-scripts"` WITHOUT `allow-same-origin` → opaque origin). Even a
   malicious `<script>` can't reach our cookies or the Supabase session in
   localStorage. Lazy-mounts via IntersectionObserver (a 1000-card gallery won't
   spin up 1000 iframes); `scale` renders thumbnails; thumbnails default scripts-off.
2. **Loaded into the editor** → the builder iframe uses a `blob:` URL, which is
   **same-origin** (needed for inline editing via contentDocument), so isolation is
   impossible there. `sanitizeTemplateHtml()` strips `<script>`, inline `on*`
   handlers, `javascript:`/`vbscript:`/`data:text/html` URLs, `<base>`, meta-refresh,
   object/embed, and nested `srcdoc` — verified against attack payloads in a real DOM
   (13/13 checks). Original JS is preserved for export/deploy (runs on the customer's
   own domain, not ours) — only the in-app editor preview loses it. Fair trade.

## Status

### Done this pass (groundwork)
- SQL §8: unlock columns, gated `template_html`, `tier_rank` / `user_has_template` /
  `get_template_html` / `my_unlocked_template_ids`.
- `sanitizeTemplateHtml()` + `<SandboxedPreview>` + `tierRank` / `isTemplateUnlocked` /
  `unlockTierLabel` helpers.
- Marketplace **preview modal** now renders the real design in the sandbox when the
  user has it unlocked (fetched via `get_template_html`), and shows a **lock/upsell**
  overlay otherwise — never fetching locked source.
- Creator **submit form** captures `layout` + `style_tags` (feed AI selection) and
  writes html to the gated `template_html` table, not the browsable row.
- Sanitizer verified in a real DOM (13/13).

### Next (in rough order)
1. **AI two-step build** (the actual slop-killer): (a) feed the AI only the metadata
   of the user's unlocked set → it returns best-fit template id + why; (b) load that
   template's html as the base and customize copy/images to the business. Add
   `sanitizeTemplateHtml` at the editor-load boundary here.
2. **"My Templates" manual picker** page: gallery of the unlocked set (SandboxedPreview
   thumbnails); selecting one pins it as the base for the next AI build.
3. **Wire the real "Use in Builder"** path (currently stubs) → sanitized load.
4. **Tier allocations** — assign `min_tier` across the catalog on import. Proposed:
   Seeker ~15 · Scribe ~75 · Archon ~250 · Sovereign ~600 · Warden = all + early access.
5. **Retire `MOCK_TEMPLATES`** once real templates are imported (keep as fallback until
   the catalog is populated so Browse is never empty).
6. **Creator payouts = Stripe Connect** (30% platform fee via `application_fee`) —
   depends on owner's Stripe (parked). Payouts stay manual until then, as today.
7. **Thumbnails** — owner isn't supplying them. Two-tier: if `thumbnail_url` is set
   (server screenshot via Cloudflare Browser Rendering — OWNER_TODO), the public
   gallery shows the image (source never ships); until then, unlocked templates show
   live sandboxed previews and locked ones show styled placeholders (no leak).

## Owner actions
- **Re-run `SUPABASE_FINAL.sql`** (idempotent) to apply §8 before real templates land.
- (Optional) Enable **Cloudflare Browser Rendering** for server-side thumbnails —
  see OWNER_TODO. Until then the gallery degrades gracefully (no source leak).
- Stripe Connect setup when ready (creator payouts).
