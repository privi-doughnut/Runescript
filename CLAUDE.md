# Rune Script — Project Context for Claude Code

## What this is
Rune Script is an AI web design agency SaaS. Single-file React app. Dark medieval-cyberpunk theme.
Tagline: "Find prospects, pitch them, build their site, run your agency — all in one place."

## Stack & where things live
- **Frontend:** React (Vite). The ENTIRE app is one file: `src/App.jsx` (~7,800 lines). Do not split it without asking.
- **Supabase client:** `src/supabase.js` — exports `supabase`; App.jsx imports it as `sb`. Must always exist next to App.jsx.
- **Worker:** `index.js` at repo ROOT (not in worker/). This is the Cloudflare Worker. `worker/index.js` is a STALE duplicate — ignore it. There is also a "deploy 2/" folder that is stale junk — ignore it.
- **HTML entry:** `index.html` at root.
- **PWA:** `public/sw.js`, `public/site.webmanifest`.
- **Build config:** `vite.config.js`, `package.json`, `netlify.toml`, `wrangler.toml`.

## Live infrastructure
- **Site:** https://runescript.netlify.app (Netlify auto-deploys on push to main)
- **Worker:** https://runescript.its-the-prithivi-show.workers.dev (Cloudflare)
- **GitHub:** github.com/privi-doughnut/Runescript (files at repo root)
- **Supabase:** https://ydxshxiemmdygumddzyx.supabase.co

## Deploy process
1. **Frontend:** commit + push to `main` → Netlify rebuilds automatically (~2-3 min). No manual build needed.
2. **Worker:** `npx wrangler deploy` (or paste index.js into Cloudflare dashboard). GitHub storage does NOT deploy the Worker — it must be shipped to Cloudflare separately.

## Worker endpoints (index.js)
- `/` — Claude API proxy (uses ANTHROPIC_API_KEY)
- `/create-trial-checkout` — Stripe checkout (uses STRIPE_SECRET_KEY, STRIPE_ARCHON_PRICE_ID)
- `/create-portal-session` — Stripe billing portal
- `/send-email` — Resend (uses RESEND_API_KEY)
- `/google-auth` — Google OAuth token exchange/refresh (uses GOOGLE_CLIENT_SECRET)
- `/calendar-event` — Google Calendar create/list/freebusy

## Cloudflare secrets (already set — do not commit these anywhere)
STRIPE_SECRET_KEY, STRIPE_ARCHON_PRICE_ID, RESEND_API_KEY, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY.
NOTE: the Worker env var for the Archon price is `STRIPE_ARCHON_PRICE_ID` (not STRIPE_PRICE_ID).

## Stripe (LIVE mode)
All 5 tier products exist. Price IDs are in App.jsx as `STRIPE_PRICE_IDS`. Only Archon ($99/mo, 30-day trial)
is wired for checkout today. Multi-tier checkout is a pending build.

## CRITICAL editing rules for App.jsx
- **ALWAYS compile-check after editing** — this file has a history of syntax errors that brace-counting misses:
  `cd src && npx esbuild App.jsx --loader:.jsx=jsx --format=esm --outfile=/dev/null 2>&1 | grep -c ERROR`
  Must return 0 before committing.
- **No unescaped apostrophes inside single-quoted strings** (e.g. `'Jim's'` breaks parsing — use double quotes).
- **No curly/smart quotes** in template literals — ASCII only.
- **Never bulk-regex-replace quotes** across the file — it overcorrects and cascades. Fix errors one at a time using esbuild's line number.
- Large-file edits: edit in place with precise str_replace, never paste the whole file into a browser editor.

## Known pending tasks
- Resume paused Supabase project (manual, Supabase dashboard)
- Deploy Worker to Cloudflare (wrangler)
- Add favicon files to public/ (generate from RealFaviconGenerator: favicon.svg, favicon-96x96.png, favicon.ico, apple-touch-icon.png, web-app-manifest-192x192.png, web-app-manifest-512x512.png)
- Multi-tier Stripe checkout wiring (5 tiers → their price IDs)
- Google app verification (later, for per-client calendars)

## Owner
Solo developer/director. Prefers: forward progress, big chunks without constant check-ins, zero bugs,
decisions reported at the end. Values genuine code understanding and product ownership.
