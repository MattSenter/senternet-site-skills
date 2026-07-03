# senternet-site-skills

Claude Code slash commands for spinning up production-ready marketing sites.

Each skill in `.claude/skills/` is a directory containing `SKILL.md` and becomes a `/senternet-*` slash command in Claude Code or a `$senternet-*` command in Codex. There is no application code here — the repo is prompt engineering for site-building workflows.

## Example Sites

Showcase of sites built with these skills:

- [StockCar](https://www.stockcar.app) - Turn your stock and investment portfolio into an up-to-date personalized podcast.
- [Bee Ready](https://www.beeready.buzz) - Non-profit providing CPR training and AEDs to youth sports teams.

## Prerequisites

To use these skills end-to-end, make sure you have:

- Node.js and `npm`
- The `skills` CLI if you want to install the local skill pack with `npx skills add .`
- `gcloud` and the Firebase CLI authenticated on the machine for any workflow that touches Firebase or Google Analytics
- A Google account that owns the Firebase and GA4 resources you want Claude to create or modify

Project-scoped `gcloud` and `firebase` commands should always include `--project` with the exact project being worked on. The only exceptions are account-scoped auth checks such as `gcloud auth list` and `firebase projects:list`.

## Installation

### Skills CLI

If you have the `skills` CLI installed, you can install the local skills in this repo directly from the repository root:

```bash
npx skills add .
```

### Global (all projects)

Copy the skill directories to `~/.claude/skills/` (Claude Code). If you also use the Agents SDK or another runtime that reads `~/.agents/skills/`, mirror them there too:

```bash
cp -r .claude/skills/senternet-* ~/.claude/skills/
cp -r .claude/skills/senternet-* ~/.agents/skills/
```

To keep them in sync going forward, symlink each skill directory instead of copying:

```bash
for dir in .claude/skills/senternet-*/; do
  ln -sf "$(pwd)/$dir" ~/.claude/skills/$(basename "$dir")
  ln -sf "$(pwd)/$dir" ~/.agents/skills/$(basename "$dir")
done
```

### Local (per-project only)

Copy or symlink into the target project's `.claude/skills/` directory:

```bash
# Copy
cp -r /path/to/senternet-site-skills/.claude/skills/senternet-* /your-project/.claude/skills/

# Or symlink
for dir in /path/to/senternet-site-skills/.claude/skills/senternet-*/; do
  ln -sf "$dir" /your-project/.claude/skills/$(basename "$dir")
done
```

## Usage

### Spin up a complete site

#### Claude Code

Start the getting-started skill with `/senternet-create-site`:

```bash
# 1. Design zip
/senternet-create-site /path/to/design-export.zip

# 2. Design folder
/senternet-create-site /path/to/design-export/

# 3. Existing site folder (upfit mode)
/senternet-create-site /path/to/existing-site/

# 4. No parameter (Hello World scaffold)
/senternet-create-site
```

#### Codex

Start the same skill with `$senternet-create-site`:

```bash
# 1. Design zip
$senternet-create-site /path/to/design-export.zip

# 2. Design folder
$senternet-create-site /path/to/design-export/

# 3. Existing site folder (upfit mode)
$senternet-create-site /path/to/existing-site/

# 4. No parameter (Hello World scaffold)
$senternet-create-site
```

Upfit mode means you point `senternet-create-site` at an existing site folder, and it inspects the project first, then patches only the missing or partial pieces instead of scaffolding a new site from scratch.
In upfit mode it also reports which optional capabilities are already enabled and presents any missing ones as enablement options, so you can see what changed and what is still available.

The Firebase skill also records custom-domain setup in `.firebase-domain.json` so reruns can detect an already-connected `www`-primary domain and skip the handoff cleanly.
If DNS or certificate issuance is still pending, the workflow should continue with Firebase-safe follow-up steps and revisit the domain verification later instead of stalling the whole setup.

## Known issues

- Firebase does not have a reliable CLI flow for linking a Firebase project to Google Analytics in this workflow, so the GA link step must be completed manually in the Firebase Console before the GA skill can continue.

Claude will ask for your app name, domain, design export if you have one (zip/directory/HTML from Claude Design), and other basics. If you do not have a design export, it will create a barebones Hello World site instead. The primary brand color is detected automatically from the design's CSS variables when a design is provided. It then executes all skills in sequence across these phases:

1. **Prerequisites** — gcloud/Firebase auth
2. **Phase 1** — Vite scaffold, design system, Firebase Hosting
3. **Phase 2** — SEO (meta tags, robots.txt, sitemap, IndexNow)
4. **Phase 3** — Analytics, email, and Reddit pixel (GA4 or PostHog, Resend, Reddit pixel)
5. **Phase 4** — Build pipeline (Puppeteer prerendering)
6. **Phase 5** — Images (WebP conversion, OG share images)
7. **Phase 6** — Performance (local Lighthouse, mobile optimization; PSI after deploy when upfitting a live site)
8. **Phase 7** — Optional (i18n, ad landing pages, blog, compare pages, reCAPTCHA)

### Individual skills

| Command | What it does |
|---|---|
| `/senternet-site-gcloud-auth` | Authenticate gcloud and Firebase CLI (run once per machine before firebase/GA skills) |
| `/senternet-site-design` | Convert a Claude Design HTML export into React components with a full design system |
| `/senternet-site-vite-setup` | Scaffold Vite + React + TypeScript with optimal config |
| `/senternet-site-firebase` | Firebase Hosting with caching, security headers, multi-env deploy, and custom domain handoff — creates or links Firebase projects after auth and confirmation |
| `/senternet-site-favicon` | Favicon and app icon generation for browser tabs, bookmarks, and mobile home screens |
| `/senternet-site-metatags` | Full SEO meta tags, OG, Twitter Card, schema.org, MetaTags component |
| `/senternet-site-robots` | robots.txt pointing to sitemap |
| `/senternet-site-sitemap` | Sitemap XML generation script with multilingual hreflang support |
| `/senternet-site-indexnow` | IndexNow submission to Bing on every deploy |
| `/senternet-site-analytics` | Help pick an analytics provider (GA4 vs PostHog), then hand off to the matching setup skill |
| `/senternet-site-google-analytics` | GA4 with lazy loading and build-time env gating — guides Firebase Console linking and retrieves or confirms the Measurement ID |
| `/senternet-site-posthog` | PostHog Cloud product analytics — events, funnels, replay — with browser-only lazy loading, production gating, and non-PII events |
| `/senternet-site-email-resend` | Transactional email with Resend + Firebase Functions — stores API key in Secret Manager and scaffolds Cloud Functions |
| `/senternet-site-stripe` | Stripe payments via Firebase Functions — hosted Checkout or embedded Payment Element, secret in Secret Manager, webhook fulfillment (license token, receipt email, or signed download URL) |
| `/senternet-recaptcha-enterprise` | reCAPTCHA Enterprise keys for local, dev, and prod forms |
| `/senternet-site-ads-reddit-pixel` | Reddit Ads conversion pixel with bootstrap stub |
| `/senternet-site-image-webp` | WebP conversion script, `<picture>` pattern, preload for LCP |
| `/senternet-site-share-images` | Per-page OG share image generation with Sharp + SVG |
| `/senternet-site-prerender` | Puppeteer-based static prerendering for all routes |
| `/senternet-site-lighthouse` | Lighthouse/PageSpeed optimization checklist and decisions |
| `/senternet-site-mobile-optimize` | Mobile image optimization, lazy loading, animation disabling |
| `/senternet-site-mobile-forms` | Mobile keyboard, autocomplete, and autocorrect attributes for all form inputs |
| `/senternet-site-mobile-nav` | Hamburger-style mobile nav with nested section anchors and body scroll lock |
| `/senternet-site-multilingual` | i18n system with URL prefix routing and hreflang tags |
| `/senternet-site-ads-landing` | Conversion-optimized ad landing pages |
| `/senternet-site-seo-blog` | SEO blog with prerendered posts, share images, and tag index pages |
| `/senternet-site-compare-pages` | Competitor alternative and vs. pages for SEO |
| `/senternet-site-ai-disclosure` | Voluntary AI Disclosure page — interviews the user about AI usage, then writes it alongside Privacy and Terms |
| `/senternet-site-csp` | Content Security Policy header with coverage for all third-party services in the suite |
| `/senternet-site-init` | Generate AGENTS.md, CLAUDE.md, and README.md for the completed site |
| `/senternet-site-ahrefs-audit` | Pull Ahrefs Site Audit issues, apply the standard fix per issue class (WebP, alt text, 4xx), verify, and commit — Shopify-hosted images out of scope |

## Generated site stack

Skills produce sites with this tech stack:

- **Vite + React + TypeScript** — scaffolded via `senternet-site-vite-setup`
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `src/index.css`
- **Firebase Hosting** — static host, `build/` as public dir (not `dist/`)
- **Puppeteer prerendering** — every route gets a real HTML snapshot at build time

### The three-file rule

Every new page/route must update all three of these files together:

1. `src/App.tsx` — add the `<Route>`
2. `scripts/prerender.mjs` — add to `ROUTES` array
3. `scripts/generate-sitemap.mjs` — add to `ROUTES` array

Missing any one means the page has no static HTML for crawlers, no sitemap entry, or both.

## Adding a skill

1. Create `.claude/skills/senternet-site-<feature>/SKILL.md`
2. Add a row to the table above
3. If it belongs in the full site setup, add its execution step to `senternet-create-site/SKILL.md` in the correct phase order

## Target Lighthouse scores (mobile)

- Performance ≥ 94
- Accessibility ≥ 98
- Best Practices ≥ 96
- SEO = 100
