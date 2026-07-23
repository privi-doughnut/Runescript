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

### 1. Stripe Connect payouts
Right now creator earnings are tracked but payouts are manual (owner pays people by hand + marks `payout_status = 'manual_paid'` in the DB). This is the biggest genuine feature gap. Real onboarding/KYC/transfer work — a meaty but high-value build. **(Build second.)**

### 2. Roadmap / changelog page audit
The app already has a Roadmap page. Worth going through it and making sure what it promises matches what actually works now, since a lot has changed. **(Build last.)**

### 3. Keep hardening what exists
Every deep dive into a feature has surfaced real bugs (the `/api/claude` collision, the fabrication paths, the CityPicker sync, the missing no-website filter). A systematic click-through of the whole website — Agency OS, Pitch Generator, Site Builder, CRM, all of it — to find and fix the rest proactively before real users hit them. **(Build first — in progress.)**

---

## Build status

- **#3 (hardening):** in progress
- **#1 (Stripe Connect):** queued
- **#2 (Roadmap audit):** queued
