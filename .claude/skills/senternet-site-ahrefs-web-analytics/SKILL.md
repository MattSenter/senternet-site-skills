---
name: senternet-site-ahrefs-web-analytics
description: Add Ahrefs Web Analytics with build-time env gating and lazy loading, as an alternative or addition to Google Analytics.
---

# Ahrefs Web Analytics Setup

Add Ahrefs Web Analytics to a Vite + React site with lazy loading, environment gating, and no render-blocking. Ahrefs Web Analytics is a free, privacy-friendly, cookieless visitor-tracking snippet, so there is no cookie banner and no consent gate to wire up. Use it as an alternative to Google Analytics, or alongside it — the two don't conflict.

This is Ahrefs **Web Analytics** (a first-party visitor-tracking snippet you embed on the site). It is not the Ahrefs Site Audit / API work covered by `/senternet-site-ahrefs-audit`, and it does not need the Ahrefs MCP server.

## Prerequisites

None beyond an Ahrefs account. Unlike GA4, there is no Firebase Console linking and no gcloud or Analytics Admin API step — Ahrefs Web Analytics is independent of Firebase and Google.

## Design principles

- The snippet loads after `window.load` so it never blocks FCP or LCP
- The tracking key is injected at build time via a Vite plugin so dev builds are analytics-free
- The block is stripped entirely in dev/staging — it never loads on non-prod environments
- All pageviews (including bounces) are tracked because the script loads on every visit, not on interaction

## Steps

### 1. Get the Ahrefs Web Analytics tracking key

1. Sign in to the Ahrefs dashboard and open **Web Analytics**.
2. Add the website/project for this site's domain.
3. Ahrefs generates an install snippet of the form:
   ```html
   <script src="https://analytics.ahrefs.com/analytics.js" data-key="YOUR_KEY" async></script>
   ```
4. Copy the `data-key` value — that is the only value this skill needs.

If the user already has a key, accept it and skip the dashboard steps.

### 2. Add the Ahrefs block to `index.html`

Insert between comment markers so the Vite plugin can substitute or strip it:

```html
<!-- AHREFS_START -->
<script>
  window.addEventListener('load', function() {
    if (document.querySelector('script[src*="analytics.ahrefs.com/analytics.js"]')) return;
    var s = document.createElement('script');
    s.src = 'https://analytics.ahrefs.com/analytics.js';
    s.setAttribute('data-key', 'AHREFS_ANALYTICS_KEY');
    s.async = true;
    document.head.appendChild(s);
  });
</script>
<!-- AHREFS_END -->
```

The literal string `AHREFS_ANALYTICS_KEY` is replaced at build time by the Vite plugin below.

### 3. Extend the `htmlPlugin` in `vite.config.ts`

Mirror the existing GA branch: when the key is set, substitute the placeholder and unwrap the markers; when it is empty, strip the whole block. If the site already has the GA `htmlPlugin`, add the Ahrefs handling alongside it rather than creating a second plugin.

```typescript
const htmlPlugin = (gaId: string, ahrefsKey: string): Plugin => ({
  name: 'html-transform',
  transformIndexHtml(html) {
    // ... existing GA handling ...

    if (ahrefsKey) {
      html = html
        .replace(/AHREFS_ANALYTICS_KEY/g, ahrefsKey)
        .replace(/\s*<!-- AHREFS_START -->\n/, '\n      <!-- Ahrefs Web Analytics -->\n')
        .replace(/\n\s*<!-- AHREFS_END -->/, '');
    } else {
      html = html.replace(/[ \t]*<!-- AHREFS_START -->[\s\S]*?<!-- AHREFS_END -->\n?/g, '');
    }

    return html;
  },
});
```

Pass `env.VITE_AHREFS_ANALYTICS_KEY` into the plugin the same way the Measurement ID is passed.

### 4. Set `VITE_AHREFS_ANALYTICS_KEY` in env files

```bash
# .env.development — Ahrefs Web Analytics disabled in dev
VITE_AHREFS_ANALYTICS_KEY=

# .env.production — use the data-key retrieved above
VITE_AHREFS_ANALYTICS_KEY=your-ahrefs-key
```

### 5. Strip the Ahrefs script from prerendered HTML

In `scripts/prerender.mjs`, strip the Ahrefs `<script>` tag so it isn't double-loaded when the hydrated app adds it (mirror the GA prerender-strip):

```js
html = html.replace(
  /<script[^>]*src="https:\/\/analytics\.ahrefs\.com\/analytics\.js[^"]*"[^>]*><\/script>/g,
  ''
);
```

## Verification

After deploying to production:
- Open Chrome DevTools → Network tab
- Filter by `analytics.ahrefs.com`
- Confirm the script loads after the page `load` event fires, not during initial HTML parse
- Check the Ahrefs Web Analytics dashboard to confirm visits are arriving
