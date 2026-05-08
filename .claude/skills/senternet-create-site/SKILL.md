---
name: senternet-create-site
description: Orchestrate the full Senternet site build by running foundation, favicon, SEO, analytics, prerender, image, and performance skills in order.
---

# Create a Complete Optimized Marketing Site

Spin up or upfit a fully optimized marketing site by executing all site skills in sequence.

---

## Mode Detection

Before asking anything, check whether the user provided a path to an existing directory:

- **Existing directory** — run in **upfit mode**: navigate to that directory and detect what's already implemented before each step. Skip steps that are complete, patch steps that are partial.
- **No directory provided** — run in **create mode**: ask the intake questions below and build from scratch. If the user does not have a design zip, directory, or HTML export, default to a barebones Hello World site using the requested project and directory names.

## Upfit Feature Inventory

In upfit mode, surface a visible feature inventory before the optional phases so the user can see what is already enabled and what is still available to add.

- For each optional capability, detect whether the repo already has it.
- Report each one as either `enabled` or `available`.
- If one or more optional capabilities are `available`, present them to the user as a single enablement menu instead of separate yes/no prompts.
- Only offer options for capabilities that are not already enabled.

Optional capabilities to inventory in upfit mode:

- Transactional email via Resend
- Reddit pixel for ad campaigns
- Spanish `/es/` multilingual support
- Ad landing pages for paid campaigns
- SEO blog
- Competitor comparison / alternative pages
- reCAPTCHA Enterprise protection for forms

---

## Intake Questions

**If creating new**, ask:
1. **Site name** (e.g. `myapp-site`) — used as the directory name
2. **App/product name** (e.g. `MyApp`) — used in copy, meta tags, schema.org
3. **Domain** (e.g. `myapp.com`) — used in canonical URLs, sitemap, IndexNow, and Firebase Hosting domain setup; default canonical host is `www.myapp.com` unless they explicitly want apex canonical
4. **Design export** — path to the zip file, directory, or HTML file exported from Claude Design (or another design tool). If they do not have one, skip this input and create a barebones Hello World site instead.
5. **App Store URL** (if iOS app, e.g. `https://apps.apple.com/app/...`) — used in CTA links
6. **Twitter/X handle** (e.g. `@MyAppHQ`) — used in Twitter Card meta tags
7. **Multilingual?** (yes/no) — whether to add Spanish (`/es/`) support

**If upfitting an existing directory**, ask only what's missing or cannot be detected:
- Read `package.json`, `firebase.json`, `.firebaserc`, `.firebase-domain.json`, `index.html`, and `.env.production` to infer app name, domain, canonical host, and GA ID before asking.
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
In upfit mode, include GitHub setup in the same feature inventory so the user can see whether the repo and remote are already enabled or still available to add.

---

## Prerequisite: Google Cloud & Firebase Authentication

**Detection:**
- Run `gcloud auth list` — if an active account is shown, skip gcloud auth
- If `gcloud auth list` fails or shows no credentialed account in this shell, do not stop there: run `gcloud auth login` with the standard scopes, then re-run `gcloud auth list` in the same shell before falling back to full auth
- If the machine is headless or browser launch fails, add `--no-browser` so gcloud prints device-flow instructions, then wait for the user to complete the browser/device step and re-run `gcloud auth list`
- Run `firebase projects:list` — if it succeeds, skip firebase login
- If `firebase projects:list` fails because the Firebase session expired or no active Firebase account is available, run `firebase login --reauth` first, then re-run `firebase projects:list` before falling back to full auth

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
- Ask about design export only if components are absent and the user actually has a design export

**No design export fallback:**
- If the user does not have a design zip, directory, or HTML export, do not invoke `/senternet-site-design`
- Create a minimal Hello World home page using the requested site name and app/product name
- Keep the site intentionally barebones; the goal is a working scaffold rather than an extracted visual design

Execute `/senternet-site-design` if components are missing or the user wants to re-import a new design.

### Step 3: Firebase Hosting

This step is required for every site, including brand-new creates. Never skip it just because the app already runs locally.

