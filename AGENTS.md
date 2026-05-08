# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of Claude Code slash commands (`.claude/skills/*/SKILL.md`) for spinning up production-ready marketing sites. Each skill directory becomes a `/senternet-*` slash command. There is no application code here — the entire repo is prompt engineering for site-building workflows.

## Adding or editing a skill

Skills live in `.claude/skills/` as directories containing `SKILL.md`, following the naming convention `senternet-site-<feature>/SKILL.md` (or `senternet-create-site/SKILL.md` for the orchestrator). To add a new skill:

1. Create `.claude/skills/senternet-site-<feature>/SKILL.md`
2. Add it to the table in `README.md`
3. If it's a phase in the full site setup, add its execution step to `senternet-create-site/SKILL.md` in the correct phase order

## Architecture of a generated site

Skills produce sites with this tech stack:
- **Vite + React + TypeScript** — scaffolded via `senternet-site-vite-setup`
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `src/index.css`
- **Firebase Hosting** — static host, `build/` as public dir (not `dist/`)
- **Puppeteer prerendering** — every route gets a real HTML snapshot at build time

### Critical architectural decisions baked into every generated site

**`hydrateRoot` not `createRoot`** — `src/main.tsx` must use `hydrateRoot` so React attaches to prerendered DOM without replacing it. Switching to `createRoot` destroys the LCP from the initial HTML paint.

**`outDir: 'build'`** — Firebase and prerender scripts expect `build/`, not Vite's default `dist/`.

**`htmlPlugin` in `vite.config.ts`** — rewrites `VITE_BASE_URL` into meta tag `content` and canonical `href` attributes at build time, conditionally injects or strips the GA block based on `VITE_GA_ID`, and injects `<link rel="modulepreload">` tags for all JS chunks.

**`app-ready` event** — `main.tsx` dispatches `document.dispatchEvent(new Event('app-ready'))` after hydration (with a 1s timeout fallback). The prerender script waits for this event before capturing HTML. If a route renders as `✗ EMPTY`, the page component is not calling this dispatch in its `useEffect`.

**`window.__PRERENDERING__ = true`** — set by the prerender script before visiting each route; use this flag to skip animations, API calls, or interactivity that breaks in headless Chrome.

### Build pipeline (full production build)

```
npm run build:prod
→ node scripts/generate-sitemap.mjs
→ tsc -b
→ vite build --mode production
→ node scripts/prerender.mjs
```

```
npm run deploy:prod
→ npm run build:prod
→ firebase deploy --only hosting --project $PREFIX-prod
→ node scripts/indexnow.mjs
```

### The three-file rule

Every new page/route must update all three of these files together — missing any one leaves the page without static HTML for crawlers, without a sitemap entry, or both:

1. `src/App.tsx` — add the `<Route>`
2. `scripts/prerender.mjs` — add to `ROUTES` array
3. `scripts/generate-sitemap.mjs` — add to `ROUTES` array (sitemap regenerates at build time)

Optionally: `scripts/generate-share-images.mjs` — add a share image block.

### CSP on static hosting

Firebase Hosting serves static headers (no per-request nonces). Use SHA-256 hashes for any remaining inline scripts — move inline scripts to `public/<name>.js` first whenever possible. Never use `'unsafe-inline'` in `script-src`.

## Target Lighthouse scores (mobile)

- Performance ≥ 94
- Accessibility ≥ 98
- Best Practices ≥ 96
- SEO = 100

## Skill execution order (from `senternet-create-site`)

Prerequisites → Phase 1 (Vite, Design, Firebase) → Phase 2 SEO (metatags, robots, sitemap, IndexNow) → Phase 3 Analytics (GA4, Reddit pixel) → Phase 4 Build pipeline (prerender) → Phase 5 Images (WebP, share images) → Phase 6 Performance (Lighthouse, mobile) → Phase 7 Optional (i18n, ad landing pages, blog, compare pages)
