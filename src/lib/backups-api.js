import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase-app.js";

const COLLECTION = "backups";
export const FIRESTORE_BACKUPS_KEEP = 7;

/** Interval for automatic cloud snapshots while admin is logged in (24h). */
export const AUTO_FIRESTORE_BACKUP_MS = 24 * 60 * 60 * 1000;

/**
 * Validates backup JSON shape (file or Firestore payload).
 * @returns {{ ok: true, data: object } | { ok: false, errors: string[], data: null }}
 */
export function validateBackupPayload(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["La raíz debe ser un objeto JSON."], data: null };
  }
  const keys = ["boats", "bookings", "blockedDates", "settings", "users"];
  for (const k of keys) {
    if (!(k in raw)) errors.push(`Falta la clave: ${k}`);
  }
  if (raw.timestamp != null && typeof raw.timestamp !== "string") {
    errors.push("timestamp debe ser un string ISO cuando existe");
  }
  if (raw.boats != null && !Array.isArray(raw.boats)) errors.push("boats debe ser un array");
  if (raw.bookings != null && !Array.isArray(raw.bookings)) errors.push("bookings debe ser un array");
  if (raw.blockedDates != null && !Array.isArray(raw.blockedDates)) errors.push("blockedDates debe ser un array");
  if (raw.settings != null && (typeof raw.settings !== "object" || Array.isArray(raw.settings))) {
    errors.push("settings debe ser un objeto");
  }
  if (raw.users != null && !Array.isArray(raw.users)) errors.push("users debe ser un array");

  if (errors.length) return { ok: false, errors, data: null };

  return {
    ok: true,
    errors: [],
    data: {
      timestamp:
        typeof raw.timestamp === "string" && raw.timestamp.trim()
          ? raw.timestamp.trim()
          : new Date().toISOString(),
      boats: Array.isArray(raw.boats) ? raw.boats : [],
      bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
      blockedDates: Array.isArray(raw.blockedDates) ? raw.blockedDates : [],
      settings: raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings) ? raw.settings : {},
      users: Array.isArray(raw.users) ? raw.users : [],
    },
  };
}

export function buildBackupSnapshot({ boats, bookings, blockedDates, settings, users }) {
  return {
    timestamp: new Date().toISOString(),
    boats: Array.isArray(boats) ? boats : [],
    bookings: Array.isArray(bookings) ? bookings : [],
    blockedDates: Array.isArray(blockedDates) ? blockedDates : [],
    settings: settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {},
    users: Array.isArray(users) ? users : [],
  };
}

export function formatBackupFilename(date = new Date()) {
  const iso = date.toISOString();
  return `backup-${iso.replace(/:/g, "-")}.json`;
}

async function pruneOldBackups(db, keep = FIRESTORE_BACKUPS_KEEP) {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const refs = [];
  snap.forEach((d) => refs.push(d.ref));
  for (let i = keep; i < refs.length; i++) {
    await deleteDoc(refs[i]);
  }
}

/**
 * Saves one backup doc + prunes to last `keep` documents.
 */
export async function saveFirestoreBackup(snapshot) {
  const db = getFirestoreDb();
  if (!db) throw new Error("no_firebase");
  const validated = validateBackupPayload(snapshot);
  if (!validated.ok) throw new Error(validated.errors.join("; "));
  await addDoc(collection(db, COLLECTION), {
    ...validated.data,
    createdAt: serverTimestamp(),
  });
  await pruneOldBackups(db, FIRESTORE_BACKUPS_KEEP);
}

/** @returns {Promise<Array<{ id: string, timestamp: string, createdAtMs: number|null }>>} */
export async function listFirestoreBackups(max = FIRESTORE_BACKUPS_KEEP) {
  const db = getFirestoreDb();
  if (!db) return [];
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => {
    const x = d.data();
    out.push({
      id: d.id,
      timestamp: typeof x.timestamp === "string" ? x.timestamp : "",
      createdAtMs: typeof x.createdAt?.toMillis === "function" ? x.createdAt.toMillis() : null,
    });
  });
  return out;
}

export async function fetchFirestoreBackupDoc(id) {
  const db = getFirestoreDb();
  if (!db) throw new Error("no_firebase");
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) throw new Error("missing");
  const x = snap.data();
  const raw = {
    timestamp: x.timestamp,
    boats: x.boats,
    bookings: x.bookings,
    blockedDates: x.blockedDates,
    settings: x.settings,
    users: x.users,
  };
  return validateBackupPayload(raw);
}
