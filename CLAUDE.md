# Rune Script — Project Context for Claude Code

## What this is
Rune Script is an AI web design agency SaaS. Single-file React app. Dark medieval-cyberpunk theme.
Tagline: "Find prospects, pitch them, build their site, run your agency — all in one place."

## Stack & where things live
- **Frontend:** React (Vite). The ENTIRE app is one file: `src/App.jsx` (~8,000+ lines). Do not split it without asking.
- **Supabase client:** `src/supabase.js` — exports `supabase`; App.jsx imports it as `sb`. Must always exist next to App.jsx.
- **Worker:** `index.js` at repo ROOT (not in worker/). This is the Cloudflare Worker. `worker/index.js` is a STALE duplicate — ignore it. There is also a "deploy 2/" folder that is stale junk — ignore it.
- **HTML entry:** `index.html` at root.
- **PWA:** `public/site.webmanifest`. No `public/sw.js` exists (index.html registers one, fails silently — harmless, just means no offline caching).
- **Build config:** `vite.config.js`, `package.json`, `netlify.toml`, `wrangler.toml` (wrangler.toml is stale/unused — it references a different Worker name; deploys don't go through it, see below).

## Live infrastructure
- **Site:** https://runescript.netlify.app (Netlify auto-deploys on push to main — **Netlify build credits can run low**; batch commits and push together rather than per-commit when doing multiple small fixes)
- **Worker:** https://runescript-worker.its-the-prithivi-show.workers.dev (Cloudflare, account id `468f18d6a560dc69a59ade8dfa4b3665`, script name `runescript-worker` — renamed from `runescript` by the owner on 2026-07-22; a separate, blank `runescript` script also exists on the account with zero secrets configured, deployed via `wrangler` from the owner's machine — do not confuse the two. If asked to deploy, deploy to `runescript-worker` (the one with all 9 secrets), not `runescript`.)
- **GitHub:** github.com/privi-doughnut/Runescript (files at repo root)
- **Supabase:** https://ydxshxiemmdygumddzyx.supabase.co (confirmed live; anon key in src/supabase.js)

## Environment gotcha (read this before touching wrangler/vite/capacitor)
This machine's system Node is v11.11.0 (from 2019) and Homebrew is broken (crashes on its own macOS-version check, unrepairable without a working brew). This blocks `wrangler`, `vite`, and the Capacitor CLI outright — they need Node 18+ (Capacitor needs 22+). Workaround used successfully: install nvm, `nvm install 22`, then explicitly `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` before every command that needs it — this harness's shell does not auto-source `.zshrc`/`.zshenv` for non-interactive invocations, so the PATH export has to be repeated per command, not set once.

## Deploy process
1. **Frontend:** commit + push to `main` → Netlify rebuilds automatically (~2-3 min, when credits allow). No manual build needed.
2. **Worker:** `wrangler deploy` does NOT work in this environment (see above). Deploy via the Cloudflare REST API directly with curl instead — see the gotchas below. GitHub storage does NOT deploy the Worker either way; it must be shipped to Cloudflare separately from the frontend push.

### Worker deploy via API (no wrangler)
Needs a Cloudflare API token scoped to `Account.Workers Scripts:Edit` (ask the owner to generate one at dash.cloudflare.com/profile/api-tokens if you don't have one — don't assume an old one is still valid).

Two non-obvious gotchas:
1. **Multipart filename must match `main_module`.** `curl -F "worker.js=@/path/to/index.js"` sets the filename to `index.js` from the local path, but Cloudflare resolves the module by filename, not field name — causes `"No such module: worker.js"`. Fix: `-F "worker.js=@/path/to/index.js;filename=worker.js;type=application/javascript+module"`.
2. **Secrets need `keep_bindings`, not redeclaration.** Don't list existing `secret_text` bindings in the upload metadata (you don't have their values, and Cloudflare rejects the request if you try without one). Instead, omit `bindings` entirely and add `"keep_bindings": ["secret_text", "plain_text"]` to the metadata — this preserves all existing secrets without needing their values.

Metadata shape:
```json
{
  "main_module": "worker.js",
  "compatibility_date": "2026-06-24",
  "compatibility_flags": [],
  "keep_bindings": ["secret_text", "plain_text"]
}
```
```
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/468f18d6a560dc69a59ade8dfa4b3665/workers/scripts/runescript-worker" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -F "metadata=<metadata.json;type=application/json" \
  -F "worker.js=@/path/to/index.js;filename=worker.js;type=application/javascript+module"
```
Always verify after deploying: re-fetch `/workers/scripts/runescript-worker/settings` and confirm all bindings are still present, then hit a couple of live endpoints to confirm real behavior (not "not configured" 500s).

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
- `STRIPE_ARCHON_PRICE_ID`, `STRIPE_SEEKER_PRICE_ID`, `STRIPE_SCRIBE_PRICE_ID`, `STRIPE_SOVEREIGN_PRICE_ID`, `STRIPE_WARDEN_PRICE_ID` — per-tier Stripe price IDs, already provisioned as secrets (don't hardcode these in code)

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

## Known pending / follow-up items
- Email sequence scheduler and creator earnings backend both need new Supabase tables — exact SQL is in PROGRESS.md. No schema-modification access from this session (anon key only).
- GitHub OAuth login likely needs `https://runescript.netlify.app` added to Supabase's Redirect URL allowlist (owner-only, Supabase dashboard).
- Capacitor mobile wrapper is scaffolded on branch `capacitor-mobile-wrapper` (not merged) — needs Xcode/Android Studio to actually build/test, which this environment doesn't have.
- Google app verification (for per-client calendars) — owner must submit, needs privacy policy/homepage/demo video.
- See PROGRESS.md and TRIAGE.md for full session-by-session history of what shipped and why.

## Owner
Solo developer/director. Prefers: forward progress, big chunks without constant check-ins, zero bugs,
decisions reported at the end. Values genuine code understanding and product ownership. Has explicitly said
not to ask routine "should I proceed" confirmation questions — pick the best option and note it afterward;
only pause for genuinely irreversible/high-stakes calls (real money, destructive ops, production security
settings like CORS policy).
