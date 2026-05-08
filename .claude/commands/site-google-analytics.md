# Google Analytics (GA4) Setup

Add GA4 to a Vite + React site with lazy loading, environment gating, and no render-blocking.

## Design principles

- GA loads after `window.load` so it never blocks FCP or LCP
- The measurement ID is injected at build time via a Vite plugin so dev builds are GA-free
- The GA block is stripped entirely in dev/staging — it never loads on non-prod environments
- All pageviews (including bounces) are tracked because the script loads on every visit, not on interaction

## Steps

1. Add the GA block to `index.html` between comment markers so the Vite plugin can substitute or strip it:

```html
<!-- GA_START -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
  window.addEventListener('load', function() {
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    s.async = true;
    document.head.appendChild(s);
  });
</script>
<!-- GA_END -->
```

   The literal string `GA_MEASUREMENT_ID` is replaced at build time by the Vite plugin below.

2. In `vite.config.ts`, add an `htmlPlugin` that:
   - When `VITE_GA_ID` is set: replaces `GA_MEASUREMENT_ID` with the actual ID, strips the comment markers
   - When `VITE_GA_ID` is empty: removes the entire `<!-- GA_START -->...<!-- GA_END -->` block

   ```typescript
   const htmlPlugin = (gaId: string): Plugin => ({
     name: 'html-transform',
     transformIndexHtml(html) {
       if (gaId) {
         return html
           .replace(/GA_MEASUREMENT_ID/g, gaId)
           .replace(/\s*<!-- GA_START -->\n/, '\n      <!-- Google Analytics -->\n')
           .replace(/\n\s*<!-- GA_END -->/, '');
       }
       return html.replace(/[ \t]*<!-- GA_START -->[\s\S]*?<!-- GA_END -->\n?/g, '');
     },
   });
   ```

3. Set `VITE_GA_ID=` (empty) in `.env.development` and `VITE_GA_ID=G-XXXXXXXXXX` in `.env.production`.

4. In `scripts/prerender.mjs`, strip the GA `<script>` tag from prerendered HTML so it isn't double-loaded when the hydrated app adds it:
   ```js
   html = html.replace(
     /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"[^>]*><\/script>/g,
     ''
   );
   ```

5. Add GA event tracking helper (optional, for conversion events):
   ```typescript
   // src/lib/analytics.ts
   export function trackEvent(eventName: string, params?: Record<string, unknown>) {
     if (typeof window !== 'undefined' && window.gtag) {
       window.gtag('event', eventName, params);
     }
   }
   ```

6. Add the gtag type declaration to `src/vite-env.d.ts`:
   ```typescript
   declare function gtag(...args: unknown[]): void;
   ```

## Verification

After deploying to production:
- Open Chrome DevTools → Network tab
- Filter by `googletagmanager.com`
- Confirm the script loads after the page `load` event fires, not during initial HTML parse
- Check GA4 Realtime report to confirm hits are arriving
