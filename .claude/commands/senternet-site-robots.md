# robots.txt Setup

Create a `robots.txt` that allows all crawlers and points to the sitemap.

## Steps

### 1. Create `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://www.DOMAIN.com/sitemap.xml
```

Replace `DOMAIN.com` with the actual domain.

### 2. Block crawlers from non-public paths (if needed)

Only add `Disallow` rules for paths that genuinely shouldn't be indexed:

```
User-agent: *
Allow: /

# Admin or internal paths — block from indexing
Disallow: /admin/
Disallow: /api/
Disallow: /_debug/

Sitemap: https://www.DOMAIN.com/sitemap.xml
```

Do not add `Disallow: /` and then re-allow — this pattern causes issues with some crawlers.

### 3. Verify robots.txt is served correctly

After deploy:
```bash
curl https://www.DOMAIN.com/robots.txt
```

Should return the file content with `Content-Type: text/plain`.

### 4. Submit to Google Search Console

In Google Search Console → Settings → robots.txt Tester, verify that:
- The file parses without errors
- Googlebot is allowed on all intended paths
- No intended pages are blocked

## Notes

- `robots.txt` has no effect on social media crawlers (Twitter, Discord, Slack) — use metatags for those
- Firebase Hosting serves `public/robots.txt` as a static file — no special config needed
- The sitemap reference in `robots.txt` is used by crawlers to discover new pages; keep it updated when the sitemap filename changes
- For multilingual sites with `/es/` paths, these are typically indexed fine by default — no special Disallow needed
- Development/staging Firebase projects should be blocked from Google indexing via a `noindex` meta tag in the HTML, not via `robots.txt`
