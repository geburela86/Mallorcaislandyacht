import { preferWebpUrl } from "./prefer-webp-url.js";

export const LS_LANG_KEY = "mallorca_yacht_lang";

const EMPTY_DESC_OBJ = { en: "", es: "", de: "", fr: "", sv: "" };

/** Canonical English fleet blurb (legacy single-language data often stores only this). */
const KNOWN_DEFAULT_BOAT_DESC_EN =
  "6 guests + skipper, Twin MerCruiser engines, 270 HP, Premium day cruiser, Elegant Italian design, Spacious sun deck, Comfortable cockpit, Swim platform, Smooth navigation, Exclusive Mediterranean experience";

const KNOWN_DEFAULT_BOAT_DESC_BY_LANG = {
  en: KNOWN_DEFAULT_BOAT_DESC_EN,
  es: "6 personas + patrón, Motores gemelos MerCruiser, 270 CV, Crucero diario premium, Elegante diseño italiano, Amplia cubierta de sol, Bañera confortable, Plataforma de baño, Navegación suave, Experiencia exclusiva en el Mediterráneo",
  de: "6 Gäste + Skipper, Doppel-MerCruiser-Motoren, 270 PS, Premium-Tageskreuzer, Elegantes italienisches Design, Geräumiges Sonnendeck, Komfortabler Cockpit-Bereich, Badeplattform, Sanfte Navigation, Exklusives Mittelmeer-Erlebnis",
  fr: "6 passagers + skipper, Moteurs jumeaux MerCruiser, 270 CV, Croiseur de jour premium, Design italien élégant, Grand pont soleil, Cockpit confortable, Plateforme de baignade, Navigation fluide, Expérience exclusive en Méditerranée",
  sv: "6 gäster + skeppare, Dubbla MerCruiser-motorer, 270 hk, Premium dagkryssare, Elegant italiensk design, Rymligt soldäck, Bekväm cockpit, Badplattform, Mjuk navigation, Exklusiv Medelhavsupplevelse",
};

const DESC_LANG_FALLBACK_ORDER = ["en", "es", "de", "fr", "sv"];
const SPECS_LANG_KEYS = ["en", "es", "de", "fr", "sv"];
const SPECS_LANG_FALLBACK_ORDER = SPECS_LANG_KEYS;

const EMPTY_SPECS_OBJ = () =>
  Object.fromEntries(SPECS_LANG_KEYS.map((k) => [k, []]));

function cleanSpecsArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s ?? "").trim()).filter(Boolean);
}

/** Parse comma-separated feature chips from admin text fields. */
export function parseCommaSeparatedSpecs(text) {
  return String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize `boat.specs` to `{ en:[], es:[], ... }` for the client.
 * Legacy `specs` as `string[]` is copied to every language until edited per locale.
 */
export function normalizeSpecsI18nObject(boat) {
  const out = EMPTY_SPECS_OBJ();
  const raw = boat?.specs;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of SPECS_LANG_KEYS) {
      out[k] = cleanSpecsArray(raw[k]);
    }
    return out;
  }
  if (Array.isArray(raw)) {
    const items = cleanSpecsArray(raw);
    for (const k of SPECS_LANG_KEYS) out[k] = [...items];
    return out;
  }
  return out;
}

function pickSpecsArrayFromObject(specsObj, lang) {
  if (!specsObj || typeof specsObj !== "object" || Array.isArray(specsObj)) return [];
  const primary = cleanSpecsArray(specsObj[lang]);
  if (primary.length) return primary;
  const tried = new Set([lang]);
  for (const k of SPECS_LANG_FALLBACK_ORDER) {
    if (tried.has(k)) continue;
    tried.add(k);
    const v = cleanSpecsArray(specsObj[k]);
    if (v.length) return v;
  }
  return [];
}

/**
 * Feature chips for the current UI language, with cross-language fallback (same rules as descriptions).
 */
export function getBoatSpecs(boat, lang = "es") {
  if (!boat) return [];
  const obj = boat?.specs;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return pickSpecsArrayFromObject(obj, lang);
  }
  if (Array.isArray(obj)) return cleanSpecsArray(obj);
  return [];
}

