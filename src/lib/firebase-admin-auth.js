import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth } from "./firebase-app.js";
import { formatFirebaseAuthError, logFirebaseAuthError, raceWithTimeout } from "./firebase-auth-diagnostics.js";

/** Do not await `auth.authStateReady()` before email/password sign-in — it can hang indefinitely in some browsers; `signInWithEmailAndPassword` does not require it. */
const EMAIL_SIGNIN_MS = 60000;
const SIGN_OUT_MS = 10000;

function normalizeFirebaseEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Signs into Firebase Auth with email/password only (no Google / no popup OAuth).
 * Reuses session when already the same user.
 * @returns {Promise<{ ok: true, reusedSession?: boolean } | { ok: false, reason: string, code?: string, message?: string }>}
 */
export async function firebaseSignInAsAdmin(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.error("[MIY] firebaseSignInAsAdmin: getFirebaseAuth() returned null (env / init).");
    return { ok: false, code: "", message: "", reason: "no_firebase" };
  }

  console.log("[MIY] firebaseSignInAsAdmin: getAuth()", {
    app: auth.app?.name,
    authDomain: auth.config?.authDomain,
    currentUid: auth.currentUser?.uid || null,
  });

  const em = normalizeFirebaseEmail(email);
  const pass = String(password ?? "");
  if (!em || !pass) {
    return { ok: false, code: "", message: "", reason: "missing_credentials" };
  }

  const cur = auth.currentUser;
  const curEm = cur?.email ? normalizeFirebaseEmail(cur.email) : "";
  if (cur && curEm === em) {
    console.log("[MIY] firebaseSignInAsAdmin: reusing existing Firebase session for", em);
    return { ok: true, reusedSession: true };
  }

  if (cur && curEm && curEm !== em) {
    try {
      await raceWithTimeout(signOut(auth), SIGN_OUT_MS, "signOut(switch-user)");
    } catch (so) {
      logFirebaseAuthError("signOut(before switch user)", so);
    }
  }

  try {
    console.log("[MIY] signInWithEmailAndPassword →", em, "(sin authStateReady)");
    await raceWithTimeout(signInWithEmailAndPassword(auth, em, pass), EMAIL_SIGNIN_MS, "signInWithEmailAndPassword");
    console.log("[MIY] signInWithEmailAndPassword OK", em, "uid=", auth.currentUser?.uid);
    return { ok: true };
  } catch (e) {
    logFirebaseAuthError("signInWithEmailAndPassword", e);
    const code = typeof e?.code === "string" ? e.code : "";
    const message = typeof e?.message === "string" ? e.message : String(e ?? "");
    return {
      ok: false,
      code,
      message,
      reason: formatFirebaseAuthError(e, { host: typeof window !== "undefined" ? window.location.hostname : "" }),
    };
  }
}
