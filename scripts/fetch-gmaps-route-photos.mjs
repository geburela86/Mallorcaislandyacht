/**
 * Resuelve enlaces maps.app.goo.gl y descarga foto del lugar (Commons o fallback chárter).
 * node scripts/fetch-gmaps-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");
const OUT = path.join(PUBLIC, "routes");

const ROUTES = [
  { id: "portals-nous", mapsHref: "https://maps.app.goo.gl/ydXoTcT8akumM1jb9", commons: "Portals Nous beach Mallorca", fallback: "51D76B7A-234C-452A-A881-91253CCA8A2F.webp" },
  { id: "illetas", mapsHref: "https://maps.app.goo.gl/YTPiW7k6qkhjnbAJ8", commons: "Playa de Illetes Mallorca", fallback: "2025-02-09-16-53-33-313.webp" },
  { id: "cala-major", mapsHref: "https://maps.app.goo.gl/7YuRLk3f6xFZYyL99", commons: "Cala Major Palma beach", fallback: "IMG_9829.webp" },
  { id: "catedral", mapsHref: "https://maps.app.goo.gl/FWphTkVNpK48AVQu8", commons: "Palma Cathedral sea view", fallback: "2025-02-09-15-43-10-400.webp" },
  { id: "cala-mosques", mapsHref: "https://maps.app.goo.gl/MgcY2ZXmXQYZS5iZ9", commons: "Cala Mosques Mallorca", fallback: "F96EE50B-2EB7-4196-94C3-F62224E43D07.webp" },
  { id: "calo-fort", mapsHref: "https://maps.app.goo.gl/KfyWquR464zHn2uc8", commons: "Caló Fort Mallorca", fallback: "134B2BD3-FDD8-46B3-B433-A95FDDEB2383.webp" },
  { id: "cala-vella", mapsHref: "https://maps.app.goo.gl/gMqBG2wbrFELy5zx8", commons: "Cala Vella Mallorca", fallback: "31B1B524-9D5F-41E0-837B-A4C8B8BCDCCC.webp" },
];

const H = { "User-Agent": "MallorcaIslandYacht/1.0 (route photos)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolvePlaceName(mapsHref) {
  const res = await fetch(mapsHref, { redirect: "follow", headers: H });
  const m = res.url.match(/\/place\/([^/@]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1].replace(/\+/g, " "));
}

function embedFromPlaceName(name) {
  return `https://www.google.com/maps?q=${encodeURIComponent(name)}&output=embed`;
}

async function commonsPhoto(query) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("generator", "search");
  api.searchParams.set("gsrsearch", query);
  api.searchParams.set("gsrlimit", "1");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("iiurlwidth", "1200");
  const data = await (await fetch(api, { headers: H })).json();
  const page = Object.values(data?.query?.pages || {})[0];
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || null;
}

async function saveWebp(id, buffer) {
  const out = path.join(OUT, `${id}.webp`);
  await sharp(buffer).rotate().resize({ width: 800, height: 600, fit: "cover" }).webp({ quality: 86 }).toFile(out);
  console.log(`  ✓ ${id} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = {};

  for (const route of ROUTES) {
    await sleep(1200);
    let placeName = "";
    try {
      placeName = (await resolvePlaceName(route.mapsHref)) || route.commons;
      console.log(`${route.id}: ${placeName}`);
    } catch (e) {
      console.warn(`  ! ${route.id} resolve: ${e.message}`);
      placeName = route.commons;
    }

    meta[route.id] = { mapsHref: route.mapsHref, mapsEmbedSrc: embedFromPlaceName(placeName), placeName };

    let buf;
    try {
      const url = await commonsPhoto(route.commons);
      if (!url) throw new Error("no commons");
      const res = await fetch(url, { headers: H });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    } catch {
      const local = path.join(PUBLIC, route.fallback);
      console.warn(`  ~ ${route.id}: fallback chárter`);
      buf = fs.readFileSync(local);
    }
    await saveWebp(route.id, buf);
  }

  const outMeta = path.join(__dirname, "..", "src", "lib", "routes-gmaps-meta.json");
  fs.writeFileSync(outMeta, JSON.stringify(meta, null, 2));
  console.log("Wrote", outMeta);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
