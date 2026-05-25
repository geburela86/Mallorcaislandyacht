import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocFromServer,
  waitForPendingWrites,
} from "firebase/firestore";
import { getFirestoreDb, getFirebaseAuth } from "./firebase-app.js";

/**
 * Single-tenant live documents (all devices must use the same Firebase project env vars).
 * — sitePublic/live: boats, blockedDates, settings, translationOverrides (world-readable)
 * — siteAdmin/live: bookings[], users[] (auth-only)
 * Slot-level booking holds live in `blockedSlots/{key}` (world-readable); see bookings-firestore.js
 */
const DOC_PUBLIC = ["sitePublic", "live"];
const DOC_ADMIN = ["siteAdmin", "live"];

const PUBLIC_BOOT_CACHE_KEY = "miy_site_public_boot_v1";
const PUBLIC_BOOT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Last known public site payload for instant repeat visits (sessionStorage). */
export function readPublicSiteBootCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PUBLIC_BOOT_CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    if (typeof o.at === "number" && Date.now() - o.at > PUBLIC_BOOT_CACHE_MAX_AGE_MS) {
      window.sessionStorage.removeItem(PUBLIC_BOOT_CACHE_KEY);
      return null;
    }
    return {
      boats: Array.isArray(o.boats) ? o.boats : [],
      blockedDates: Array.isArray(o.blockedDates) ? o.blockedDates : [],
      settings: o.settings && typeof o.settings === "object" ? o.settings : null,
      translationOverrides:
        o.translationOverrides && typeof o.translationOverrides === "object"
          ? o.translationOverrides
          : {},
    };
  } catch {
    return null;
  }
}

export function writePublicSiteBootCache(data) {
  if (typeof window === "undefined" || !data || typeof data !== "object") return;
  const norm = normalizeSitePublicDocForClient(data);
  if (!norm) return;
  try {
    const boats = filterBoatsForPublicLiveDoc(pickBoatsArrayForWrite(norm));
    window.sessionStorage.setItem(
      PUBLIC_BOOT_CACHE_KEY,
      JSON.stringify({
        at: Date.now(),
        boats,
        blockedDates: Array.isArray(norm.blockedDates) ? norm.blockedDates : [],
        settings: norm.settings && typeof norm.settings === "object" ? norm.settings : {},
        translationOverrides:
          norm.translationOverrides && typeof norm.translationOverrides === "object"
            ? norm.translationOverrides
            : {},
      }),
    );
    if (boats.length && typeof document !== "undefined") {
      document.documentElement.classList.add("site-boot-ready");
    }
  } catch {
    /* quota / private mode */
  }
}

/** Canonical field on `sitePublic/live` is `boats`; accept legacy/alternate keys when reading. */
export function normalizeSitePublicDocForClient(data) {
  if (!data || typeof data !== "object") return data;
  let boats;
  if (Array.isArray(data.boats)) boats = data.boats;
  else if (Array.isArray(data.vessels)) boats = data.vessels;
  else if (Array.isArray(data.fleet)) boats = data.fleet;
  else if (Array.isArray(data.barcos)) boats = data.barcos;
  if (boats === undefined) return data;
  return { ...data, boats };
}

function pickBoatsArrayForWrite(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.boats)) return payload.boats;
  if (Array.isArray(payload.vessels)) return payload.vessels;
  if (Array.isArray(payload.fleet)) return payload.fleet;
  if (Array.isArray(payload.barcos)) return payload.barcos;
  return [];
}

/** True = include in `sitePublic/live` `boats` (public website). Missing flags = published. */
export function boatIsPublishedForPublicLive(b) {
  if (!b || typeof b !== "object") return false;
  if (b.draft === true) return false;
  if (b.published === false) return false;
  if (b.visible === false) return false;
  if (b.isActive === false) return false;
  if (b.enabled === false) return false;
  const st = typeof b.status === "string" ? b.status.toLowerCase() : "";
  if (st === "draft" || st === "hidden" || st === "archived") return false;
  return true;
}

export function filterBoatsForPublicLiveDoc(arr) {
  return (Array.isArray(arr) ? arr : []).filter(boatIsPublishedForPublicLive);
}

/** Raw Firestore document fields (not normalized). `boats` is only the JSON key `boats`. */
export function extractSitePublicLiveDocBoatsArray(raw) {
  if (!raw || typeof raw !== "object") return [];
  return Array.isArray(raw.boats) ? raw.boats : [];
}

/**
 * Raw `sitePublic/live` read (for the public `.boats` field only).
 */
