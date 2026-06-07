import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirestoreDb, getFirebaseAuth, getFirebaseRuntimeSummary } from "./firebase-app.js";

/** Porcentaje fijo acordado con el negocio (códigos VIP de un solo uso en admin). */
export const VIP_CHARTER_DISCOUNT_PCT = 20;

export const DISCOUNT_PCT_OPTIONS = [5, 10, 15, 20, 25, 30];
export const DISCOUNT_MAX_USES_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 60];

const COLLECTION = "discountCodes";

export function isAllowedDiscountPct(n) {
  return DISCOUNT_PCT_OPTIONS.includes(Number(n));
}

export function isAllowedMaxUses(n) {
  return DISCOUNT_MAX_USES_OPTIONS.includes(Number(n));
}

/** @returns {"single"|"multi"|null} */
export function discountCodeKind(data) {
  if (!data || typeof data !== "object") return null;
  if (data.type === "multi") return "multi";
  if (data.type === "single" || data.maxUses == null) return "single";
  return null;
}

/** Normaliza código para almacenar y comparar (A–Z, 0–9, máx. 24). */
export function normalizeVipDiscountCode(raw) {
  if (raw == null) return "";
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código alfanumérico aleatorio (sin 0/O/1/I para reducir confusiones). */
export function generateRandomVipCode(len = 8) {
  const n = Math.min(24, Math.max(4, Math.floor(len)));
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    let s = "";
    for (let i = 0; i < n; i++) s += CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)];
    return s;
  }
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < n; i++) out += CODE_CHARSET[buf[i] % CODE_CHARSET.length];
  return out;
}

function resolveUsableFromData(data) {
  if (!data || data.active === false) return null;
  const kind = discountCodeKind(data);
  if (kind === "single") {
    const pct = Number(data.pct);
    if (pct !== VIP_CHARTER_DISCOUNT_PCT) return null;
    if (data.usedByBookingId) return null;
    return { pct, kind: "single" };
  }
  if (kind === "multi") {
    const pct = Number(data.pct);
    const maxUses = Number(data.maxUses);
    const useCount = Number(data.useCount) || 0;
    if (!isAllowedDiscountPct(pct) || !isAllowedMaxUses(maxUses)) return null;
    if (useCount >= maxUses) return null;
    return { pct, kind: "multi", maxUses, useCount };
  }
  return null;
}

function readTokenRole(claims) {
  const c = claims && typeof claims === "object" ? claims : {};
  const roleRaw = c.role;
  return typeof roleRaw === "string" ? roleRaw.trim() : roleRaw != null ? String(roleRaw).trim() : "";
}

/**
 * Refresca el JWT y registra contexto antes de escribir en `discountCodes`.
 * Las reglas de producción exigen `request.auth.token.role == 'owner'` para create/delete/list.
 */
export async function ensureDiscountCodesWriterAuth() {
  const auth = getFirebaseAuth();
  const summary = getFirebaseRuntimeSummary();
  const db = getFirestoreDb();

  if (!summary.configured) {
    const err = Object.assign(new Error("Firebase no configurado (VITE_FIREBASE_*)."), {
      code: "discount-codes/no-firebase",
    });
    console.error("[MIY][discountCodes] ensureDiscountCodesWriterAuth:", err.message);
    throw err;
  }

  if (!auth) {
    const err = Object.assign(new Error("getFirebaseAuth() null"), { code: "discount-codes/no-auth" });
    console.error("[MIY][discountCodes] ensureDiscountCodesWriterAuth:", err.message);
    throw err;
  }

  const ready = auth.authStateReady?.();
  if (ready && typeof ready.then === "function") {
    await ready;
  }

  const user = auth.currentUser;
  if (!user) {
    const err = Object.assign(
      new Error("No hay sesión Firebase. Usa «Conectar Firebase» en la barra superior."),
      { code: "discount-codes/not-authenticated" },
    );
    console.error("[MIY][discountCodes] ensureDiscountCodesWriterAuth:", err.message);
    throw err;
  }

  const authProjectId = auth.app?.options?.projectId ?? null;
  const firestoreProjectId = db?.app?.options?.projectId ?? null;
  if (authProjectId && firestoreProjectId && authProjectId !== firestoreProjectId) {
    console.error("[MIY][discountCodes] projectId mismatch Auth vs Firestore", {
      authProjectId,
      firestoreProjectId,
      envProjectId: summary.projectId,
    });
  }

  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult();
  const role = readTokenRole(tokenResult?.claims);
  const ctx = {
    collection: COLLECTION,
    uid: user.uid,
    email: user.email,
    envProjectId: summary.projectId,
    authProjectId,
    firestoreProjectId,
    authDomain: summary.authDomain,
    origin: typeof window !== "undefined" ? window.location.origin : null,
    hostname: typeof window !== "undefined" ? window.location.hostname : null,
    roleClaim: role || "(ausente)",
    hasOwnerClaim: role === "owner",
    tokenExpiration: tokenResult?.expirationTime ?? null,
  };

  console.log("[MIY][discountCodes] writer auth OK", ctx);

  if (role !== "owner") {
    console.warn(
      "[MIY][discountCodes] El JWT no incluye role:owner. Con reglas de producción, create/delete en discountCodes devuelve permission-denied. " +
        "Ejecuta: npm run firebase:set-owner-claim → cerrar sesión Firebase → volver a entrar. " +
        "O despliega reglas abiertas temporalmente: npm run firebase:deploy-rules:open",
    );
  }

  return { user, role, ctx };
}

