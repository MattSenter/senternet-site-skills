---
name: senternet-site-seo-blog
description: Add a prerendered SEO blog with posts and tag pages.
---

# SEO Blog

Add an SEO-optimized blog section to drive organic search traffic. Each post gets its own prerendered route, sitemap entry, and share image.

## Before you start

Ask the user:

> **What URL path should the blog live at?** (e.g. `/blog`, `/insights`, `/news`, `/updates`)
> Default is `/blog` — press enter to keep it.

Use their answer as `$BLOG_PATH` throughout. If they skip or enter nothing, use `/blog`.

## Architecture

Posts live at `$BLOG_PATH/SLUG`. Each post is:
- A React component (or data-driven template) with unique content
- A prerendered static HTML page
- Listed on an index page at `/blog`
- Linked from a sitemap entry
- Given a programmatically generated share image

## Steps

### 1. Create the blog index page

Name the component after the path segment (e.g. `InsightsIndexPage` for `/insights`, `BlogIndexPage` for `/blog`).

```tsx
// src/components/BlogIndexPage.tsx  ← rename to match $BLOG_PATH
import { MetaTags } from './MetaTags';
import { Link } from 'react-router-dom';

const POSTS = [
  {
    slug: 'how-to-get-started-with-appname',
    title: 'How to Get Started with APPNAME',
    date: '2026-01-15',
    description: 'A step-by-step guide to setting up APPNAME and getting value on day one.',
    image: '/share/post-getting-started.webp',
  },
  // Add new posts here
];

export function BlogIndexPage() {
  return (
    <>
      <MetaTags
        title="Blog - APPNAME"
        description="Guides, tips, and updates from the APPNAME team."
        image="/share/blog-index.webp"
      />
      <main>
        <h1>Blog</h1>
        <ul>
          {POSTS.map(post => (
            <li key={post.slug}>
              <Link to={`$BLOG_PATH/${post.slug}`}>
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
// src/components/PostGettingStarted.tsx
import { MetaTags } from './MetaTags';

export function PostGettingStarted() {
  return (
    <>
      <MetaTags
        title="How to Get Started with APPNAME - APPNAME Blog"
        description="A step-by-step guide to setting up APPNAME and getting value on day one."
        image="/share/post-getting-started.webp"
      />
      <article>
        <header>
          <h1>How to Get Started with APPNAME</h1>
          <time dateTime="2026-01-15">January 15, 2026</time>
        </header>

        <p>Getting started with APPNAME takes less than five minutes...</p>

        {/* Article body */}

        {/* Schema.org Article markup */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "How to Get Started with APPNAME",
          "datePublished": "2026-01-15",
          "author": { "@type": "Organization", "name": "APPNAME" },
          "image": "https://www.DOMAIN.com/share/post-getting-started.png",
        })}</script>
      </article>
    </>
  );
}
```

### 3. Add routes to `src/App.tsx`

```tsx
<Route path="$BLOG_PATH" element={<BlogIndexPage />} />
<Route path="$BLOG_PATH/how-to-get-started-with-appname" element={<PostGettingStarted />} />
```

### 4. Add to `scripts/prerender.mjs`

```js
const ROUTES = [
  '$BLOG_PATH',
  '$BLOG_PATH/how-to-get-started-with-appname',
];
```

### 5. Add to `public/sitemap.xml`

```xml
<url>
  <loc>https://www.DOMAIN.com$BLOG_PATH</loc>
  <lastmod>2026-01-15</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://www.DOMAIN.com$BLOG_PATH/how-to-get-started-with-appname</loc>
  <lastmod>2026-01-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

Or add post routes to `generate-sitemap.mjs` and regenerate.

### 6. Generate a share image for each post

Add a block to `scripts/generate-share-images.mjs`:

```js
const BLOG_POSTS = [
  { id: 'post-getting-started', title: 'How to Get Started with APPNAME', subtitle: 'January 15, 2026', color: '#00d4ff' },
];

for (const post of BLOG_POSTS) {
  const svg = buildPostSvg(post); // your SVG template
  await sharp(Buffer.from(svg)).png().toFile(`public/share/${post.id}.png`);
  await sharp(`public/share/${post.id}.png`).webp({ quality: 85 }).toFile(`public/share/${post.id}.webp`);
}
```

### 7. Tag / category index pages (for programmatic SEO at scale)

For apps with many content categories, create index pages per tag:

```
$BLOG_PATH/topics               → all topics
$BLOG_PATH/topics/guides        → all guide posts
$BLOG_PATH/topics/updates       → all product update posts
$BLOG_PATH/topics/tips          → posts tagged with tips
```

Data lives in `src/data/posts.ts`:

```typescript
export interface PostAppearance {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  accentColor: string;
}

export interface Topic {
  slug: string;
  label: string;
  posts: PostAppearance[];
}

export const TOPICS: Topic[] = [
  {
    slug: 'guides',
    label: 'Guides',
    posts: [
      {
        slug: 'how-to-get-started-with-appname',
        title: 'How to Get Started with APPNAME',
        date: '2026-01-15',
        excerpt: 'Set up APPNAME and get value on day one.',
        accentColor: '#00d4ff',
      },
    ],
  },
];
```

When adding a new post, update `posts.ts` for every topic it belongs to.

## SEO writing guidelines

- **Title format**: `[Topic] - [Date or Context] | APPNAME` — unique per post
- **Description**: 150–160 chars, includes the primary keyword naturally
- **H1**: matches the post title exactly (one per page)
- **Internal links**: each post should link to 2–3 related posts and the blog index
- **Publication date**: use `<time dateTime="YYYY-MM-DD">` for structured data
- **Alt text**: all images need descriptive alt text, not filename
- **Word count**: 400+ words minimum for Google to consider it substantive content
- **Freshness**: update `<lastmod>` in the sitemap when you revise a post