function normalizeDescText(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function isKnownDefaultBoatBlurb(text) {
  return normalizeDescText(text) === normalizeDescText(KNOWN_DEFAULT_BOAT_DESC_EN);
}

/** Same marketing copy saved with small edits (spacing, “HP”/“hp”, etc.) still maps to translations. */
function isLikelyDefaultMarketingBlurb(text) {
  if (isKnownDefaultBoatBlurb(text)) return true;
  const n = normalizeDescText(text).toLowerCase();
  if (n.length < 72) return false;
  const needles = [
    "6 guests",
    "mercruiser",
    "270",
    "premium day cruiser",
    "italian design",
    "mediterranean experience",
  ];
  return needles.every((x) => n.includes(x));
}

function localizedKnownDefaultBoatBlurb(lang) {
  const k = typeof lang === "string" && KNOWN_DEFAULT_BOAT_DESC_BY_LANG[lang] ? lang : "en";
  return KNOWN_DEFAULT_BOAT_DESC_BY_LANG[k] || KNOWN_DEFAULT_BOAT_DESC_BY_LANG.en;
}

function maybeTranslateKnownBlurb(raw, lang) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (isLikelyDefaultMarketingBlurb(t)) return localizedKnownDefaultBoatBlurb(lang);
  return t;
}

function pickFromDescObject(descObj, lang) {
  if (!descObj || typeof descObj !== "object") return "";
  const primary = String(descObj[lang] ?? "").trim();
  if (primary) return primary;
  const tried = new Set([lang]);
  for (const k of DESC_LANG_FALLBACK_ORDER) {
    if (tried.has(k)) continue;
    tried.add(k);
    const v = String(descObj[k] ?? "").trim();
    if (v) return v;
  }
  for (const v of Object.values(descObj)) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/**
 * Public copy for a vessel, honoring `lang` and legacy shapes (`desc_*`, string `desc`, `description`).
 * Falls back across languages when a locale is empty, and maps the default English marketing blurb to all UI languages.
 */
export function getBoatDescription(boat, lang = "es") {
  if (!boat) return "";

  // Prefer nested `desc` map (post–normalizeBoatsForClient and admin saves). Root `desc_es` / `desc_en`
  // legacy fields often duplicate English under the wrong key and must not override this map.
  const descObj =
    boat.desc && typeof boat.desc === "object" && !Array.isArray(boat.desc) ? boat.desc : null;
  if (descObj) {
    const fromObj = pickFromDescObject(descObj, lang);
    if (fromObj) return maybeTranslateKnownBlurb(fromObj, lang);
  }

  const tryLegacyKeys = [lang, ...DESC_LANG_FALLBACK_ORDER.filter((k) => k !== lang)];
  const legacyTried = new Set();
  for (const k of tryLegacyKeys) {
    const key = `desc_${k}`;
    if (legacyTried.has(key)) continue;
    legacyTried.add(key);
    const v = boat[key];
    if (typeof v === "string" && v.trim()) {
      return maybeTranslateKnownBlurb(v, lang);
    }
  }

  if (typeof boat.desc === "string" && boat.desc.trim()) {
    return maybeTranslateKnownBlurb(boat.desc, lang);
  }

  if (typeof boat.description === "string" && boat.description.trim()) {
    return maybeTranslateKnownBlurb(boat.description, lang);
  }

  return "";
}

export function normalizeBoatDesc(boat) {
  if (!boat) return { ...EMPTY_DESC_OBJ };
  return {
    en: getBoatDescription(boat, "en"),
    es: getBoatDescription(boat, "es"),
    de: getBoatDescription(boat, "de"),
    fr: getBoatDescription(boat, "fr"),
    sv: getBoatDescription(boat, "sv"),
  };
}

function normalizeBoatImageUrls(boat) {
  if (!boat || typeof boat !== "object") return boat;
  const next = { ...boat };
  if (Array.isArray(boat.imgs)) {
    next.imgs = boat.imgs.map((u) => preferWebpUrl(u)).filter(Boolean);
  }
  if (typeof boat.img === "string" && boat.img.trim()) {
    next.img = preferWebpUrl(boat.img);
  }
  return next;
}

export function normalizeBoatForClient(boat) {
  const b = normalizeBoatImageUrls(boat);
  return { ...b, desc: normalizeBoatDesc(b), specs: normalizeSpecsI18nObject(b) };
}

export function normalizeBoatsForClient(boatsArray) {
  return (Array.isArray(boatsArray) ? boatsArray : []).map((boat) => normalizeBoatForClient(boat));
}
