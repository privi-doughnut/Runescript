# Owner To-Do List

_Written 2026-07-18, end of the final code phase. Ordered so the items that unblock everything else come first — do those, and the rest of the app just starts working with no further coding needed._

## 1. Run `SUPABASE_FINAL.sql` — unblocks Creator Program, email sequences, and creator earnings

Go to Supabase Dashboard → your project → **SQL Editor** → New query, paste the entire contents of `SUPABASE_FINAL.sql` (repo root), run it. It's idempotent — safe to run even if you're not sure it's already been run. Nothing to restart afterward; PostgREST picks up new tables/columns automatically, just refresh the app.

Until this is run, three features fail gracefully with a clear "has SUPABASE_FINAL.sql been run yet?" message instead of crashing — but they don't actually do anything yet:
- Creator Program applications (can't be saved or reviewed)
- Email sequence saving/enrollment/sending
- Real template sales tracking / creator earnings

## 2. Add the `SUPABASE_SERVICE_ROLE_KEY` Cloudflare secret — unblocks email sequence sending

The Cron Trigger that actually sends scheduled sequence emails needs a Supabase **service role** key (not the anon key already in the app) so it can read/update sends across all users, not just one. Get it from Supabase Dashboard → Project Settings → API → `service_role` key (keep this secret — it bypasses all Row Level Security).

Add it as a Cloudflare Worker secret:
```
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
(or via the Cloudflare dashboard → Workers → runescript → Settings → Variables, if `wrangler` doesn't work in your environment either — add it as an **encrypted** variable, not plain text.)

Without this, the Cron Trigger (already deployed and firing every 15 minutes) and the on-load fallback both correctly no-op rather than erroring — confirmed live — but no sequence emails will actually send.

## 3. Fix GitHub OAuth login

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs — now that the site has moved to Cloudflare, add `https://runescript.its-the-prithivi-show.workers.dev` and `https://runescript.its-the-prithivi-show.workers.dev/**` (the old `https://runescript.netlify.app` entries can stay harmlessly or be removed, your call). The GitHub OAuth provider itself is correctly configured (verified the redirect to GitHub carries a real, valid client ID) — the redirect allowlist is almost certainly the actual blocker, diagnosed but not something fixable from application code.

## 4. Confirm the Cloudflare Workers Build picked up the latest push

You connected the Worker to the GitHub repo (2026-07-22) — Cloudflare now runs `npm run build` and deploys automatically on every push to `main`, replacing both the old manual curl deploy and Netlify. The script is named `runescript` (you renamed it back after a brief detour as `runescript-worker` mid-session). Check the Workers & Pages dashboard → `runescript` → Deployments to confirm the latest build succeeded and reflects this session's commits.

## 5. Test a real small Stripe payment + refund

Worth doing end-to-end now that Marketplace purchases go through real Stripe Checkout (previously fake/instant): buy a cheap template for real, confirm the charge appears in Stripe, confirm it shows up correctly in the Marketplace Earnings tab and Creator Program stats, then refund it from the Stripe dashboard. Also worth re-testing the subscription tiers and the Shop section's one-time checkout, if you haven't already confirmed those with a real card.

## 6. Rotate the Anthropic API key if it was ever exposed

Not exposed by anything I did this session (never printed, logged, or committed) — including this as a standing hygiene check per your original instructions. If you're not sure whether it's ever been pasted somewhere it shouldn't have been, rotating it is cheap insurance: generate a new key at console.anthropic.com, update the `RUNESCRIPT_API_KEY` Cloudflare secret.

## 7. Confirm Cloudflare secret names are all still correct

One real thing broke and has been fixed — worth knowing about since it could recur in a different form. After you renamed the Worker back to `runescript`, `STRIPE_SEEKER_PRICE_ID` was missing (8 of the 9 original bindings survived, that one didn't). Cause: it was a plain "vars" binding, not a true secret, and a git-connected `wrangler` deploy reconciles vars against `wrangler.toml` — anything not declared there gets silently dropped, while true secrets (`secret_text`) are never touched by a normal deploy. Fixed by declaring it directly in `wrangler.toml`'s `[vars]` (its value isn't actually sensitive — a Stripe Price ID, not a credential — so this is safe to commit); the next push restores it automatically.

Worth a quick sanity check once that build lands: Workers & Pages → `runescript` → Settings → Variables and Secrets should show all 4 remaining `STRIPE_*_PRICE_ID` secrets, the other 4 core secrets (`RUNESCRIPT_STRIPE_API_KEY`, `RUNESCRIPT_API_KEY`, `RUNESCRIPT(RESEND)_API_KEY`, `RUNESCRIPT_GOOGLE_CLIENT_SECRET`), and `STRIPE_SEEKER_PRICE_ID` back as a var. If you ever add a genuinely new secret going forward, remember: true secrets are safe from this, but any plain/non-sensitive config value should go in `wrangler.toml`'s `[vars]`, not just the dashboard, or it can vanish on the next deploy the same way.

## 8. Review pending Creator Program applications and template sales

Once #1 and #2 are done and real applications/sales start coming in: the Creator Program page (Cmd+K → "Creator Program") has an admin panel visible only to your account that shows applications with Approve/Reject buttons. The Marketplace Earnings tab is honest that payouts are currently **manual** — there's no Stripe Connect automation (that's a real, separate build, intentionally not attempted half-done this session). When a creator's owed a payout, you'll need to pay them directly and mark it in the `template_sales` table (`payout_status = 'manual_paid'`) via the Supabase dashboard.

## 9. (Later) Google OAuth app verification

For per-client calendar integration — needs a privacy policy, homepage, and demo video before Google will verify the app. Not urgent, no other feature depends on it.

## 10. (Optional, small) Enable Google PageSpeed for the real Site Analyzer speed test

The Site Analyzer now has a "Real Speed Test" that pulls actual performance
scores + Core Web Vitals from Google PageSpeed Insights. It works keyless off
Google's free shared quota, but that quota is frequently exhausted (it errored
"quota exceeded" during testing). For reliable use: in Google Cloud Console,
enable the **PageSpeed Insights API**, create an API key (a plain one, no HTTP-
referrer restriction, or allowlist your Cloudflare domain), and paste it into
Settings → API Keys → "Google PageSpeed API Key". The feature degrades
gracefully until then (shows a clear "add a key" message, never fake data).

## 11. (Optional) Nice-to-haves, not blocking anything

- Purchase the `runescript.app` domain, if you still want it.
- Buffer/Ayrshare integration for social scheduling, Twilio for SMS — neither is wired up; only add if there's an actual near-term need.
- If you want the e-commerce Shop section to work on a customer's own deployed domain, add their domain to `ALLOWED_ORIGINS` in `index.js` — deliberately left alone this session since it's a production CORS/security setting. Note this list currently still only has the old `runescript.netlify.app`/`*.netlify.app` — worth adding `runescript.its-the-prithivi-show.workers.dev` too if any customer-facing flow ever calls the API cross-origin from a *different* origin than the one serving the app itself (same-origin calls, which is most of the app now that frontend+API are one deploy, don't need CORS at all).
- Capacitor mobile wrapper is scaffolded on branch `capacitor-mobile-wrapper` (unmerged, and now meaningfully diverged from `main` after this session's changes). Needs Xcode (`npx cap open ios`) or Android Studio (`npx cap open android`) to actually build/test — this environment has neither. If you want to pick this up, expect to redo the merge from `main` first since the branch is stale.
- Consider a permanent fix for this machine's Node situation (system Node is v11.11.0 from 2019, Homebrew is broken/unrepairable) — every session so far has worked around it with a manual `nvm install 22` + explicit `PATH` export per command, which is fragile. Actually fixing Homebrew, or documenting the nvm path permanently in a shell profile that this harness *does* source, would remove that friction for good.
