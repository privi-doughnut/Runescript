# Rune Script — Progress Report

_Last updated: 2026-07-24 (fifth session — roadmap audit, SQL activated, honesty pass on stats + pricing)_

---

## Fifth session (2026-07-24/25): SQL activated, honesty pass, Option-C builds

- **SUPABASE_FINAL.sql ran successfully** (owner). Fixed an idempotency trap
  first (a pre-existing older `referrals` table needed explicit
  `add column if not exists` guards). Verified live: Creator Program
  applications submit and Affiliate handles save against the real tables.
- **Roadmap + Changelog audited** for honesty; added the `feature_requests`
  table so the community board works.
- **Landing stats** replaced (fabricated usage numbers → real product-capability
  stats). **Dead legal-contact button** fixed (had no handler + dead domain).
- **Option C — building the buildable-now backlog** (before trimming pricing).
  Built this session:
  - 10 self-contained client-site sections added to the Site Builder palette:
    FAQ, Team, Menu, Booking, Newsletter, Map, Video, Loyalty, Stats, Live Chat.
  - AI review-response drafts (per real Google review, in prospect details).
  - AI Client Health Score / churn prediction (CRM drawer).
  - **Unlocked 10 built-but-hidden AI Studio tools** (sidebar showed 7 of 17)
    and added 4 more (Local SEO Audit, Customer Personas, Survey Builder, Call
    Summarizer) → **AI Studio now exposes 21 tools**.
  - Real PageSpeed / Core Web Vitals speed test in the Site Analyzer (replaced
    an AI *guess* with real Lighthouse measurement; optional key field added).
  - Lead Predictor — AI "Prioritize My Pipeline" in the CRM.
  - Lead-score transparency: why-hover in CRM (table/kanban/drawer) + a
    dismissible scoring note on Scanner and CRM.
  - Confirmed client code export already existed (Download All / Clone / per-page).
  - Fixed real bugs: CRM Table-view rows didn't open the detail drawer;
    the "17 tools" claim was false (only 7 reachable).

### Owner-action items noted this session (for the end-of-build batch)
- **Stripe** still parked — everything Stripe (Connect payouts, subscription
  billing on client sites, e-signature+payment, multi-currency, abandoned cart)
  waits on Stripe setup.
- Landing/pricing **honesty flags**: pricing tiers still list many not-yet-built
  features (see backlog below). Per owner: build everything buildable first,
  THEN trim/adjust pricing near launch. Don't trim yet.
- Client-site sections that post via `mailto:you@example.com` use a placeholder
  address — fine as a template default (the agency edits it per client), just
  noting it's intentional.
