import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Long-polling fuerza el transporte HTTP en lugar de WebChannel/WebSockets puros — suele funcionar mejor en Safari,
 * ventana incógnito y redes que cortan el canal en tiempo real (los otros navegadores siguen viendo datos).
 */
const FIRESTORE_SETTINGS = {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
};

function readConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };
}

let appCache = null;
let dbCache = null;
let authCache = null;
let firebaseInitLogged = false;
let firestoreInitLogged = false;
let firebaseEnvLogged = false;

export function isFirebaseConfigured() {
  return !!readConfig();
}

/** Safe summary for admin/debug UI (no API keys). */
export function getFirebaseRuntimeSummary() {
  const c = readConfig();
  if (!c) {
    return { configured: false, projectId: null, authDomain: null };
  }
  return { configured: true, projectId: c.projectId, authDomain: c.authDomain };
}

/**
 * Public diagnostics only (requested by operator).
 * Note: Firebase `apiKey` is not a secret, but this log is still intentionally explicit.
 */
export function getFirebaseConfigForPublicDebug() {
  return readConfig();
}

export function getFirebaseApp() {
  if (!readConfig()) return null;
  if (appCache) return appCache;
  const cfg = readConfig();
  /** Prefer an existing app that matches this bundle's projectId (never blindly use getApps()[0]). */
  const existing = getApps().find((a) => a.options?.projectId === cfg.projectId);
  appCache = existing || initializeApp(cfg);
  if (!firebaseInitLogged) {
    firebaseInitLogged = true;
    /** Misma forma que `initializeApp` — apiKey enmascarada (no volcar secreto en consola). */
    const firebaseConfig = {
      apiKey: cfg.apiKey ? `[REDACTED len=${cfg.apiKey.length}]` : "(missing)",
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId || "",
      appId: cfg.appId || "",
    };
    console.log(firebaseConfig);
    console.log("[MIY] Firebase initialized app options (compare with Firebase Console → Project settings → Web app):", {
      projectId: appCache.options?.projectId,
      authDomain: appCache.options?.authDomain,
    });
    if (typeof window !== "undefined") {
      console.log("[MIY] Browser origin (must be in Authentication → Authorized domains):", {
        origin: window.location.origin,
        hostname: window.location.hostname,
      });
    }
  }
  if (!firebaseEnvLogged) {
    firebaseEnvLogged = true;
    console.log("[MIY] VITE_FIREBASE_* present in bundle:", {
      VITE_FIREBASE_API_KEY: !!import.meta.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_PROJECT_ID: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      VITE_FIREBASE_AUTH_DOMAIN: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      VITE_FIREBASE_APP_ID: !!import.meta.env.VITE_FIREBASE_APP_ID,
    });
  }
  return appCache;
}

export function getFirestoreDb() {
  if (!getFirebaseApp()) return null;
  if (!dbCache) {
    dbCache = initializeFirestore(getFirebaseApp(), FIRESTORE_SETTINGS);
    if (!firestoreInitLogged) {
      firestoreInitLogged = true;
      const c = readConfig();
      console.log("[MIY] Firestore instance ready for project:", c?.projectId);
    }
  }
  return dbCache;
}

export function getFirebaseAuth() {
  if (!getFirebaseApp()) return null;
  if (!authCache) {
    const cfg = readConfig();
    authCache = getAuth(getFirebaseApp());
    console.log("[MIY] getAuth()", {
      projectId: cfg?.projectId ?? null,
      authDomain: authCache.config?.authDomain ?? null,
      apiKeyPresent: !!cfg?.apiKey,
    });
    const ar = authCache.authStateReady?.();
    if (ar && typeof ar.then === "function") {
      ar.then(() => {
        console.log("[MIY] onAuthStateReady (initial):", authCache.currentUser?.uid || null, authCache.currentUser?.email || "");
      }).catch((e) => {
        console.error("[MIY] authStateReady promise rejected", e);
      });
    } else {
      console.log("[MIY] getAuth: no authStateReady(); currentUser=", authCache.currentUser?.uid || null);
    }
  }
  return authCache;
}
