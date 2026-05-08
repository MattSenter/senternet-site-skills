# Multilingual / i18n Support

Add multi-language support with URL-based routing (`/es/`, `/fr/`), hreflang tags, localized prerendering, and Firebase Hosting i18n.

## Architecture decision

This implementation uses:
- **URL prefix routing**: English at `/`, Spanish at `/es/`, etc. (not `?lang=es` query params)
- **React Context** for current language state
- **A single `i18n.ts` file** with all copy for all locales (not separate JSON files)
- **`window.__LANG__`** flag so the prerender script can force a specific locale during static generation
- **hreflang `<link>` tags** in the prerendered HTML so Google serves the right language

## Steps

### 1. Create `src/i18n.ts`

Define all locales and copy in one typed file:

```typescript
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'es';

export interface LocaleCopy {
  languageLabel: string;
  languageNames: Record<Language, string>;
  nav: {
    home: string;
    about: string;
    pricing: string;
  };
  home: {
    meta: { title: string; description: string };
    hero: { headline: string; body: string; cta: string };
    // ... add all copy keys
  };
  // ... add all pages
}

const copy: Record<Language, LocaleCopy> = {
  en: {
    languageLabel: 'Language',
    languageNames: { en: 'English', es: 'Español' },
    nav: { home: 'Home', about: 'About', pricing: 'Pricing' },
    home: {
      meta: {
        title: 'APPNAME - Tagline',
        description: 'Description for search results.',
      },
      hero: {
        headline: 'Your headline here',
        body: 'Supporting copy here.',
        cta: 'Get started',
      },
    },
  },
  es: {
    languageLabel: 'Idioma',
    languageNames: { en: 'English', es: 'Español' },
    nav: { home: 'Inicio', about: 'Acerca', pricing: 'Precios' },
    home: {
      meta: {
        title: 'APPNAME - Eslogan',
        description: 'Descripción para resultados de búsqueda.',
      },
      hero: {
        headline: 'Tu titular aquí',
        body: 'Copia de apoyo aquí.',
        cta: 'Comenzar',
      },
    },
  },
};

const LanguageContext = createContext<{ language: Language; setLanguage: (l: Language) => void }>({
  language: 'en',
  setLanguage: () => {},
});

function detectLanguage(): Language {
  // Prerender script injects window.__LANG__ before navigating to /es/* routes
  if (typeof window !== 'undefined' && (window as any).__LANG__) {
    return (window as any).__LANG__ as Language;
  }
  // URL prefix: /es/* → Spanish
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/es')) {
    return 'es';
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(detectLanguage);
  useEffect(() => {
    // Sync language when the URL changes (e.g. user navigates via React Router)
    const newLang = detectLanguage();
    if (newLang !== language) setLanguage(newLang);
  }, [typeof window !== 'undefined' ? window.location.pathname : '']);
  return createElement(LanguageContext.Provider, { value: { language, setLanguage } }, children);
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useCopy(): LocaleCopy {
  const { language } = useLanguage();
  return useMemo(() => copy[language], [language]);
}
```

### 2. Update `src/App.tsx` for locale routing

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* English routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          {/* Spanish routes — same components, language set by URL prefix */}
          <Route path="/es" element={<HomePage />} />
          <Route path="/es/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
```

### 3. Use copy in page components

```tsx
import { useCopy } from '../i18n';

function HomePage() {
  const t = useCopy();
  return (
    <>
      <MetaTags title={t.home.meta.title} description={t.home.meta.description} />
      <h1>{t.home.hero.headline}</h1>
      <p>{t.home.hero.body}</p>
    </>
  );
}
```

### 4. Add hreflang links in the `usePageHead` hook (or MetaTags component)

```tsx
// In MetaTags.tsx or a usePageHead hook
const setAlternate = (hreflang: string, href: string) => {
  let el = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'alternate'); document.head.appendChild(el); }
  el.setAttribute('hreflang', hreflang);
  el.setAttribute('href', href);
};

const origin = import.meta.env.VITE_BASE_URL || window.location.origin;
const englishPath = currentPath.replace(/^\/es/, '') || '/';
const spanishPath = currentPath.startsWith('/es') ? currentPath : `/es${currentPath === '/' ? '' : currentPath}`;

setAlternate('en', `${origin}${englishPath}`);
setAlternate('es', `${origin}${spanishPath}`);
setAlternate('x-default', `${origin}${englishPath}`);
```

### 5. Update the prerender script for locales

```js
const LOCALES = [
  { language: 'en', dir: '' },
  { language: 'es', dir: 'es' },
];

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    if (locale.language !== 'en') {
      await page.evaluateOnNewDocument((lang) => { window.__LANG__ = lang; }, locale.language);
    }
    const requestPath = locale.dir
      ? `/${locale.dir}${route === '/' ? '' : route}`
      : route;
    await page.goto(`http://localhost:9999${requestPath}`, { waitUntil: 'networkidle2' });
    // ... render and save
    const outDir = locale.dir
      ? path.join(buildDir, locale.dir, route === '/' ? '' : route.slice(1))
      : (route === '/' ? buildDir : path.join(buildDir, route.slice(1)));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  }
}
```

### 6. Update the sitemap with hreflang alternates

See `site-sitemap` skill — the `LOCALES` array generates the `<xhtml:link>` alternates automatically.

### 7. Language switcher component

```tsx
function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const router = useNavigate();

  const switchTo = (lang: Language) => {
    setLanguage(lang);
    const current = window.location.pathname;
    const newPath = lang === 'es'
      ? `/es${current === '/' ? '' : current.replace(/^\/es/, '')}`
      : current.replace(/^\/es/, '') || '/';
    router(newPath);
  };

  return (
    <button onClick={() => switchTo(language === 'en' ? 'es' : 'en')}>
      {language === 'en' ? 'Español' : 'English'}
    </button>
  );
}
```

## Notes

- All copy must live in `i18n.ts` — never hardcode English strings in components
- The prerender script must clear the `/es` directory before re-rendering to avoid stale pages: `fs.rmSync(path.join(buildDir, 'es'), { recursive: true, force: true })`
- Firebase Hosting's `"i18n": { "root": "/" }` config is optional — URL prefix routing handles i18n at the app level
- For RTL languages (Arabic, Hebrew), add `dir="rtl"` to `<html>` based on the active language
