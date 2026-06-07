import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Resuelve credenciales de cuenta de servicio para Firebase Admin.
 * Orden (el primero que aplique):
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON — JSON completo en una línea (como lo descarga Google).
 * 2) FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 — mismo JSON codificado en Base64 (útil si .env rompe comillas).
 * 3) Claves partidas (cualquiera de los dos prefijos):
 *    - FIREBASE_ADMIN_PROJECT_ID o FIREBASE_PROJECT_ID o VITE_FIREBASE_PROJECT_ID
 *    - FIREBASE_ADMIN_CLIENT_EMAIL o FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_ADMIN_PRIVATE_KEY o FIREBASE_PRIVATE_KEY (usar \n literales en .env para saltos de línea)
 * 4) GOOGLE_APPLICATION_CREDENTIALS — ruta a un archivo JSON (típico en local con `vercel dev`).
 */
function resolveServiceAccountFromEnv() {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      let v = JSON.parse(jsonRaw);
      if (typeof v === "string") v = JSON.parse(v);
      return v;
    } catch {
      throw new Error("invalid_FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      throw new Error("invalid_FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");
    }
  }

  const projectId = (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    ""
  ).trim();
  const clientEmail = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    ""
  ).trim();
  const privateKeyRaw = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    ""
  ).trim();

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n"),
    };
  }

  if (projectId || clientEmail || privateKeyRaw) {
    throw new Error("incomplete_firebase_admin_split_env");
  }

  return null;
}

export function ensureFirebaseApp() {
  if (getApps().length) return;

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const account = resolveServiceAccountFromEnv();

  if (account) {
    initializeApp({ credential: cert(account) });
    return;
  }

  if (gac) {
    initializeApp({ credential: applicationDefault() });
    return;
  }

  throw new Error("missing_firebase_admin_credentials");
}

export { getFirestore };
