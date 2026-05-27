/**
 * Descarga 1 foto por destino (Google Places si hay API key; si no, Wikipedia).
 * Salida: public/routes/{id}.webp
 *
 * Uso:
 *   GOOGLE_MAPS_API_KEY=tu_clave node scripts/fetch-google-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ROUTES_FUEL_ITEMS } from "../src/lib/routes-fuel-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "public", "routes");
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/** Si no hay API de Google ni Commons, usa fotos propias del chárter. */
const LOCAL_FALLBACK = {
  "cala-major": "IMG_9829.webp",
  illetas: "2025-02-09-16-53-33-313.webp",
  "calo-fort": "15B77A5D-EB55-428A-B377-09E379D08037.webp",
  "cala-mosques": "A558C2A8-ABA6-4AC0-ADE3-A6AF7F629944.webp",
  "cala-vella": "F96EE50B-2EB7-4196-94C3-F62224E43D07.webp",
};

const GOOGLE_KEY =
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
  "";

const WIKI_HEADERS = {
  "User-Agent": "MallorcaIslandYacht/1.0 (routes photos; info@mallorcaislandyacht.com)",
};

async function fetchJson(url, init) {
  const res = await fetch(url, { ...init, headers: { ...WIKI_HEADERS, ...init?.headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function googlePlacePhoto(query) {
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", query);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "photos,place_id,name");
  findUrl.searchParams.set("key", GOOGLE_KEY);
  const find = await fetchJson(findUrl);
  const candidate = find.candidates?.[0];
  const ref = candidate?.photos?.[0]?.photo_reference;
  if (!ref) throw new Error(`Sin fotos en Google Places: ${query}`);
  const photoUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  photoUrl.searchParams.set("maxwidth", "1400");
  photoUrl.searchParams.set("photo_reference", ref);
  photoUrl.searchParams.set("key", GOOGLE_KEY);
  return fetchBuffer(photoUrl);
}

async function wikipediaPhoto(title) {
  const api = new URL("https://en.wikipedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("prop", "pageimages");
  api.searchParams.set("pithumbsize", "1400");
  api.searchParams.set("titles", title);
  const data = await fetchJson(api);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const src = page?.thumbnail?.source || page?.original?.source;
  if (src) return fetchBuffer(src);
  throw new Error(`Sin imagen en Wikipedia: ${title}`);
}

async function commonsPhoto(search) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("generator", "search");
  api.searchParams.set("gsrsearch", search);
  api.searchParams.set("gsrlimit", "1");
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("iiurlwidth", "1400");
  const data = await fetchJson(api);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const src = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
  if (!src) throw new Error(`Sin imagen en Commons: ${search}`);
  return fetchBuffer(src);
}

async function fetchPhotoForItem(item) {
  const query = item.mapsQuery || item.destination;
  if (GOOGLE_KEY) return googlePlacePhoto(query);
  const wikiTitle = item.wikipediaTitle || item.destination;
  const commonsQueries = item.commonsSearch || [
    `${item.destination} Mallorca`,
    `${item.destination} beach`,
    "Mallorca beach cove",
  ];
  try {
    return await wikipediaPhoto(wikiTitle);
  } catch {
    let lastErr;
    for (const q of commonsQueries) {
      try {
        await sleep(1200);
        return await commonsPhoto(q);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }
}

async function saveWebp(id, buffer) {
  const out = path.join(OUT_DIR, `${id}.webp`);
  await sharp(buffer)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ✓ ${path.relative(process.cwd(), out)} (${kb} KB)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(GOOGLE_KEY ? "Fuente: Google Places API" : "Fuente: Wikipedia (añade GOOGLE_MAPS_API_KEY para fotos de Google Maps)");

  for (const item of ROUTES_FUEL_ITEMS) {
    try {
      let buf;
      try {
        buf = await fetchPhotoForItem(item);
      } catch (e) {
        const localName = LOCAL_FALLBACK[item.id];
        if (!localName) throw e;
        const localPath = path.join(PUBLIC_DIR, localName);
        if (!fs.existsSync(localPath)) throw e;
        console.warn(`  ~ ${item.id}: usando foto local ${localName}`);
        buf = fs.readFileSync(localPath);
      }
      await saveWebp(item.id, buf);
    } catch (e) {
      console.error(`  ✗ ${item.id}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
