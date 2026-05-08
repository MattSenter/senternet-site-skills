# Vite + React + TypeScript Site Setup

Initialize a production-ready Vite + React + TypeScript project for a Senternet marketing site.

## Steps

1. Scaffold the project with Vite using the React + TypeScript template:
   ```bash
   npm create vite@latest $SITE_NAME -- --template react-ts
   cd $SITE_NAME
   npm install
   ```
   Replace `$SITE_NAME` with the project directory name (e.g. `myapp-site`).

2. Install core dependencies:
   ```bash
   npm install react-router-dom
   npm install -D puppeteer sharp
   ```

3. Update `vite.config.ts` with:
   - Path alias `@/` → `src/`
   - `outDir: 'build'` (not the default `dist` — Firebase and prerender scripts expect `build/`)
   - `manualChunks: { 'vendor-react': ['react', 'react-dom', 'react-router-dom'] }` for parallel chunk loading
   - `build.target: 'esnext'`
   - Dev server port from `PORT` env var with a project-specific default (e.g. 3003)
   - An `htmlPlugin` that rewrites `VITE_BASE_URL` into meta tag `content` and canonical `href` attributes at build time, and conditionally injects or strips the GA block based on `VITE_GA_ID`

   The htmlPlugin should also inject `<link rel="modulepreload">` tags for all JS chunks so the browser fetches them from `<head>` rather than waiting for the `<script>` at end of body.

4. Set up `src/main.tsx`:
   - Use `hydrateRoot` (not `createRoot`) so React attaches to pre-rendered DOM without replacing it — this keeps LCP from the initial HTML paint
   - Dispatch `new Event('app-ready')` after hydration so the prerender script knows the page is ready
   - Add a 1s fallback timeout that also dispatches `app-ready`

5. Set up `src/App.tsx` with React Router:
   - Use `BrowserRouter` + `Routes` + `Route`
   - Add a catch-all `<Route path="*">` that redirects to `/`
   - Lazy-load page components with `React.lazy` + `Suspense`

6. Create `.env.development` and `.env.production` files:
   ```
   VITE_BASE_URL=http://localhost:3003
   VITE_GA_ID=
   ```
   and
   ```
   VITE_BASE_URL=https://www.yoursite.com
   VITE_GA_ID=G-XXXXXXXXXX
   ```

7. Update `package.json` scripts:
   ```json
   {
     "dev": "vite --port 3003",
     "build": "tsc -b && vite build",
     "build:prod": "tsc -b && vite build --mode production && node scripts/prerender.mjs",
     "preview": "vite preview"
   }
   ```

8. Add `tsconfig.json` with strict mode and path alias for `@/`.

9. Create `src/index.css` with Tailwind CSS v4 import:
   ```css
   @import "tailwindcss";
   ```
   Install Tailwind:
   ```bash
   npm install -D tailwindcss @tailwindcss/vite
   ```
   Add `@tailwindcss/vite` to the vite plugins array.

10. Create `scripts/` directory for build helpers.

11. Create `public/` with `favicon.png`, `favicon.svg`, `favicon.ico`, and `apple-touch-icon.png` placeholders.

12. Create `src/assets/` for optimized images.

## Output

When complete, the project should:
- Run `npm run dev` without errors
- Build with `npm run build` without TypeScript errors
- Have the `@/` alias working for imports
- Have React Router wired up with at least a home route
- Be ready for Firebase Hosting, GA, prerender, and all other site skills to be layered on top
