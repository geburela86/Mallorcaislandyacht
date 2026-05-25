/**
 * Helpers for Firebase Auth debugging and resilient UX (timeouts, readable errors).
 */

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
export function raceWithTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`[${label}] timed out after ${ms}ms`);
      err.code = "miy/timeout";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Human-readable line for UI + logs (Spanish).
 * @param {unknown} e
 * @param {{ host?: string }} [ctx]
 */
export function formatFirebaseAuthError(e, ctx = {}) {
  const code = typeof e?.code === "string" ? e.code : "";
  const msg = typeof e?.message === "string" ? e.message : String(e ?? "");
  const host = ctx.host || (typeof window !== "undefined" ? window.location.hostname : "");

  const byCode = {
    "auth/invalid-api-key":
      "API key inválida o no coincide con el proyecto. Revisa VITE_FIREBASE_API_KEY y el despliegue (rebuild).",
    "auth/unauthorized-domain": `Dominio no autorizado (${host}). En Firebase Console → Authentication → Settings → Authorized domains, añade: mallorcaislandyacht.com, www.mallorcaislandyacht.com, tu dominio Netlify (*.netlify.app) y localhost.`,
    "auth/network-request-failed":
      "Fallo de red hacia Firebase (auth/network-request-failed). Comprueba conexión, VPN, bloqueadores o CORS.",
    "auth/operation-not-allowed":
      "Proveedor deshabilitado (auth/operation-not-allowed). En Authentication → Sign-in method, habilita Email/Password.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Email o contraseña incorrectos (invalid-credential).",
    "auth/user-not-found": "No existe usuario con ese email en Firebase Auth.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos o restablece acceso.",
    "auth/user-disabled": "Esta cuenta está deshabilitada en Firebase.",
    "auth/internal-error": "Error interno de Firebase (revisa estado del proyecto y facturación).",
    "auth/popup-blocked": "El navegador bloqueó una ventana emergente (OAuth). Este panel solo usa email/contraseña; si ves este código, suele ser caché o extensión: recarga en ventana privada.",
    "auth/popup-closed-by-user": "Ventana de inicio de sesión cerrada antes de terminar.",
    "auth/cancelled-popup-request": "Inicio de sesión cancelado o otra ventana de login abierta.",
    "auth/web-storage-unsupported": "Este entorno no permite almacenamiento (cookies/storage). Prueba otro navegador o modo normal.",
    "permission-denied": "Firestore: permission-denied (revisa firestore.rules o que el usuario tenga permiso).",
    "miy/timeout": msg,
  };

  if (byCode[code]) return byCode[code];

  const lower = msg.toLowerCase();
  /** REST / fetch: API key HTTP restrictions or wrong referrer → 403 on identitytoolkit.googleapis.com */
  if (
    lower.includes("403") ||
    lower.includes("forbidden") ||
    lower.includes("permission_denied") ||
    lower.includes("requests from this referer are blocked")
  ) {
    if (lower.includes("identitytoolkit") || lower.includes("securetoken") || lower.includes("referer")) {
      return (
        "HTTP 403 hacia Google Identity Toolkit: casi siempre la API key de Firebase tiene restricciones en Google Cloud Console → APIs y servicios → Credenciales → (tu clave) → " +
        "Restricciones de aplicaciones. Añade referentes HTTP de tu dominio (p. ej. https://tudominio.com/* y https://www.tudominio.com/*) o «Ninguno» en desarrollo. " +
        "Comprueba también VITE_FIREBASE_API_KEY y que sea la del mismo proyecto que en Firebase Console."
      );
    }
    return "Acceso denegado (403). Revisa restricciones de la API key en Google Cloud y dominios autorizados en Firebase Authentication.";
  }

  return code ? `${code}: ${msg}` : msg || "Error desconocido de autenticación.";
}

/** @param {unknown} e */
export function logFirebaseAuthError(scope, e) {
  const code = typeof e?.code === "string" ? e.code : "";
  const name = typeof e?.name === "string" ? e.name : "";
  const message = typeof e?.message === "string" ? e.message : String(e ?? "");
  const stack = typeof e?.stack === "string" ? e.stack : "";
  console.error(`[MIY][FirebaseAuth] ${scope}`, { code, name, message, stack, raw: e });
}
