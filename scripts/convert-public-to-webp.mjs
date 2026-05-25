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

const RASTER = /\.(png|jpe?g)$/i;

/** Icons / PWA / QR — keep original format only. */
const SKIP_NAME = /^(favicon|apple-touch-icon|icon-master|website-qr|review-qr)/i;

async function convertFile(absPath) {
  const ext = path.extname(absPath);
  const webpPath = absPath.slice(0, -ext.length) + ".webp";
  const before = fs.statSync(absPath).size;
  await sharp(absPath)
    .rotate()
    .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
    .toFile(webpPath);
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
    console.error("public/ not found");
    process.exit(1);
  }
  const files = walk(PUBLIC);
  if (!files.length) {
    console.log("No PNG/JPEG files in public/");
    return;
  }
  console.log(`Converting ${files.length} file(s) (WebP quality ${WEBP_QUALITY})…`);
  for (const f of files) {
    try {
      await convertFile(f);
    } catch (e) {
      console.error(`  FAILED ${path.relative(PUBLIC, f)}:`, e?.message || e);
      process.exitCode = 1;
    }
  }
  console.log("Done.");
}

main();
