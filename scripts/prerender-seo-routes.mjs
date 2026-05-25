import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getBlogArticle, isBlogPath } from "../src/lib/seo-blog.js";
import {
  SITE_ORIGIN,
  SEO_SITEMAP_ROUTES,
  SEO_PRERENDER_ES,
  SEO_BLOG_PRERENDER_ES,
  resolveSeoMeta,
  buildSeoGraphJsonLd,
  SEO_OG_IMAGE,
  getFaqForLang,
} from "../src/lib/seo.js";
import {
  SEO_LOCALES,
  buildLocalizedPath,
  getPrerenderBlock,
} from "../src/lib/seo-locales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceTag(html, tag, attrs, inner) {
  const re = new RegExp(`<${tag}[^>]*>[^<]*</${tag}>`, "i");
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  return re.test(html) ? html.replace(re, `${open}${escapeHtml(inner)}</${tag}>`) : html;
}

function replaceHtmlLang(html, lang) {
  return html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}"`);
}

function replaceMeta(html, attr, key, content) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html;
}

function replaceCanonical(html, href) {
  const re = /<link\s+rel="canonical"[^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  return re.test(html) ? html.replace(re, tag) : html;
}

function replaceJsonLd(html, data) {
  const re = /<script[^>]*id="miy-localbusiness-jsonld"[^>]*>[\s\S]*?<\/script>/i;
  const tag = `<script type="application/ld+json" id="miy-localbusiness-jsonld">${JSON.stringify(data)}</script>`;
  return re.test(html) ? html.replace(re, tag) : html;
}

function buildFaqHtml(lang) {
  return getFaqForLang(lang)
    .map(
      (item) =>
        `    <details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`,
    )
    .join("\n");
}

function buildBlogStaticMain(routePath, lang) {
  const article = getBlogArticle(routePath, lang);
  if (!article) return null;
  const sections = (article.sections || [])
    .map((sec) => {
      const paras = (sec.paragraphs || [])
        .map((p) => `      <div class="site-text">${escapeHtml(p)}</div>`)
        .join("\n");
      const list = sec.list?.length
        ? `<ul>${sec.list.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`
        : "";
      return `    <section>\n      <div class="blog-prerender__h">${escapeHtml(sec.h2)}</div>\n${paras}${list}\n    </section>`;
    })
    .join("\n");
  return `<main id="seo-prerender" lang="${lang}">
  <div class="blog-prerender">
    <div class="blog-prerender__title">${escapeHtml(article.h1)}</div>
${sections}
  </div>
</main>`;
}

function buildStaticMain(routePath, lang) {
  const blogMain = isBlogPath(routePath) ? buildBlogStaticMain(routePath, lang) : null;
  if (blogMain) return blogMain;

  const block =
    getPrerenderBlock(routePath, lang) ||
    SEO_BLOG_PRERENDER_ES[routePath] ||
    SEO_PRERENDER_ES[routePath] ||
    SEO_PRERENDER_ES["/"];
  const sections = (block.sections || [])
    .map(
      (s) =>
        `    <section>\n      <h2>${escapeHtml(s.h2)}</h2>\n      <p>${escapeHtml(s.p)}</p>\n    </section>`,
    )
    .join("\n");
  const faqBlock =
    routePath === "/" || routePath === "/alquiler-barco-mallorca"
      ? `\n    <section id="faq">\n      <h2>FAQ</h2>\n${buildFaqHtml(lang)}\n    </section>`
      : "";
  return `<main id="seo-prerender" lang="${lang}">
  <article>
    <h1>${escapeHtml(block.h1)}</h1>
    <p>${escapeHtml(block.lead)}</p>
${sections}${faqBlock}
  </article>
</main>`;
}

function patchHtml(template, basePath, lang) {
  const localizedPath = buildLocalizedPath(basePath, lang);
  const meta = resolveSeoMeta(lang, localizedPath);
  const jsonLd = buildSeoGraphJsonLd({ lang, pathname: localizedPath });

  let html = template;
  html = replaceHtmlLang(html, lang);
  html = replaceTag(html, "title", "", meta.title);
  html = replaceMeta(html, "name", "description", meta.description);
  html = replaceMeta(html, "name", "keywords", meta.keywords);
  html = replaceMeta(html, "property", "og:title", meta.title);
  html = replaceMeta(html, "property", "og:description", meta.description);
  html = replaceMeta(html, "property", "og:url", meta.canonical);
  html = replaceMeta(html, "name", "twitter:title", meta.title);
  html = replaceMeta(html, "name", "twitter:description", meta.description);
  html = replaceCanonical(html, meta.canonical);
  html = replaceMeta(html, "property", "og:image", SEO_OG_IMAGE);
  html = replaceMeta(html, "name", "twitter:image", SEO_OG_IMAGE);
  html = replaceJsonLd(html, jsonLd);

  const staticMain = buildStaticMain(basePath, lang);
  if (html.includes('id="seo-prerender"')) {
    html = html.replace(/<main id="seo-prerender"[\s\S]*?<\/main>/, staticMain);
  } else {
    html = html.replace("<div id=\"root\"></div>", `${staticMain}\n    <div id="root"></div>`);
  }

  return html;
}

function outDirForLocalizedPath(localizedPath) {
  if (localizedPath === "/") return distDir;
  return path.join(distDir, localizedPath.slice(1));
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error("prerender: dist/ not found. Run vite build first.");
    process.exit(1);
  }

  const templatePath = path.join(distDir, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("prerender: dist/index.html not found.");
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, "utf8");
  let count = 0;

  for (const { path: basePath } of SEO_SITEMAP_ROUTES) {
    for (const lang of SEO_LOCALES) {
      const localizedPath = buildLocalizedPath(basePath, lang);
      const html = patchHtml(template, basePath, lang);
      const dir = outDirForLocalizedPath(localizedPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
      count += 1;
      console.log(`prerender: ${SITE_ORIGIN}${localizedPath === "/" ? "/" : localizedPath} [${lang}]`);
    }
  }

  console.log(`prerender: wrote ${count} HTML file(s) across ${SEO_LOCALES.length} locales`);
}

main();
