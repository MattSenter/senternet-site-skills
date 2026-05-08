---
name: senternet-site-share-images
description: Generate per-page Open Graph share images.
---

# Per-Page OG Share Image Generation

Generate 1200x630 Open Graph / Twitter Card share images for every page using Sharp and SVG composition. No Figma or external tools needed.

## Why generate programmatically

- Consistent branding across all pages
- No manual Figma exports when adding new pages
- Images can include dynamic text (page title, stats, etc.)
- Output both PNG (OG standard) and WebP (smaller, supported by most crawlers)

## Steps

### 1. Detect the site's font

Before writing anything, find what font the site actually uses so the share images match site branding.

Check these locations in order:

1. **`index.html`** — look for a Google Fonts `<link>` tag, e.g. `family=Geist` or `family=Manrope`
2. **`tailwind.config.*`** — look for `fontFamily` in `theme.extend`
3. **`src/index.css` or `src/styles.css`** — look for `@import` of a font or a `@font-face` block
4. **`public/fonts/`** — look for any `.ttf` / `.woff2` files already bundled with the site

Record:
- The font **family name** (e.g. `Geist`, `Manrope`, `Plus Jakarta Sans`)
- Where the font file lives: either a local path (bundled in `public/fonts/`) or a Google Fonts URL

### 2. Ensure Sharp is available

```bash
npm install -D sharp
```

### 3. Prepare the font file for Sharp/SVG rendering

Sharp renders SVG via `librsvg`, which requires fonts as local `.ttf` files — it cannot fetch Google Fonts URLs at render time.

**If the site bundles a font in `public/fonts/`:** use that file directly. No extra step needed.

**If the site loads a Google Font:** download the `.ttf` for use by the script:

```bash
# Replace FONT_NAME with the actual family, e.g. Geist, Manrope, PlusJakartaSans
curl -L "https://fonts.google.com/download?family=FONT_NAME" -o /tmp/font.zip
unzip -j /tmp/font.zip "*.ttf" -d /tmp/site-font/
# Pick the variable or regular-weight .ttf and note its path
```

Alternatively install via Homebrew (macOS) if a cask exists:

```bash
brew install --cask font-FONT_NAME-variable   # e.g. font-geist-variable, font-manrope-variable
# Installs to ~/Library/Fonts/
```

### 4. Create `scripts/generate-share-images.mjs`

Replace `SITE_FONT_FAMILY` with the family name found in Step 1, and `getSiteFontPath()` with the actual path to the `.ttf` file (local project path or OS fonts directory).

```js
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shareDir = path.resolve(__dirname, '../public/share');
await mkdir(shareDir, { recursive: true });

// Font — use the same font the site uses for brand consistency.
// Update SITE_FONT_FAMILY and getSiteFontPath() to match the actual font.
const SITE_FONT_FAMILY = 'SITE_FONT_FAMILY'; // e.g. 'Geist', 'Manrope'

function getSiteFontPath() {
  const home = os.homedir();
  // Option A: font is bundled in the project (preferred — works on all OSes)
  const bundled = path.resolve(__dirname, '../public/fonts/FONT_FILE.ttf');
  // Option B: font installed to OS fonts directory
  switch (os.platform()) {
    case 'darwin': return path.join(home, 'Library/Fonts/FONT_FILE.ttf');
    case 'linux':  return path.join(home, '.local/share/fonts/FONT_FILE.ttf');
    case 'win32':  return path.join(process.env.LOCALAPPDATA ?? home, 'Microsoft/Windows/Fonts/FONT_FILE.ttf');
    default:       return bundled;
  }
}

const fontPath = getSiteFontPath();
const FONT_FACE = `@font-face{font-family:'${SITE_FONT_FAMILY}';src:url('file://${fontPath}')format('truetype');font-weight:100 900;}`;

// Pages to generate share images for
const PAGES = [
  {
    id: 'home',
    title: 'APPNAME',
    subtitle: 'Your tagline here',
    color: '#00d4ff',
  },
  // Add one entry per page that needs a unique share image
];

function buildSvg(page) {
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>${FONT_FACE}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#0f1520"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Accent bar -->
  <rect x="60" y="80" width="6" height="80" rx="3" fill="${page.color}"/>

  <!-- Title -->
  <text x="90" y="145"
    font-family="${SITE_FONT_FAMILY}, system-ui, sans-serif"
    font-size="64" font-weight="700"
    fill="white">${page.title}</text>

  <!-- Subtitle -->
  <text x="90" y="210"
    font-family="${SITE_FONT_FAMILY}, system-ui, sans-serif"
    font-size="32" font-weight="400"
    fill="#9ca3af">${page.subtitle}</text>

  <!-- Domain watermark -->
  <text x="90" y="570"
    font-family="${SITE_FONT_FAMILY}, system-ui, sans-serif"
    font-size="24" font-weight="500"
    fill="${page.color}">www.DOMAIN.com</text>
</svg>`;
}

for (const page of PAGES) {
  const svg = buildSvg(page);
  const pngPath = path.join(shareDir, `${page.id}.png`);
  const webpPath = path.join(shareDir, `${page.id}.webp`);

  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);
  console.log(`Generated share/${page.id}.png + .webp`);
}
```

Customize the SVG to match your brand. For complex designs, layer multiple SVG elements, embed logo PNGs using `data:` URIs, or use `sharp.composite()` to overlay images.

### 5. Run the script

```bash
node scripts/generate-share-images.mjs
```

Commit the output files in `public/share/`.

### 6. Add the script to `package.json`

```json
{
  "scripts": {
    "generate:share-images": "node scripts/generate-share-images.mjs"
  }
}
```

### 7. Reference share images in `<MetaTags>`

Pass the `.webp` path to `<MetaTags image>` in each page component:

```tsx
<MetaTags
  title="About - APPNAME"
  description="Learn more about what we do."
  image="/share/about.webp"
/>
```

The `MetaTags` component resolves root-relative paths to absolute URLs using `VITE_BASE_URL`.

### 8. Add all share images to the prerender script's third-party strip list

Share images are static files — no action needed. But ensure the `og:image` meta tag in each prerendered page points to the correct share image URL, not the default home preview.

## Design guidelines

- **Size**: 1200x630px minimum; 2400x1260 for retina (scale up the SVG canvas)
- **Text**: Keep title ≤ 60 chars so it doesn't get cut in social previews
- **Contrast**: White or light text on dark backgrounds; avoid pure #fff on #000 (harsh)
- **Brand element**: Include your domain name or logo so shares are identifiable without context
- **Safe zone**: Keep important content 60px from edges — some platforms crop share images

## Embedding a PNG logo in the SVG

```js
import { readFileSync } from 'fs';
const logoBase64 = readFileSync(path.resolve(__dirname, '../public/logo.png')).toString('base64');
// In the SVG string:
`<image href="data:image/png;base64,${logoBase64}" x="60" y="480" width="120" height="120" />`
```
