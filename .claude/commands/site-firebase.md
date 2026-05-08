# Firebase Hosting Setup

Add Firebase Hosting to a Vite + React site with optimal caching, security headers, and multi-environment deployment.

## Steps

1. Install Firebase CLI if not already present:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase in the project root:
   ```bash
   firebase login
   firebase init hosting
   ```
   When prompted:
   - Public directory: `build`
   - Configure as SPA: yes (rewrites all paths to `index.html`)
   - Set up automatic builds: no

3. Replace the generated `firebase.json` with the production-ready config:

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

4. Create `.firebaserc` with dev and prod project aliases:
```json
{
  "projects": {
    "default": "APPNAME-dev",
    "dev": "APPNAME-dev",
    "prod": "APPNAME-prod"
  }
}
```
Replace `APPNAME` with the Firebase project prefix.

5. Add deploy scripts to `package.json`:
```json
{
  "deploy:dev": "npm run build:dev && firebase deploy --only hosting --project APPNAME-dev",
  "deploy:prod": "npm run build:prod && firebase deploy --only hosting --project APPNAME-prod && node scripts/indexnow.mjs"
}
```

6. Create the two Firebase projects in the Firebase console (or via CLI):
   ```bash
   firebase projects:create APPNAME-dev
   firebase projects:create APPNAME-prod
   ```

7. If the app has Firebase Functions, add a `functions/` directory with its own `package.json` and TypeScript config. Update `firebase.json` to include:
```json
{
  "functions": {
    "source": "functions",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" ci", "npm --prefix \"$RESOURCE_DIR\" run build"]
  }
}
```
And update the deploy script to `firebase deploy --only hosting,functions`.

## Notes

- `cleanUrls: true` removes `.html` extensions from URLs
- `trailingSlash: false` canonicalizes `/page/` to `/page`
- The 1-year immutable cache on assets works because Vite hashes filenames on every build
- HTML gets a short 1hr cache so deploys propagate quickly without users seeing stale pages
- Security headers (`X-Frame-Options`, etc.) satisfy Lighthouse Best Practices checks
