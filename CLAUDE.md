# Rune Script — Project Context for Claude Code

## What this is
Rune Script is an AI web design agency SaaS. Single-file React app. Dark medieval-cyberpunk theme.
Tagline: "Find prospects, pitch them, build their site, run your agency — all in one place."

## Stack & where things live
- **Frontend:** React (Vite). The ENTIRE app is one file: `src/App.jsx` (~8,000+ lines). Do not split it without asking.
- **Supabase client:** `src/supabase.js` — exports `supabase`; App.jsx imports it as `sb`. Must always exist next to App.jsx.
- **Worker:** `index.js` at repo ROOT (not in worker/). This is the Cloudflare Worker — serves both the API routes AND the built frontend (static assets), same script. `worker/index.js` is a STALE duplicate — ignore it. There is also a "deploy 2/" folder that is stale junk — ignore it.
- **HTML entry:** `index.html` at root.
- **PWA:** `public/site.webmanifest`. No `public/sw.js` exists (index.html registers one, fails silently — harmless, just means no offline caching).
- **Build config:** `vite.config.js`, `package.json`, `wrangler.toml` (this is now the REAL, live deploy config — see below. `netlify.toml` is vestigial, left over from before the move to Cloudflare Pages/Workers; the site no longer deploys there).

## Live infrastructure
- **Site + Worker (same deploy):** https://runescript.its-the-prithivi-show.workers.dev — Cloudflare, account id `468f18d6a560dc69a59ade8dfa4b3665`, script name `runescript`. This single Worker serves the built frontend (static assets from `dist/`, via the `[assets]` block in `wrangler.toml`) AND the API routes in `index.js` — static files are matched first, anything unmatched (e.g. `/create-invoice-payment`, `/send-email`) falls through to the Worker's `fetch()` handler. As of 2026-07-22 this script is **connected to the GitHub repo via Cloudflare Workers Builds** — every push to `main` triggers Cloudflare's own CI to run `npm run build` and deploy automatically. **This replaces both the old manual curl-based Worker deploy AND Netlify** — a plain `git push` to `main` is now the entire deploy step for everything, frontend and backend both.
  - History, in case it's relevant again: this script was briefly named `runescript-worker` (2026-07-22, after the owner renamed it away from `runescript` mid-session and a separate blank `runescript` script briefly existed from a one-off manual `wrangler deploy`). The owner has since renamed it back to `runescript` and deleted the blank duplicate — there is only ever meant to be one script on this account named `runescript`. If a second `runescript`-ish script ever reappears, it's very likely another naming mixup, not something to build against.
  - **Known gotcha confirmed live:** a git-connected `wrangler` deploy reconciles `vars`/`plain_text` bindings against `wrangler.toml`'s `[vars]` section — anything not declared there gets silently wiped (this dropped `STRIPE_SEEKER_PRICE_ID` once already). `secret_text` bindings are never touched by a normal deploy, so true secrets are safe either way. Non-sensitive values (like Stripe Price IDs) should go in `wrangler.toml`'s `[vars]`, not be left as an undeclared dashboard-only binding.
  - **Do not hand-roll a manual Cloudflare API deploy unless the owner explicitly asks for a one-off out-of-band deploy** (e.g. testing something before it's ready to push to `main`). The git-connected build is now the default path.
- **GitHub:** github.com/privi-doughnut/Runescript (files at repo root)
- **Supabase:** https://ydxshxiemmdygumddzyx.supabase.co (confirmed live; anon key in src/supabase.js)

## Environment gotcha (read this before touching wrangler/vite/capacitor)
This machine's system Node is v11.11.0 (from 2019) and Homebrew is broken (crashes on its own macOS-version check, unrepairable without a working brew). This blocks `wrangler`, `vite`, and the Capacitor CLI outright — they need Node 18+ (Capacitor needs 22+). Workaround used successfully: install nvm, `nvm install 22`, then explicitly `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` before every command that needs it — this harness's shell does not auto-source `.zshrc`/`.zshenv` for non-interactive invocations, so the PATH export has to be repeated per command, not set once. Note: even with Node 22, `wrangler deploy`/`wrangler dev` still don't work *in this specific sandboxed environment* — but that's no longer the deploy blocker it used to be, since Cloudflare's own git-connected build now handles deploys (see above). Node 22 is still needed here for `npm run build`/`vite` if you want to sanity-check a production build locally before pushing, and for Playwright-based browser verification via `npm run dev`.

## Deploy process
**Just push to `main`.** Cloudflare Workers Builds (git-connected, set up 2026-07-22) runs `npm run build` and deploys the result — frontend static assets and the `index.js` Worker — as one script, automatically. No manual Netlify step, no manual Cloudflare API curl deploy. Verify a deploy landed by checking the live site/endpoints after pushing (Cloudflare's build takes a couple minutes; if secrets-dependent endpoints 500 with "not configured" right after a push, the build may still be in flight — wait and recheck before assuming something broke).

If you ever genuinely need a manual out-of-band deploy (bypassing git, e.g. testing before committing) — the owner has a scoped Cloudflare API token they can provide; ask for it fresh each time rather than assuming an old one is still valid. The multipart-upload mechanics (filename-must-match-`main_module`, `keep_bindings` for preserving secrets without needing their values) are documented in this file's git history if ever needed again, but shouldn't be under the new setup.

## Worker endpoints (index.js)
- `/` — Claude API proxy (model: `claude-sonnet-5`)
- `/create-trial-checkout` — Stripe checkout, all 5 tiers (accepts `tier` in body: seeker/scribe/archon/sovereign/warden; Archon gets a 30-day trial, others are plain subscriptions)
- `/create-invoice-payment` — one-time Stripe checkout for an arbitrary amount (invoices, e-commerce Buy Now buttons)
- `/check-session/:id` — verify a Stripe checkout session after redirect
- `/send-email` — Resend
- `/google-auth` — Google OAuth token exchange/refresh
- `/calendar-event` — Google Calendar create/list/freebusy

## Cloudflare secret binding names (already set — these are NOT the generic names you'd expect)
- `RUNESCRIPT_STRIPE_API_KEY` — Stripe secret key
- `RUNESCRIPT_API_KEY` — Anthropic API key
- `RUNESCRIPT(RESEND)_API_KEY` — Resend key. **Literal parentheses in the name** — must use bracket notation in JS: `env['RUNESCRIPT(RESEND)_API_KEY']`, dot notation won't parse.
- `RUNESCRIPT_GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `STRIPE_ARCHON_PRICE_ID`, `STRIPE_SCRIBE_PRICE_ID`, `STRIPE_SOVEREIGN_PRICE_ID`, `STRIPE_WARDEN_PRICE_ID` — per-tier Stripe price IDs, provisioned as secrets (don't hardcode these in code)
- `STRIPE_SEEKER_PRICE_ID` — same idea, but declared in `wrangler.toml`'s `[vars]` instead of as a dashboard secret (not sensitive — a Price ID, not a credential — and needs to survive git-connected deploys, see the gotcha above)

## Stripe (LIVE mode)
All 5 tiers are wired for checkout (Seeker $10, Scribe $49, Archon $99 w/ 30-day trial, Sovereign $199, Warden $349). Price IDs also duplicated in App.jsx as `STRIPE_PRICE_IDS` for reference/display, but the Worker is the source of truth via the secrets above.

## CRITICAL editing rules for App.jsx
- **ALWAYS compile-check after editing:**
  `cd src && npx esbuild App.jsx --loader:.jsx=jsx --format=esm --outfile=/dev/null 2>&1 | grep -c ERROR`
  Must return 0 before committing.
- **Also check for duplicate functions after structural edits:**
  `grep -oE 'function [A-Za-z0-9_]+' src/App.jsx | sort | uniq -d` — must be empty.
- **No unescaped apostrophes inside single-quoted strings** (e.g. `'Jim's'` breaks parsing — use double quotes).
- **No curly/smart quotes** in template literals — ASCII only.
- **Never bulk-regex-replace quotes** across the file — it overcorrects and cascades. Fix errors one at a time using esbuild's line number.
- Large-file edits: edit in place with precise str_replace, never paste the whole file into a browser editor.
- **Compile-checking is not the same as verifying it works.** This file has a real history of bugs that pass every static check (undeclared variables only referenced inside event handlers, features that render nothing because the component that owns them never got mounted, etc.). Get the app running in a real browser (Node 22 via nvm + Vite, see above) and actually click the thing before calling a UI fix done.

## Design standard (anti-slop) — read before building or generating any UI
`DESIGN_SYSTEM.md` is the canonical design standard for the app's own UI **and**
the AI's site generation — the owner's "Ultimate Design Engineering & Anti-Slop
System" (motion, layout rhythm, interactive states, semantic HTML, banned
buzzwords, deterministic loading, etc.). Its operational vanilla-HTML translation
lives as `DESIGN_SYSTEM_PROMPT` in `src/App.jsx` and is prepended to every Site
Builder generation prompt. When touching app UI, follow it. If you change one,
keep the doc and the prompt constant in sync. `/polish` and the "Grill Protocol"
(ask 2–3 focused questions before a big new view) are behaviors for you, the
assistant — honor them.

## Known pending / follow-up items
- Email sequence scheduler and creator earnings backend both need new Supabase tables — exact SQL is in PROGRESS.md. No schema-modification access from this session (anon key only).
- GitHub OAuth login likely needs the live site URL added to Supabase's Redirect URL allowlist (owner-only, Supabase dashboard → Authentication → URL Configuration). Was `https://runescript.netlify.app` — now that the site has moved to Cloudflare (`https://runescript.its-the-prithivi-show.workers.dev`, see Live infrastructure above), that URL needs to be added there too (and the old Netlify one can probably stay or be removed, owner's call).
- Capacitor mobile wrapper is scaffolded on branch `capacitor-mobile-wrapper` (not merged) — needs Xcode/Android Studio to actually build/test, which this environment doesn't have.
- Google app verification (for per-client calendars) — owner must submit, needs privacy policy/homepage/demo video.
- See PROGRESS.md and TRIAGE.md for full session-by-session history of what shipped and why.

## Owner
Solo developer/director. Prefers: forward progress, big chunks without constant check-ins, zero bugs,
decisions reported at the end. Values genuine code understanding and product ownership. Has explicitly said
not to ask routine "should I proceed" confirmation questions — pick the best option and note it afterward;
only pause for genuinely irreversible/high-stakes calls (real money, destructive ops, production security
settings like CORS policy).
