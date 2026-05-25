import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb, getFirebaseAuth, isFirebaseConfigured } from "./firebase-app.js";

/** Activa logs: dev automático, o en consola: window.__MIY_ANALYTICS_DEBUG__ = true */
function analyticsDebugEnabled() {
  if (typeof window !== "undefined" && window.__MIY_ANALYTICS_DEBUG__ === true) return true;
  return !!import.meta.env?.DEV;
}

function analyticsDebug(label, payload) {
  if (!analyticsDebugEnabled()) return;
  if (payload === undefined) console.log(`[MIY][analytics-debug] ${label}`);
  else console.log(`[MIY][analytics-debug] ${label}`, payload);
}

/** Decodifica payload del JWT (solo claims; no imprime el token completo). */
function decodeJwtPayload(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Diagnóstico JWT + custom claims (llamar desde consola: await window.__miyLogAnalyticsJwt()).
 * @param {import("firebase/auth").User | null | undefined} authUser
 */
export async function logAnalyticsJwtDiagnostics(authUser) {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const paramUser = authUser || null;
  const current = auth?.currentUser || null;

  analyticsDebug("=== JWT / Auth diagnostics (start) ===", {
    configured: isFirebaseConfigured(),
    authProjectId: auth?.app?.options?.projectId ?? null,
    firestoreProjectId: db?.app?.options?.projectId ?? null,
    projectsMatch: auth?.app?.options?.projectId === db?.app?.options?.projectId,
    paramUid: paramUser?.uid ?? null,
    paramEmail: paramUser?.email ?? null,
    currentUid: current?.uid ?? null,
    currentEmail: current?.email ?? null,
    uidParamMatchesCurrent: paramUser?.uid === current?.uid,
  });

  if (!auth || !current) {
    analyticsDebug("STOP: no Firebase Auth session (currentUser null). 403/400 en signIn impiden leer Firestore.");
    return { ok: false, reason: "no_current_user" };
  }

  let tokenResult;
  try {
    await current.getIdToken(true);
    tokenResult = await current.getIdTokenResult();
  } catch (e) {
    analyticsDebug("STOP: getIdTokenResult failed", {
      code: e?.code,
      message: e?.message || String(e),
    });
    return { ok: false, reason: "token_failed", error: e };
  }

  const claims = tokenResult?.claims || {};
  const roleRaw = claims.role;
  const role = typeof roleRaw === "string" ? roleRaw : roleRaw != null ? String(roleRaw) : "";
  const adminClaim = claims.admin === true || claims.admin === "true";

  let jwtPayload = null;
  try {
    const rawToken = await current.getIdToken();
    jwtPayload = decodeJwtPayload(rawToken);
  } catch (e) {
    analyticsDebug("JWT decode failed", e?.message || e);
  }

  const jwtRole =
    typeof jwtPayload?.role === "string"
      ? jwtPayload.role
      : jwtPayload?.role != null
        ? String(jwtPayload.role)
        : "";

  const rulesWouldAllow = {
    hasAuth: true,
    roleIsOwner: role === "owner" || jwtRole === "owner",
    roleIsBookings: role === "bookings" || jwtRole === "bookings",
    adminTrue: adminClaim || jwtPayload?.admin === true,
    noRoleOrAdminKeys:
      jwtPayload != null &&
      !Object.prototype.hasOwnProperty.call(jwtPayload, "role") &&
      !Object.prototype.hasOwnProperty.call(jwtPayload, "admin"),
  };

  const summary = {
    uid: current.uid,
    email: current.email,
    authTime: tokenResult.authTime,
    issuedAtTime: tokenResult.issuedAtTime,
    expirationTime: tokenResult.expirationTime,
    claimsRole: role || null,
    jwtPayloadRole: jwtRole || null,
    claimsAdmin: claims.admin ?? null,
    jwtPayloadAdmin: jwtPayload?.admin ?? null,
    hasRoleOwner: role === "owner" || jwtRole === "owner",
    allClaimKeys: Object.keys(claims).filter(
      (k) => !["iss", "aud", "auth_time", "user_id", "sub", "iat", "exp", "email", "email_verified", "firebase"].includes(k),
    ),
    rulesHint: rulesWouldAllow,
  };

  console.log("[MIY][analytics-debug] JWT summary (custom claims)", summary);
  analyticsDebug("full claims object (getIdTokenResult)", claims);
  if (jwtPayload) analyticsDebug("JWT payload (decoded, custom fields)", jwtPayload);

  if (!summary.hasRoleOwner && !rulesWouldAllow.noRoleOrAdminKeys && !rulesWouldAllow.adminTrue) {
    console.warn(
      "[MIY][analytics-debug] El JWT NO incluye role:owner. Firestore rules (analyticsStaffReader) pueden denegar lectura. " +
        "Ejecuta: npm run firebase:set-owner-claim → logout → login.",
    );
  }

  if (db) {
    try {
      const testSnap = await getDocs(query(collection(db, COLLECTION), limit(1)));
      analyticsDebug("Firestore getDocs(analyticsEvents, limit 1) OK", { docCount: testSnap.size });
    } catch (e) {
      analyticsDebug("Firestore getDocs(analyticsEvents) FAILED", {
        code: e?.code,
        message: e?.message || String(e),
      });
    }
  }

  analyticsDebug("=== JWT / Auth diagnostics (end) ===");
  return { ok: true, summary };
}

if (typeof window !== "undefined") {
  window.__miyLogAnalyticsJwt = logAnalyticsJwtDiagnostics;
}

const COLLECTION = "analyticsEvents";
const LS_VISITOR_KEY = "miy_analytics_visitor_v1";
const SS_SESSION_KEY = "miy_analytics_session_v1";
const SS_GEO_KEY = "miy_analytics_geo_v1";
const SS_EVENT_COUNT_KEY = "miy_analytics_event_count_v1";
const SS_STARTED_KEY = "miy_analytics_started_v1";
const SS_PAGES_KEY = "miy_analytics_pages_v1";
/** Límite bajo para no saturar Firestore ni la web del visitante. */
const MAX_EVENTS_PER_SESSION = 22;
const CLICK_DEBOUNCE_MS = 1200;
const ADMIN_FETCH_LIMIT = 500;

const EVENT_TYPES = new Set([
  "session_start",
  "page_view",
  "click",
  "language",
  "booking_open",
]);

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getAnalyticsVisitorId() {
  try {
    let id = window.localStorage.getItem(LS_VISITOR_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(LS_VISITOR_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export function getAnalyticsSessionId() {
  try {
    let id = window.sessionStorage.getItem(SS_SESSION_KEY);
    if (!id) {
      id = randomId();
      window.sessionStorage.setItem(SS_SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

function bumpSessionEventCount() {
  try {
    const n = parseInt(window.sessionStorage.getItem(SS_EVENT_COUNT_KEY) || "0", 10) || 0;
    if (n >= MAX_EVENTS_PER_SESSION) return false;
    window.sessionStorage.setItem(SS_EVENT_COUNT_KEY, String(n + 1));
    return true;
  } catch {
    return true;
  }
}

function shouldTrackPageView(path) {
  try {
    const seen = safeJsonParse(window.sessionStorage.getItem(SS_PAGES_KEY)) || [];
    if (seen.includes(path)) return false;
    const next = [...seen, path].slice(-8);
    window.sessionStorage.setItem(SS_PAGES_KEY, JSON.stringify(next));
    return true;
  } catch {
    return true;
  }
}

function sessionAlreadyStarted() {
  try {
    return window.sessionStorage.getItem(SS_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionStarted() {
  try {
    window.sessionStorage.setItem(SS_STARTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function parseUtm(search) {
  const p = new URLSearchParams(search || "");
  return {
    utmSource: (p.get("utm_source") || "").slice(0, 80),
    utmMedium: (p.get("utm_medium") || "").slice(0, 80),
    utmCampaign: (p.get("utm_campaign") || "").slice(0, 120),
  };
}

export function parseDeviceInfo() {
  if (typeof navigator === "undefined") return {};
  const ua = navigator.userAgent || "";
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  let deviceType = "desktop";
  if (w > 0 && w < 768) deviceType = "mobile";
  else if (w > 0 && w < 1024) deviceType = "tablet";

  let os = "unknown";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return {
    deviceType,
    os,
    browser,
    language: (navigator.language || "").slice(0, 16),
  };
}

export async function resolveVisitorGeo() {
  try {
    const cached = safeJsonParse(window.sessionStorage.getItem(SS_GEO_KEY));
    if (cached && typeof cached === "object" && cached.country) return cached;
  } catch {
    /* ignore */
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return {};
    const j = await res.json();
    if (!j?.success) return {};
    const geo = {
      country: String(j.country || "").slice(0, 80),
      countryCode: String(j.country_code || "").slice(0, 8),
      city: String(j.city || "").slice(0, 80),
      region: String(j.region || "").slice(0, 80),
    };
    try {
      window.sessionStorage.setItem(SS_GEO_KEY, JSON.stringify(geo));
    } catch {
      /* ignore */
    }
    return geo;
  } catch {
    return {};
  }
}

let geoPromise = null;
let sessionMetaCache = null;

async function getSessionMeta() {
  if (sessionMetaCache) return sessionMetaCache;
  const geo = await (geoPromise || (geoPromise = resolveVisitorGeo()));
  sessionMetaCache = {
    ...parseDeviceInfo(),
    ...parseUtm(typeof window !== "undefined" ? window.location.search : ""),
    ...geo,
    referrer: typeof document !== "undefined" ? String(document.referrer || "").slice(0, 300) : "",
  };
  return sessionMetaCache;
}

let clickLastKey = "";
let clickLastAt = 0;
let writeQueue = Promise.resolve();

function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(() => {});
  return writeQueue;
}

async function writeEvent(payload) {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  if (!db) return;
  try {
    await addDoc(collection(db, COLLECTION), payload);
  } catch (e) {
    console.warn("[MIY] analytics:", e?.message || e);
  }
}

function baseIds(path) {
  return {
    sessionId: getAnalyticsSessionId(),
    visitorId: getAnalyticsVisitorId(),
    path: path.slice(0, 200),
    createdAt: serverTimestamp(),
  };
}

/**
 * Registro ligero: pocos eventos por sesión, geo/dispositivo solo al inicio.
 */
export async function trackSiteEvent(type, extra = {}) {
  if (typeof window === "undefined") return;
  if (!EVENT_TYPES.has(type)) return;
  if (!bumpSessionEventCount()) return;

  const path =
    typeof extra.path === "string"
      ? extra.path.slice(0, 200)
      : `${window.location.pathname || "/"}${window.location.search || ""}`.slice(0, 200);

  if (type === "page_view" && !shouldTrackPageView(path)) return;

  if (type === "click") {
    const key = `${extra.label || ""}|${extra.target || ""}`;
    const now = Date.now();
    if (key === clickLastKey && now - clickLastAt < CLICK_DEBOUNCE_MS) return;
    clickLastKey = key;
    clickLastAt = now;
  }

  const lang = typeof extra.lang === "string" ? extra.lang.slice(0, 8) : "";

  await enqueueWrite(async () => {
    if (!sessionAlreadyStarted()) {
      markSessionStarted();
      const meta = await getSessionMeta();
      await writeEvent({
        type: "session_start",
        ...baseIds(path),
        ...meta,
        lang,
      });
    }

    if (type === "session_start") return;

    const slim = {
      type,
      ...baseIds(path),
      lang,
    };
    if (typeof extra.label === "string" && extra.label) slim.label = extra.label.slice(0, 200);
    if (typeof extra.target === "string" && extra.target) slim.target = extra.target.slice(0, 300);
    if (typeof extra.section === "string" && extra.section) slim.section = extra.section.slice(0, 80);

    await writeEvent(slim);
  });
}

function mapAnalyticsSnapshot(snap) {
  const rows = snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt;
    return {
      id: d.id,
      ...data,
      createdAtMs: ts?.toDate ? ts.toDate().getTime() : typeof ts === "number" ? ts : 0,
    };
  });
  rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return rows;
}

/**
 * Evalúa claims del JWT (no bloquea la suscripción; las reglas de Firestore deciden).
 * @returns {{ role: string, adminClaim: boolean, hasOwner: boolean, claims: object }}
 */
function readAnalyticsClaimsFromToken(claims) {
  const c = claims && typeof claims === "object" ? claims : {};
  const roleRaw = c.role;
  const role =
    typeof roleRaw === "string" ? roleRaw.trim() : roleRaw != null ? String(roleRaw).trim() : "";
  const adminClaim = c.admin === true || c.admin === "true";
  const hasOwner = role === "owner";
  const hasBookings = role === "bookings";
  return { role, adminClaim, hasOwner, hasBookings, claims: c };
}

/**
 * Asegura sesión Firebase activa y refresca el JWT antes de leer analyticsEvents.
 * No lanza por claims ausentes (solo registra); permission-denied viene de Firestore/rules.
 * @param {import("firebase/auth").User | null | undefined} authUser
 */
export async function ensureAnalyticsReaderAuth(authUser) {
  const auth = getFirebaseAuth();
  if (!auth) {
    analyticsDebug("ensureAnalyticsReaderAuth: getFirebaseAuth() null");
    const err = new Error("Conecta Firebase (email/contraseña del admin) antes de abrir Estadísticas.");
    err.code = "analytics/not-authenticated";
    throw err;
  }

  const ready = auth.authStateReady?.();
  if (ready && typeof ready.then === "function") await ready;

  const paramUid = authUser?.uid ?? null;
  const current = auth.currentUser;
  if (!current) {
    analyticsDebug("ensureAnalyticsReaderAuth: currentUser null after authStateReady", { paramUid });
    const err = new Error("Sesión Firebase no lista. Vuelve a pulsar «Conectar Firebase».");
    err.code = "analytics/auth-not-ready";
    throw err;
  }

  if (paramUid && paramUid !== current.uid) {
    analyticsDebug("WARN: React firebaseAuthUser.uid !== auth.currentUser.uid", {
      paramUid,
      currentUid: current.uid,
    });
  }

  analyticsDebug("ensureAnalyticsReaderAuth: refreshing ID token…", {
    uid: current.uid,
    email: current.email,
  });

  await current.getIdToken(true);
  const tokenResult = await current.getIdTokenResult();
  const { role, adminClaim, hasOwner, hasBookings, claims } = readAnalyticsClaimsFromToken(
    tokenResult?.claims,
  );

  let jwtRole = "";
  try {
    const jwtPayload = decodeJwtPayload(await current.getIdToken());
    jwtRole =
      typeof jwtPayload?.role === "string"
        ? jwtPayload.role
        : jwtPayload?.role != null
          ? String(jwtPayload.role)
          : "";
  } catch (e) {
    analyticsDebug("ensureAnalyticsReaderAuth: JWT decode error", e?.message || e);
  }

  analyticsDebug("ensureAnalyticsReaderAuth: token claims", {
    roleFromClaims: role || null,
    roleFromJwtPayload: jwtRole || null,
    adminClaim,
    hasOwner: hasOwner || jwtRole === "owner",
    hasBookings: hasBookings || jwtRole === "bookings",
    expirationTime: tokenResult.expirationTime,
    authProjectId: auth.app?.options?.projectId ?? null,
    firestoreProjectId: getFirestoreDb()?.app?.options?.projectId ?? null,
  });

  if (role && role !== "owner" && role !== "bookings" && !adminClaim) {
    console.warn(
      `[MIY][analytics-debug] claim role="${role}" no es owner/bookings; Firestore puede denegar si las reglas exigen analyticsStaffReader.`,
    );
  }
  if (!role && !jwtRole && !adminClaim) {
    console.warn(
      "[MIY][analytics-debug] JWT sin claim role ni admin. Ejecuta npm run firebase:set-owner-claim, logout y login. " +
        "Si signIn da 403/400, el token nunca se actualiza (revisa API key / dominio autorizado).",
    );
  }

  return current;
}

/** Solo cuando la pestaña Estadísticas está abierta (evita lecturas constantes). */
export function subscribeAnalyticsEvents(onData, onError, max = ADMIN_FETCH_LIMIT, authUser) {
  const db = getFirestoreDb();
  if (!db) {
    analyticsDebug("subscribeAnalyticsEvents: no Firestore db");
    onData([]);
    return () => {};
  }

  let cancelled = false;
  let unsub = () => {};

  const attachListener = (withOrderBy) => {
    const col = collection(db, COLLECTION);
    const q = withOrderBy
      ? query(col, orderBy("createdAt", "desc"), limit(max))
      : query(col, limit(max));
    analyticsDebug("attachListener onSnapshot", {
      withOrderBy,
      limit: max,
      collection: COLLECTION,
      authUid: getFirebaseAuth()?.currentUser?.uid ?? null,
    });
    return onSnapshot(
      q,
      (snap) => {
        analyticsDebug("onSnapshot OK", { docs: snap.size, withOrderBy });
        onData(mapAnalyticsSnapshot(snap));
      },
      (err) => {
        const code = typeof err?.code === "string" ? err.code : "";
        const auth = getFirebaseAuth();
        console.warn("[MIY] analytics subscribe:", code || err?.message || err);
        analyticsDebug("onSnapshot ERROR", {
          code,
          message: err?.message || String(err),
          withOrderBy,
          authUid: auth?.currentUser?.uid ?? null,
          authEmail: auth?.currentUser?.email ?? null,
          hint:
            code === "permission-denied"
              ? "Firestore rules o JWT sin claim role:owner. En consola: await window.__miyLogAnalyticsJwt()"
              : null,
        });
        if (code === "failed-precondition" && withOrderBy && !cancelled) {
          analyticsDebug("reintentando sin orderBy (índice pendiente)");
          unsub();
          unsub = attachListener(false);
          return;
        }
        if (onError) {
          if (code === "permission-denied") {
            void logAnalyticsJwtDiagnostics(authUser);
            const hint = new Error(
              "Sin permiso en analyticsEvents. Abre consola y ejecuta: await window.__miyLogAnalyticsJwt() " +
                "para ver si el JWT incluye role:owner.",
            );
            hint.code = code;
            onError(hint);
          } else {
            onError(err);
          }
        }
        onData([]);
      },
    );
  };

  void (async () => {
    analyticsDebug("subscribeAnalyticsEvents: start", {
      paramUid: authUser?.uid ?? null,
      max,
    });
    try {
      const user = await ensureAnalyticsReaderAuth(authUser);
      if (cancelled) return;
      if (analyticsDebugEnabled()) {
        await logAnalyticsJwtDiagnostics(user);
      }
      unsub = attachListener(true);
    } catch (e) {
      console.warn("[MIY] analytics auth:", e?.message || e);
      analyticsDebug("subscribeAnalyticsEvents: auth step failed", {
        code: e?.code,
        message: e?.message || String(e),
      });
      if (onError) onError(e);
      onData([]);
    }
  })();

  return () => {
    cancelled = true;
    unsub();
  };
}

function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeAnalyticsSummary(events, rangeDays = 30) {
  const now = Date.now();
  const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;
  const inRange = (Array.isArray(events) ? events : []).filter((e) => (e.createdAtMs || 0) >= cutoff);

  const visitors = new Set();
  const sessions = new Set();
  let pageViews = 0;
  let clicks = 0;
  const byDay = {};
  const byCountry = {};
  const byPage = {};
  const byClick = {};
  const sessionMap = new Map();

  for (const e of inRange) {
    if (e.visitorId) visitors.add(e.visitorId);
    if (e.sessionId) sessions.add(e.sessionId);
    const dk = dayKey(e.createdAtMs || now);
    byDay[dk] = byDay[dk] || { views: 0, visitors: new Set() };
    if (e.visitorId) byDay[dk].visitors.add(e.visitorId);

    if (e.type === "page_view" || e.type === "session_start") {
      pageViews += 1;
      byDay[dk].views += 1;
      const p = e.path || "/";
      byPage[p] = (byPage[p] || 0) + 1;
    }
    if (e.type === "click") {
      clicks += 1;
      const lbl = e.label || e.target || "(sin etiqueta)";
      byClick[lbl] = (byClick[lbl] || 0) + 1;
    }

    if (e.type === "session_start" && e.country) {
      byCountry[e.country] = (byCountry[e.country] || 0) + 1;
    }

    if (e.sessionId) {
      let s = sessionMap.get(e.sessionId);
      if (!s) {
        s = {
          sessionId: e.sessionId,
          country: e.country,
          city: e.city,
          deviceType: e.deviceType,
          browser: e.browser,
          firstAt: e.createdAtMs,
          lastAt: e.createdAtMs,
          pageViews: 0,
          clicks: 0,
        };
        sessionMap.set(e.sessionId, s);
      }
      s.lastAt = Math.max(s.lastAt, e.createdAtMs || 0);
      s.firstAt = Math.min(s.firstAt, e.createdAtMs || s.firstAt);
      if (e.type === "page_view" || e.type === "session_start") s.pageViews += 1;
      if (e.type === "click") s.clicks += 1;
      if (e.country && !s.country) s.country = e.country;
      if (e.city && !s.city) s.city = e.city;
      if (e.deviceType && !s.deviceType) s.deviceType = e.deviceType;
      if (e.browser && !s.browser) s.browser = e.browser;
    }
  }

  const dailySeries = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      views: v.views,
      visitors: v.visitors.size,
    }));

  const top = (obj, n = 5) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));

  const sessionRows = Array.from(sessionMap.values())
    .map((s) => ({
      ...s,
      durationMin: Math.max(0, Math.round((s.lastAt - s.firstAt) / 60000)),
    }))
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 12);

  return {
    rangeDays,
    uniqueVisitors: visitors.size,
    uniqueSessions: sessions.size,
    pageViews,
    clicks,
    dailySeries,
    topCountries: top(byCountry),
    topPages: top(byPage),
    topClicks: top(byClick),
    recentSessions: sessionRows,
  };
}

export function formatAnalyticsTime(ms) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
