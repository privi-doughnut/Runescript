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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── STRIPE: Create Trial Checkout Session ──────────────────────────────
    if (url.pathname === '/create-trial-checkout' && request.method === 'POST') {
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_ARCHON_PRICE_ID) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const { email, name, userId, origin: clientOrigin } = await request.json();
        const returnOrigin = clientOrigin || 'https://runescript.netlify.app';

        const params = new URLSearchParams({
          'payment_method_types[]': 'card',
          'mode': 'subscription',
          'customer_email': email,
          'line_items[0][price]': env.STRIPE_ARCHON_PRICE_ID,
          'line_items[0][quantity]': '1',
          'subscription_data[trial_period_days]': '30',
          'subscription_data[metadata][userId]': userId || '',
          'subscription_data[metadata][name]': name || '',
          'success_url': `${returnOrigin}/?trial=success&session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': `${returnOrigin}/?trial=cancelled`,
          'allow_promotion_codes': 'true',
        });

        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
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
      if (!env.STRIPE_SECRET_KEY) {
        return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: cors });
      }
      try {
        const sessionId = url.pathname.replace('/check-session/', '');
        const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
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
      if (!env.RESEND_API_KEY) {
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
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
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
      if (!env.GOOGLE_CLIENT_SECRET) {
        return Response.json({ error: 'Google not configured' }, { status: 500, headers: cors });
      }
      try {
        const { code, redirectUri, refreshToken, clientId } = await request.json();
        const body = new URLSearchParams();
        body.set('client_id', clientId || env.GOOGLE_CLIENT_ID || '');
        body.set('client_secret', env.GOOGLE_CLIENT_SECRET);
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
    if (!env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500, headers: cors });
    }
    try {
      const body = await request.json();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
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
