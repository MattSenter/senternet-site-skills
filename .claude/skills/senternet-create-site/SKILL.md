---
name: senternet-create-site
description: Orchestrate the full Senternet site build by running foundation, SEO, analytics, prerender, image, and performance skills in order.
---

# Create a Complete Optimized Marketing Site

Spin up or upfit a fully optimized marketing site by executing all site skills in sequence.

---

## Mode Detection

Before asking anything, check whether the user provided a path to an existing directory:

- **Existing directory** — run in **upfit mode**: navigate to that directory and detect what's already implemented before each step. Skip steps that are complete, patch steps that are partial.
- **No directory provided** — run in **create mode**: ask all intake questions and build from scratch.

---

## Intake Questions

**If creating new**, ask:
1. **Site name** (e.g. `myapp-site`) — used as the directory name
2. **App/product name** (e.g. `MyApp`) — used in copy, meta tags, schema.org
3. **Domain** (e.g. `www.myapp.com`) — used in canonical URLs, sitemap, IndexNow
4. **Design export** — path to the zip file, directory, or HTML file exported from Claude Design (or another design tool). The primary brand color will be detected automatically from the design's CSS variables.
5. **App Store URL** (if iOS app, e.g. `https://apps.apple.com/app/...`) — used in CTA links
6. **Twitter/X handle** (e.g. `@MyAppHQ`) — used in Twitter Card meta tags
7. **Multilingual?** (yes/no) — whether to add Spanish (`/es/`) support

**If upfitting an existing directory**, ask only what's missing or cannot be detected:
- Read `package.json`, `firebase.json`, `.firebaserc`, `index.html`, and `.env.production` to infer app name, domain, and GA ID before asking.
- Only ask for values that can't be found in the project files.

---

## Detection Rules (apply before every step)

Before executing each step, run the detection check listed for that step:

- **Already implemented** → skip the step; print a one-line note (e.g. `✓ firebase.json exists — skipping Firebase setup`).
- **Partially implemented** → patch only what's missing; note what was added.
- **Not present** → execute the full step.

---

## Prerequisite: GitHub Setup *(optional)*

**Detection:**
- `.git/` directory exists → skip `git init`; check remote with `git remote -v`
- `.gitignore` exists → update it to include recommended entries (env files, credentials, build output, editor dirs, OS files) without removing existing entries
- GitHub remote is already set → skip remote creation

Execute `/senternet-site-github-setup` for any missing pieces.

Ask: "Do you want to set up a git repo and GitHub remote now?" only if `.git/` does not exist. If it does, skip the question entirely.

---

## Prerequisite: Google Cloud & Firebase Authentication

**Detection:**
- Run `gcloud auth list` — if an active account is shown, skip gcloud auth
- Run `firebase projects:list` — if it succeeds, skip firebase login

Execute `/senternet-site-gcloud-auth` for any missing auth.

---

## Phase 1: Project Foundation

Phase 1 is mandatory for every new site. Do not consider the site created until all three foundation pieces are in place:
- Vite + React scaffold
- Design system/components
- Firebase Hosting config and deploy wiring

### Step 1: Vite + React Setup

**Detection:**
- `package.json` with `vite` and `react` in dependencies → skip scaffolding
- `vite.config.ts` exists → check for `htmlPlugin`, `outDir: 'build'`, `manualChunks`; patch only missing pieces
- `src/main.tsx` exists with `hydrateRoot` → skip; without it → patch
- `.env.development` and `.env.production` exist → skip env file creation

Execute `/senternet-site-vite-setup` for any missing pieces.

### Step 2: Site Design

**Detection:**
- `src/styles/design-system.css` exists → skip design extraction
- `src/pages/` and `src/components/` contain React components → skip component conversion
- Ask about design export only if components are absent

Execute `/senternet-site-design` if components are missing or the user wants to re-import a new design.

### Step 3: Firebase Hosting

This step is required for every site, including brand-new creates. Never skip it just because the app already runs locally.

**Detection:**
- `firebase.json` exists → check for caching headers, security headers, `cleanUrls`; patch missing config keys
- `.firebaserc` exists → check for dev/prod project entries; add missing entries
- `deploy:prod` script in `package.json` → skip script addition

Execute `/senternet-site-firebase` for any missing pieces.

After this step, verify these three files exist and are correct before moving on:
- `firebase.json`
- `.firebaserc`
- `package.json` with `deploy:prod` wired to Firebase deploy

---

## Phase 2: SEO Foundation

### Step 4: Meta Tags

**Detection:**
- `index.html` contains `og:title` → OG tags present; check for Twitter Card, PWA, canonical, favicon — add only what's missing
- `src/components/MetaTags.tsx` exists → skip component creation
- Schema.org `<script type="application/ld+json">` in `index.html` → skip structured data

Execute `/senternet-site-metatags` for any missing pieces.

### Step 5: robots.txt

**Detection:**
- `public/robots.txt` exists → skip; verify it points to the sitemap — update if not

Execute `/senternet-site-robots` if missing or malformed.

### Step 6: Sitemap

**Detection:**
- `scripts/generate-sitemap.mjs` exists → skip script creation; verify routes include `/`, `/privacy`, `/terms`
- `public/sitemap.xml` exists → regenerate only if routes have changed
- `build:prod` script calls `generate-sitemap` → skip wiring

Execute `/senternet-site-sitemap` for any missing pieces.

