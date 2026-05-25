/**
 * Genera un PNG con código QR que abre la página principal del sitio (inicio).
 *
 * Uso:
 *   npm run qr:web -- https://tudominio.com
 *   SITE_URL=https://tudominio.com npm run qr:web
 *
 * El QR codifica solo el origen + "/" (no /reserve ni otras rutas).
 */
import QRCode from "qrcode";
import { writeFile } from "fs/promises";
import path from "path";

const raw = process.argv[2] ?? process.env.SITE_URL ?? "http://localhost:5173";

let homeUrl;
try {
  const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
  homeUrl = `${u.origin}/`;
} catch {
  console.error("URL no válida:", raw);
  process.exit(1);
}

const outPath = path.join(process.cwd(), "public", "website-qr.png");

await QRCode.toFile(outPath, homeUrl, {
  width: 520,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#0b1f3a", light: "#ffffff" },
});

console.log("QR guardado:", outPath);
console.log("Apunta a:", homeUrl);
