# Image Optimization: WebP Conversion

Convert all site images to WebP format and enforce the `<picture>` element pattern throughout the codebase.

## Steps

### 1. Install `sharp`

```bash
npm install -D sharp
```

### 2. Create `scripts/convert-images.mjs`

```js
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function convertDir(dir, { lossless = false, quality = 82 } = {}) {
  let files;
  try { files = await readdir(dir); } catch { return; }
  const pngs = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  for (const file of pngs) {
    const input = path.join(dir, file);
    const output = path.join(dir, file.replace(/\.(png|jpg|jpeg)$/, '.webp'));
    await sharp(input).webp(lossless ? { lossless: true } : { quality }).toFile(output);
    const inSize = (await stat(input)).size;
    const outSize = (await stat(output)).size;
    console.log(`${file} → ${path.basename(output)}: ${(inSize/1024).toFixed(0)}KB → ${(outSize/1024).toFixed(0)}KB (${Math.round((1-outSize/inSize)*100)}% smaller)`);
  }
}

// Opaque photos and screenshots — lossy is fine
await convertDir(path.resolve(__dirname, '../src/assets'), { quality: 82 });

// Transparent PNGs (icons, logos with alpha) — must be lossless to preserve alpha channel
await convertDir(path.resolve(__dirname, '../public/images'), { lossless: true });

// OG preview image
const ogPng = path.resolve(__dirname, '../public/preview.png');
const ogWebp = path.resolve(__dirname, '../public/preview.webp');
try {
  await sharp(ogPng).webp({ quality: 82 }).toFile(ogWebp);
  const inSize = (await (await import('fs')).promises.stat(ogPng)).size;
  const outSize = (await (await import('fs')).promises.stat(ogWebp)).size;
  console.log(`preview.png → preview.webp: ${(inSize/1024).toFixed(0)}KB → ${(outSize/1024).toFixed(0)}KB`);
} catch { /* no OG image yet */ }
```

Extend the script by calling `convertDir()` for any additional image directories.

### 3. Add the convert script to `package.json`

```json
{
  "scripts": {
    "convert-images": "node scripts/convert-images.mjs"
  }
}
```

### 4. Run the script

```bash
npm run convert-images
```

Commit both the original files and the `.webp` outputs. The `.webp` files are not generated at build time — they must be in the repo.

### 5. Use `<picture>` with WebP source in all image components

**Always use this pattern — never a bare `<img>` pointing at PNG or JPG:**

```tsx
<picture>
  <source srcSet="/path/to/image.webp" type="image/webp" />
  <img src="/path/to/image.png" alt="Descriptive alt text" className="..." />
</picture>
```

All layout and style attributes go on `<img>`, not on `<picture>`.

For responsive images with multiple sizes:
```tsx
<picture>
  <source
    srcSet="/images/hero-400.webp 400w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
    type="image/webp"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <img src="/images/hero-800.png" alt="Hero image" />
</picture>
```

### 6. Rules

- **Lossy (`quality: 82`)**: opaque photos, screenshots, illustrations without transparency
- **Lossless**: anything with an alpha channel (transparent backgrounds, logos, icons)
- **Commit both files**: original + `.webp` so the `<picture>` fallback always works
- **Never** reference a PNG directly in `src=` if a WebP exists — always use `<picture>`
- **OG image** (`public/preview.png`) must also have a `.webp` version for social crawlers that support it

### 7. LCP image special treatment

The hero image (likely the LCP element) needs a `<link rel="preload">` in `index.html`:

```html
<link rel="preload" as="image" href="/screenshot-app.webp" type="image/webp" fetchpriority="high"
  media="(min-width: 769px)" />
<link rel="preload" as="image" href="/screenshot-app-sm.webp" type="image/webp" fetchpriority="high"
  media="(max-width: 768px)" />
```

The preloaded file must use a **stable public URL** (not a Vite-hashed asset) so the `<link>` URL matches the actual `src`. Place hero images in `public/` not `src/assets/`.
