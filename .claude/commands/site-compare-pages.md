# Competitor Alternative / Compare Pages

Create SEO-optimized "X alternative" and "X vs Y" pages to capture high-intent search traffic from users evaluating competitors.

## Why these pages work

"[Competitor] alternative" and "[Us] vs [Competitor]" searches have strong commercial intent — users are actively evaluating products. These pages rank well because:
- The keyword is explicit in the URL and title
- The content answers the searcher's actual question
- Internal links from these pages to your home/pricing pages signal authority

## Page formats

### Format 1: "[Competitor] Alternative" — singular

URL: `/compare/competitor-alternative`
Title: `Best [Competitor] Alternative in [Year] - [Your App]`

Good for: targeting users specifically searching for an alternative to one product.

### Format 2: "[Competitor] Alternatives" — plural

URL: `/compare/competitor-alternatives`
Title: `[N] [Competitor] Alternatives for [Use Case] in [Year]`

Good for: ranking in listicle-format queries. Can mention multiple alternatives including you.

### Format 3: "[Your App] vs [Competitor]"

URL: `/compare/yourapp-vs-competitor`
Title: `[Your App] vs [Competitor]: Which is Better?`

Good for: users who already know both products and want a direct comparison.

### Format 4: "[Competitor] vs [Competitor]"

URL: `/compare/competitor-a-vs-competitor-b`
Title: `[Competitor A] vs [Competitor B]: Which is Better for [Use Case]?`

Good for: ranking when users search for a comparison you're not even in — you appear as a third option.

## Steps

### 1. Create a reusable `ComparePage` component

```tsx
// src/components/ComparePages.tsx
import { MetaTags } from './MetaTags';
import { Link } from 'react-router-dom';

interface Feature {
  name: string;
  yours: boolean | string;
  theirs: boolean | string;
}

interface ComparePageProps {
  title: string;
  description: string;
  heroHeadline: string;
  heroBody: string;
  competitorName: string;
  features: Feature[];
  verdict: string;
  ctaText: string;
  ctaUrl: string;
  image?: string;
}

export function ComparePage({ title, description, heroHeadline, heroBody, competitorName, features, verdict, ctaText, ctaUrl, image }: ComparePageProps) {
  return (
    <>
      <MetaTags title={title} description={description} image={image} />
      <main>
        <h1>{heroHeadline}</h1>
        <p>{heroBody}</p>

        <section>
          <h2>Feature Comparison</h2>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>APPNAME</th>
                <th>{competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.name}>
                  <td>{f.name}</td>
                  <td>{typeof f.yours === 'boolean' ? (f.yours ? '✓' : '✗') : f.yours}</td>
                  <td>{typeof f.theirs === 'boolean' ? (f.theirs ? '✓' : '✗') : f.theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>The Verdict</h2>
          <p>{verdict}</p>
        </section>

        <a href={ctaUrl}>{ctaText}</a>

        {/* Schema.org for compare pages */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
        })}</script>
      </main>
    </>
  );
}
```

### 2. Create individual compare page components

```tsx
export function YahooFinanceAlternativePage() {
  return (
    <ComparePage
      title="Best Yahoo Finance Alternative in 2026 - APPNAME"
      description="Looking for a Yahoo Finance alternative? APPNAME gives you AI-powered portfolio podcasts instead of charts. Free on iPhone."
      heroHeadline="The Yahoo Finance Alternative That Talks to You"
      heroBody="Yahoo Finance is great for charts and news. But if you want your portfolio explained in plain English — APPNAME turns your holdings into a daily audio briefing."
      competitorName="Yahoo Finance"
      features={[
        { name: 'Portfolio tracking', yours: true, theirs: true },
        { name: 'AI audio briefing', yours: true, theirs: false },
        { name: 'Pre-market updates', yours: true, theirs: true },
        { name: 'Crypto support', yours: true, theirs: true },
        { name: 'No account required', yours: true, theirs: false },
        { name: 'Free', yours: true, theirs: true },
      ]}
      verdict="If you read Yahoo Finance, APPNAME is the audio version. Same data, but it talks to you on your commute."
      ctaText="Try APPNAME Free"
      ctaUrl="https://apps.apple.com/app/..."
      image="/share/compare-yahoo.webp"
    />
  );
}
```

### 3. Add routes and prerender entries

For each compare page, add to:
1. `src/App.tsx` — `<Route path="/compare/yahoo-finance-alternative" element={<YahooFinanceAlternativePage />} />`
2. `scripts/prerender.mjs` — ROUTES array
3. `public/sitemap.xml` — URL entry with priority 0.7

### 4. Link compare pages from your site

- Add a "Comparisons" section to the footer
- Link from the home page ("See how we compare")
- Link between compare pages ("Also see: Robinhood Alternative")

Internal linking is critical for Google to discover and rank these pages.

### 5. Generate share images

Add entries to `scripts/generate-share-images.mjs` for each compare page. Use the competitor's primary color or neutral branding.

## SEO guidelines for compare pages

- **URL**: use the keyword exactly — `/compare/yahoo-finance-alternative` not `/compare/yahoo`
- **Title**: include the year (or "2026") — compare queries are time-sensitive
- **H1**: matches the primary keyword ("Best Yahoo Finance Alternative")
- **Content**: be genuinely useful — explain real differences, don't just say you're better at everything
- **Word count**: 600+ words; Google rewards depth for commercial comparison queries
- **Features table**: include features where the competitor wins — authenticity builds trust
- **CTA**: link to App Store or sign-up, not just the home page
- **Internal links**: link to 2–3 other compare pages ("Also looking at Robin Hood? See our comparison.")
- **Update annually**: refresh the year in the title and revisit feature accuracy