- **PageSpeed** speed test now routes through the Worker's `/pagespeed` proxy so
  the key is a **shared Cloudflare secret** (`PAGESPEED_API_KEY`) that works for
  ALL users at once — NOT a per-user Settings field (that only affects one
  browser; corrected this after the owner asked whether Settings propagates —
  it does not). Owner action: enable the PageSpeed Insights API + add the
  `PAGESPEED_API_KEY` Cloudflare secret. Reliable + secure (key never exposed
  client-side, unlike the hardcoded Places key). Degrades gracefully off the
  free shared quota until then. See OWNER_TODO #10.
  - Note for later review: this same "shared Cloudflare secret via Worker proxy"
    pattern is the *correct* way to add any future shared API key — better than
    hardcoding it client-side like the Places key (which is extractable and only
    safe because it's referrer-restricted). Worth migrating the Places key to
    this pattern eventually too.

---

## Pay-list completion estimate (2026-07-25)

Honest estimate of how much of the ~200-item pricing-tier feature list is
achievable, so expectations stay grounded:

- **~15% already built** (were listed as if pending — see "Already built" below).
- **~30–35% buildable solo, no blockers** (AI generators, client-site sections,
  PageSpeed/Core Web Vitals, live chat, reporting, health/lead scoring, etc.).
- **~15% buildable but need owner account/service setup** (Stripe features,
  Twilio voicemail/SMS, heatmap embeds) — buildable once those accounts exist.
- **~25% large, dedicated multi-session builds** (real-time collaboration,
  teams/seats/roles, white-label + reseller, full public API, finishing the
  mobile app, no-SQL database builder) — each deserves its own focused session.
- **~5% not honestly buildable** (LinkedIn scraping — ToS/blocking).

**Net: ~60–70% end-to-end achievable if the owner handles the account setups,
or ~50% purely on my own before any owner action.** The remaining ~30% are the
big-rock builds above. Strategy: build the self-contained majority first
(in progress), then the account-dependent ones once setups are done, then
scope the big rocks individually. Trim/adjust pricing near launch, not before.

---

## Feature backlog captured from the pricing tiers (2026-07-24)

The pricing tiers historically listed ~200 features, most aspirational/not-built.
Before trimming the pricing page down to what's actually live, capturing the
full set here so nothing is forgotten — grouped by buildability. This is the
product roadmap backlog.

### Already built (were listed as if pending — they exist today)
AI case study generator, press release generator, AI pricing suggester, brand
voice analyzer, time tracking, referral tracking, revenue-sharing on template
sales (creator earnings), invoicing, contract generator, client intake form
generator, proposal generator, CSV export, Google Business Profile optimizer,
ad copy generator, SEO content/blog generator, review-response drafts,
Marketplace buy/sell + earnings, e-commerce Shop section (products/cart/
checkout), appointment/booking widget, section editor (drag-drop reorder +
inline text/image edit), GitHub deploy, AI Call Coach, competitor/site
analyzer, client portal (view), email sequences, creator program, affiliate
program.

### Cleanly buildable now — no external account needed
- Lead predictor (AI scores the CRM pipeline on a schedule)
- Site performance dashboard + Core Web Vitals (Google PageSpeed Insights API — free)
- Automated monthly site-health reports (cron + PageSpeed + Resend email)
- Local SEO optimization tool (AI over the business's data)
- Review monitoring (Google Places reviews we already fetch) + AI response drafts
- Live chat widget (embeddable on client sites, same pattern as the booking widget)
- AI chatbot per site / 24-7 conversation AI for client sites (embeddable widget + Claude proxy)
- Client-facing code export (we already generate the HTML — add a download)
- Automated client reporting / multi-client financial reporting (aggregate existing data)
- Client health score — AI predicts churn (AI over CRM status/activity)
- Client persona builder, survey builder, digital forms/waivers (generators)
- AEO / schema markup generator, ADA compliance checker, speed optimizer (AI passes)
- Phone/email finder & social presence check (best-effort; honest about coverage — NOT LinkedIn scraping)
- Meeting scheduler, project management + milestones (local data features)
- Loyalty/rewards, gift cards, coupons on client sites (site sections/widgets)
- Restaurant/fitness/hotel/event/course industry tool packs (site templates + sections)
- Staging environment, version history, automatic backups (localStorage/Supabase snapshots)

### Buildable but need an owner account / paid service
- Voicemail drop, SMS outreach automation → Twilio (+ a ringless-voicemail vendor)
- Heatmap integration → Microsoft Clarity or Hotjar embed (owner signs up)
- Subscription billing on client sites, multi-currency e-commerce, e-signature +
  instant payment, abandoned-cart recovery, POS, subscription boxes → Stripe (parked
  until Stripe is set up)
- Cold email warm-up, full SMS+email outreach automation → email/SMS infra + warmup service
- AI model selector (GPT-4o, Gemini), bring-your-own-API-key → those providers' keys
- Directory auto-submission, multichannel selling (Amazon/eBay/FB/IG), dropshipping,
  print-on-demand → each is a third-party integration/marketplace API
- AI video maker / AI pitch video → a video-generation API
- Uptime monitoring, SSL management → an uptime service / cert automation
- Google Ads / Facebook+Instagram ads generators can be built (copy), but *placing*
  ads needs those ad platforms' APIs + the owner's ad accounts

### Large — need a dedicated build (not a bolt-on)
- Real-time collaboration / simultaneous editors → Supabase Realtime + conflict handling
- Teams: multiple seats, roles & permissions, sub-accounts → multi-user/org data model + auth work
- Reseller program / white-label (own domain, rebranded editor & reports & mobile builder)
  → theming layer + tenant model + custom-domain routing
- Full API access + custom integrations (Enterprise) → a public API surface
- Database builder (no-SQL) / user-auth builder for client sites → substantial builders
- Wix-style free-form drag-drop page editor (beyond today's section editor)
- Mobile app builder (Capacitor scaffold exists on a branch; needs Xcode/Android Studio to finish)
- Agentic autonomous build mode

### Recommend dropping / rewording (not honestly buildable)
- "LinkedIn owner scraping" / "LinkedIn-informed pitches": LinkedIn actively blocks
  scraping and it violates their ToS. Reword to a general "owner/contact research"
  (best-effort public data) or drop.

---

## Fourth session (2026-07-21 / 07-22): infrastructure move + Scanner overhaul

### Hosting moved from Netlify to Cloudflare (one Worker serves everything)
The whole site now runs on a single Cloudflare Worker, `runescript` (`https://runescript.its-the-prithivi-show.workers.dev`), that serves BOTH the built frontend (static assets from `dist/`, via `wrangler.toml`'s `[assets]` block) AND the API routes in `index.js`. The owner connected it to the GitHub repo via Cloudflare Workers Builds, so **a plain `git push` to `main` is now the entire deploy** — Cloudflare runs `npm run build` and ships frontend + backend together, automatically. This replaced both Netlify (frontend) and the old manual curl-based Worker deploy. `netlify.toml` is now vestigial; `wrangler.toml` is the real, live deploy config. See CLAUDE.md for the full story, including a brief mid-session rename detour (`runescript` → `runescript-worker` → back to `runescript`).

### Critical bug: every AI feature was broken after the move (`/api/claude` route collision)
Once the Worker started serving the frontend, `/` resolved to `index.html` at the assets layer for *every* HTTP method before the fetch handler ran. The Claude API proxy was mounted at `/`, so every POST/preflight to it got a bare 405 from the assets layer — silently breaking Prospect Scanner, Pitch Generator, AI Studio, Site Builder, everything that routes through `callClaude()`. This was the root cause of "Scan failed: Failed to fetch" and the app feeling hollow. Fixed by moving the proxy to `/api/claude` (a path that can't collide with a static file) and updating the one frontend call site. Verified live end-to-end.

### `STRIPE_SEEKER_PRICE_ID` binding loss (fixed + hardened)
After the Worker rename, that one binding vanished — it was a plain `vars` binding, not a `secret_text`, and git-connected wrangler deploys reconcile vars against `wrangler.toml`, dropping anything not declared there. Restored it directly in `wrangler.toml`'s `[vars]` (it's a Price ID, not a credential — safe to commit) so it survives every future deploy. Documented the gotcha in CLAUDE.md.

### Prospect Scanner: major overhaul
- **JSON-truncation fix:** the AI-fallback business generator capped `max_tokens` too low for large result counts, cutting responses off mid-object ("Expected double-quoted property name"). Now scales with the requested count; audited and raised every other `JSON.parse(callClaude(...))` call site with the same risk.
- **CityPicker sync bug:** the city field kept its own internal display text initialized once on mount and never re-synced when set externally, so clicking an example/saved-search filled the underlying state but not the visible field. Added the missing sync effect.
- **Business type input:** free-text input PLUS a 237-category dropdown (hoisted as shared `BUSINESS_TYPES`) plus a "Surprise me" button that randomizes both business type AND city/country.
- **Persistence:** results and search fields now survive navigating away and back (previously wiped on unmount), with a "Restart / Clear All" button. A scan that's still running when you navigate away no longer vanishes — it writes progress/results straight to storage independent of React state, and returning resumes the loading indicator or shows the finished results.
- **Recent Searches** subtab (Google-history style): click a past search to regenerate it fresh in a large popup.
- **Saved for Later watchlist:** a new page (in nav + command palette) where businesses saved from the scanner are re-checked against current Google Places data on open, flagging what changed (rating/reviews/website/phone) since they were saved.
- **No-website filter (the tool's actual purpose):** City Search now returns ONLY businesses without a website — the whole point is finding leads that need one built. Fetches the Places max (20) and trims after filtering to keep counts healthy; shows a clear "they all already have sites" message on the edge case.

### Honest data: removed ALL AI-fabricated businesses
Owner's call — a prospecting tool showing invented companies that don't exist is actively harmful, not a helpful fallback. Removed AI fabrication from all four places it existed (main scan, business lookup, watchlist re-check, signed-out landing teaser). Each now dead-ends honestly ("add a Places key" / manual entry / unchecked) instead of inventing data. Prospect Scanner is now real-Google-Places-data-only. (Note: a shared Google Places API key is hardcoded + auto-applied for all users; it's real and HTTP-referrer-restricted — the owner updated the referrer allowlist for the new Cloudflare domain.)

### AI Studio layout fix
Brand Voice was sitting at the top of the results box, visually splitting it; moved it into the selector column so the big open box is results-only.

### Deploy verification (this session)
Every change compiled clean (0 esbuild errors), no duplicate functions, and was verified in a real browser (Playwright/Chromium) — including reproducing the exact user-reported scenarios (São Paulo fertility clinics, mid-scan navigation). Each push confirmed live via the Cloudflare deployments API + live endpoint checks (`/api/claude` responding, new bundle hash serving, secrets intact).

---

## Third session (2026-07-18): finish backend-dependent features, verified in a real browser throughout

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
