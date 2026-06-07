/**
 * Establece el custom claim { role: "owner" } en Firebase Auth para el admin.
 *
 * Requiere credenciales Admin en .env (misma convención que api/lib/firebase-admin.js):
 *   FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, etc.
 *
 * Uso:
 *   node scripts/set-owner-custom-claim.mjs
 *   node scripts/set-owner-custom-claim.mjs <uid> <email>
 */
import fs from "fs";
import path from "path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_UID = "WdNlMH5GJogBW1TZdkiexPXPhbB3";
const DEFAULT_EMAIL = "info@mallorcaislandyacht.com";

const root = path.resolve(import.meta.dirname, "..");

function loadProjectEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn("No se encontró .env; se usan solo las variables ya exportadas en el shell.");
    return;
  }

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        try {
          value = JSON.parse(`"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
        } catch {
          /* valor literal entre comillas dobles */
        }
      }
    }

    process.env[key] = value;
  }
}

/** Misma resolución de credenciales que api/lib/firebase-admin.js (sin importar Firestore). */
function resolveServiceAccountFromEnv() {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    let v = JSON.parse(jsonRaw);
    if (typeof v === "string") v = JSON.parse(v);
    return v;
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (b64) {
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decoded);
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

function ensureFirebaseAdminApp() {
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

  throw new Error(
    "Faltan credenciales Admin. Define FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS en .env",
  );
}

async function resolveUser(auth, uidHint, emailHint) {
  if (uidHint) {
    try {
      return await auth.getUser(uidHint);
    } catch (err) {
      if (err?.code !== "auth/user-not-found") throw err;
      console.warn(`UID no encontrado (${uidHint}); buscando por email…`);
    }
  }

  return auth.getUserByEmail(emailHint);
}

async function main() {
  const uidHint = (process.argv[2] || DEFAULT_UID).trim();
  const emailHint = (process.argv[3] || DEFAULT_EMAIL).trim().toLowerCase();

  loadProjectEnv();
  ensureFirebaseAdminApp();

  const auth = getAuth();
  const before = await resolveUser(auth, uidHint, emailHint);

  console.log("Usuario encontrado:", {
    uid: before.uid,
    email: before.email,
    customClaimsBefore: before.customClaims || {},
  });

  if (before.email && before.email.toLowerCase() !== emailHint) {
    console.warn(
      `Aviso: el email del usuario (${before.email}) no coincide con el esperado (${emailHint}).`,
    );
  }

  await auth.setCustomUserClaims(before.uid, { role: "owner" });

  const after = await auth.getUser(before.uid);
  const claims = after.customClaims || {};

  if (claims.role !== "owner") {
    console.error("Verificación fallida. customClaims actuales:", claims);
    process.exit(1);
  }

  console.log("\nOK — custom claim aplicado y verificado:");
  console.log(
    JSON.stringify(
      {
        uid: after.uid,
        email: after.email,
        customClaims: claims,
      },
      null,
      2,
    ),
  );
  console.log(
    "\nEl cliente debe cerrar sesión y volver a entrar (o forzar refresh del ID token) para ver el claim en el JWT.",
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  if (err?.code) console.error("code:", err.code);
  process.exit(1);
});
