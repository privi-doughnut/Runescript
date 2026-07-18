# Rune Script — Progress Report

_Last updated: 2026-07-18 (third session — final code phase: Creator Program, email sequences, creator earnings, all backend-wired and live)_

## This session: finish backend-dependent features, verified in a real browser throughout

Goal: get every remaining feature that needs code (not owner dashboard access) fully working, so what's left after this session is a clean, ordered list of owner-only tasks. Every feature below was clicked in a real running browser (Node 22 + Vite + Playwright/Chromium), not verified by code review alone — same standard as last session, continued.

Three features needed new Supabase tables. Since this session only has the anon key (no schema-modification access), all required SQL was written into `SUPABASE_FINAL.sql` at the repo root — idempotent, safe to run multiple times. **The owner needs to run this in the Supabase SQL Editor** before these features have any data to work with. Every feature was built to fail gracefully (a clear toast/error message, not a white screen or silent no-op) until that SQL is run — and this was verified directly: the exact "has SUPABASE_FINAL.sql been run yet?" messages were confirmed to appear via real network responses (missing-table Postgres errors), with no crashes.

## Phase 1 — Creator Program (shipped)

The application form was previously frontend-only (`setApplied(true)` and nothing else). Now:
- Applications save to Supabase (`creator_applications`).
- The owner gets a notification email via the existing Resend `/send-email` Worker endpoint.
- An admin panel (gated by `user.email === OWNER_EMAIL`) lists all applications with Approve/Reject actions.
- Approving an Archon/Sovereign application sets `comp_plan` on the applicant's `profiles` row — no Stripe subscription manipulation, just a flag the app already respects.

**Necessary fix found while wiring `comp_plan` through:** returning users always showed as free "Apprentice" regardless of what they'd actually paid for or been comped. Three compounding bugs: `checkTrial()` (which resolves plan/trial/comp status) was written but never called from anywhere; a stale `localStorage`-cache `setUser` call in the app's bootstrap effect was racing against and sometimes overwriting the real Supabase-fetched user; and Supabase query errors were being silently swallowed (`{data}` destructured without checking `{error}`, so a failing query returned `null` without throwing). Fixed all three and verified with a Playwright test: set a plan via REST using a real signed-up user's own session token, reload, confirm Settings shows the correct plan.

## Phase 2 — Email sequence scheduler (shipped)

