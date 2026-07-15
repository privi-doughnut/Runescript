# Triage Report

_2026-07-15, second session — investigated with a real running browser (Playwright + Chromium), not code review alone._

## Environment setup notes
- Upgraded Node via nvm (v22.23.1) since Homebrew is unrepairable on this machine and the system Node (v11.11.0) can't run Vite at all. Had to fix `~/.zshenv` and explicitly export PATH per-command since the harness's shell doesn't auto-source `.zshrc`/`.zshenv` for non-interactive invocations — see updated project memory.
- No `chromium-cli` available; installed Playwright + Chromium directly in scratchpad (not added to project `package.json` — it's verification tooling, not an app dependency).
- Supabase email confirmation was blocking scripted signup (rate-limited on confirmation emails). Owner disabled "Confirm email" in Supabase Auth settings, which unblocked testing — this also removes friction from the real signup funnel for actual users.
- Ruled out stale service worker caching as an explanation for any of this: `public/sw.js` does not exist at all (same finding as last session), so no service worker is ever successfully installed — nothing is being cached. Confirmed separately that the live site's deployed JS bundle contains last session's "Reorder Sections" and "Pay Link" strings, so the live deploy is current, not stale.

## Bug 1 & 2 — Agency OS and AI Studio white screens (SHARED ROOT CAUSE)

**Reproduced.** Clicking "Agency OS" throws immediately on mount:
```
ReferenceError: showLibrary is not defined
    at AgencyOSPage (App.jsx)
```

**Root cause:** A "Saved Library" display block (shows `savedOutputs`, `scheduled`, gated by `showLibrary`) is physically located inside `AgencyOSPage`'s JSX (around line 3802), but `AgencyOSPage` never declares any of `showLibrary`, `savedOutputs`, or `scheduled` as state — it has nothing to do with them (its actual state is clients/invoices/proposals/time-tracking/referrals). This is almost certainly copy-paste contamination from `AIStudioPage`.

Meanwhile `AIStudioPage` is where this feature actually *should* live — it already has the `scheduled` state and the "Save"/"Schedule" buttons that produce `savedOutputs` (`setSavedOutputs(...)` is called from its own render), but it **also never declares `showLibrary` or `savedOutputs`** as state, and references `showLibrary` in a `useEffect` dependency array on every render — so `AIStudioPage` throws the identical `ReferenceError` on mount too.

A second, separate bug in the same component: `AIStudioPage`'s "signature" tool prompt references `brand?.primaryColor`, but no `brand` variable is declared or passed as a prop anywhere in that component. Optional chaining (`?.`) only guards against `null`/`undefined` *values* — it does not protect against a completely undeclared identifier, so this would also throw `ReferenceError: brand is not defined` the moment that code path executes (not on mount, since it's inside an event handler, but it's dead-on-arrival broken).

**Fix:** Remove the misplaced "Saved Library" block from `AgencyOSPage` entirely (it has no legitimate use for it). In `AIStudioPage`, declare `showLibrary`/`setShowLibrary` and `savedOutputs`/`setSavedOutputs` state, move the "Saved Library" display block into `AIStudioPage`'s own render (near the Save/Schedule buttons that populate it), and add a toggle button to actually open it (currently nothing sets `showLibrary` to `true` anywhere). Fix `brand?.primaryColor` by removing the reference to the undeclared variable and using the existing fallback color directly.

## Bug 3 — AI features "connection lost"

**Reproduced and confirmed with a direct fetch test in-browser:**
```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'http://localhost:5184'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root cause:** `callClaude()` (the single function every AI feature in the entire app routes through — Pitch Generator, Site Builder, AI Studio, proposals, contracts, everything) fetches `https://api.anthropic.com/v1/messages` **directly from the browser**, bypassing the Cloudflare Worker proxy entirely, and without the `x-api-key`/`anthropic-version` headers Anthropic's API requires. This was never going to work — browsers can't call Anthropic's API directly (no CORS allowance, and the API key would be exposed client-side even if it could). Every other AI-adjacent function in the codebase (`sendEmail`, `createPaymentLink`, `startTierCheckout`) correctly routes through `window.CLAUDE_ENDPOINT` (the Worker); `callClaude` is the sole exception.

This is almost certainly the single highest-impact bug on this list — it breaks every AI feature in the product, not just AI Studio.

**Fix:** Point `callClaude` at `${workerUrl}/` (the Worker's existing Claude proxy endpoint, already correctly implemented and verified working via curl last session) instead of Anthropic directly.

## Bug 4 — GitHub login error page after authenticating

**Partially diagnosed, not fixable via app code.** Clicked "Continue with GitHub" and confirmed the redirect to GitHub's login page is correctly formed: real `client_id`, and `redirect_uri=https://ydxshxiemmdygumddzyx.supabase.co/auth/v1/callback` (Supabase's own fixed callback endpoint). This proves the GitHub OAuth provider **is** enabled and configured with valid credentials in Supabase — the failure is not "provider not enabled."

I could not complete the loop without real GitHub credentials (not something to fake). But there is no custom OAuth callback-handling code anywhere in `App.jsx` — the app relies entirely on Supabase's client-side automatic `detectSessionInUrl` behavior to pick up the session after GitHub redirects back through Supabase. Given the initiation side is correctly configured, the most likely failure point is **Supabase's Redirect URL allowlist** (Authentication → URL Configuration → Redirect URLs) not including the production origin (`https://runescript.netlify.app`) — Supabase shows its own error page if the post-auth redirect target isn't allowlisted, which matches "error page after authenticating" exactly.

**Action needed (owner, not code):** Check Supabase Dashboard → Authentication → URL Configuration → Redirect URLs includes `https://runescript.netlify.app` and `https://runescript.netlify.app/**`. I don't have Supabase management API access to check or fix this myself (only the client-safe anon key).

## Bug 5 — Search doesn't work

**Investigated, not confirmed as broken.** Tested the global search box with a fresh, empty account (0 prospects/pitches/proposals) — it correctly opened a results dropdown and correctly reported "NO RESULTS FOR 'plumbing'", which is accurate for an account with no data. I was not able to test search *with* real data this pass (would need seeded prospects first). Will retest with real data during Phase 2/6 verification before concluding this is fixed or was never actually broken.

## Bug 6 & 7 — No onboarding slideshow / "Watch the Tour" does nothing (SHARED ROOT CAUSE)

**Root cause found via code inspection, confirmed by absence:** `showOnboarding` state exists, `setShowOnboarding(true)` is correctly called both on new-user signup and via the Settings "Watch Tour Again" button (through a `showOnboarding` CustomEvent → window listener → state update chain that is itself correctly wired). The `OnboardingSlideshow` component itself is fully built and correct. But **nothing anywhere in the file actually renders `<OnboardingSlideshow>`** conditionally on `showOnboarding` being true. The state updates; nothing visible happens. Confirmed via `grep` — zero matches for `showOnboarding&&` or `<OnboardingSlideshow` anywhere in the render tree.

**Fix (applied):** Added `{showOnboarding&&<OnboardingSlideshow userName={user?.name} onClose={...}/>}` at the top level of the main app render, alongside the other modal-level components (`ToastDock`, `ShortcutsOverlay`, `CommandPalette`).

## Bug 8 — Pay Link button "can't find it"

**Confirmed present in code and in the live deployed bundle** (verified via curl against the live bundle). Most likely explanation: the owner couldn't reach it because Agency OS was white-screening (Bug 1) before they could ever get to the Invoices tab. Also a real, separate issue: it's a small ghost-style text button among several similar buttons on each invoice card — not very visually prominent. Will improve its visibility once Bug 1 is fixed and it's actually reachable to look at.

## Bug 9 — Section reorder "can't find it"

**Confirmed present in code and in the live deployed bundle.** The "🧩 Reorder Sections" button only renders once a page has actually been built (`currentHtml` must be truthy) — and building a page requires a working AI call, which was completely broken (Bug 3). The owner very likely never got past building a single page to ever see the button. Will also make it more visually prominent (a "visible affordance/handle" per the original ask) once Bug 3 is fixed and it's actually reachable.

## Unconfirmed / minor observations (not on the original list)

- Dashboard shows two near-duplicate greetings stacked ("Good afternoon, Triage" and "Good afternoon, Triage." right below it) — looks like two separate components each rendering their own greeting. Cosmetic, low priority, will check during Phase 6 pass.
- Saw one intermittent `401` on a Supabase `invoices` REST query on first dashboard load; did not reproduce on retry. Possibly a token-refresh race on the very first load right after signup. Not chasing further without a reliable repro — will watch for it during the full Phase 6 pass.

## Fix order (per the brief: crashes first, since 1 & 2 share a cause)
1. Bug 1 & 2 (shared) — `showLibrary`/`savedOutputs`/`brand` fix
2. Bug 3 — `callClaude` Worker routing fix (highest impact — unblocks Bug 8 and 9's reachability too)
3. Bug 6 & 7 (shared) — already fixed, needs browser verification
4. Bug 8 — verify reachable now, improve visual prominence
5. Bug 9 — verify reachable now, improve visual prominence
6. Bug 5 — retest with real data
7. Bug 4 — document for owner, not app-code-fixable
