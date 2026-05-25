/** Locale URL prefixes for international SEO (Google hreflang). */
export const SEO_LOCALES = ["es", "en", "de", "fr", "sv"];

const LOCALE_CODES = new Set(["en", "de", "fr", "sv"]);

/** Base paths that must never get a locale prefix (admin, payments, etc.). */
const NON_LOCALIZED_PREFIXES = ["/admin", "/dejar-resena", "/success", "/booking"];

export function isNonLocalizedPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  return NON_LOCALIZED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * Split pathname into locale + path without prefix (e.g. /en/barcos-alquiler → en, /barcos-alquiler).
 */
export function parseLocalePath(pathname) {
  const raw = pathname.replace(/\/$/, "") || "/";
  if (isNonLocalizedPath(raw)) {
    return { lang: "es", basePath: raw };
  }
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { lang: "es", basePath: "/" };
  }
  if (LOCALE_CODES.has(parts[0])) {
    const lang = parts[0];
    const rest = parts.slice(1);
    return { lang, basePath: rest.length ? `/${rest.join("/")}` : "/" };
  }
  return { lang: "es", basePath: raw };
}

/** Public URL for a base path and locale (Spanish = no prefix). */
export function buildLocalizedPath(basePath, lang) {
  const base = basePath.replace(/\/$/, "") || "/";
  if (isNonLocalizedPath(base)) return base;
  if (!lang || lang === "es") return base === "/" ? "/" : base;
  if (!LOCALE_CODES.has(lang)) return base;
  if (base === "/") return `/${lang}`;
  return `/${lang}${base}`;
}

export function localizeHref(href, lang) {
  const h = String(href || "").trim();
  if (!h || h.startsWith("http") || h.startsWith("#") || h.startsWith("mailto:")) return h;
  const pathOnly = h.split("?")[0].split("#")[0];
  const { basePath } = parseLocalePath(pathOnly);
  return buildLocalizedPath(basePath, lang);
}

/** Homepage + key landings — static prerender snippets per locale. */
export const SEO_PRERENDER_BY_LANG = {
  "/": {
    es: {
      h1: "Alquiler de Barcos en Palma de Mallorca",
      lead:
        "Yacht charter y chárter privado con yates, veleros y embarcaciones desde El Molinar, Palma.",
      sections: [
        { h2: "Barcos en Palma", p: "Alquiler de barco y yacht charter con patrón profesional." },
        { h2: "Chárter Privado", p: "Condiciones claras, seguro e IVA incluidos." },
      ],
    },
    en: {
      h1: "Yacht Charter in Palma, Mallorca",
      lead: "Private boat hire and yacht charter with professional skipper from El Molinar, Palma.",
      sections: [
        { h2: "Boats in Palma", p: "Boat hire and day charter on the Mediterranean." },
        { h2: "Private Charter", p: "Clear terms, insurance and VAT included." },
      ],
    },
    de: {
      h1: "Boot mieten & Yachtcharter in Palma, Mallorca",
      lead: "Privater Bootscharter ab El Molinar, Palma — mit professionellem Skipper.",
      sections: [
        { h2: "Boote in Palma", p: "Boot mieten und Tagescharter auf Mallorca." },
        { h2: "Privater Charter", p: "Transparente Bedingungen, Versicherung inklusive." },
      ],
    },
    fr: {
      h1: "Location de bateau à Palma de Majorque",
      lead: "Charter privé et location yacht au départ d’El Molinar, Palma — avec skipper.",
      sections: [
        { h2: "Bateaux à Palma", p: "Location bateau et charter journée en Méditerranée." },
        { h2: "Charter privé", p: "Conditions claires, assurance et TVA incluses." },
      ],
    },
    sv: {
      h1: "Båtcharter i Palma, Mallorca",
      lead: "Privat båthyra och yachtcharter med skeppare från El Molinar, Palma.",
      sections: [
        { h2: "Båtar i Palma", p: "Båthyra och dagcharter på Medelhavet." },
        { h2: "Privat charter", p: "Tydliga villkor, försäkring ingår." },
      ],
    },
  },
};

export function getPrerenderBlock(basePath, lang) {
  const key = basePath.replace(/\/$/, "") || "/";
  return SEO_PRERENDER_BY_LANG[key]?.[lang] || SEO_PRERENDER_BY_LANG[key]?.es || null;
}