**Detection:**
- `firebase.json` exists → check for caching headers, security headers, `cleanUrls`; patch missing config keys
- `.firebaserc` exists → check for dev/prod project entries; add missing entries
- `.firebase-domain.json` exists with `status: connected` and the expected apex/canonical pair → skip the custom domain handoff
- `.firebase-domain.json` exists with `status: pending-dns` → keep moving on later phases and revisit the domain verification after other Firebase-safe steps finish
- `deploy:prod` script in `package.json` → skip script addition

Execute `/senternet-site-firebase` for any missing pieces, including the custom-domain handoff when `.firebase-domain.json` is absent or still pending.

After this step, verify these files exist and are correct before moving on:
- `firebase.json`
- `.firebaserc`
- `.firebase-domain.json` if the canonical domain was connected
- `package.json` with `deploy:prod` wired to Firebase deploy

---

## Phase 2: SEO Foundation

### Step 4: Favicon Assets

**Detection:**
- `public/favicon.svg`, `public/favicon.png`, `public/favicon.ico`, and `public/apple-touch-icon.png` all exist → skip icon generation
- `index.html` or `src/components/MetaTags.tsx` already links the favicon files → skip head tag patch

Execute `/senternet-site-favicon` for any missing pieces.

### Step 5: Meta Tags

**Detection:**
- `index.html` contains `og:title` → OG tags present; check for Twitter Card, PWA, canonical, favicon — add only what's missing
- `src/components/MetaTags.tsx` exists → skip component creation
- Schema.org `<script type="application/ld+json">` in `index.html` → skip structured data

Execute `/senternet-site-metatags` for any missing pieces.

### Step 6: robots.txt

**Detection:**
- `public/robots.txt` exists → skip; verify it points to the sitemap — update if not

Execute `/senternet-site-robots` if missing or malformed.

### Step 7: Sitemap

**Detection:**
- `scripts/generate-sitemap.mjs` exists → skip script creation; verify routes include `/`, `/privacy`, `/terms`
- `public/sitemap.xml` exists → regenerate only if routes have changed
- `build:prod` script calls `generate-sitemap` → skip wiring

Execute `/senternet-site-sitemap` for any missing pieces.

### Step 8: IndexNow

**Detection:**
- Any `public/*.txt` file matching a 32-char hex key → IndexNow key already exists; skip key generation
- `scripts/indexnow.mjs` exists → skip script creation
- `deploy:prod` script calls `indexnow` → skip wiring

Execute `/senternet-site-indexnow` for any missing pieces.

---

## Phase 3: Analytics, Email & Tracking

### Step 9: Google Analytics

**Detection:**
- `index.html` contains `<!-- GA_START -->` comment marker → GA block already present
- `.env.production` contains `VITE_GA_ID` → skip env var setup
- `vite.config.ts` has `htmlPlugin` handling GA injection → skip plugin verification

Execute `/senternet-site-google-analytics` for any missing pieces.

### Step 10: Transactional Email via Resend *(optional — for forms, notifications, or onboarding)*

**Detection:**
- `functions/src/index.ts` contains `RESEND_API_KEY` or `sendResendEmail` → skip
- `firebase.json` has a `functions` block and root `package.json` deploy script already includes `hosting,functions` → skip wiring

In upfit mode, include transactional email in the optional-feature menu if it is not already detected. If the user selects it, execute `/senternet-site-email-resend`.

### Step 11: Reddit Pixel *(optional — only if running Reddit ads)*

**Detection:**
- `src/components/RedditPixel.tsx` exists → skip
- `index.html` contains Reddit pixel bootstrap stub → skip
- `VITE_REDDIT_PIXEL_ID` in `.env.production` → skip

In upfit mode, include Reddit pixel in the optional-feature menu if it is not already detected. If the user selects it, execute `/senternet-site-ads-reddit-pixel`.

---

## Phase 4: Build Pipeline

### Step 12: Prerendering

**Detection:**
- `scripts/prerender.mjs` exists → skip script creation; verify ROUTES list covers current routes
- `build:prod` and `build:dev` scripts call `prerender` → skip wiring

Execute `/senternet-site-prerender` for any missing pieces.

---

## Phase 5: Images

### Step 13: WebP Conversion