/** Diagnóstico en consola del navegador: await window.__miyLogDiscountCodesAuth() */
export async function logDiscountCodesAuthForDebug() {
  try {
    const out = await ensureDiscountCodesWriterAuth();
    return { ok: true, ...out.ctx };
  } catch (e) {
    const code = typeof e?.code === "string" ? e.code : "";
    const message = typeof e?.message === "string" ? e.message : String(e ?? "");
    console.error("[MIY][discountCodes] logDiscountCodesAuthForDebug failed", { code, message });
    return { ok: false, code, message };
  }
}

export function logDiscountCodesFirestoreError(operation, codeId, err) {
  const firestoreCode = typeof err?.code === "string" ? err.code : "";
  const message = typeof err?.message === "string" ? err.message : String(err ?? "");
  const payload = {
    file: "src/lib/discount-codes-firestore.js",
    operation,
    collection: COLLECTION,
    documentId: codeId,
    firestoreCode,
    message,
    httpStatus: firestoreCode === "permission-denied" ? 403 : undefined,
  };

  if (firestoreCode === "permission-denied") {
    payload.hint =
      "Firestore bloqueó la escritura. 1) npm run firebase:deploy-rules (o :open para probar). " +
      "2) npm run firebase:set-owner-claim y volver a iniciar sesión. " +
      "3) Authentication → dominios autorizados debe incluir " +
      (typeof window !== "undefined" ? window.location.hostname : "tu dominio") +
      ". 4) await window.__miyLogDiscountCodesAuth()";
  }

  console.error(`[MIY][discountCodes] ${operation} FAILED`, payload);

  const wrapped = new Error(message || firestoreCode || "discount_codes_write_failed");
  wrapped.code = firestoreCode || "unknown";
  wrapped.discountCodesDebug = payload;
  return wrapped;
}

if (typeof window !== "undefined") {
  window.__miyLogDiscountCodesAuth = logDiscountCodesAuthForDebug;
}

/**
 * Invitado: comprueba si existe `discountCodes/{id}` activo y usable.
 * @returns {Promise<{ id: string, pct: number, kind: "single"|"multi" } | null>}
 */
export async function resolveActiveDiscountCodePublic(raw) {
  const id = normalizeVipDiscountCode(raw);
  if (id.length < 4) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    const resolved = resolveUsableFromData(snap.data());
    if (!resolved) return null;
    return { id, pct: resolved.pct, kind: resolved.kind };
  } catch (e) {
    console.warn("[MIY][discountCodes] resolveActiveDiscountCodePublic:", e?.code || e?.message || e);
    return null;
  }
}

/** @deprecated Usar resolveActiveDiscountCodePublic */
export async function isVipDiscountCodeActivePublic(raw) {
  const r = await resolveActiveDiscountCodePublic(raw);
  return r != null;
}

/** Admin: lista códigos (requiere Firebase Auth + reglas owner para list). */
export function subscribeDiscountCodesAdmin(onRows, onErr) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) return () => {};
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      const rows = [];
      snap.forEach((d) => {
        const x = d.data();
        const kind = discountCodeKind(x);
        rows.push({
          id: d.id,
          kind,
          active: x?.active !== false,
          pct: Number(x?.pct) || (kind === "multi" ? 0 : VIP_CHARTER_DISCOUNT_PCT),
          maxUses: kind === "multi" ? Number(x?.maxUses) || 0 : null,
          useCount: kind === "multi" ? Number(x?.useCount) || 0 : 0,
          usedByBookingId: typeof x?.usedByBookingId === "string" ? x.usedByBookingId : "",
        });
      });
      rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      onRows(rows);
    },
    (err) => {
      const code = typeof err?.code === "string" ? err.code : "";
      console.error("[MIY][discountCodes] subscribeDiscountCodesAdmin FAILED", {
        file: "src/lib/discount-codes-firestore.js",
        collection: COLLECTION,
        firestoreCode: code,
        message: err?.message || String(err),
        httpStatus: code === "permission-denied" ? 403 : undefined,
        hint:
          code === "permission-denied"
            ? "list en discountCodes requiere role:owner o reglas abiertas. Despliega firestore.rules."
            : undefined,
      });
      onErr?.(err);
    },
  );
}

