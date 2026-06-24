/**
 * RUNE SCRIPT — Claude API Proxy Worker
 * Deployed on Cloudflare Workers
 * 
 * This worker proxies requests from the frontend to Anthropic's API,
 * keeping your API key secret on the server side.
 * 
 * Setup:
 * 1. wrangler secret put ANTHROPIC_API_KEY
 * 2. wrangler deploy
 */

export default {
  async fetch(request, env) {
    // ── CORS Configuration ─────────────────────────────────────────────
    // Add your domains here after deployment
    const allowedOrigins = [
      'https://runescript.app',
      'https://www.runescript.app', 
      'https://app.runescript.app',
      'http://localhost:5173',   // Vite dev server
      'http://localhost:4173',   // Vite preview
    ];

    const origin = request.headers.get('Origin') || '';
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.netlify.app');

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // ── Handle preflight ───────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Only allow POST ────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // ── Check API key is configured ────────────────────────────────────
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      // ── Parse request body ─────────────────────────────────────────
      const body = await request.json();

      // ── Enforce model and token limits ─────────────────────────────
      // Prevent abuse by capping max_tokens
      const safeBody = {
        ...body,
        model: 'claude-sonnet-4-20250514', // Always use this model
        max_tokens: Math.min(body.max_tokens || 1400, 4000), // Cap at 4000
      };

      // ── Forward to Anthropic ───────────────────────────────────────
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(safeBody),
      });

      const data = await response.json();

      // ── Return response ────────────────────────────────────────────
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Worker error', message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
