# Rune Script — Progress Report

_Last updated: 2026-07-15_

## Shipped this session

### Phase 1 — Verify & sync
- Confirmed `App.jsx` compiled clean, `supabase.js` intact.
- Local `main` was 2 commits behind `origin/main` (someone had uploaded `CLAUDE.md` and deleted `README.md` directly on GitHub) — fast-forwarded, no conflicts.

### Phase 2 — Multi-tier Stripe checkout
- Generalized `/create-trial-checkout` to accept a `tier` and route to the correct price. Archon keeps its 30-day trial; Seeker/Scribe/Sovereign/Warden are plain subscriptions.
- Fixed a **pre-existing production outage**, unrelated to this feature: the live Worker referenced `STRIPE_SECRET_KEY` / `ANTHROPIC_API_KEY` / `RESEND_API_KEY` / `GOOGLE_CLIENT_SECRET`, but the actual bound secrets are named `RUNESCRIPT_STRIPE_API_KEY` / `RUNESCRIPT_API_KEY` / `RUNESCRIPT(RESEND)_API_KEY` / `RUNESCRIPT_GOOGLE_CLIENT_SECRET`. Stripe, Claude, email, and Google auth were all returning 500 before this fix.
- Fixed a second bug found in the same area: the post-checkout return handler hardcoded every successful purchase to `plan: 'archon_trial'` regardless of what was actually bought. Now reads the tier back from the redirect and sets the correct plan.
- Verified live: all 5 tiers return real `cs_live_...` checkout sessions.

### Phase 3 — Favicons
- CLAUDE.md claimed a correct `site.webmanifest` already existed — it didn't (never existed in git history). Downloaded all 6 real favicon files, authored `site.webmanifest` from scratch matching the app's theme color.

### Phase 4 — Nice-to-haves
- **Marketplace preview modal / ratings**: turned out to already be fully working. The bug report was likely caused by a dead, confusingly-named `previewTpl` state variable sitting unused next to the real (working) `previewTmpl`. Removed the dead one.
- **Invoice payment links**: new Worker endpoint `/create-invoice-payment` (one-time Stripe Checkout via inline `price_data`, no pre-created Price needed) + a "Pay Link" button on unpaid invoices that copies the generated link to clipboard.
- **In-app plan switcher**: the code-side wiring already existed. What was actually missing was Stripe account configuration — the Billing Portal had `subscription_update` "enabled" but no `products` allowlist, so there was nothing to switch to. Configured all 5 tiers as switch targets directly via the Stripe API.
- **Email sequence scheduler**: skipped. See "Skipped" below.

### Phase 5 — Ambitious builds
- **AI ad copy generator**: already existed in AI Studio. Extended the prompt to include targeting/audience suggestions (per the original ask) and added a "text only, no image/video" label.
- **Drag-and-drop Site Builder**: shipped a basic version. Pages are stored as opaque AI-generated HTML strings, not structured section data, so this works by parsing top-level `<body>` children via `DOMParser`, showing them as a draggable list, and reassembling the HTML on save (head/styles untouched). New opt-in button + modal — doesn't touch the existing chat-based generation path.
- **Capacitor mobile wrapper**: skipped. See "Skipped" below.

## Skipped, and why

1. **Email sequence scheduler.** Real scheduling needs somewhere to persist "which day of the sequence is this contact on." The only real backend available is Supabase, and the Supabase project is currently **paused** (see Owner Tasks below). Building this against an unreachable database would mean shipping unverified, untestable code — skipped cleanly rather than guess.

2. **Capacitor mobile wrapper.** Hard-blocked: `npx @capacitor/cli` refuses to run — `The Capacitor CLI requires NodeJS >=22.0.0`, and this machine has Node v11.11.0 (from 2019). Even if that weren't true, actually building/testing a native app shell needs Xcode and Android Studio, neither of which I have any way to verify or use here. Confirmed the version block empirically before deciding to skip rather than assuming.

## A significant environment limitation (affects future sessions too)

This machine's tooling is very stale — **Node v11.11.0** (installed March 2019) and a **broken Homebrew** install. This blocked more than one thing this session:

- `npx wrangler deploy` doesn't work at all (`workerd` binary fails to load, plus the CLI itself can't parse its own modern JS). I worked around this by calling Cloudflare's REST API directly with `curl` and a scoped API token instead.
- `npx vite` (the actual dev server) **also fails to start** — `Unexpected token {`. This means **I could not launch the app in a real browser this session**, for anything. Every UI change (Phase 4/5 items) was verified by careful manual code tracing and static compile-checking, not by actually clicking through it. That's a real gap — please click through the Marketplace preview modal, the invoice Pay Link flow, and the new Site Builder section reorder feature on the live site when you get a chance, since none of them got a real runtime test.
- Any future session on this same machine will hit the same wall for anything requiring modern Node tooling (Capacitor, newer testing frameworks, etc.) until Node is upgraded.

## Owner-only tasks (unchanged from original list, still pending)

- Resume the paused Supabase project (supabase.com dashboard) — also now a blocker for the email sequence scheduler above.
- Submit the Google OAuth app for verification (needs privacy policy, homepage, demo video).
- Test live Stripe checkout with a real card + immediate refund — **now more important than before**, since checkout is wired for all 5 tiers, not just Archon. Worth testing at least one non-Archon tier too, since that code path is newer.
- Purchase runescript.app domain if desired.
- Consider upgrading Node on this machine (18+ minimum, 22+ for Capacitor) if you want `wrangler`/`vite`/`capacitor` to work locally again — I did not touch this myself since it's a system-level change outside this repo.

## Honest completion assessment

Everything in the original 6-phase list was attempted; two items were skipped for concrete, verifiable reasons (not scope fatigue) and documented above rather than silently dropped. The multi-tier Stripe checkout was the highest-priority item and is fully live and tested. The biggest residual risk is the untested-in-browser UI work from Phases 4–5 (Marketplace modal cleanup, invoice Pay Link, section reorder) — the code is sound by careful review and compiles clean, but "compiles clean" isn't the same as "works when clicked," and I want that gap on the record rather than glossed over.

I'd call this roughly **90-95% of the original ask complete**, with the remaining gap being: the two explicitly-skipped items (both blocked by things outside this session's control), and real-browser verification of the newest UI additions.
