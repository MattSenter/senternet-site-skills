---
name: senternet-site-firebase
description: Set up Firebase Hosting, custom domains, project IDs, headers, and deploy scripts.
---

# Firebase Hosting Setup

Add Firebase Hosting to a Vite + React site with optimal caching, security headers, custom domain handoff, and multi-environment deployment. Can be run on a fresh project or re-run later to add a missing environment or finish domain setup.

## Prerequisites

Run `/senternet-site-gcloud-auth` first if you haven't authenticated this machine yet.
Project creation only works when both `gcloud` and `firebase` are logged into the Google account that owns the target projects.

## Steps

### 1. Install Firebase CLI if not present

```bash
which firebase || npm install -g firebase-tools
```

### 2. Derive and confirm the Firebase project prefix

Derive a prefix from the site name (lowercase, hyphens, strip trailing `-site`):
```bash
# e.g. site name "myapp-site" → prefix "myapp"
# e.g. site name "my-marketing-site" → prefix "my-marketing"
# e.g. site name "myapp" → prefix "myapp"
```

Show the user the derived prefix and ask them to confirm or override it before proceeding. This prefix is used as `$PREFIX-dev` and `$PREFIX-prod` for Firebase project IDs. The Firebase project display name must always match the project ID exactly.

Also derive the canonical public host from the site domain when available. Default to `www.DOMAIN.com` as the primary host and `DOMAIN.com` as the apex that redirects to `www.DOMAIN.com` unless the user explicitly prefers the apex as canonical.

### 3. Determine which environments to set up

Check if `.firebaserc` already exists:
```bash
cat .firebaserc 2>/dev/null
```

**If `.firebaserc` does not exist** — ask the user which environments to create:
- Dev only (`$PREFIX-dev`)
- Prod only (`$PREFIX-prod`)
- Both dev and prod

**If `.firebaserc` already exists** — read it to determine which environments are already configured. Only ask about creating the missing one(s). If both are already present, confirm the config looks correct and exit.

### 4. Check which Firebase projects already exist

```bash
firebase projects:list 2>/dev/null | grep "$PREFIX"
```

Note which of `$PREFIX-dev` and `$PREFIX-prod` already exist so you don't try to recreate them.
If `firebase projects:list` fails with an auth error or returns nothing because the CLI session expired, try `firebase login --reauth` first and then run `firebase projects:list` again. If that succeeds, continue. If it still fails, run `/senternet-site-gcloud-auth` and follow the Firebase reauth prompts there before continuing.

### 5. Create Firebase projects for selected environments

