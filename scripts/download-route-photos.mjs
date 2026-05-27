/**
 * Fotos por destino: playa/cala real (Wikimedia) + fallback chárter (mar y barcos).
 * node scripts/download-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");
const OUT = path.join(PUBLIC, "routes");

const H = { "User-Agent": "MallorcaIslandYacht/1.0 (route photos)" };

/** Wikimedia: lugar real; fallback: chárter con mar y barco. */
const ROUTE_PHOTOS = {
  catedral: {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Catedral_de_Palma_de_Mallorca%2C_desde_Carrer_del_Mirador%2C_fachadas_sur_y_oeste.jpg/1280px-Catedral_de_Palma_de_Mallorca%2C_desde_Carrer_del_Mirador%2C_fachadas_sur_y_oeste.jpg",
    fallback: "2025-02-09-15-43-10-400.webp",
  },
  "cala-major": {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Cala_Major_%2876720833%29.jpeg/1280px-Cala_Major_%2876720833%29.jpeg",
    fallback: "IMG_9829.webp",
  },
  illetas: {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Playa_de_Illetes_%28Mallorca%29_%2818377602942%29.jpg/1280px-Playa_de_Illetes_%28Mallorca%29_%2818377602942%29.jpg",
    fallback: "2025-02-09-16-53-33-313.webp",
  },
  "portals-nous": {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Platja_portals_nous01.jpg/1280px-Platja_portals_nous01.jpg",
    fallback: "51D76B7A-234C-452A-A881-91253CCA8A2F.webp",
  },
  "calo-fort": {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cala_Portals_Vells%2C_Mallorca_-_panoramio.jpg/1280px-Cala_Portals_Vells%2C_Mallorca_-_panoramio.jpg",
    fallback: "134B2BD3-FDD8-46B3-B433-A95FDDEB2383.webp",
  },
  "cala-mosques": {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Meeresbucht_Cala_Portals_Vells_II.jpg/1280px-Meeresbucht_Cala_Portals_Vells_II.jpg",
    fallback: "F96EE50B-2EB7-4196-94C3-F62224E43D07.webp",
  },
  "cala-vella": {
    wikimedia:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cala_Fornells_Mallorca.jpg/1280px-Cala_Fornells_Mallorca.jpg",
    fallback: "31B1B524-9D5F-41E0-837B-A4C8B8BCDCCC.webp",
  },
};

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: H });
  if (!res.ok) throw new Error(`${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function save(id, buf) {
  const out = path.join(OUT, `${id}.webp`);
  await sharp(buf).rotate().resize({ width: 640, height: 480, fit: "cover" }).webp({ quality: 86 }).toFile(out);
  console.log(`✓ ${id} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [id, { wikimedia, fallback }] of Object.entries(ROUTE_PHOTOS)) {
  try {
    await save(id, await fetchBuffer(wikimedia));
  } catch {
    console.warn(`~ ${id}: chárter fallback`);
    await save(id, fs.readFileSync(path.join(PUBLIC, fallback)));
  }
}
