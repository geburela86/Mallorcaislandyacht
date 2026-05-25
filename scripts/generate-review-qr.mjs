/**
 * PNG con QR que abre el formulario de reseñas con token secreto (?t=...).
 *
 * Uso:
 *   REVIEW_GATE_TOKEN=tu_token npm run qr:reviews -- https://tudominio.com
 *   npm run qr:reviews -- https://tudominio.com mi_token_secreto
 *
 * El token debe coincidir con Admin → Settings → Reviews · QR access (y Firestore meta/reviewGate si usas Firebase).
 */
import QRCode from "qrcode";
import { writeFile } from "fs/promises";
import path from "path";

const siteArg = process.argv[2] ?? process.env.SITE_URL ?? "http://localhost:5173";
const tokenArg = process.argv[3] ?? process.env.REVIEW_GATE_TOKEN ?? process.env.VITE_REVIEW_GATE_TOKEN ?? "";

if (!String(tokenArg).trim()) {
  console.error("Falta el token: pásalo como 2º argumento o REVIEW_GATE_TOKEN / VITE_REVIEW_GATE_TOKEN");
  process.exit(1);
}

let origin;
try {
  const u = new URL(siteArg.includes("://") ? siteArg : `https://${siteArg}`);
  origin = u.origin;
} catch {
  console.error("URL no válida:", siteArg);
  process.exit(1);
}

const token = String(tokenArg).trim();
const reviewUrl = `${origin}/dejar-resena?t=${encodeURIComponent(token)}`;

const outPath = path.join(process.cwd(), "public", "reviews-qr.png");

await QRCode.toFile(outPath, reviewUrl, {
  width: 520,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#0b1f3a", light: "#ffffff" },
});

console.log("QR de reseñas guardado:", outPath);
console.log("Apunta a:", reviewUrl);
