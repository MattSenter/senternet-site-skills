---
name: senternet-site-google-analytics
description: Add GA4 with build-time env gating and lazy loading.
---

# Google Analytics (GA4) Setup

Add GA4 to a Vite + React site with lazy loading, environment gating, and no render-blocking. Automatically links the Firebase project to Google Analytics, creates or reuses a GA4 property, and retrieves the Measurement ID via the Analytics Admin API.

## Prerequisites

Run `/senternet-site-gcloud-auth` first if you haven't authenticated this machine yet (requires the `analytics.edit` scope). The auth skill should try the browser-based Google login flow on behalf of the user before asking them to do anything manually; only fall back to an explicit command if that browser flow cannot complete in this environment.

If the site already has a Firebase project, make sure the Firebase project is linked to Google Analytics before wiring the Measurement ID. An unlinked Firebase project will still show "Get started" in the console even if the website code is sending GA hits.

## Design principles

- GA loads after `window.load` so it never blocks FCP or LCP
- The Measurement ID is injected at build time via a Vite plugin so dev builds are GA-free
- The GA block is stripped entirely in dev/staging — it never loads on non-prod environments
- All pageviews (including bounces) are tracked because the script loads on every visit, not on interaction

## Steps

### 1. Link the Firebase project to Google Analytics

If the Firebase project is not yet linked, use the Firebase Management API to enable Analytics for the project first.

**Step 1a — Check whether Analytics is already linked:**
```bash
node .claude/skills/senternet-site-google-analytics/scripts/check-firebase-analytics.mjs --project PROJECT_ID
```

The helper prints the exact Firebase project ID it checked. If it reports `Firebase Analytics link: linked`, stop here and continue to step 2. If it reports `Firebase Analytics link: not linked` or exits with code `2`, continue to step 1b.

**Step 1b — Link the Firebase project to an existing GA account:**
```bash
TOKEN=$(gcloud auth print-access-token)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analyticsAccountId": "ACCOUNT_ID"
  }' \
  "https://firebase.googleapis.com/v1beta1/projects/PROJECT_ID:addGoogleAnalytics" | python3 -m json.tool
```

Use the Google Analytics account that should own the site's property. If the project already has a linked property and the user wants to keep it, do not call this endpoint again with a different property ID.

Poll the returned `Operation` with `operations.get` until `done` is `true` if Firebase reports the link as still provisioning.

If the call fails with `403`, re-run `/senternet-site-gcloud-auth` and confirm the Google account has Owner access to the Firebase project and Edit access to the GA account.

If the project is still unlinked or auth is missing, do not stop at a generic handoff. Attempt the browser-based auth flow immediately, then retry the link check:
```bash
gcloud auth login \
  --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics

gcloud auth application-default login \
  --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics

firebase login --reauth
```

If the browser flow fails because the environment cannot open a browser or complete interactive auth, show the user the exact command to run next. For headless sessions, use:
```bash
gcloud auth login --no-browser --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
gcloud auth application-default login --no-browser --scopes=openid,email,profile,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/analytics
firebase login --reauth --no-localhost
```

### 2. Get a GA4 Measurement ID via the Analytics Admin API

Run the following to retrieve or create a GA4 property and get the Measurement ID:

**Step 2a — Get an access token:**
```bash
TOKEN=$(gcloud auth print-access-token)
```

**Step 2b — List GA accounts to find your account ID:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://analyticsadmin.googleapis.com/v1beta/accounts" | python3 -m json.tool
```

The response lists your GA accounts. Note the `name` field (e.g. `accounts/123456`). If there's only one account, use it automatically. If there are multiple, show the list and ask the user which account to use.

**Step 2c — Check if a property already exists for this domain:**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/ACCOUNT_ID" | python3 -m json.tool
```

If a property matching the site's domain exists, use it (skip to step 2e). If not, create one.

**Step 2d — Create a new GA4 property:**
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

**Step 2e — Create a web data stream to get the Measurement ID:**
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

If any step fails with a 403, the token is missing the analytics scope. Run `/senternet-site-gcloud-auth` again, and try the browser-based auth commands above before telling the user they need to intervene.

If the user already has a Measurement ID they want to use, accept it and skip the API steps above.

### 3. Add the GA block to `index.html`

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

### 4. Add the `htmlPlugin` to `vite.config.ts`

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

### 5. Set `VITE_GA_ID` in env files

```bash
# .env.development — GA disabled in dev
VITE_GA_ID=

# .env.production — use the Measurement ID retrieved above
VITE_GA_ID=G-XXXXXXXXXX
```

### 6. Strip GA script from prerendered HTML

In `scripts/prerender.mjs`, strip the GA `<script>` tag so it isn't double-loaded when the hydrated app adds it:

```js
html = html.replace(
  /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"[^>]*><\/script>/g,
  ''
);
```

### 7. Add GA event tracking helper

```typescript
// src/lib/analytics.ts
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}
```

### 8. Add gtag type declaration

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
