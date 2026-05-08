# Create a Complete Optimized Marketing Site

Spin up a fully optimized marketing site from scratch by executing all site skills in sequence.

Before starting, ask the user for:
1. **Site name** (e.g. `myapp-site`) — used as the directory name
2. **App/product name** (e.g. `MyApp`) — used in copy, meta tags, schema.org
3. **Domain** (e.g. `www.myapp.com`) — used in canonical URLs, sitemap, IndexNow
4. **Design export** — path to the zip file, directory, or HTML file exported from Claude Design (or another design tool). The primary brand color will be detected automatically from the design's CSS variables.
5. **App Store URL** (if iOS app, e.g. `https://apps.apple.com/app/...`) — used in CTA links
6. **Twitter/X handle** (e.g. `@MyAppHQ`) — used in Twitter Card meta tags
7. **Multilingual?** (yes/no) — whether to add Spanish (`/es/`) support

Then execute these skills in order. Each builds on the previous.

---

## Prerequisite: GitHub Setup *(optional)*

Execute `/senternet-site-github-setup`:
- Run `git init` in the new project directory
- Create `.gitignore` covering env files, credentials, build output, editor dirs, and OS files
- Optionally create an initial commit and a GitHub remote

Ask the user: "Do you want to set up a git repo and GitHub remote now?" If no, skip this step — it can be run later.

---

## Prerequisite: Google Cloud & Firebase Authentication

Execute `/senternet-site-gcloud-auth`:
- Check if `gcloud` and `firebase` CLIs are installed; install if missing
- Authenticate with Google Cloud (including analytics scope) and Firebase CLI
- Verify with `gcloud auth list` and `firebase projects:list`

Skip this step if the user has already run it on this machine in a prior session.

---

## Phase 1: Project Foundation

### Step 1: Vite + React Setup
Execute `/senternet-site-vite-setup`:
- Scaffold Vite + React + TypeScript project in a new directory named `$SITE_NAME`
- Configure `vite.config.ts` with the `htmlPlugin` (GA injection + URL rewriting + modulepreload)
- Set `outDir: 'build'`
- Add `manualChunks` for React vendor split
- Set up `hydrateRoot` in `main.tsx` with `app-ready` event dispatch
- Create `.env.development` and `.env.production`

### Step 2: Site Design
Execute `/senternet-site-design`:
- Ask the user if they have a Claude Design HTML export; if yes, read the file
- Extract the design system (CSS variables, fonts) into `src/styles/design-system.css`
- Convert each HTML section into a typed React component under `src/pages/` and `src/components/`
- Implement the `useScrollReveal` hook if the design uses scroll animations
- Copy images from the export into `public/images/`
- Wire up `src/App.tsx` with the home page route
- Run `npm run dev` and ask the user to verify visually

### Step 3: Firebase Hosting
Execute `/senternet-site-firebase`:
- Create `firebase.json` with caching headers, security headers, cleanUrls
- Create `.firebaserc` with `$FIREBASE_PREFIX-dev` and `$FIREBASE_PREFIX-prod`
- Add `deploy:prod` script to `package.json` (required); add `deploy:dev` only if dev environment was set up (optional)

---

## Phase 2: SEO Foundation

### Step 3: Meta Tags
Execute `/senternet-site-metatags`:
- Add full meta tag block to `index.html` (OG, Twitter Card, PWA, canonical, favicon)
- Add schema.org structured data (MobileApplication + WebSite, or Organization)
- Add Apple Smart App Banner if this is an iOS app
- Create `src/components/MetaTags.tsx` component

### Step 4: robots.txt
Execute `/senternet-site-robots`:
- Create `public/robots.txt` pointing to sitemap

### Step 5: Sitemap
Execute `/senternet-site-sitemap`:
- Create `scripts/generate-sitemap.mjs` with initial routes (`/`, `/privacy`, `/terms`)
- Wire into `build:prod` script
- Generate the initial `public/sitemap.xml`

### Step 6: IndexNow
Execute `/senternet-site-indexnow`:
- Generate an IndexNow key
- Create `public/$KEY.txt`
- Create `scripts/indexnow.mjs`
- Wire into `deploy:prod` script

---

## Phase 3: Analytics & Tracking

### Step 7: Google Analytics
Execute `/senternet-site-google-analytics`:
- Add GA block with comment markers to `index.html`
- Verify the `htmlPlugin` in `vite.config.ts` handles injection/stripping
- Set `VITE_GA_ID` in `.env.production`

