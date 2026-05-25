import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, getFirebaseRuntimeSummary } from "./firebase-app.js";
import { raceWithTimeout } from "./firebase-auth-diagnostics.js";

// Hard limit requested by operator: keep diagnostics responsive.
const DIAGNOSTIC_TIMEOUT_MS = 8000;

const DEBUG_DOC = ["debug", "connectivityTest"];
const SITE_PUBLIC_LIVE = ["sitePublic", "live"];

function normalizeDiagError(e) {
  const code = typeof e?.code === "string" ? e.code : "";
  const message = typeof e?.message === "string" ? e.message : String(e ?? "");

  const lower = message.toLowerCase();
  const msgHasCors =
    lower.includes("access control checks") || lower.includes("cors") || lower.includes("failed to fetch");
  if (msgHasCors) {
    return { code: "CORS/network", message };
  }

  // Firestore client quota errors often land as resource-exhausted / quota exceeded.
  if (code === "resource-exhausted" || lower.includes("quota exceeded") || lower.includes("quota")) {
    return { code: "quota", message };
  }

  if (code === "permission-denied") return { code, message };

  if (code === "unauthenticated") return { code, message };
  if (lower.includes("unauthenticated")) return { code: "unauthenticated", message };

  if (code) return { code, message };
  return { code: "firestore/unknown", message };
}

function createDiagError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Writes a small test document (requires auth). Use from Admin "Test Firebase".
 * @returns {Promise<{ ok: boolean, summary: object, readBack: boolean }>}
 */
/**
 * Waits for auth persistence, logs current user, then writes a test doc (needs auth).
 * Use from Settings «Test Firebase Auth».
 */
export async function firebaseAuthDebugProbe() {
  const auth = getFirebaseAuth();
  const summary = getFirebaseRuntimeSummary();
  if (!summary.configured) {
    throw new Error("Firebase env missing: set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (Netlify build env).");
  }
  if (!auth) throw new Error("Firebase Auth not initialized.");
  const startedAt = Date.now();
  try {
    const remaining = Math.max(500, DIAGNOSTIC_TIMEOUT_MS - (Date.now() - startedAt));
    await raceWithTimeout(
      auth.authStateReady?.() ?? Promise.resolve(),
      Math.min(remaining, 3000),
      "authStateReady(debugProbe)",
    );
  } catch {
    /* continue; we still validate currentUser below */
  }

  if (!auth?.currentUser) {
    throw createDiagError(
      "unauthenticated",
      "Not authenticated — conecta Firebase (barra superior) e inicia sesión como cuenta admin válida.",
    );
  }

  const remainingForFirestore = Math.max(500, DIAGNOSTIC_TIMEOUT_MS - (Date.now() - startedAt));
  console.log("Firebase Auth:", { uid: auth.currentUser.uid, email: auth.currentUser.email });
  try {
    return await firebaseWriteDebugPing({ timeoutMs: remainingForFirestore });
  } catch (e) {
    const n = normalizeDiagError(e);
    const err = createDiagError(n.code, n.message);
    throw err;
  }
}

/**
 * Server-read of `sitePublic/live` (should be world-readable by rules).
 * Useful to distinguish "offline / config / rules" issues.
 */
export async function firebaseReadSitePublicLiveFromServer() {
  const db = getFirestoreDb();
  const summary = getFirebaseRuntimeSummary();
  if (!summary.configured) {
    throw new Error("Firebase env missing: set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (Netlify build env).");
  }
  if (!db) throw new Error("Firestore not initialized.");
  const ref = doc(db, ...SITE_PUBLIC_LIVE);
  const snap = await getDocFromServer(ref);
  return {
    ok: true,
    exists: snap.exists(),
    path: SITE_PUBLIC_LIVE.join("/"),
  };
}

/** Same as `firebaseReadSitePublicLiveFromServer` but fails fast if the network hangs after sign-in. */
export async function firebaseReadSitePublicLiveFromServerWithTimeout(ms = DIAGNOSTIC_TIMEOUT_MS) {
  return raceWithTimeout(firebaseReadSitePublicLiveFromServer(), ms, "readSitePublicLive");
}

export async function firebaseWriteDebugPing({ timeoutMs = DIAGNOSTIC_TIMEOUT_MS } = {}) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  const summary = getFirebaseRuntimeSummary();
  if (!summary.configured) {
    throw new Error("Firebase env missing: set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (Netlify build env).");
  }
  if (!db) throw new Error("Firestore not initialized.");
  if (!auth?.currentUser) {
    throw createDiagError(
      "unauthenticated",
      "Not authenticated — use «Conectar Firebase» e inicia sesión de nuevo.",
    );
  }

  const ref = doc(db, ...DEBUG_DOC);
  const op = (async () => {
    await setDoc(ref, {
      ping: true,
      at: serverTimestamp(),
      uid: auth.currentUser.uid,
      projectId: summary.projectId || "",
    });
    const snap = await getDoc(ref);
    return {
      ok: true,
      summary,
      readBack: snap.exists(),
      path: DEBUG_DOC.join("/"),
    };
  })();

  try {
    return await raceWithTimeout(op, timeoutMs, "firestoreWriteDebugPing");
  } catch (e) {
    const n = normalizeDiagError(e);
    const err = createDiagError(n.code, n.message);
    throw err;
  }
}
