// Rune Script — Cloudflare Worker
// Handles: Claude API proxy + Stripe Checkout for trial

const ALLOWED_ORIGINS = ['https://runescript.netlify.app', 'https://runescript.app'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin?.endsWith('.netlify.app') ? origin : 'https://runescript.netlify.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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
        }, { headers: cors });
      } catch(e) {
        return Response.json({ error: e.message }, { status: 500, headers: cors });
      }
    }

    // ── RESEND: Send Email ─────────────────────────────────────────────────
    if (url.pathname === '/send-email' && request.method === 'POST') {
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: Math.min(body.max_tokens || 1400, 4000),
        }),
      });
      const data = await response.json();
      return Response.json(data, { status: response.status, headers: cors });
    } catch(e) {
      return Response.json({ error: e.message }, { status: 500, headers: cors });
    }
  }
};
