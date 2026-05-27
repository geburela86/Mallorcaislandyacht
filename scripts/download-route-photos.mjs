/**
 * Descarga fotos reales (Wikimedia Commons) a public/routes/{id}.webp
 * Ejecutar: node scripts/download-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "public", "routes");

/** Fotos reales de cada lugar (Wikimedia Commons, CC). */
const REAL_PHOTOS = {
  catedral:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Catedral_de_Palma_de_Mallorca%2C_desde_Carrer_del_Mirador%2C_fachadas_sur_y_oeste.jpg/1280px-Catedral_de_Palma_de_Mallorca%2C_desde_Carrer_del_Mirador%2C_fachadas_sur_y_oeste.jpg",
  "cala-major":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Cala_Major_%2876720833%29.jpeg/1280px-Cala_Major_%2876720833%29.jpeg",
  illetas:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Playa_de_Illetes_%28Mallorca%29_%2818377602942%29.jpg/1280px-Playa_de_Illetes_%28Mallorca%29_%2818377602942%29.jpg",
  "portals-nous":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Platja_portals_nous01.jpg/1280px-Platja_portals_nous01.jpg",
  "calo-fort":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cala_Fornells_Mallorca.jpg/1280px-Cala_Fornells_Mallorca.jpg",
  "cala-mosques":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Cal%C3%B3_d%E2%80%99en_Rafalino_16.jpg/1280px-Cal%C3%B3_d%E2%80%99en_Rafalino_16.jpg",
  "cala-vella":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cala_Portals_Vells%2C_Mallorca_-_panoramio.jpg/1280px-Cala_Portals_Vells%2C_Mallorca_-_panoramio.jpg",
};

const H = { "User-Agent": "MallorcaIslandYacht/1.0 (route photos; info@mallorcaislandyacht.com)" };

async function download(id, url) {
  const res = await fetch(url, { headers: H });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(OUT, `${id}.webp`);
  await sharp(buf).rotate().resize({ width: 800, height: 600, fit: "cover" }).webp({ quality: 85 }).toFile(out);
  console.log(`✓ ${id} → ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [id, url] of Object.entries(REAL_PHOTOS)) {
  try {
    await download(id, url);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
  }
}