**Detection:**
- `scripts/convert-images.mjs` exists → skip
- `convert-images` npm script in `package.json` → skip
- `public/images/` directory exists → skip directory creation

Execute `/senternet-site-image-webp` for any missing pieces.

### Step 14: Share Images

**Detection:**
- `scripts/generate-share-images.mjs` exists → skip
- `public/share/home.png` exists → skip generation
- `index.html` `og:image` points to `/share/home.png` → skip update

Execute `/senternet-site-share-images` for any missing pieces.

---

## Phase 6: Performance

This phase is mandatory for every site. Do not mark the site complete until Lighthouse optimization has been executed against a locally served production build, the reported regressions have been addressed, and the site is retested.

### Step 15: Lighthouse Optimization

**Detection:**
- `vite.config.ts` has `modulepreload` injection and `manualChunks` → still run `/senternet-site-lighthouse` against the local production build to verify actual performance, image, caching, and LCP discovery behavior
- `index.html` has `<link rel="modulepreload">` → still run `/senternet-site-lighthouse` locally
- CSS has `@media (prefers-reduced-motion)` or mobile animation disabling → still run `/senternet-site-lighthouse` locally

Execute `/senternet-site-lighthouse` unconditionally in this phase against a locally served `build/` output, then fix any reported Lighthouse issues before proceeding.

### Step 16: Mobile Optimization

**Detection:**
- `public/images/` contains a `-sm.webp` hero variant → skip mobile hero creation
- `index.html` has `<link rel="preload" media="...">` responsive preload → skip
- Images have `loading="lazy"` where appropriate → skip

Execute `/senternet-site-mobile-optimize` for any missing pieces.

---

## Phase 7: Optional Features

### Step 17: Multilingual (if requested)

**Detection:**
- `src/i18n.ts` exists → already multilingual; skip
- `src/App.tsx` contains `LanguageProvider` → skip
- Prerender script contains `/es/` routes → skip

If not present, include Spanish (`/es/`) support in the optional-feature menu in upfit mode. Execute `/senternet-site-multilingual` if the user selects it.

### Step 18: Ad Landing Pages

**Detection:**
- `src/components/LandingPage.tsx` exists → skip base component
- A campaign-specific landing page route exists in `App.tsx` → skip

In upfit mode, include ad landing pages in the optional-feature menu if they are not already detected. Execute `/senternet-site-ads-landing` if the user selects them.

### Step 19: SEO Blog

**Detection:**
- A blog route and blog index component exist in `src/` → skip
- `src/data/` contains post data → skip

In upfit mode, include the SEO blog in the optional-feature menu if it is not already detected. Execute `/senternet-site-seo-blog` if the user selects it.

### Step 20: Compare Pages

**Detection:**
- `src/components/ComparePages.tsx` exists → skip
- Competitor/alternative routes exist in `App.tsx` → skip

In upfit mode, include competitor comparison / alternative pages in the optional-feature menu if they are not already detected. Execute `/senternet-site-compare-pages` if the user selects them.

### Step 21: reCAPTCHA Enterprise for Forms

**Detection:**
- `gcloud recaptcha keys list --project "$PROJECT_ID"` shows existing local/dev/prod form keys → skip
- `recaptchaenterprise.googleapis.com` is already enabled → skip API enablement

In upfit mode, include reCAPTCHA Enterprise in the optional-feature menu if it is not already detected. Execute `/senternet-recaptcha-enterprise` if the user selects it.

---

## Step 22: Verify everything works

1. `npm run dev` — dev server starts cleanly
2. `npm run build:prod` — builds, prerenders all routes (check for `✗ EMPTY` failures)
3. *(Optional — only if dev environment exists)* `npm run deploy:dev` — deploys to staging Firebase project
4. *(Optional)* Verify staging URL loads and meta tags are correct
5. Fix any Lighthouse failures found on the local production build before first production deploy
6. `npm run deploy:prod` — deploys to production + runs IndexNow
7. *(Optional, upfit only)* If an existing deployed site and production URL are already detectable, run PageSpeed Insights against production after deploy to capture live CDN behavior

---

## Step 23: Initialize Project Documentation

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
