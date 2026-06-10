---
name: senternet-site-analytics
description: Help the user choose between Google Analytics and PostHog, then hand off to the matching setup skill.
---

# Analytics Router

Use this skill when the user wants analytics on the site but has **not** yet picked a provider. It chooses between Google Analytics 4 and PostHog, then hands off — it does not implement anything itself.

## Choosing a provider

Ask one short question if the choice is ambiguous, then route:

- **Google Analytics 4** → run `/senternet-site-google-analytics`. Best for marketing-site traffic measurement, acquisition channels, and Search/Ads integration. Pairs naturally with the Firebase project this suite already sets up.
- **PostHog** → run `/senternet-site-posthog`. Best for product analytics: events, funnels, retention, and session replay on an app-like site.

Quick guidance when the user is unsure:

- Marketing/brochure site, cares about traffic sources and SEO → **GA4**.
- App, dashboard, or interactive product where per-user behavior and funnels matter → **PostHog**.
- Wanting both is valid — they don't conflict. Set up GA4 first, then PostHog; both load lazily and gate on production.

## Handoff rules

- Once the provider is known, hand off immediately to the target skill and stop.
- Do not repeat or preview the target skill's setup steps here.
- Do not explain both options at length unless the user explicitly asks for a comparison.