### Step 7: IndexNow

**Detection:**
- Any `public/*.txt` file matching a 32-char hex key → IndexNow key already exists; skip key generation
- `scripts/indexnow.mjs` exists → skip script creation
- `deploy:prod` script calls `indexnow` → skip wiring

Execute `/senternet-site-indexnow` for any missing pieces.

---

## Phase 3: Analytics & Tracking

### Step 8: Google Analytics

**Detection:**
- `index.html` contains `<!-- GA_START -->` comment marker → GA block already present
- `.env.production` contains `VITE_GA_ID` → skip env var setup
- `vite.config.ts` has `htmlPlugin` handling GA injection → skip plugin verification

Execute `/senternet-site-google-analytics` for any missing pieces.

### Step 9: Reddit Pixel *(optional — only if running Reddit ads)*

**Detection:**
- `src/components/RedditPixel.tsx` exists → skip
- `index.html` contains Reddit pixel bootstrap stub → skip
- `VITE_REDDIT_PIXEL_ID` in `.env.production` → skip

Ask: "Do you want to add a Reddit pixel for ad campaigns?" only if none of the above are detected. Execute `/senternet-site-ads-reddit-pixel` if yes.

---

## Phase 4: Build Pipeline

### Step 10: Prerendering

**Detection:**
- `scripts/prerender.mjs` exists → skip script creation; verify ROUTES list covers current routes
- `build:prod` and `build:dev` scripts call `prerender` → skip wiring

Execute `/senternet-site-prerender` for any missing pieces.

---

## Phase 5: Images

### Step 11: WebP Conversion

**Detection:**
- `scripts/convert-images.mjs` exists → skip
- `convert-images` npm script in `package.json` → skip
- `public/images/` directory exists → skip directory creation

Execute `/senternet-site-image-webp` for any missing pieces.

### Step 12: Share Images

**Detection:**
- `scripts/generate-share-images.mjs` exists → skip
- `public/share/home.png` exists → skip generation
- `index.html` `og:image` points to `/share/home.png` → skip update

Execute `/senternet-site-share-images` for any missing pieces.

---

## Phase 6: Performance

### Step 13: Lighthouse Optimization

**Detection:**
- `vite.config.ts` has `modulepreload` injection and `manualChunks` → likely optimized; check `main.tsx` for `app-ready` event
- `index.html` has `<link rel="modulepreload">` → skip
- CSS has `@media (prefers-reduced-motion)` or mobile animation disabling → skip

Execute `/senternet-site-lighthouse` for any missing pieces.

### Step 14: Mobile Optimization

**Detection:**
- `public/images/` contains a `-sm.webp` hero variant → skip mobile hero creation
- `index.html` has `<link rel="preload" media="...">` responsive preload → skip
- Images have `loading="lazy"` where appropriate → skip

Execute `/senternet-site-mobile-optimize` for any missing pieces.

---

## Phase 7: Optional Features

### Step 15: Multilingual (if requested)

**Detection:**
- `src/i18n.ts` exists → already multilingual; skip
- `src/App.tsx` contains `LanguageProvider` → skip
- Prerender script contains `/es/` routes → skip

If not present, ask: "Do you want Spanish (`/es/`) multilingual support?" Execute `/senternet-site-multilingual` if yes.

### Step 16: Ad Landing Pages

**Detection:**
- `src/components/LandingPage.tsx` exists → skip base component
- A campaign-specific landing page route exists in `App.tsx` → skip

Ask: "Do you want ad landing pages for paid campaigns?" only if not detected. Execute `/senternet-site-ads-landing` if yes.

### Step 17: SEO Blog

**Detection:**
- A blog route and blog index component exist in `src/` → skip
- `src/data/` contains post data → skip

Ask: "Do you want an SEO blog?" only if not detected. Execute `/senternet-site-seo-blog` if yes.

### Step 18: Compare Pages

**Detection:**
- `src/components/ComparePages.tsx` exists → skip
- Competitor/alternative routes exist in `App.tsx` → skip

Ask: "Do you want competitor comparison/alternative pages for SEO?" only if not detected. Execute `/senternet-site-compare-pages` if yes.

---

## Final: Verify everything works

1. `npm run dev` — dev server starts cleanly
2. `npm run build:prod` — builds, prerenders all routes (check for `✗ EMPTY` failures)
3. *(Optional — only if dev environment exists)* `npm run deploy:dev` — deploys to staging Firebase project
4. *(Optional)* Verify staging URL loads and meta tags are correct
5. *(Optional)* Run PageSpeed Insights against staging URL
6. Fix any Lighthouse failures before first production deploy
7. `npm run deploy:prod` — deploys to production + runs IndexNow

---

## Step 19: Initialize Project Documentation

**Detection:**
- `AGENTS.md` exists → skip generation (do not overwrite existing project docs)
- `CLAUDE.md` exists → skip
- `README.md` exists → skip

If any are missing, execute `/senternet-site-init` for only the missing files.

---

## Three-file rule (enforce for every new page)

Every new page/route must update these three files together — missing any one breaks crawlers or indexing:

1. `src/App.tsx` — add the `<Route>`
2. `scripts/prerender.mjs` — add to ROUTES array
3. `public/sitemap.xml` (or regenerate via `generate-sitemap.mjs`)
4. `scripts/generate-share-images.mjs` — add a share image block and run it
