# senternet-site-skills

Claude Code slash commands for spinning up production-ready marketing sites.

## How to use

Copy `.claude/commands/` into any new site project (or symlink it). The skills become available as slash commands in Claude Code.

### Spin up a complete site

```
/senternet-create-site
```

Claude will ask for your app name, domain, brand color, and other basics, then execute all skills in sequence.

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