export async function getLiveSitePublicRawOnce(preferServer = true) {
  const db = getFirestoreDb();
  if (!db) return null;
  const ref = doc(db, ...DOC_PUBLIC);
  if (preferServer) {
    try {
      const snap = await getDocFromServer(ref);
      if (!snap.exists()) return null;
      return snap.data();
    } catch {
      /* fall through */
    }
  }
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Writes only `sitePublic/live.boats` (+ `updatedAt`) with merge, then reads back from server.
 * For debugging / forcing publication without touching other public fields.
 */
export async function mergePublishBoatsToSitePublicLive(boatsList) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db) throw new Error("no_firebase");
  if (!auth?.currentUser) throw new Error("not_authenticated");
  const ref = doc(db, ...DOC_PUBLIC);
  const boats = filterBoatsForPublicLiveDoc(Array.isArray(boatsList) ? boatsList : []);
  await setDoc(
    ref,
    {
      boats,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await waitForPendingWrites(db);
  const verify = await getDocFromServer(ref);
  const raw = verify.exists() ? verify.data() : null;
  const readBoats = extractSitePublicLiveDocBoatsArray(raw);
  return { boats: readBoats, boatsLength: readBoats.length };
}

/**
 * One-shot read of published site data. Prefer server so UI matches Firestore after admin writes (avoids stale cache).
 */
export async function getLiveSitePublicOnce(preferServer = true) {
  const db = getFirestoreDb();
  if (!db) return null;
  const ref = doc(db, ...DOC_PUBLIC);
  if (preferServer) {
    try {
      const snap = await getDocFromServer(ref);
      if (!snap.exists()) return null;
      return normalizeSitePublicDocForClient(snap.data());
    } catch {
      /* offline or transient — fall back to cache */
    }
  }
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeSitePublicDocForClient(snap.data());
}

function fingerprintLivePublicSnap(snap) {
  if (!snap.exists()) return "__empty__";
  const raw = snap.data();
  const norm = normalizeSitePublicDocForClient(raw);
  return fingerprintPublicSiteFields(norm);
}

/** Huella estable del contenido publicable (sin `updatedAt`). */
export function fingerprintPublicSiteFields(data) {
  if (!data || typeof data !== "object") return "__empty__";
  const boats = filterBoatsForPublicLiveDoc(pickBoatsArrayForWrite(data));
  const blockedDates = Array.isArray(data.blockedDates) ? data.blockedDates : [];
  const settings = data.settings && typeof data.settings === "object" ? data.settings : {};
  const translationOverrides =
    data.translationOverrides && typeof data.translationOverrides === "object"
      ? data.translationOverrides
      : {};
  try {
    return JSON.stringify({ boats, blockedDates, settings, translationOverrides });
  } catch {
    return String(boats?.length ?? 0);
  }
}

/** Huella estable de `siteAdmin/live` (sin `updatedAt`). */
export function fingerprintAdminSiteFields(data) {
  if (!data || typeof data !== "object") return "__empty_admin__";
  const bookings = Array.isArray(data.bookings) ? data.bookings : [];
  const users = Array.isArray(data.users) ? data.users : [];
  try {
    return JSON.stringify({ bookings, users });
  } catch {
    return String(bookings.length);
  }
}

export function fingerprintLiveSiteWritePayload(payload) {
  const publicFp = fingerprintPublicSiteFields(payload);
  const adminFp = fingerprintAdminSiteFields(payload);
  return `${publicFp}||${adminFp}`;
}

/** Último contenido escrito o recibido de Firestore; evita re-escrituras idénticas. */
let lastAcknowledgedWriteFingerprint = null;

export function noteRemoteLiveSiteFingerprint(payload) {
  lastAcknowledgedWriteFingerprint = fingerprintLiveSiteWritePayload(payload);
}

export function resetLiveSiteWriteFingerprint() {
  lastAcknowledgedWriteFingerprint = null;
}

/** Millis desde `updatedAt` (Timestamp o objeto plano); null si no hay campo. */
function docUpdatedAtMillis(data) {
  if (!data || typeof data !== "object") return null;
  const u = data.updatedAt;
  if (u == null) return null;
  if (typeof u.toMillis === "function") return u.toMillis();
  if (typeof u.seconds === "number") {
    return u.seconds * 1000 + (typeof u.nanoseconds === "number" ? u.nanoseconds / 1e6 : 0);
  }
  return null;
}

/**
 * Live site data readable by anyone (no guest PII). Used by the public website.
 * Single `onSnapshot` listener (no polling — evita agotar cuota).
 * @param onData {(normalized: object|null, meta: { rawData: object|null }) => void}
 */
export function subscribeLiveSitePublic(onData, onErr) {
  const db = getFirestoreDb();
  if (!db) return () => {};
  const ref = doc(db, ...DOC_PUBLIC);

  let lastDeliveredFingerprint = null;
  let maxDeliveredUpdatedAtMs = null;
  let cancelled = false;

  const deliver = (snap, opts = {}) => {
    if (cancelled) return;
    const fp = fingerprintLivePublicSnap(snap);
    if (!opts.force && fp === lastDeliveredFingerprint) return;

    const rawIfAny = snap.exists() ? snap.data() : null;
    const updatedMs = rawIfAny ? docUpdatedAtMillis(rawIfAny) : null;
    if (
      snap.exists() &&
      updatedMs !== null &&
      maxDeliveredUpdatedAtMs !== null &&
      updatedMs < maxDeliveredUpdatedAtMs
    ) {
      return;
    }

    lastDeliveredFingerprint = fp;
    if (updatedMs !== null) {
      maxDeliveredUpdatedAtMs =
        maxDeliveredUpdatedAtMs === null ? updatedMs : Math.max(maxDeliveredUpdatedAtMs, updatedMs);
    }

    if (!snap.exists()) {
      onData(null, { rawData: null });
      return;
    }
    const raw = snap.data();
    const norm = normalizeSitePublicDocForClient(raw);
    noteRemoteLiveSiteFingerprint(norm);
    onData(norm, { rawData: raw });
  };

  const onSnapshotErr =
    onErr &&
    ((err) => {
      const code = typeof err?.code === "string" ? err.code : "";
      if (code === "permission-denied") {
        console.error(
          "[site-sync] sitePublic/live: permission-denied — los visitantes anónimos deben poder leer este documento. " +
            "Copia firestore.rules del repo (match /sitePublic/{docId} allow read: if true) y despliega: firebase deploy --only firestore:rules",
        );
      }
      onErr(err);
    });

  const unsubSnapshot = onSnapshot(
    ref,
    (snap) => deliver(snap),
    onSnapshotErr || onErr,
  );

  return () => {
    cancelled = true;
    unsubSnapshot();
  };
}

/**
 * Bookings + team users — readable only when signed in with Firebase Auth (same account as admin).
 */
export function subscribeLiveSiteAdmin(onData, onErr) {
  const db = getFirestoreDb();
  if (!db) return () => {};
  const ref = doc(db, ...DOC_ADMIN);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data());
    },
    onErr,
  );
}

