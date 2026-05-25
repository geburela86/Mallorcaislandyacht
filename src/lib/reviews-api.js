import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { getFirestoreDb, getFirebaseAuth, isFirebaseConfigured } from "./firebase-app.js";
import { firebaseSignInAsAdmin } from "./firebase-admin-auth.js";

const LS_REVIEWS = "miy_reviews_v1";
const META_GATE = "meta";
const GATE_DOC = "reviewGate";
/** Mismo doc que `site-sync-api.js` — `settings.reviewGateToken` se publica al guardar el sitio. */
const SITE_PUBLIC_LIVE = ["sitePublic", "live"];

function readLocalReviews() {
  try {
    const raw = window.localStorage.getItem(LS_REVIEWS);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocalReviews(rows) {
  try {
    window.localStorage.setItem(LS_REVIEWS, JSON.stringify(rows));
    window.dispatchEvent(new Event("miy-reviews-changed"));
  } catch {
    /* ignore */
  }
}

/** @deprecated Use firebaseSignInAsAdmin — kept as alias for callers. */
export async function syncFirebaseAuth(email, password) {
  return firebaseSignInAsAdmin(email, password);
}

export async function firebaseSignOut() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch {
    /* ignore */
  }
}

/** Gate token en Firestore: doc `meta/reviewGate`, campo `token`. */
export async function fetchReviewGateTokenRemote() {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, META_GATE, GATE_DOC));
    if (!snap.exists()) return null;
    const t = snap.data()?.token;
    return typeof t === "string" && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

/** Token publicado en `sitePublic/live.settings` al hacer sync del sitio (admite QR sin doc meta). */
async function fetchReviewGateTokenFromSitePublic() {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, ...SITE_PUBLIC_LIVE));
    if (!snap.exists()) return null;
    const settings = snap.data()?.settings;
    const t = settings && typeof settings === "object" ? settings.reviewGateToken : null;
    return typeof t === "string" && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

export function getEnvReviewGateToken() {
  const t = import.meta.env.VITE_REVIEW_GATE_TOKEN;
  return typeof t === "string" && t.trim() ? t.trim() : "";
}

/**
 * Validates URL gate param `t` against (in order of check) Firestore `meta/reviewGate.token`,
 * `sitePublic/live.settings.reviewGateToken`, and/or `VITE_REVIEW_GATE_TOKEN`.
 * El doc público refleja el token del QR tras “Guardar sitio”; `meta/reviewGate` es opcional si ese sync falla.
 */
export async function validateReviewGateParam(tParam) {
  const raw = typeof tParam === "string" ? tParam.trim() : "";
  if (!raw) return false;
  const [fromMeta, fromPublic, env] = await Promise.all([
    fetchReviewGateTokenRemote(),
    fetchReviewGateTokenFromSitePublic(),
    Promise.resolve(getEnvReviewGateToken()),
  ]);
  if (fromMeta && raw === fromMeta) return true;
  if (fromPublic && raw === fromPublic) return true;
  if (env && raw === env) return true;
  return false;
}

/** Subscribe to reviews list (newest first). */
export function subscribeReviews(onData, onErr) {
  const db = getFirestoreDb();
  if (!db) {
    const emit = () => {
      const rows = readLocalReviews().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(rows);
    };
    emit();
    const fn = () => emit();
    window.addEventListener("miy-reviews-changed", fn);
    return () => window.removeEventListener("miy-reviews-changed", fn);
  }
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => {
        const x = d.data();
        rows.push({
          id: d.id,
          name: String(x.name || ""),
          rating: Math.min(5, Math.max(1, parseInt(x.rating, 10) || 0)),
          text: String(x.text || ""),
          reply: typeof x.reply === "string" ? x.reply : "",
          createdAt: typeof x.createdAt?.toMillis === "function" ? x.createdAt.toMillis() : Number(x.createdAt) || Date.now(),
          updatedAt: typeof x.updatedAt?.toMillis === "function" ? x.updatedAt.toMillis() : Number(x.updatedAt) || null,
        });
      });
      onData(rows);
    },
    (err) => {
      if (typeof onErr === "function") onErr(err);
      onData([]);
    },
  );
}

export async function createReview({ name, rating, text }) {
  const db = getFirestoreDb();
  const n = String(name || "").trim().slice(0, 80);
  const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 0));
  const txt = String(text || "").trim().slice(0, 2000);
  if (!n || !r || !txt) throw new Error("invalid_review");

  if (!db) {
    const row = {
      id: `local-${Date.now()}`,
      name: n,
      rating: r,
      text: txt,
      reply: "",
      createdAt: Date.now(),
      updatedAt: null,
    };
    writeLocalReviews([row, ...readLocalReviews()]);
    return row.id;
  }

  const ref = await addDoc(collection(db, "reviews"), {
    name: n,
    rating: r,
    text: txt,
    reply: "",
    createdAt: serverTimestamp(),
    updatedAt: null,
  });
  return ref.id;
}

export async function adminUpdateReview(id, patch) {
  const db = getFirestoreDb();
  if (!db) {
    const rows = readLocalReviews();
    const idx = rows.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error("not_found");
    const cur = rows[idx];
    const next = {
      ...cur,
      ...(patch.name != null ? { name: String(patch.name).trim().slice(0, 80) } : {}),
      ...(patch.rating != null ? { rating: Math.min(5, Math.max(1, parseInt(patch.rating, 10) || cur.rating)) } : {}),
      ...(patch.text != null ? { text: String(patch.text).trim().slice(0, 2000) } : {}),
      ...(patch.reply !== undefined ? { reply: String(patch.reply || "").trim().slice(0, 2000) } : {}),
      updatedAt: Date.now(),
    };
    rows[idx] = next;
    writeLocalReviews(rows);
    return;
  }
  const ref = doc(db, "reviews", id);
  const data = {};
  if (patch.name != null) data.name = String(patch.name).trim().slice(0, 80);
  if (patch.rating != null) data.rating = Math.min(5, Math.max(1, parseInt(patch.rating, 10) || 1));
  if (patch.text != null) data.text = String(patch.text).trim().slice(0, 2000);
  if (patch.reply !== undefined) data.reply = String(patch.reply || "").trim().slice(0, 2000);
  data.updatedAt = serverTimestamp();
  await updateDoc(ref, data);
}

export async function adminDeleteReview(id) {
  const db = getFirestoreDb();
  if (!db) {
    writeLocalReviews(readLocalReviews().filter((x) => x.id !== id));
    return;
  }
  await deleteDoc(doc(db, "reviews", id));
}

/** Persist gate token to Firestore (requires Firebase Auth signed in). */
export async function adminSaveReviewGateToken(token) {
  const db = getFirestoreDb();
  const t = String(token || "").trim();
  if (!db || !t) throw new Error("bad_gate");
  await setDoc(
    doc(db, META_GATE, GATE_DOC),
    { token: t, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export { isFirebaseConfigured };