The existing "Email Sequence Builder" only generated AI copy for a one-off outreach sequence — no persistence, no actual sending. Now:
- Generated sequences can be saved (`email_sequences`/`sequence_steps`) and auto-enroll the target prospect (`sequence_enrollments`/`sequence_sends`, with per-step send times computed from each step's day offset).
- A "Saved Sequences" panel lists a user's sequences and lets them enroll additional prospects into an existing one.
- **Real gap found and fixed:** prospects in this app never carry an email address anywhere in the data model (verified via a full-file search — only Invoices/Proposals work around this today, with a `window.prompt()` at send time). Enrollment now does the same thing, rather than silently being unusable for every real prospect.
- Sending is handled by a new `scheduled()` handler on the Worker (Cloudflare Cron Trigger, configured directly via the Cloudflare API since wrangler can't run here — confirmed live, firing every 15 minutes) that queries due, unsent `sequence_sends` using a service-role key and sends via Resend, idempotently. A matching `/process-sequences` HTTP endpoint does the identical work as a fallback, fired fire-and-forget on every app load in case the Cron Trigger ever proves unreliable.
- Also added "Email Sequences" to the Cmd+K command palette — it was missing entirely, a real discoverability gap found while trying to navigate to the page myself to test it.

**Still needs from the owner:** the `SUPABASE_SERVICE_ROLE_KEY` Cloudflare secret. Without it, `/process-sequences` and the cron handler both correctly no-op (`{skipped: true, reason: "..."}`) rather than erroring — confirmed live — but no emails will actually send until that secret is set.

## Phase 3 — Creator earnings backend (shipped, live-deployed)

Marketplace's "Submit a Template" only pushed to local component state before — it vanished on reload and no other user could ever see or buy it, so there was no real seller to ever pay a cut to. Now:
- A real `templates` table makes creator submissions persist and actually be browsable/buyable by other users, alongside the existing built-in catalog.
- "Buy" goes through real Stripe Checkout (new `/create-template-checkout` Worker endpoint, same inline-price pattern as the existing `/create-invoice-payment`) instead of an instant fake client-side purchase. On return, the session is verified via `/check-session` and a real `template_sales` row is recorded with a 70% `creator_cut` for creator-submitted templates (0 for the built-in catalog, which has no real seller).
- Every hardcoded `$0`/`0` stat (Marketplace's Earnings tab, Creator Program's stats bar) now runs a real query.
- **Fixed a pre-existing inconsistency:** Marketplace's copy claimed an 80% creator share while Creator Program's stats label said 70%. Standardized on 70% per this phase's spec.
- Stripe Connect automated payouts were out of scope for one session (real onboarding/KYC/webhook work) — the UI is explicit that payouts are "manual for now" rather than faking automation.

**Live-verified, not just code-reviewed:** deployed the updated Worker via the Cloudflare API (all 9 existing secret bindings confirmed intact afterward), then created a real `$1` live Stripe Checkout session end-to-end via curl — got back a genuine `checkout.stripe.com` URL with correctly round-tripped metadata via `/check-session`. Not completed, no charge. Browser-verified the full click-to-redirect path separately (the live Worker call itself is CORS-blocked from `localhost` by design — same restriction that already covers AI generation, not something introduced this session or something I changed).

## Phase 4 — Regression pass + remaining loose ends

Re-verified last session's fixes still hold after all the Phase 1–3 changes: Agency OS and AI Studio both load with zero console errors, the onboarding slideshow still appears on signup, the dashboard shows exactly one greeting, all 470 Marketplace template IDs remain unique (no regression), and global search still returns real matches against real data.

Confirmed the section editor's drag-and-drop is genuinely functional, not just present in code — tested with real mouse-drag events in a browser and watched two sections actually swap order. Duplicate/delete/Add Section controls are all there. The e-commerce Shop section is confirmed present in the Add Section palette with its documented CORS caveat (works on `runescript.netlify.app`/`*.netlify.app`; a customer's own domain needs to be added to `ALLOWED_ORIGINS` first — deliberately not touched, it's a production security setting).

Capacitor mobile wrapper: confirmed the `capacitor-mobile-wrapper` branch still exists, unmerged, and has now diverged significantly from `main` (main gained ~700 lines of `App.jsx` changes across this session). Not touched further — still needs Xcode/Android Studio, which this environment doesn't have.

## Deploy verification

- Compiled clean (0 esbuild errors) and zero duplicate function names after every edit, throughout.
- **Clicked through all 26 pages** in the app (via the mobile nav, which lists every route) in a real browser after all changes: zero blank screens, zero JS console errors.
- Worker deployed via the Cloudflare API (owner provided a fresh scoped token mid-session) — verified all 9 secret bindings survived, and the new endpoints (`/create-template-checkout`, `/check-session` with metadata, `/process-sequences`) all respond correctly live, not as "not configured" 500s.
- Configured the Cron Trigger schedule (`*/15 * * * *`) via the Cloudflare API — confirmed via `/schedules`, and documented in `wrangler.toml` for reference even though wrangler itself can't run in this environment.
- `public/sw.js` still doesn't exist (unchanged from last session — registration fails silently, no offline caching, harmless) — nothing to bump.

## Deploy infrastructure notes

- Netlify build credits are still limited per the owner — all of this session's commits were made locally throughout and pushed to `main` in one batch at the end of the session, not per-commit.
- Worker deploys (Cloudflare API, separate from Netlify) are unaffected by Netlify's credit situation either way, and are confirmed live for every change that touched `index.js` this session.

## Owner-only tasks

See `OWNER_TODO.md` for the full, ordered checklist (unblocking items first). Short version: run `SUPABASE_FINAL.sql`, add the `SUPABASE_SERVICE_ROLE_KEY` Cloudflare secret, fix the GitHub OAuth redirect allowlist, confirm Netlify has rebuilt, test one real small Stripe payment + refund.

## Honest completion assessment

All three backend-dependent features (Creator Program, email sequence scheduler, creator earnings) are fully code-complete and live-deployed, gracefully degrading everywhere the Supabase tables don't exist yet. They will start actually storing/sending real data the moment the owner runs the SQL — no further coding needed for the golden path. The one real gap: Stripe Connect automated payouts were explicitly scoped out (documented as "manual for now" rather than half-built), consistent with the instruction to document rather than fake automation when something is genuinely too large for one session.
