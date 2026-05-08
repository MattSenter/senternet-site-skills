# senternet-site-skills

Claude Code slash commands for spinning up production-ready Senternet marketing sites.
Each skill encodes the patterns developed across stockcar-site and beeready-site.

## How to use

Copy `.claude/commands/` into any new site project (or symlink it). The skills become available as slash commands in Claude Code.

### Spin up a complete site

```
/create-site
```

Claude will ask for your app name, domain, brand color, and other basics, then execute all skills in sequence.

### Individual skills

| Command | What it does |
|---|---|
| `/site-vite-setup` | Scaffold Vite + React + TypeScript with optimal config |
| `/site-firebase` | Firebase Hosting with caching, security headers, multi-env deploy |
| `/site-google-analytics` | GA4 with lazy loading and build-time env gating |
| `/site-reddit-pixel` | Reddit Ads conversion pixel with bootstrap stub |
| `/site-metatags` | Full SEO meta tags, OG, Twitter Card, schema.org, MetaTags component |
| `/site-robots` | robots.txt pointing to sitemap |
| `/site-sitemap` | Sitemap XML generation script with multilingual hreflang support |
| `/site-indexnow` | IndexNow submission to Bing on every deploy |
| `/site-image-webp` | WebP conversion script, `<picture>` pattern, preload for LCP |
| `/site-share-images` | Per-page OG share image generation with Sharp + SVG |
| `/site-prerender` | Puppeteer-based static prerendering for all routes |
| `/site-lighthouse` | Lighthouse/PageSpeed optimization checklist and decisions |
| `/site-mobile-optimize` | Mobile image optimization, lazy loading, animation disabling |
| `/site-multilingual` | i18n system with URL prefix routing and hreflang tags |
| `/site-ads-landing` | Conversion-optimized ad landing pages |
| `/site-seo-blog` | SEO blog/insight posts with ticker index pages |
| `/site-compare-pages` | Competitor alternative and vs. pages for SEO |

## The three-file rule

Every new page must update three files together:
1. `src/App.tsx` — add the `<Route>`
2. `scripts/prerender.mjs` — add to ROUTES array
3. `public/sitemap.xml` — add a `<url>` entry

Missing any one means the page has no static HTML for crawlers, no sitemap entry for indexing, or both.

## Target Lighthouse scores (mobile)

- Performance ≥ 94
- Accessibility ≥ 98
- Best Practices ≥ 96
- SEO = 100