/**
 * Writes public + admin snapshots. Requires Firebase Auth (sign in with admin email/password).
 * Omite la escritura si el contenido (sin `updatedAt`) no cambió respecto al último ack local.
 * @param {{ force?: boolean }} opts — `force: true` fuerza setDoc aunque la huella coincida.
 */
export async function pushLiveSiteSnapshot(payload, opts = {}) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db) throw new Error("no_firebase");
  if (!auth?.currentUser) throw new Error("not_authenticated");

  const fp = fingerprintLiveSiteWritePayload(payload);
  if (!opts.force && fp === lastAcknowledgedWriteFingerprint) {
    return { ok: true, skipped: true };
  }

  const publicPayload = {
    boats: filterBoatsForPublicLiveDoc(pickBoatsArrayForWrite(payload)),
    blockedDates: Array.isArray(payload.blockedDates) ? payload.blockedDates : [],
    settings: payload.settings && typeof payload.settings === "object" ? payload.settings : {},
    translationOverrides:
      payload.translationOverrides && typeof payload.translationOverrides === "object"
        ? payload.translationOverrides
        : {},
    updatedAt: serverTimestamp(),
  };
  const adminPayload = {
    bookings: Array.isArray(payload.bookings) ? payload.bookings : [],
    users: Array.isArray(payload.users) ? payload.users : [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, ...DOC_PUBLIC), publicPayload, { merge: true });
  await setDoc(doc(db, ...DOC_ADMIN), adminPayload, { merge: true });
  await waitForPendingWrites(db);
  lastAcknowledgedWriteFingerprint = fp;
  console.log("[MIY] Firestore guardado OK", {
    docs: ["sitePublic/live", "siteAdmin/live"],
    boats: publicPayload.boats.length,
    blockedDates: publicPayload.blockedDates.length,
    bookings: adminPayload.bookings.length,
    users: adminPayload.users.length,
  });
  return { ok: true, skipped: false };
}
