# Sitemap Generation

Generate a `sitemap.xml` from a route list, with optional multilingual `hreflang` support, and wire it into the build pipeline.

## Steps

### 1. Create `scripts/generate-sitemap.mjs`

```js
#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'https://www.DOMAIN.com'; // replace with actual domain
const LASTMOD = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);

// Define all routes with their SEO priority
const ROUTES = [
  { path: '/',        changefreq: 'weekly',  priority: '1.0' },
  { path: '/pricing', changefreq: 'weekly',  priority: '0.9' },
  { path: '/about',   changefreq: 'monthly', priority: '0.8' },
  { path: '/privacy', changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms',   changefreq: 'yearly',  priority: '0.3' },
  // Add landing pages, blog posts, compare pages, etc.
];

// For multilingual sites, define locales. Remove/empty this array for English-only sites.
const LOCALES = [
  { language: 'en', prefix: '' },
  // { language: 'es', prefix: '/es' },
];

function localizedPath(routePath, prefix) {
  if (routePath === '/') return prefix || '/';
  return `${prefix}${routePath}`;
}

function escapeXml(val) {
  return val.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
            .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const urls = [];
for (const route of ROUTES) {
  for (const locale of LOCALES) {
    const loc = `${SITE_URL}${localizedPath(route.path, locale.prefix)}`;

    // Build hreflang alternates (only needed for multilingual sites)
    const alternates = LOCALES.length > 1
      ? [
          ...LOCALES.map(alt => ({
            hreflang: alt.language,
            href: `${SITE_URL}${localizedPath(route.path, alt.prefix)}`,
          })),
          { hreflang: 'x-default', href: `${SITE_URL}${localizedPath(route.path, '')}` },
        ]
      : [];

    urls.push({ loc, alternates, ...route });
  }
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
    (LOCALES.length > 1 ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : '') + '>',
  ...urls.map(entry => {
    const altLines = entry.alternates
      .map(a => `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}" />`)
      .join('\n');
    return [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      altLines,
      `    <lastmod>${LASTMOD}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }),
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(__dirname, '../public/sitemap.xml'), xml);
console.log(`Generated sitemap with ${urls.length} URL(s).`);
```

### 2. Add the script to `package.json`

```json
{
  "scripts": {
    "generate:sitemap": "node scripts/generate-sitemap.mjs",
    "build:prod": "npm run generate:sitemap && tsc -b && vite build --mode production && node scripts/prerender.mjs"
  }
}
```

### 3. Reference the sitemap in `robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://www.DOMAIN.com/sitemap.xml
```

### 4. Keep routes in sync

The routes array in `generate-sitemap.mjs` must stay in sync with:
- `src/App.tsx` (React Router routes)
- `scripts/prerender.mjs` (prerender ROUTES array)

When you add a new page, update all three files at the same time.

### 5. Priority guidelines

| Page type | Priority | Changefreq |
|-----------|----------|------------|
| Home | 1.0 | weekly |
| Primary landing pages | 0.9 | weekly |
| Features, pricing, about | 0.8 | monthly |
| Blog/insight posts | 0.7–0.8 | monthly |
| Compare / alternative pages | 0.7 | monthly |
| Secondary content | 0.5 | monthly |
| Legal (privacy, terms) | 0.3 | yearly |

### 6. For high-volume programmatic pages (100+ pages)

Use a sitemap index instead of a single sitemap:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.DOMAIN.com/sitemap-main.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.DOMAIN.com/sitemap-tickers.xml</loc>
  </sitemap>
</sitemapindex>
```

## Verification

After generating:
- Open `public/sitemap.xml` and verify route count
- Submit to Google Search Console: Sitemaps → Add sitemap
- The IndexNow script reads from this file automatically — no extra steps needed
