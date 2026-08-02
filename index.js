// Rune Script — Cloudflare Worker
// Handles: Claude API proxy + Stripe Checkout for trial

// The live site now runs on the Cloudflare Worker's own domain (frontend +
// API served from the same origin), so most requests are same-origin and
// don't need CORS at all — but the fallback default must be the live origin,
// not the old Netlify one, or any genuinely cross-origin call (or a strict
// preflight) gets an allow-origin that doesn't match and fails.
const LIVE_ORIGIN = 'https://runescript.its-the-prithivi-show.workers.dev';
const ALLOWED_ORIGINS = [LIVE_ORIGIN, 'https://runescript.netlify.app', 'https://runescript.app'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin?.endsWith('.netlify.app') || origin?.endsWith('.workers.dev') ? origin : LIVE_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Supabase project the app authenticates against. The anon key is PUBLIC by
// design (it only grants what RLS allows) — safe to hardcode in the Worker.
const SUPABASE_AUTH_URL = 'https://ydxshxiemmdygumddzyx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHNoeGllbW1keWd1bWRkenl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Nzc0MzYsImV4cCI6MjA5ODA1MzQzNn0.Huaa2WXjKu5LLHacQVoa3Ya_P5WvbbDe7kKdQUhgDYw';

// Verifies the caller is a real logged-in user by validating their Supabase
// access token against Supabase Auth. This gates the cost-bearing endpoints
// (Claude proxy, Resend) so a stranger can't drain the API keys — CORS alone
// does NOT stop non-browser requests. Returns true if the token maps to a user.
async function verifySupabaseUser(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  try {
    const r = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  } catch (e) { return false; }
}

// Maps each tier to the Cloudflare secret name holding its Stripe price ID.
// All 5 are provisioned as secrets in the dashboard — none hardcoded here.
const TIER_PRICE_ENV_KEYS = {
  seeker: 'STRIPE_SEEKER_PRICE_ID',
  scribe: 'STRIPE_SCRIBE_PRICE_ID',
  archon: 'STRIPE_ARCHON_PRICE_ID',
  sovereign: 'STRIPE_SOVEREIGN_PRICE_ID',
  warden: 'STRIPE_WARDEN_PRICE_ID',
};

// ── EMAIL SEQUENCE SCHEDULER: send due steps ────────────────────────────────
// Requires the SUPABASE_SERVICE_ROLE_KEY secret (bypasses RLS so it can send
// across all users' queued sends, not just one). Idempotent: only touches
// rows where sent = false, and marks each sent immediately after a
// successful Resend call, so re-running (cron retry, or the on-load
// fallback below firing twice) never double-sends.
const SUPABASE_URL = 'https://ydxshxiemmdygumddzyx.supabase.co';

async function processDueSequenceSends(env) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = env['RUNESCRIPT(RESEND)_API_KEY'];
  if (!serviceKey || !resendKey) {
    return { skipped: true, reason: 'SUPABASE_SERVICE_ROLE_KEY or Resend key not configured' };
  }
  const nowIso = new Date().toISOString();
  const dueResp = await fetch(
    `${SUPABASE_URL}/rest/v1/sequence_sends?sent=eq.false&send_at=lte.${encodeURIComponent(nowIso)}&select=id,send_at,sequence_enrollments(contact_email,contact_name,status),sequence_steps(subject,body)&limit=200`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!dueResp.ok) {
    return { error: `Supabase query failed: ${dueResp.status} ${await dueResp.text()}` };
  }
  const due = await dueResp.json();
  let sent = 0, failed = 0, skippedInactive = 0;
  for (const row of due) {
    const enrollment = row.sequence_enrollments;
    const step = row.sequence_steps;
    if (!enrollment || !step || enrollment.status !== 'active') { skippedInactive++; continue; }
    try {
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Rune Script <onboarding@resend.dev>',
          to: [enrollment.contact_email],
          subject: step.subject || '(no subject)',
          html: (step.body || '').replace(/\n/g, '<br/>'),
        }),
      });
      const emailData = await emailResp.json();
      if (emailData.error) throw new Error(emailData.error.message || 'Resend error');
      await fetch(`${SUPABASE_URL}/rest/v1/sequence_sends?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent: true, sent_at: new Date().toISOString() }),
      });
      sent++;
    } catch (e) {
      failed++;
    }
  }
  return { checked: due.length, sent, failed, skippedInactive };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── STRIPE: Create Checkout Session (all 5 tiers) ───────────────────────
    // Archon keeps its 30-day trial; the other four are plain subscriptions.
    if (url.pathname === '/create-trial-checkout' && request.method === 'POST') {
      const stripeKey = env.RUNESCRIPT_STRIPE_API_KEY;
      if (!stripeKey || !env.STRIPE_ARCHON_PRICE_ID) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const { email, name, userId, origin: clientOrigin, tier } = await request.json();
        const returnOrigin = clientOrigin || 'https://runescript.netlify.app';
        const selectedTier = TIER_PRICE_ENV_KEYS.hasOwnProperty(tier) ? tier : 'archon';
        const priceId = env[TIER_PRICE_ENV_KEYS[selectedTier]];
        const isTrial = selectedTier === 'archon';
        if (!priceId) {
          return Response.json({ error: 'Price not configured for this tier' }, { status: 500, headers: cors });
        }

        const params = new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'subscription',
          'customer_email': email,
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          'subscription_data[metadata][userId]': userId || '',
          'subscription_data[metadata][name]': name || '',
          'subscription_data[metadata][tier]': selectedTier,
          'success_url': `${returnOrigin}/?trial=success&tier=${selectedTier}&session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': `${returnOrigin}/?trial=cancelled`,
          'allow_promotion_codes': 'true',
        });
        if (isTrial) params.set('subscription_data[trial_period_days]', '30');

        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const session = await resp.json();
        if (session.error) return Response.json({ error: session.error.message }, { status: 400, headers: cors });
        return Response.json({ url: session.url, sessionId: session.id }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── STRIPE: Create one-time Invoice Payment Link ────────────────────────
    // Arbitrary-amount checkout session for a single invoice, using inline
    // price_data instead of a pre-created Price — no Stripe dashboard setup.
    if (url.pathname === '/create-invoice-payment' && request.method === 'POST') {
      const stripeKey = env.RUNESCRIPT_STRIPE_API_KEY;
      if (!stripeKey) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const { amount, description, clientName } = await request.json();
        const cents = Math.round(Number(amount) * 100);
        if (!cents || cents < 1) {
          return Response.json({ error: 'Invalid amount' }, { status: 400, headers: cors });
        }
        const params = new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'payment',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(cents),
          'line_items[0][price_data][product_data][name]': description || `Invoice${clientName ? ' — ' + clientName : ''}`,
          'line_items[0][quantity]': '1',
          'success_url': 'https://runescript.netlify.app/?invoice=paid',
          'cancel_url': 'https://runescript.netlify.app/?invoice=cancelled',
        });
        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const session = await resp.json();
        if (session.error) return Response.json({ error: session.error.message }, { status: 400, headers: cors });
        return Response.json({ url: session.url, sessionId: session.id }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── STRIPE: Create one-time Template Purchase Checkout ──────────────────
    // Same shape as /create-invoice-payment (inline price_data, no pre-created
    // Stripe Price) but carries template/seller/buyer metadata through the
    // session so the frontend can record a real template_sales row after
    // /check-session confirms payment — see App.jsx MarketplacePage.
    if (url.pathname === '/create-template-checkout' && request.method === 'POST') {
      const stripeKey = env.RUNESCRIPT_STRIPE_API_KEY;
      if (!stripeKey) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const { templateId, templateName, price, sellerId, buyerId, buyerEmail } = await request.json();
        const cents = Math.round(Number(price) * 100);
        if (!cents || cents < 1) {
          return Response.json({ error: 'Invalid price' }, { status: 400, headers: cors });
        }
        const params = new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'payment',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(cents),
          'line_items[0][price_data][product_data][name]': templateName || 'Template',
          'line_items[0][quantity]': '1',
          'metadata[templateId]': templateId || '',
          'metadata[templateName]': templateName || '',
          'metadata[sellerId]': sellerId || '',
          'metadata[buyerId]': buyerId || '',
          'success_url': 'https://runescript.netlify.app/?template_purchase=success&session_id={CHECKOUT_SESSION_ID}',
          'cancel_url': 'https://runescript.netlify.app/?template_purchase=cancelled',
        });
        if (buyerEmail) params.set('customer_email', buyerEmail);
        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const session = await resp.json();
        if (session.error) return Response.json({ error: session.error.message }, { status: 400, headers: cors });
        return Response.json({ url: session.url, sessionId: session.id }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── STRIPE: Verify Session After Checkout ──────────────────────────────
    if (url.pathname.startsWith('/check-session/') && request.method === 'GET') {
      const stripeKey = env.RUNESCRIPT_STRIPE_API_KEY;
      if (!stripeKey) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const sessionId = url.pathname.replace('/check-session/', '');
        const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
        const session = await resp.json();
        return Response.json({
          status: session.status,
          customerId: session.customer,
          subscriptionId: session.subscription,
          email: session.customer_details?.email,
          name: session.customer_details?.name,
          amountTotal: session.amount_total,
          metadata: session.metadata || {},
        }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── EMAIL SEQUENCE SCHEDULER: on-load fallback trigger ──────────────────
    // The real sender is the scheduled() Cron Trigger below. This endpoint
    // does the exact same idempotent work, callable over HTTP — the frontend
    // fires it (fire-and-forget) on app load as a fallback in case the Cron
    // Trigger isn't active. Safe to call as often as anyone likes.
    if (url.pathname === '/process-sequences' && request.method === 'POST') {
      try {
        const result = await processDueSequenceSends(env);
        return Response.json(result, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── DOMAIN AVAILABILITY (real, via RDAP) ───────────────────────────────
    // RDAP is the modern, free, keyless WHOIS replacement. A 404 means the
    // domain isn't registered (available); 200 means it's taken. No API key,
    // no fabrication — real registration status. Runs server-side to avoid
    // browser CORS and follow RDAP redirects.
    if (url.pathname === '/domain-check' && request.method === 'GET') {
      const base = (url.searchParams.get('base') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!base) return Response.json({ error: 'Missing base' }, { status: 400, headers: cors });
      const tlds = ['.com', '.net', '.org', '.co', '.io', '.app', '.dev', '.design'];
      // Uses Cloudflare's own DNS-over-HTTPS (no redirects, fast, reliable from
      // a Worker). NXDOMAIN (Status 3) means the domain isn't registered =>
      // available. NOERROR with NS records => registered => taken. Anything
      // ambiguous (registered but no nameservers, SERVFAIL) => null, shown
      // honestly as "couldn't check".
      const checkOne = async (domain) => {
        try {
          const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`, { headers: { accept: 'application/dns-json' } });
          if (!r.ok) return { domain, available: null };
          const d = await r.json();
          if (d.Status === 3) return { domain, available: true };           // NXDOMAIN => not registered
          if (d.Status === 0 && Array.isArray(d.Answer) && d.Answer.some(a => a.type === 2)) return { domain, available: false }; // has NS => registered
          return { domain, available: null };
        } catch (e) { return { domain, available: null }; }
      };
      try {
        const results = await Promise.all(tlds.map(t => checkOne(base + t)));
        return Response.json({ results }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── GOOGLE PAGESPEED INSIGHTS proxy ────────────────────────────────────
    // Real Lighthouse performance + Core Web Vitals for the Site Analyzer.
    // Runs server-side so the API key (PAGESPEED_API_KEY Cloudflare secret)
    // is shared across ALL users and never exposed client-side. Works keyless
    // too, but Google's anonymous shared quota is usually exhausted — set the
    // secret for reliable use (see OWNER_TODO).
    if (url.pathname === '/pagespeed' && request.method === 'GET') {
      const target = url.searchParams.get('url');
      if (!target) return Response.json({ error: 'Missing url' }, { status: 400, headers: cors });
      try {
        const key = env.PAGESPEED_API_KEY;
        const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&category=performance&strategy=mobile${key ? `&key=${key}` : ''}`;
        const resp = await fetch(api);
        const data = await resp.json();
        if (data.error) {
          const msg = data.error.message || 'PageSpeed error';
          const quota = /quota|rate limit/i.test(msg);
          return Response.json({ error: msg, quota: quota && !key }, { status: 400, headers: cors });
        }
        const lh = data.lighthouseResult || {}; const au = lh.audits || {};
        return Response.json({
          score: Math.round((lh.categories?.performance?.score ?? 0) * 100),
          metrics: [
            ['Largest Contentful Paint', 'largest-contentful-paint'],
            ['Cumulative Layout Shift', 'cumulative-layout-shift'],
            ['First Contentful Paint', 'first-contentful-paint'],
            ['Total Blocking Time', 'total-blocking-time'],
            ['Speed Index', 'speed-index'],
          ].filter(([, id]) => au[id]?.displayValue).map(([k, id]) => ({ k, v: au[id].displayValue, s: au[id].score })),
        }, { headers: cors });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── RESEND: Send Email ─────────────────────────────────────────────────
    if (url.pathname === '/send-email' && request.method === 'POST') {
      // Gated: only a logged-in user can send mail, so a stranger can't abuse
      // the Resend account for spam (which would also wreck sender reputation).
      if (!(await verifySupabaseUser(request))) {
        return Response.json({ error: 'Sign in required.' }, { status: 401, headers: cors });
      }
      const resendKey = env['RUNESCRIPT(RESEND)_API_KEY'];
      if (!resendKey) {
        return Response.json({ error: 'Resend not configured' }, { status: 500, headers: cors });
      }
      try {
        const { to, subject, html, from } = await request.json();
        if (!to || !subject || !html) {
          return Response.json({ error: 'Missing to, subject, or html' }, { status: 400, headers: cors });
        }
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from || 'Rune Script <onboarding@resend.dev>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
          }),
        });
        const data = await resp.json();
        if (data.error) return Response.json({ error: data.error.message || 'Send failed' }, { status: 400, headers: cors });
        return Response.json({ id: data.id, sent: true }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── GOOGLE CALENDAR: OAuth token exchange ──────────────────────────────
    // Exchanges an auth code (or refresh token) for an access token. Keeps the
    // client secret server-side. Frontend sends { code, redirectUri } on first
    // connect, or { refreshToken } to refresh.
    if (url.pathname === '/google-auth' && request.method === 'POST') {
      const googleSecret = env.RUNESCRIPT_GOOGLE_CLIENT_SECRET;
      if (!googleSecret) {
        return Response.json({ error: 'Google not configured' }, { status: 500, headers: cors });
      }
      try {
        const { code, redirectUri, refreshToken, clientId } = await request.json();
        const body = new URLSearchParams();
        body.set('client_id', clientId || env.GOOGLE_CLIENT_ID || '');
        body.set('client_secret', googleSecret);
        if (refreshToken) {
          body.set('refresh_token', refreshToken);
          body.set('grant_type', 'refresh_token');
        } else {
          if (!code || !redirectUri) {
            return Response.json({ error: 'Missing code or redirectUri' }, { status: 400, headers: cors });
          }
          body.set('code', code);
          body.set('redirect_uri', redirectUri);
          body.set('grant_type', 'authorization_code');
        }
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        const data = await resp.json();
        if (data.error) return Response.json({ error: data.error_description || data.error }, { status: 400, headers: cors });
        return Response.json(data, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── GOOGLE CALENDAR: create / list events ──────────────────────────────
    // Proxies calendar requests using an access token passed from the client.
    // action: 'create' (needs event), 'list' (needs timeMin/timeMax), 'freebusy'.
    if (url.pathname === '/calendar-event' && request.method === 'POST') {
      try {
        const { accessToken, action, event, timeMin, timeMax } = await request.json();
        if (!accessToken) return Response.json({ error: 'Missing access token' }, { status: 400, headers: cors });
        const auth = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        if (action === 'create') {
          const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST', headers: auth, body: JSON.stringify(event),
          });
          const data = await resp.json();
          if (data.error) return Response.json({ error: data.error.message || 'Create failed' }, { status: 400, headers: cors });
          return Response.json({ id: data.id, htmlLink: data.htmlLink, created: true }, { headers: cors });
        }

        if (action === 'list') {
          const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime' });
          const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: auth });
          const data = await resp.json();
          if (data.error) return Response.json({ error: data.error.message }, { status: 400, headers: cors });
          return Response.json({ items: data.items || [] }, { headers: cors });
        }

        if (action === 'freebusy') {
          const resp = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST', headers: auth,
            body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
          });
          const data = await resp.json();
          if (data.error) return Response.json({ error: data.error.message }, { status: 400, headers: cors });
          return Response.json({ busy: data.calendars?.primary?.busy || [] }, { headers: cors });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400, headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── CLAUDE API PROXY ───────────────────────────────────────────────────
    // Deliberately NOT mounted at "/" — this Worker also serves the built
    // frontend as static assets (see wrangler.toml [assets]), and "/" always
    // resolves to index.html at the assets layer before any request reaches
    // this fetch handler, regardless of HTTP method. A POST/OPTIONS to "/"
    // was returning 405 from the assets layer itself, breaking every AI
    // feature in the app (Prospect Scanner, Pitch Generator, AI Studio, Site
    // Builder, all route through this one endpoint). Moved to a path that
    // can't collide with a static file.
    if (url.pathname === '/api/claude' && request.method === 'POST') {
      // Gated: only a logged-in user can use the AI proxy, so a stranger
      // can't drain the Anthropic key by hitting this endpoint directly.
      if (!(await verifySupabaseUser(request))) {
        return Response.json({ error: 'Sign in to use AI features.' }, { status: 401, headers: cors });
      }
      const anthropicKey = env.RUNESCRIPT_API_KEY;
      if (!anthropicKey) {
        return Response.json({ error: 'API key not configured' }, { status: 500, headers: cors });
      }
      try {
        const body = await request.json();
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            ...body,
            model: 'claude-sonnet-5',
            max_tokens: Math.min(body.max_tokens || 1400, 8000),
          }),
        });
        const data = await response.json();
        return Response.json(data, { status: response.status, headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: cors });
  },

  // Cloudflare Cron Trigger entry point — configured via the Cloudflare API
  // (schedules endpoint) since wrangler.toml isn't used for deploys here.
  // See OWNER_TODO.md to confirm the trigger is active in the dashboard.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processDueSequenceSends(env));
  },
};
