/**
 * Fotos reales por destino → public/routes/{id}.webp
 * Origen: assets del proyecto (fotos de Google Maps / usuario).
 *
 * Ejecutar: node scripts/download-route-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "..", ".cursor-assets-routes");
const PROJECT_ASSETS = path.resolve(
  process.env.HOME || "",
  ".cursor/projects/Users-gonzaloburela-Desktop-mallorca-yacht/assets",
);
const OUT = path.resolve(__dirname, "..", "public", "routes");

/** id → nombre de archivo en assets (fotos reales por destino). */
const USER_ROUTE_PHOTOS = {
  catedral: "catedral-1001f9dd-b0ab-4c83-b9dc-c662148f3740.png",
  "cala-major": "Cala_Major-fe160d07-32ac-4e5d-ba39-5fcb1ad1069d.png",
  illetas: "Illetas-237f8d26-3dba-4afc-8134-d6476ce19bea.png",
  "portals-nous": "Portals_nous-05cec8c5-5110-4e2e-b245-e9f60625c0e1.png",
  "calo-fort": "cala_fort-d4de9c4a-712a-4563-9337-dd4811b688be.png",
  "cala-mosques": "Cala_Mosques-e2a06382-1e86-43e9-8be4-ccdbc5336ec2.png",
  "cala-vella": "cala_vella-b7559993-c649-4100-8049-36d5cf8a4f25.png",
};

function resolveAssetsDir() {
  if (fs.existsSync(PROJECT_ASSETS)) return PROJECT_ASSETS;
  if (fs.existsSync(ASSETS_DIR)) return ASSETS_DIR;
  return null;
}

async function process(id, filename, assetsDir) {
  const src = path.join(assetsDir, filename);
  if (!fs.existsSync(src)) throw new Error(`No existe ${src}`);
  const out = path.join(OUT, `${id}.webp`);
  await sharp(src)
    .rotate()
    .resize({ width: 800, height: 600, fit: "cover" })
    .webp({ quality: 88 })
    .toFile(out);
  console.log(`✓ ${id} ← ${filename} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}

const assetsDir = resolveAssetsDir();
if (!assetsDir) {
  console.error("No se encontró carpeta assets con fotos de rutas.");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [id, file] of Object.entries(USER_ROUTE_PHOTOS)) {
  try {
    await process(id, file, assetsDir);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
  }
}
