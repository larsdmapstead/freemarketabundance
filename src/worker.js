/**
 * freemarketabundance.com Worker
 *
 * Static assets in public/ are served by Cloudflare. This script only handles
 * POST /api/sign (the signature forms on the page). Everything else falls
 * through to the static assets.
 *
 * Storage: a KV namespace bound as SIGNUPS. Until that binding exists the
 * endpoint answers 503 and the page tells the visitor honestly that nothing
 * was recorded. Add the binding (see wrangler.jsonc) and signups go live with
 * no change to the page.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sign') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method' }, 405);
      }
      if (!env.SIGNUPS) {
        // Not wired up yet. The page shows its "not open yet, nothing recorded" state.
        return json({ ok: false, error: 'not_open' }, 503);
      }

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim().slice(0, 120);
      const source = String(body.source || '').slice(0, 40);
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return json({ ok: false, error: 'bad_email' }, 400);
      }

      const key = 'sig:' + email;
      const existing = await env.SIGNUPS.get(key);
      if (!existing) {
        const record = {
          email,
          name,
          source,
          signed_at: new Date().toISOString(),
          ip_country: request.headers.get('cf-ipcountry') || '',
          ua: (request.headers.get('user-agent') || '').slice(0, 200),
        };
        await env.SIGNUPS.put(key, JSON.stringify(record));
        // Running count, best effort (KV is eventually consistent; good enough for a public counter).
        const n = parseInt((await env.SIGNUPS.get('meta:count')) || '0', 10) + 1;
        await env.SIGNUPS.put('meta:count', String(n));
      }
      return json({ ok: true, already: Boolean(existing) }, 200);
    }

    if (url.pathname === '/api/count' && request.method === 'GET') {
      if (!env.SIGNUPS) return json({ ok: false, error: 'not_open' }, 503);
      const n = parseInt((await env.SIGNUPS.get('meta:count')) || '0', 10);
      return json({ ok: true, count: n }, 200, 60);
    }

    // Everything else: static assets from public/
    return env.ASSETS.fetch(request);
  },
};

function json(obj, status, maxAge) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}