For **prod** (if it doesn't already exist):
```bash
firebase projects:create $PREFIX-prod --display-name "$PREFIX-prod"
```
Immediately confirm it shows up in `firebase projects:list`. If it does not, stop and report the failure instead of assuming the project was created.

For **dev** (if selected and doesn't already exist) — ask the user whether to create it or skip creation (e.g. they'll create it manually or it already exists under a different account):
```bash
# Only run if user confirms they want to create it
firebase projects:create $PREFIX-dev --display-name "$PREFIX-dev"
```
Immediately confirm it shows up in `firebase projects:list`. If it does not, stop and report the failure instead of assuming the project was created.

If creation fails with "project ID already taken", check if the user owns it via `firebase projects:list`. If they do, proceed — the project exists and we'll just reference it. If they don't own it, ask them to choose a different prefix.
If creation fails because the Firebase session expired, run `firebase login --reauth`, re-run `firebase projects:list`, and only retry project creation after the reauth succeeds.

### 6. Write `firebase.json`

Only write if it doesn't already exist (re-run should not overwrite):

```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "cleanUrls": true,
    "trailingSlash": false,
    "headers": [
      {
        "source": "**/*.@(js|css|webp|png|jpg|jpeg|svg|woff2|woff|ico)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.@(html|json)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
        ]
      }
    ]
  }
}
```

### 7. Write `.firebaserc`

Write only the environments that have been set up (now or previously):

**Both environments:**
```json
{
  "projects": {
    "default": "$PREFIX-prod",
    "dev": "$PREFIX-dev",
    "prod": "$PREFIX-prod"
  }
}
```

**Prod only:**
```json
{
  "projects": {
    "default": "$PREFIX-prod",
    "prod": "$PREFIX-prod"
  }
}
```

**Dev only:**
```json
{
  "projects": {
    "default": "$PREFIX-dev",
    "dev": "$PREFIX-dev"
  }
}
```

### 8. Add deploy scripts to `package.json`

`deploy:prod` is always required. `deploy:dev` is only added if a dev environment was set up. On re-run, add the new script without touching existing ones.

**Prod deploy script** (always add):
```json
"deploy:prod": "npm run build:prod && firebase deploy --only hosting --project $PREFIX-prod && node scripts/indexnow.mjs"
```

**Dev deploy script** (only if dev environment was set up):
```json
"deploy:dev": "npm run build:dev && firebase deploy --only hosting --project $PREFIX-dev"
```

Note: The `&& node scripts/indexnow.mjs` tail on `deploy:prod` is only added if `scripts/indexnow.mjs` exists. Skip it otherwise.

### 9. Set up the custom domain handoff

This step is for the canonical public domain and should be re-runnable without breaking an existing setup.

**Detection:**
- `.firebase-domain.json` exists and `status` is `connected` for the requested apex/canonical pair → skip this step
- `.firebase-domain.json` exists but `status` is `pending-dns` or the requested domains changed → patch the file and continue with the handoff
- `.firebase-domain.json` does not exist → create it as part of the handoff

**If DNS or ACME validation is still propagating, do not stop the workflow here.**
Instead, set the domain state to `pending-dns`, explain that Firebase may need time to verify the records and issue SSL, and offer to continue with the next available setup steps while waiting. Those next steps can include:
- deploying hosting to the Firebase project
- finishing SEO files or deploy scripts that do not depend on the domain being live
- returning later to re-check the DNS and certificate status

When you come back later, re-open the Firebase domain flow and verify the records and SSL status before marking the domain `connected`.

**Default domain policy:**
- Primary host: `www.DOMAIN.com`
- Apex host: `DOMAIN.com`
- Redirect: `DOMAIN.com` redirects to `www.DOMAIN.com`

**Do the Firebase console setup on behalf of the user as far as possible:**
- Open the Firebase Hosting domain flow for the production site
- Add `www.DOMAIN.com` as the main custom domain
- Add `DOMAIN.com` as the redirecting apex domain
- Keep the redirect-to-secondary-domain option enabled so the apex forwards to `www`
- Do not guess DNS values; mirror the exact record types and targets Firebase displays
- Capture the DNS records Firebase displays and translate them into the user’s DNS provider terminology
- If the provider already has records pointing elsewhere for the same host, tell the user to remove or replace those records before verification

**Write `.firebase-domain.json` in the target site root** so upfit mode can detect a completed setup on later runs:

```json
{
  "apexDomain": "DOMAIN.com",
  "canonicalHost": "www.DOMAIN.com",
  "redirectApexToCanonical": true,
  "status": "pending-dns"
}
```

If the user later confirms the domain is connected and SSL is issued, update `status` to `connected` instead of creating a second file.

## Notes

- `cleanUrls: true` removes `.html` extensions from URLs
- `trailingSlash: false` canonicalizes `/page/` to `/page`
- The 1-year immutable cache on assets works because Vite hashes filenames on every build
- HTML gets a 1hr cache so deploys propagate quickly without users seeing stale pages
- Security headers (`X-Frame-Options`, etc.) satisfy Lighthouse Best Practices checks
- If the app later adds Firebase Functions, update `firebase.json` to include a `functions` key and change `deploy:prod` to `firebase deploy --only hosting,functions`
- When the custom domain is connected, use `https://www.DOMAIN.com` everywhere in canonical URLs, robots.txt, sitemap generation, and share/meta tags