async function writeDiscountCodeDoc(codeId, data, operation) {
  await ensureDiscountCodesWriterAuth();
  const db = getFirestoreDb();
  if (!db) {
    throw Object.assign(new Error("no_firebase"), { code: "discount-codes/no-firebase" });
  }
  const ref = doc(db, COLLECTION, codeId);
  try {
    await setDoc(ref, data);
    console.log(`[MIY][discountCodes] ${operation} OK`, {
      collection: COLLECTION,
      documentId: codeId,
      path: `${COLLECTION}/${codeId}`,
      type: data.type,
      pct: data.pct,
      maxUses: data.maxUses ?? null,
    });
  } catch (e) {
    throw logDiscountCodesFirestoreError(operation, codeId, e);
  }
}

/** Código de un solo uso (−20%). */
export async function createDiscountCodeFirestore(rawCode) {
  const id = normalizeVipDiscountCode(rawCode);
  if (id.length < 4) throw new Error("invalid_code");
  await writeDiscountCodeDoc(
    id,
    {
      type: "single",
      active: true,
      pct: VIP_CHARTER_DISCOUNT_PCT,
      createdAt: serverTimestamp(),
    },
    "createDiscountCodeFirestore",
  );
}

/** Código reutilizable con % y usos máximos configurables. */
export async function createMultiUseDiscountCodeFirestore(rawCode, pct, maxUses) {
  const id = normalizeVipDiscountCode(rawCode);
  if (id.length < 4) throw new Error("invalid_code");
  const pctN = Number(pct);
  const maxN = Number(maxUses);
  if (!isAllowedDiscountPct(pctN)) throw new Error("invalid_pct");
  if (!isAllowedMaxUses(maxN)) throw new Error("invalid_max_uses");
  await writeDiscountCodeDoc(
    id,
    {
      type: "multi",
      active: true,
      pct: pctN,
      maxUses: maxN,
      useCount: 0,
      createdAt: serverTimestamp(),
    },
    "createMultiUseDiscountCodeFirestore",
  );
}

export async function deleteDiscountCodeFirestore(codeId) {
  await ensureDiscountCodesWriterAuth();
  const db = getFirestoreDb();
  if (!db) throw Object.assign(new Error("no_firebase"), { code: "discount-codes/no-firebase" });
  const id = normalizeVipDiscountCode(codeId);
  if (!id) throw new Error("invalid_code");
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.log("[MIY][discountCodes] deleteDiscountCodeFirestore OK", {
      collection: COLLECTION,
      documentId: id,
    });
  } catch (e) {
    throw logDiscountCodesFirestoreError("deleteDiscountCodeFirestore", id, e);
  }
}

/** Sin Firebase: comprobar contra lista en ajustes (solo modo local). */
export function isVipCodeInLocalSettingsList(raw, settings) {
  const id = normalizeVipDiscountCode(raw);
  if (id.length < 4) return false;
  const list = settings?.offer?.vipCodes;
  if (!Array.isArray(list)) return false;
  return list.some((c) => normalizeVipDiscountCode(c) === id);
}

const LS_USED_LOCAL_VIP_CODES = "miy_used_local_vip_codes_v1";

function readUsedLocalVipCodeSet() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_USED_LOCAL_VIP_CODES) : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === "string").map((x) => normalizeVipDiscountCode(x)).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Modo sin Firebase: un código de la lista en ajustes solo vale una vez por navegador. */
export function isVipCodeAvailableLocal(raw, settings) {
  if (!isVipCodeInLocalSettingsList(raw, settings)) return false;
  const id = normalizeVipDiscountCode(raw);
  return !readUsedLocalVipCodeSet().has(id);
}

/**
 * Actualización al reservar (cliente, dentro de runTransaction).
 * @returns {{ pct: number, kind: "single"|"multi", update: object }}
 */
export function buildPromoRedeemUpdateClient(codeData, bookingId) {
  const resolved = resolveUsableFromData(codeData);
  if (!resolved) {
    throw new Error("invalid_promo");
  }
  if (resolved.kind === "single") {
    return {
      pct: resolved.pct,
      kind: "single",
      update: {
        active: false,
        usedAt: serverTimestamp(),
        usedByBookingId: bookingId,
      },
    };
  }
  const useCount = Number(codeData.useCount) || 0;
  const maxUses = Number(codeData.maxUses);
  const nextCount = useCount + 1;
  const update = {
    useCount: nextCount,
    lastUsedAt: serverTimestamp(),
    lastUsedByBookingId: bookingId,
  };
  if (nextCount >= maxUses) {
    update.active = false;
  }
  return { pct: resolved.pct, kind: "multi", update };
}

export function markLocalVipCodeUsedOnce(codeId) {
  const id = normalizeVipDiscountCode(codeId);
  if (id.length < 4 || typeof window === "undefined") return;
  try {
    const cur = readUsedLocalVipCodeSet();
    cur.add(id);
    window.localStorage.setItem(LS_USED_LOCAL_VIP_CODES, JSON.stringify(Array.from(cur).sort()));
  } catch {}
}
