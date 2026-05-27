/**
 * Genera fotos de rutas (mar + barcos) desde assets del chárter en public/.
 * Salida: public/routes/{id}.webp (800×600, recorte cover)
 *
 * Ejecutar: node scripts/download-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");
const OUT = path.join(PUBLIC, "routes");

/** Origen local por destino — imágenes con agua de mar y embarcaciones. */
const ROUTE_PHOTO_SOURCES = {
  catedral: "2025-02-09-15-43-10-400.webp", // bahía de Palma, mar y costa
  "cala-major": "IMG_9829.webp", // agua turquesa, gente en el agua
  illetas: "2025-02-09-16-53-33-313.webp", // cala, mar claro
  "portals-nous": "51D76B7A-234C-452A-A881-91253CCA8A2F.webp", // yate en el mar
  "calo-fort": "134B2BD3-FDD8-46B3-B433-A95FDDEB2383.webp", // baño desde barco, agua cristalina
  "cala-mosques": "F96EE50B-2EB7-4196-94C3-F62224E43D07.webp", // barco en cala
  "cala-vella": "31B1B524-9D5F-41E0-837B-A4C8B8BCDCCC.webp", // navegación costa mallorquina
};

async function processRoute(id, filename) {
  const src = path.join(PUBLIC, filename);
  if (!fs.existsSync(src)) throw new Error(`No existe ${filename}`);
  const out = path.join(OUT, `${id}.webp`);
  await sharp(src)
    .rotate()
    .resize({ width: 800, height: 600, fit: "cover" })
    .webp({ quality: 86, effort: 6 })
    .toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`✓ ${id} ← ${filename} (${kb} KB)`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [id, file] of Object.entries(ROUTE_PHOTO_SOURCES)) {
  try {
    await processRoute(id, file);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
  }
}
