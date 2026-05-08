---
name: senternet-site-firebase
description: Set up Firebase Hosting, project IDs, headers, and deploy scripts.
---

# Firebase Hosting Setup

Add Firebase Hosting to a Vite + React site with optimal caching, security headers, and multi-environment deployment. Can be run on a fresh project or re-run later to add a missing environment.

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

Show the user the derived prefix and ask them to confirm or override it before proceeding. This prefix is used as `$PREFIX-dev` and `$PREFIX-prod` for Firebase project IDs.

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
firebase projects:create $PREFIX-prod --display-name "$APP_NAME"
```
Immediately confirm it shows up in `firebase projects:list`. If it does not, stop and report the failure instead of assuming the project was created.

For **dev** (if selected and doesn't already exist) — ask the user whether to create it or skip creation (e.g. they'll create it manually or it already exists under a different account):
```bash
# Only run if user confirms they want to create it
firebase projects:create $PREFIX-dev --display-name "$APP_NAME Dev"
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

## Notes

- `cleanUrls: true` removes `.html` extensions from URLs
- `trailingSlash: false` canonicalizes `/page/` to `/page`
- The 1-year immutable cache on assets works because Vite hashes filenames on every build
- HTML gets a 1hr cache so deploys propagate quickly without users seeing stale pages
- Security headers (`X-Frame-Options`, etc.) satisfy Lighthouse Best Practices checks
- If the app later adds Firebase Functions, update `firebase.json` to include a `functions` key and change `deploy:prod` to `firebase deploy --only hosting,functions`
