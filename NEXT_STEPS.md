# Rune Script — What's Next (Roadmap)

_Last updated: 2026-07-22. This is the working roadmap. It splits into three piles: the one blocker that gates everything, the account/dashboard work only the owner can do, and the code work Claude can build._

---

## The critical blocker (do this first)

**Run `SUPABASE_FINAL.sql`.** This is the single biggest thing gating the app. Until it runs, three entire features are dead — Creator Program applications, the whole email-sequence scheduler, and creator earnings / template sales tracking. All the code is built and waiting; it just has no tables to write to. It's a ~60-second copy-paste into the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste `SUPABASE_FINAL.sql` from repo root → run). Idempotent, safe to re-run. Everything else is secondary to this.

---

## Things only the owner can do (Claude can't touch these)

All account/dashboard actions — worth batching. Owner has said they'll start these near ~97% build completion.

- **`SUPABASE_SERVICE_ROLE_KEY`** as a Cloudflare Worker secret → unblocks sequence emails actually sending (the cron + fallback currently no-op safely without it).
- **GitHub OAuth** → add the Cloudflare domain (`https://runescript.its-the-prithivi-show.workers.dev` and `/**`) to Supabase's Authentication → URL Configuration → Redirect URLs.
- **One real ~$10 Stripe test payment + refund** → confirms the whole checkout/earnings loop end-to-end (Marketplace buy → `template_sales` row → Earnings tab → refund).
- **Confirm the Google Places key returns real results on production** (referrer allowlist was updated for the new domain — verify a live scan actually returns businesses).
- See `OWNER_TODO.md` for the full, detailed checklist including lower-priority items (Anthropic key rotation, Google OAuth app verification, domain purchase, etc.).

---

## What Claude can build next — the code roadmap

Ordered by the owner's chosen build sequence: **#3 first, then #1, then #2.**

### 1. Stripe Connect payouts — ⏸ PARKED
Creator earnings are tracked but payouts are manual (owner pays people by hand + marks `payout_status = 'manual_paid'` in the DB). Automating this needs Stripe Connect. **Parked until the owner finishes setting up Stripe** — nothing Stripe-related can be built or tested until then. This is the biggest remaining feature gap once unblocked.

### 2. Roadmap / changelog page audit — ✅ DONE (2026-07-24)
Corrected the in-app Roadmap so it matches reality (removed the stale "AI fallback" scanner claim, moved shipped features — visual editor, e-commerce, watchlist — out of Coming Soon, added a "Backend-Ready — Activating" phase). Refreshed the Changelog (was frozen at Jun 13; added v1.7–v1.9). Added the missing `feature_requests` table so the community board works.

### 3. Keep hardening what exists — ◑ SUBSTANTIALLY DONE (ongoing)
Every deep dive surfaces real bugs. Done so far: full 27-page sweep (no crashes/blank screens), fixed all `.single()` 406s, removed affiliate stat fabrication + built the affiliate backend, fixed the stale CORS allowlist, added keep-alive + verified no DOM-collision risk, money-path pages (CRM/Agency OS) verified clean. Remaining: deeper interactive testing of Site Builder edge cases and the AI Studio tools as time allows.

---

## Build status

- **#2 (Roadmap audit):** ✅ done
- **#3 (hardening):** ◑ substantially done, ongoing
- **#1 (Stripe Connect):** ⏸ parked — blocked on owner's Stripe setup

## When Stripe is ready (owner)

Ping me once Stripe is set up and Connect is enabled. Then #1 unblocks: I'll build creator payout onboarding (Express accounts recommended — Stripe hosts the KYC/dashboard) and the transfer flow, and document the Stripe-dashboard steps.
