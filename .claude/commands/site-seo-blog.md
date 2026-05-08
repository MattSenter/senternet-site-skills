# SEO Blog / Insight Posts

Add an SEO-optimized blog or insights section to drive organic search traffic. Each post gets its own prerendered route, sitemap entry, and share image.

## Architecture

Posts live at `/insights/SLUG` or `/blog/SLUG`. Each post is:
- A React component (or data-driven template) with unique content
- A prerendered static HTML page
- Listed on an index page at `/insights`
- Linked from a sitemap entry
- Given a programmatically generated share image

## Steps

### 1. Create the insights index page

```tsx
// src/components/InsightsIndexPage.tsx
import { MetaTags } from './MetaTags';
import { Link } from 'react-router-dom';

const POSTS = [
  {
    slug: 'big-tech-earnings-april-2026',
    title: 'Big Tech Earnings: What to Expect',
    date: '2026-04-29',
    description: 'AAPL, MSFT, META, and GOOGL all reporting this week. Here\'s what the market is watching.',
    image: '/share/insight-big-tech.webp',
  },
  // Add new posts here
];

export function InsightsIndexPage() {
  return (
    <>
      <MetaTags
        title="Market Insights - APPNAME"
        description="Timely analysis on stocks, crypto, and market-moving events."
        image="/share/insights-index.webp"
      />
      <main>
        <h1>Market Insights</h1>
        <ul>
          {POSTS.map(post => (
            <li key={post.slug}>
              <Link to={`/insights/${post.slug}`}>
                <h2>{post.title}</h2>
                <time dateTime={post.date}>{post.date}</time>
                <p>{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
```

### 2. Create individual post components

Each post is a standalone component:

```tsx
// src/components/InsightBigTechEarnings.tsx
import { MetaTags } from './MetaTags';

export function InsightBigTechEarnings() {
  return (
    <>
      <MetaTags
        title="Big Tech Earnings April 2026 - APPNAME"
        description="AAPL, MSFT, META, and GOOGL all reporting this week. Here's what the market is watching."
        image="/share/insight-big-tech.webp"
      />
      <article>
        <header>
          <h1>Big Tech Earnings: What to Expect This Week</h1>
          <time dateTime="2026-04-29">April 29, 2026</time>
        </header>

        <p>This week marks the most consequential earnings stretch of the year...</p>

        {/* Article body */}

        {/* Schema.org Article markup */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Big Tech Earnings: What to Expect This Week",
          "datePublished": "2026-04-29",
          "author": { "@type": "Organization", "name": "APPNAME" },
          "image": "https://www.DOMAIN.com/share/insight-big-tech.png",
        })}</script>
      </article>
    </>
  );
}
```

### 3. Add routes to `src/App.tsx`

```tsx
<Route path="/insights" element={<InsightsIndexPage />} />
<Route path="/insights/big-tech-earnings-april-2026" element={<InsightBigTechEarnings />} />
```

### 4. Add to `scripts/prerender.mjs`

```js
const ROUTES = [
  '/insights',
  '/insights/big-tech-earnings-april-2026',
];
```

### 5. Add to `public/sitemap.xml`

```xml
<url>
  <loc>https://www.DOMAIN.com/insights</loc>
  <lastmod>2026-04-29</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://www.DOMAIN.com/insights/big-tech-earnings-april-2026</loc>
  <lastmod>2026-04-29</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

Or add post routes to `generate-sitemap.mjs` and regenerate.

### 6. Generate a share image for each post

Add a block to `scripts/generate-share-images.mjs`:

```js
const INSIGHT_POSTS = [
  { id: 'insight-big-tech', title: 'Big Tech Earnings', subtitle: 'April 29, 2026', color: '#00d4ff' },
];

for (const post of INSIGHT_POSTS) {
  const svg = buildInsightSvg(post); // your SVG template
  await sharp(Buffer.from(svg)).png().toFile(`public/share/${post.id}.png`);
  await sharp(`public/share/${post.id}.png`).webp({ quality: 85 }).toFile(`public/share/${post.id}.webp`);
}
```

### 7. Ticker / topic index pages (for programmatic SEO at scale)

For apps tracking many tickers, create index pages per ticker:

```
/insights/tickers              → all tickers
/insights/tickers/stock        → all stocks
/insights/tickers/stock/AAPL   → posts mentioning AAPL
/insights/tickers/crypto/BTC   → posts mentioning BTC
```

Data lives in `src/data/tickers.ts`:

```typescript
export interface InsightAppearance {
  slug: string;
  title: string;
  date: string;
  keyMetric: string;
  accentColor: string;
}

export interface Ticker {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto';
  appearances: InsightAppearance[];
}

export const TICKERS: Ticker[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    appearances: [
      {
        slug: 'big-tech-earnings-april-2026',
        title: 'Big Tech Earnings: What to Expect',
        date: '2026-04-29',
        keyMetric: 'Beat estimates by 4%',
        accentColor: '#00d4ff',
      },
    ],
  },
];
```

When adding a new insight, update `tickers.ts` for every ticker mentioned in the post.

## SEO writing guidelines

- **Title format**: `[Topic] - [Date or Context] | APPNAME` — unique per post
- **Description**: 150–160 chars, includes the primary keyword naturally
- **H1**: matches the post title exactly (one per page)
- **Internal links**: each post should link to 2–3 related posts and the insights index
- **Publication date**: use `<time dateTime="YYYY-MM-DD">` for structured data
- **Alt text**: all images need descriptive alt text, not filename
- **Word count**: 400+ words minimum for Google to consider it substantive content
- **Freshness**: update `<lastmod>` in the sitemap when you revise a post
