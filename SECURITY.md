# Rune Script — Security Audit & Posture

_First audit: 2026-08-02. This documents what's been hardened, what's verified safe, and the owner actions that remain. Kept current as the app changes._

## TL;DR
The two highest-impact holes — an open AI proxy anyone could drain, and a PII leak in the affiliate table — are **fixed**. RLS is on for every table, there's no code injection surface, and no secrets are committed. A handful of medium/low items are documented below as follow-ups (mostly defense-in-depth and one marketplace monetization leak).

---

## Fixed this pass

### 1. Open Worker endpoints → API-key drain (was HIGH)
Every Worker endpoint was unauthenticated. Anyone could `POST /api/claude` and burn the Anthropic key (real money) or abuse `/send-email` via Resend (spam + sender-reputation damage). **CORS does not stop this** — CORS only restricts browsers; a script/curl ignores it.
- **Fix:** the Worker now verifies the caller's Supabase access token against Supabase Auth before spending on those two endpoints (`verifySupabaseUser`), returning 401 otherwise. The frontend attaches the logged-in user's token (`authHeaders`) to `callClaude` and `sendEmail`.
- The Supabase anon key hardcoded in the Worker is **public by design** (it only grants what RLS allows) — safe there.

### 2. Affiliate payout_email PII leak (was HIGH)
The `affiliates` RLS had `select using (true)` — exposing every user's `payout_email` (PII) to every other logged-in user, who could harvest them.
- **Fix:** users can now only read their **own** affiliate row. Referral attribution at signup maps a `?ref=` handle → user_id via a `security definer` function (`resolve_affiliate_id`) that returns *only* the id, never the email.
- **Owner action required:** re-run `SUPABASE_FINAL.sql` (idempotent) so this policy change takes effect.

---

## Verified safe
- **RLS is enabled on all 10 app tables** (creator_applications, templates, template_sales, email_sequences + 3 sequence tables, affiliates, referrals, feature_requests). No table is world-open.
- **No code-injection surface** — no `eval`, `new Function`, or string-based `setTimeout`/`setInterval`.
- **Money endpoints validate input** — Stripe amount/price must be ≥ 1 cent.
- **No secrets in the repo** — `.env`/`.env.local` are gitignored; the only client-side key is the Google Places key (see follow-ups).
- **Site preview iframe** currently only ever renders the user's *own* content (marketplace template HTML is **not** wired into the builder — those buttons are no-ops), so the same-origin preview is self-XSS at most, not a cross-user vuln.

---

## Owner actions / follow-ups (ordered by impact)

1. **Re-run `SUPABASE_FINAL.sql`** — applies the affiliate payout_email fix (#2 above). Required.

2. **Cloudflare rate-limiting** (MEDIUM, defense-in-depth). The Stripe-session, `/pagespeed`, and `/domain-check` endpoints stay ungated (Stripe ones are called from customer sites; the others are cheap). Add a WAF/rate-limiting rule in the Cloudflare dashboard (Security → WAF → Rate limiting) — e.g. cap requests per IP per minute on `/create-*`, `/pagespeed`, `/domain-check`. Stops brute abuse without code changes.

3. **Lock down the Google Places API key** (MEDIUM). It's hardcoded in the client bundle (extractable by anyone via devtools). Its *only* protection is Google-side restriction — confirm in Google Cloud Console that this key is **HTTP-referrer restricted** to your domains (`*.workers.dev`, your custom domain). Better long-term: migrate Places calls to a Worker proxy with the key as a Cloudflare secret, exactly like `/pagespeed` and `/domain-check` already do.

4. **Marketplace template HTML is world-readable** (MEDIUM, monetization + latent XSS). The `templates` browse policy exposes the `html` column to everyone, so a buyer could read a paid template's source without buying. It's also a *latent* XSS delivery path. When the marketplace is actually monetized, split `html` into a buyer/seller-only table (or a view/function that only returns it after a recorded `template_sales` purchase), and **never load untrusted template HTML into the same-origin builder iframe without sanitizing** (strip `<script>` and inline event handlers) or sandboxing it. The "Use in Builder" buttons are currently no-ops, which keeps this safe for now.

5. **`feature_requests` is intentionally permissive** (LOW). Anyone signed in can insert/update any row (it's a public wishlist board), so votes/titles can be vandalized. Low-stakes; tighten later if it's abused (e.g. an RPC that only increments votes).

6. **GitHub OAuth redirect allowlist** (already tracked in OWNER_TODO) — ensure only your real origins are in Supabase's redirect allowlist so tokens can't be redirected elsewhere.

---

## Notes on the threat model
- The app is behind Supabase auth; all AI/email usage is by logged-in users, which is what the gating enforces.
- The client-site widgets (Shop, booking, chat) run on *customers'* deployed sites and call the Stripe-session endpoints cross-origin by design — those can't be locked to the app origin, hence the rate-limiting recommendation instead.
- Session tokens live in the browser (standard for Supabase). The same-origin preview iframe is the main thing to keep untrusted HTML out of.
