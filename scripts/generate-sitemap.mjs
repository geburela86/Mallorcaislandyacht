import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SITE_ORIGIN,
  SEO_SITEMAP_ROUTES,
} from "../src/lib/seo.js";
import { SEO_LOCALES, buildLocalizedPath } from "../src/lib/seo-locales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hreflangLinksForBasePath(basePath) {
  return SEO_LOCALES.map((locale) => {
    const href = `${SITE_ORIGIN}${buildLocalizedPath(basePath, locale)}`;
    const hreflang = locale;
    return `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`;
  }).join("\n");
}

function buildSitemapXml(lastmod) {
  const urlBlocks = [];

  for (const { path: basePath, changefreq, priority } of SEO_SITEMAP_ROUTES) {
    const alternates = hreflangLinksForBasePath(basePath);
    const xDefault = `${SITE_ORIGIN}${buildLocalizedPath(basePath, "es")}`;

    for (const locale of SEO_LOCALES) {
      const loc = `${SITE_ORIGIN}${buildLocalizedPath(basePath, locale)}`;
      urlBlocks.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}" />
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlBlocks.join("\n")}
</urlset>
`;
}

function writeOut(file, xml) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, xml, "utf8");
}

function main() {
  const distMode = process.argv.includes("--dist");
  const lastmod = new Date().toISOString().slice(0, 10);
  const xml = buildSitemapXml(lastmod);
  const urlCount = SEO_SITEMAP_ROUTES.length * SEO_LOCALES.length;

  if (distMode) {
    if (!fs.existsSync(distDir)) {
      console.error("sitemap: dist/ not found. Run vite build first.");
      process.exit(1);
    }
    writeOut(path.join(distDir, "sitemap.xml"), xml);
    console.log(`sitemap: wrote dist/sitemap.xml (${urlCount} localized URLs, hreflang)`);
    return;
  }

  writeOut(path.join(publicDir, "sitemap.xml"), xml);
  console.log(`sitemap: wrote public/sitemap.xml (${urlCount} localized URLs, hreflang)`);
}

main();