### Step 8: Reddit Pixel *(optional — only if running Reddit ads)*
If advertising on Reddit, execute `/senternet-site-ads-reddit-pixel`:
- Add Reddit pixel bootstrap stub to `index.html`
- Create `src/components/RedditPixel.tsx`
- Add `<RedditPixel>` to `src/App.tsx`
- Set `VITE_REDDIT_PIXEL_ID` in `.env.production`

---

## Phase 4: Build Pipeline

### Step 9: Prerendering
Execute `/senternet-site-prerender`:
- Create `scripts/prerender.mjs` with initial ROUTES list
- Wire into `build:prod` and `build:dev` scripts
- Verify the strip list covers GA, Reddit pixel, and Clarity scripts

---

## Phase 5: Images

### Step 10: WebP Conversion
Execute `/senternet-site-image-webp`:
- Create `scripts/convert-images.mjs`
- Add `convert-images` npm script
- Create `src/assets/` and `public/images/` directories
- Create hero image placeholder and run conversion
- Add `<link rel="preload">` for hero image in `index.html`

### Step 11: Share Images
Execute `/senternet-site-share-images`:
- Create `scripts/generate-share-images.mjs` with home page image at minimum
- Generate `public/share/home.png` + `home.webp`
- Run the script to produce initial share images
- Update `index.html` og:image to point to `/share/home.png`

---

## Phase 6: Performance

### Step 12: Lighthouse Optimization
Execute `/senternet-site-lighthouse`:
- Apply all critical performance decisions to `vite.config.ts`, `main.tsx`, and `index.html`
- Verify `modulepreload` injection works
- Disable decorative animations on mobile via media query
- Set `will-change: transform` on hero image wrapper

### Step 13: Mobile Optimization
Execute `/senternet-site-mobile-optimize`:
- Create mobile-sized hero variant (`-sm.webp`)
- Add responsive `<link rel="preload">` with `media` attributes
- Add `loading="lazy"` to all below-fold images

---

## Phase 7: Optional Features

### Step 14: Multilingual (if requested)
Execute `/senternet-site-multilingual`:
- Create `src/i18n.ts` with English and Spanish locales
- Add `LanguageProvider` to `src/App.tsx`
- Add `/es/*` routes
- Update prerender script for locale variants
- Update sitemap with `hreflang` alternates

### Step 15: Ad Landing Pages (optional — for paid ad campaigns)
Ask the user: "Do you want ad landing pages for paid campaigns?" If yes, execute `/senternet-site-ads-landing`:
- Create `src/components/LandingPage.tsx` base component
- Create at least one campaign-specific landing page
- Add route, prerender entry, and sitemap entry

If no, skip this step.

### Step 16: SEO Blog (when content is ready)
Execute `/senternet-site-seo-blog`:
- Ask the user what URL path the blog should use (default: `/blog`)
- Create `src/components/BlogIndexPage.tsx` (renamed to match the chosen path)
- Add the chosen route and prerender entry
- Set up `src/data/` structure for posts

### Step 17: Compare Pages (optional — for competitive SEO)
Ask the user: "Do you want competitor comparison/alternative pages for SEO?" If yes, execute `/senternet-site-compare-pages`:
- Create `src/components/ComparePages.tsx` with reusable `ComparePage` component
- Create at least 3 competitor alternative pages
- Add routes, prerender entries, and sitemap entries

If no, skip this step.

---

## Final: Verify everything works

1. `npm run dev` — dev server starts cleanly
2. `npm run build:prod` — builds, prerenders all routes (check for `✗ EMPTY` failures)
3. *(Optional — only if dev environment exists)* `npm run deploy:dev` — deploys to staging Firebase project
4. *(Optional)* Verify staging URL loads and meta tags are correct
5. *(Optional)* Run PageSpeed Insights against staging URL
6. Fix any Lighthouse failures before first production deploy
7. `npm run deploy:prod` — deploys to production + runs IndexNow

## Step 18: Initialize Project Documentation

Execute `/senternet-site-init`:
- Read the completed project files to understand its full structure
- Generate `AGENTS.md` with comprehensive codebase context (tech stack, architectural decisions, build pipeline, three-file rule, env vars, Firebase projects)
- Write `CLAUDE.md` containing only `See AGENTS.md for rules`
- Generate `README.md` with quick-start, deploy commands, scripts table, and architecture summary

---

## Three-file rule (enforce for every new page)

Every new page/route must update these three files together — missing any one breaks crawlers or indexing:

1. `src/App.tsx` — add the `<Route>`
2. `scripts/prerender.mjs` — add to ROUTES array
3. `public/sitemap.xml` (or regenerate via `generate-sitemap.mjs`)
4. `scripts/generate-share-images.mjs` — add a share image block and run it
