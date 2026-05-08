# senternet-site-skills

Claude Code slash commands for spinning up production-ready marketing sites.

Each skill in `.claude/skills/` is a directory containing `SKILL.md` and becomes a `/senternet-*` slash command. There is no application code here — the repo is prompt engineering for site-building workflows.

## Installation

### Global (all projects)

Copy the skill directories to both `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Agents SDK and other runtimes):

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

```
/senternet-create-site
```

Claude will ask for your app name, domain, design export (zip/directory/HTML from Claude Design), and other basics. The primary brand color is detected automatically from the design's CSS variables. It then executes all skills in sequence across these phases:

1. **Prerequisites** — gcloud/Firebase auth
2. **Phase 1** — Vite scaffold, design system, Firebase Hosting
3. **Phase 2** — SEO (meta tags, robots.txt, sitemap, IndexNow)
4. **Phase 3** — Analytics (GA4, Reddit pixel)
5. **Phase 4** — Build pipeline (Puppeteer prerendering)
6. **Phase 5** — Images (WebP conversion, OG share images)
7. **Phase 6** — Performance (Lighthouse, mobile optimization)
8. **Phase 7** — Optional (i18n, ad landing pages, blog, compare pages)

### Individual skills

| Command | What it does |
|---|---|
| `/senternet-site-gcloud-auth` | Authenticate gcloud and Firebase CLI (run once per machine before firebase/GA skills) |
| `/senternet-site-design` | Convert a Claude Design HTML export into React components with a full design system |
| `/senternet-site-vite-setup` | Scaffold Vite + React + TypeScript with optimal config |
| `/senternet-site-firebase` | Firebase Hosting with caching, security headers, multi-env deploy — creates Firebase projects automatically |
| `/senternet-site-google-analytics` | GA4 with lazy loading and build-time env gating — creates GA4 property and retrieves Measurement ID automatically |
| `/senternet-site-ads-reddit-pixel` | Reddit Ads conversion pixel with bootstrap stub |
| `/senternet-site-metatags` | Full SEO meta tags, OG, Twitter Card, schema.org, MetaTags component |
| `/senternet-site-robots` | robots.txt pointing to sitemap |
| `/senternet-site-sitemap` | Sitemap XML generation script with multilingual hreflang support |
| `/senternet-site-indexnow` | IndexNow submission to Bing on every deploy |
| `/senternet-site-image-webp` | WebP conversion script, `<picture>` pattern, preload for LCP |
| `/senternet-site-share-images` | Per-page OG share image generation with Sharp + SVG |
| `/senternet-site-prerender` | Puppeteer-based static prerendering for all routes |
| `/senternet-site-lighthouse` | Lighthouse/PageSpeed optimization checklist and decisions |
| `/senternet-site-mobile-optimize` | Mobile image optimization, lazy loading, animation disabling |
| `/senternet-site-multilingual` | i18n system with URL prefix routing and hreflang tags |
| `/senternet-site-ads-landing` | Conversion-optimized ad landing pages |
| `/senternet-site-seo-blog` | SEO blog with prerendered posts, share images, and tag index pages |
| `/senternet-site-compare-pages` | Competitor alternative and vs. pages for SEO |
| `/senternet-site-csp` | Content Security Policy header with coverage for all third-party services in the suite |
| `/senternet-site-init` | Generate AGENTS.md, CLAUDE.md, and README.md for the completed site |

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
