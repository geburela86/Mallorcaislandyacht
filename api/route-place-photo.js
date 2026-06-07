/**
 * Sirve la foto de un destino (cache en public/routes o fetch a Google Places).
 * GET /api/route-place-photo?id=cala-major
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES_FUEL_ITEMS } from "../src/lib/routes-fuel-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, "..", "public", "routes");

const GOOGLE_KEY =
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
  "";

const CACHE = new Map();

async function googlePhotoBuffer(query) {
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", query);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "photos");
  findUrl.searchParams.set("key", GOOGLE_KEY);
  const find = await fetch(findUrl);
  if (!find.ok) throw new Error(`findplace ${find.status}`);
  const data = await find.json();
  const ref = data.candidates?.[0]?.photos?.[0]?.photo_reference;
  if (!ref) throw new Error("no_photo");
  const photoUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  photoUrl.searchParams.set("maxwidth", "1200");
  photoUrl.searchParams.set("photo_reference", ref);
  photoUrl.searchParams.set("key", GOOGLE_KEY);
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const item = ROUTES_FUEL_ITEMS.find((x) => x.id === id);
  if (!item) {
    res.status(404).json({ error: "unknown_route" });
    return;
  }

  const localPath = path.join(ROUTES_DIR, `${id}.webp`);
  if (fs.existsSync(localPath)) {
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.end(fs.readFileSync(localPath));
    return;
  }

  if (!GOOGLE_KEY) {
    res.status(404).json({ error: "no_image", hint: "Run scripts/fetch-google-route-photos.mjs or set GOOGLE_MAPS_API_KEY" });
    return;
  }

  try {
    const cacheKey = `${id}:${item.mapsQuery}`;
    let buf = CACHE.get(cacheKey);
    if (!buf) {
      buf = await googlePhotoBuffer(item.mapsQuery || item.destination);
      CACHE.set(cacheKey, buf);
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(buf);
  } catch {
    res.status(502).json({ error: "photo_fetch_failed" });
  }
}
