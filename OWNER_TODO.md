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

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs — now that the site has moved to Cloudflare, add `https://runescript-worker.its-the-prithivi-show.workers.dev` and `https://runescript-worker.its-the-prithivi-show.workers.dev/**` (the old `https://runescript.netlify.app` entries can stay harmlessly or be removed, your call). The GitHub OAuth provider itself is correctly configured (verified the redirect to GitHub carries a real, valid client ID) — the redirect allowlist is almost certainly the actual blocker, diagnosed but not something fixable from application code.

## 4. Confirm the Cloudflare Workers Build picked up the latest push

You connected `runescript-worker` to the GitHub repo (2026-07-22) — Cloudflare now runs `npm run build` and deploys automatically on every push to `main`, replacing both the old manual curl deploy and Netlify. Check the Workers & Pages dashboard → `runescript-worker` → Deployments to confirm the latest build succeeded and reflects this session's commits. If you haven't already, also double check the build command in that project's settings is `npm run build` (should be picked up from `wrangler.toml`'s new `[build]` block, but worth a glance the first time).

## 5. Test a real small Stripe payment + refund

Worth doing end-to-end now that Marketplace purchases go through real Stripe Checkout (previously fake/instant): buy a cheap template for real, confirm the charge appears in Stripe, confirm it shows up correctly in the Marketplace Earnings tab and Creator Program stats, then refund it from the Stripe dashboard. Also worth re-testing the subscription tiers and the Shop section's one-time checkout, if you haven't already confirmed those with a real card.

## 6. Rotate the Anthropic API key if it was ever exposed

Not exposed by anything I did this session (never printed, logged, or committed) — including this as a standing hygiene check per your original instructions. If you're not sure whether it's ever been pasted somewhere it shouldn't have been, rotating it is cheap insurance: generate a new key at console.anthropic.com, update the `RUNESCRIPT_API_KEY` Cloudflare secret.

## 7. Confirm Cloudflare secret names are all still correct

Verified live this session — all 9 existing bindings are on `runescript-worker` (the script the live site now runs on): `RUNESCRIPT_STRIPE_API_KEY`, `RUNESCRIPT_API_KEY`, `RUNESCRIPT(RESEND)_API_KEY`, `RUNESCRIPT_GOOGLE_CLIENT_SECRET`, and the 5 per-tier `STRIPE_*_PRICE_ID` secrets. Nothing to do here unless you want to double-check yourself. Worth a sanity check after the first git-triggered build completes, since it's a new deploy path — confirm the same 9 are still listed under `runescript-worker` → Settings → Variables and Secrets, not just assumed to have carried over.

The separate blank `runescript` script (from your one-off manual `wrangler deploy`) has none of these and isn't connected to anything live — safe to rename back or delete once you've confirmed `runescript-worker` is fully working, whenever you're ready.

## 8. Review pending Creator Program applications and template sales

Once #1 and #2 are done and real applications/sales start coming in: the Creator Program page (Cmd+K → "Creator Program") has an admin panel visible only to your account that shows applications with Approve/Reject buttons. The Marketplace Earnings tab is honest that payouts are currently **manual** — there's no Stripe Connect automation (that's a real, separate build, intentionally not attempted half-done this session). When a creator's owed a payout, you'll need to pay them directly and mark it in the `template_sales` table (`payout_status = 'manual_paid'`) via the Supabase dashboard.

## 9. (Later) Google OAuth app verification

For per-client calendar integration — needs a privacy policy, homepage, and demo video before Google will verify the app. Not urgent, no other feature depends on it.

## 10. (Optional) Nice-to-haves, not blocking anything

- Purchase the `runescript.app` domain, if you still want it.
- Buffer/Ayrshare integration for social scheduling, Twilio for SMS — neither is wired up; only add if there's an actual near-term need.
- If you want the e-commerce Shop section to work on a customer's own deployed domain, add their domain to `ALLOWED_ORIGINS` in `index.js` — deliberately left alone this session since it's a production CORS/security setting. Note this list currently still only has the old `runescript.netlify.app`/`*.netlify.app` — worth adding `runescript-worker.its-the-prithivi-show.workers.dev` too if any customer-facing flow ever calls the API cross-origin from a *different* Cloudflare subdomain than the one serving the app itself (same-origin calls, which is most of the app now that frontend+API are one deploy, don't need CORS at all).
- Capacitor mobile wrapper is scaffolded on branch `capacitor-mobile-wrapper` (unmerged, and now meaningfully diverged from `main` after this session's changes). Needs Xcode (`npx cap open ios`) or Android Studio (`npx cap open android`) to actually build/test — this environment has neither. If you want to pick this up, expect to redo the merge from `main` first since the branch is stale.
- Consider a permanent fix for this machine's Node situation (system Node is v11.11.0 from 2019, Homebrew is broken/unrepairable) — every session so far has worked around it with a manual `nvm install 22` + explicit `PATH` export per command, which is fragile. Actually fixing Homebrew, or documenting the nvm path permanently in a shell profile that this harness *does* source, would remove that friction for good.
