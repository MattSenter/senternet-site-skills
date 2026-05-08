# Google Analytics (GA4) Setup

Add GA4 to a Vite + React site with lazy loading, environment gating, and no render-blocking. Automatically creates a GA4 property and retrieves the Measurement ID via the Analytics Admin API.

## Prerequisites

Run `/senternet-site-gcloud-auth` first if you haven't authenticated this machine yet (requires the `analytics.edit` scope).

## Design principles

- GA loads after `window.load` so it never blocks FCP or LCP
- The Measurement ID is injected at build time via a Vite plugin so dev builds are GA-free
- The GA block is stripped entirely in dev/staging — it never loads on non-prod environments
- All pageviews (including bounces) are tracked because the script loads on every visit, not on interaction

## Steps

### 1. Get a GA4 Measurement ID via the Analytics Admin API

Run the following to retrieve or create a GA4 property and get the Measurement ID:

**Step 1a — Get an access token:**
```bash
TOKEN=$(gcloud auth print-access-token)
```

**Step 1b — List GA accounts to find your account ID:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://analyticsadmin.googleapis.com/v1beta/accounts" | python3 -m json.tool
```

The response lists your GA accounts. Note the `name` field (e.g. `accounts/123456`). If there's only one account, use it automatically. If there are multiple, show the list and ask the user which account to use.

**Step 1c — Check if a property already exists for this domain:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/ACCOUNT_ID" | python3 -m json.tool
```

If a property matching the site's domain exists, use it (skip to step 1e). If not, create one.

**Step 1d — Create a new GA4 property:**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "APP_NAME",
    "timeZone": "America/New_York",
    "currencyCode": "USD",
    "parent": "accounts/ACCOUNT_ID",
    "industryCategory": "TECHNOLOGY"
  }' \
  "https://analyticsadmin.googleapis.com/v1beta/properties" | python3 -m json.tool
```

Note the `name` field from the response (e.g. `properties/789012`).

**Step 1e — Create a web data stream to get the Measurement ID:**
```bash
MEASUREMENT_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "DOMAIN web stream",
    "type": "WEB_DATA_STREAM",
    "webStreamData": {
      "defaultUri": "https://DOMAIN"
    }
  }' \
  "https://analyticsadmin.googleapis.com/v1beta/PROPERTY_NAME/dataStreams" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['webStreamData']['measurementId'])")

echo "Measurement ID: $MEASUREMENT_ID"
```

If any step fails with a 403, the token is missing the analytics scope. Run `/senternet-site-gcloud-auth` again — it re-auths with the required scopes.

If the user already has a Measurement ID they want to use, accept it and skip the API steps above.

### 2. Add the GA block to `index.html`

Insert between comment markers so the Vite plugin can substitute or strip it:

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

### 3. Add the `htmlPlugin` to `vite.config.ts`

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

### 4. Set `VITE_GA_ID` in env files

```bash
# .env.development — GA disabled in dev
VITE_GA_ID=

# .env.production — use the Measurement ID retrieved above
VITE_GA_ID=G-XXXXXXXXXX
```

### 5. Strip GA script from prerendered HTML

In `scripts/prerender.mjs`, strip the GA `<script>` tag so it isn't double-loaded when the hydrated app adds it:

```js
html = html.replace(
  /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"[^>]*><\/script>/g,
  ''
);
```

### 6. Add GA event tracking helper

```typescript
// src/lib/analytics.ts
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}
```

### 7. Add gtag type declaration

In `src/vite-env.d.ts`:
```typescript
declare function gtag(...args: unknown[]): void;
```

## Verification

After deploying to production:
- Open Chrome DevTools → Network tab
- Filter by `googletagmanager.com`
- Confirm the script loads after the page `load` event fires, not during initial HTML parse
- Check GA4 Realtime report to confirm hits are arriving
