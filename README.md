# Free Market Abundance (freemarketabundance.com)

Static site plus one tiny Worker route. Deployed as a Cloudflare Worker with static assets (same pattern as Pollfinity-site).

```
wrangler.jsonc       Cloudflare config: serve public/ as static assets, run src/worker.js for /api/*
src/worker.js        POST /api/sign stores signatures in KV (binding SIGNUPS); GET /api/count
package.json         wrangler dev dependency only
public/
  index.html         The Free Market Abundance page (working draft 9, Nov 8 2026)
  404.html           Not-found page
  _headers           Security headers (Cloudflare static assets read this file)
  robots.txt
  sitemap.xml
```

## Cloudflare Workers Builds settings

| Setting | Value |
|---|---|
| Project name | `freemarketabundance` |
| Production branch | `main` |
| Build command | (leave empty) |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

Push to `main` = production deploy. Pull requests get a preview URL.

## Signups

Without a KV binding the form reports that signups are not open and records nothing. To go live:

```
npx wrangler kv namespace create SIGNUPS
```

Paste the printed id into the `kv_namespaces` block in `wrangler.jsonc` (it is there, commented out), push, done. Records are stored as `sig:<email>`; `meta:count` holds the running total.

## Editing the page

`public/index.html` is a single file with inline CSS and JS. Google Fonts is the only external request. Local preview: `npx wrangler dev`.
