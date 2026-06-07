/**
 * High-quality WebP siblings for raster images in public/ (keeps originals).
 * Run: node scripts/convert-public-to-webp.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");

/** Visually lossless for photos; much smaller than PNG. */
const WEBP_QUALITY = 92;
/** Cap longest edge — 4K phone photos are ~6 MB WebP at full res; 1920px is enough for web. */
const MAX_EDGE = 1920;

const RASTER = /\.(png|jpe?g)$/i;

/** Icons / PWA / QR — keep original format only. */
const SKIP_NAME = /^(favicon|apple-touch-icon|icon-master|website-qr|review-qr)/i;

async function convertFile(absPath) {
  const ext = path.extname(absPath);
  const webpPath = absPath.slice(0, -ext.length) + ".webp";
  const before = fs.statSync(absPath).size;
  const meta = await sharp(absPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const longest = Math.max(w, h);
  let pipeline = sharp(absPath).rotate();
  if (longest > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: w >= h ? MAX_EDGE : undefined,
      height: h > w ? MAX_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  await pipeline.webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true }).toFile(webpPath);
  const after = fs.statSync(webpPath).size;
  const rel = path.relative(PUBLIC, absPath);
  const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  console.log(`  ${rel} → ${path.basename(webpPath)} (${formatBytes(before)} → ${formatBytes(after)}, −${pct}%)`);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".DS_Store" || name === "site-media.json") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (RASTER.test(name) && !SKIP_NAME.test(name)) files.push(full);
  }
  return files;
}

async function main() {
  if (!fs.existsSync(PUBLIC)) {
    console.error