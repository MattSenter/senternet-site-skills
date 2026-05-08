# Per-Page OG Share Image Generation

Generate 1200x630 Open Graph / Twitter Card share images for every page using Sharp and SVG composition. No Figma or external tools needed.

## Why generate programmatically

- Consistent branding across all pages
- No manual Figma exports when adding new pages
- Images can include dynamic text (page title, stats, etc.)
- Output both PNG (OG standard) and WebP (smaller, supported by most crawlers)

## Steps

### 1. Ensure Sharp and Inter font are available

```bash
npm install -D sharp
brew install --cask font-inter  # installs InterVariable.ttf to ~/Library/Fonts
```

Or use any system font at a known path.

### 2. Create `scripts/generate-share-images.mjs`

Structure:
- Build SVG strings for each page's unique design
- Use `sharp` to render SVG → PNG
- Then convert PNG → WebP with `sharp`
- Output to `public/share/`

```js
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, writeFile } from 'fs/promises';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shareDir = path.resolve(__dirname, '../public/share');
await mkdir(shareDir, { recursive: true });

// Font path — adjust to your installed font
const fontPath = path.join(os.homedir(), 'Library/Fonts/InterVariable.ttf');
const FONT_FACE = `@font-face{font-family:'Inter';src:url('file://${fontPath}')format('truetype');font-weight:100 900;}`;

// Pages to generate share images for
const PAGES = [
  {
    id: 'home',
    title: 'APPNAME',
    subtitle: 'Your tagline here',
    color: '#00d4ff',
  },
  {
    id: 'pricing',
    title: 'Pricing',
    subtitle: 'Choose the plan that works for you',
    color: '#00ff88',
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
    font-family="Inter, system-ui, sans-serif"
    font-size="64" font-weight="700"
    fill="white">${page.title}</text>

  <!-- Subtitle -->
  <text x="90" y="210"
    font-family="Inter, system-ui, sans-serif"
    font-size="32" font-weight="400"
    fill="#9ca3af">${page.subtitle}</text>

  <!-- Domain watermark -->
  <text x="90" y="570"
    font-family="Inter, system-ui, sans-serif"
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

### 3. Run the script

```bash
node scripts/generate-share-images.mjs
```

Commit the output files in `public/share/`.

### 4. Add the script to `package.json`

```json
{
  "scripts": {
    "generate:share-images": "node scripts/generate-share-images.mjs"
  }
}
```

### 5. Reference share images in `<MetaTags>`

Pass the `.webp` path to `<MetaTags image>` in each page component:

```tsx
<MetaTags
  title="Pricing - APPNAME"
  description="Choose the plan that works for you."
  image="/share/pricing.webp"
/>
```

The `MetaTags` component resolves root-relative paths to absolute URLs using `VITE_BASE_URL`.

### 6. Add all share images to the prerender script's third-party strip list

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
