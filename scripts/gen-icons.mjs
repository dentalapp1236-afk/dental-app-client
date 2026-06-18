// Generates PWA icons from an inline SVG. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
mkdirSync(publicDir, { recursive: true });

// Full-bleed background (good for maskable) + centered white tooth in the safe zone.
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14233c"/>
      <stop offset="1" stop-color="#3a72e3"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <path fill="#ffffff" d="M256 120
    C 198 120 152 148 140 196
    C 130 236 142 306 160 366
    C 170 398 180 414 194 414
    C 210 414 212 378 220 350
    C 226 328 238 318 256 318
    C 274 318 286 328 292 350
    C 300 378 302 414 318 414
    C 332 414 342 398 352 366
    C 370 306 382 236 372 196
    C 360 148 314 120 256 120 Z"/>
</svg>`;

const sizes = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "maskable-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

const buf = Buffer.from(svg);
for (const { file, size } of sizes) {
  await sharp(buf).resize(size, size).png().toFile(resolve(publicDir, file));
  console.log("wrote", file);
}

// Scalable favicon
writeFileSync(resolve(publicDir, "favicon.svg"), svg);
console.log("wrote favicon.svg");
