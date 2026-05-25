import {
  SEO_BLOG_PATH_META,
  SEO_BLOG_PRERENDER_ES,
  SEO_BLOG_SITEMAP,
  buildBlogArticleJsonLd,
  isBlogPath,
} from "./seo-blog.js";
import {
  SEO_LOCALES,
  buildLocalizedPath,
  isNonLocalizedPath,
  parseLocalePath,
} from "./seo-locales.js";

export { SEO_LOCALES, buildLocalizedPath, parseLocalePath, localizeHref } from "./seo-locales.js";

/** Per-language SEO copy — market-adapted, not literal translation. */
export const SITE_ORIGIN = "https://mallorcaislandyacht.com";

export { SEO_BLOG_PRERENDER_ES, SEO_BLOG_PATH_META, SEO_BLOG_SITEMAP };
export const SEO_OG_IMAGE = `${SITE_ORIGIN}/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp`;

export const SEO_LANG_META = {
  es: {
    title: "Alquiler de Barco en Mallorca | Yacht Charter Palma",
    description:
      "Alquiler de barco en Mallorca y Palma: yates, veleros y charter privado con patrón. Reserva flexible, seguro y multiidioma.",
    keywords:
      "alquiler barco mallorca, alquiler de barco Palma, yacht charter Mallorca, chárter privado, alquiler yate Palma",
  },
  en: {
    title: "Yacht Charter Mallorca | Private Boat Hire in Palma",
    description:
      "Charter yachts, sailboats and motorboats from Palma. Flexible bookings, skipper included, multilingual service.",
    keywords:
      "yacht charter Mallorca, boat hire Palma, private charter Mallorca, sailboat rental Palma",
  },
  de: {
    title: "Bootscharter Mallorca | Yacht mieten in Palma",
    description:
      "Privater Yacht- und Bootscharter ab Palma. Flexible Buchung, Skipper inklusive, mehrsprachiger Service.",
    keywords:
      "Boot mieten Mallorca, Yachtcharter Palma, Bootscharter Mallorca, Yacht mieten Palma",
  },
  fr: {
    title: "Location yacht Palma | Charter privé à Majorque",
    description:
      "Louez yachts, voiliers et bateaux privés au départ de Palma. Réservation flexible, skipper inclus, service multilingue.",
    keywords:
      "location bateau Palma, charter yacht Majorque, location yacht Palma, charter privé Mallorca",
  },
  sv: {
    title: "Båtcharter Mallorca | Privat båthyra i Palma",
    description:
      "Hyr yachter, segelbåtar och motorbåtar från Palma. Flexibel bokning, skeppare ingår, flerspråkig service.",
    keywords:
      "båtcharter Mallorca, båthyra Palma, privat charter Mallorca, yachtuthyrning Palma",
  },
};

/** Friendly URL overrides — same SPA, path-specific title/description for crawlers. */
export const SEO_PATH_META = {
  "/barcos-alquiler": {
    es: {
      title: "Alquiler de Barcos en Palma | Flota y precios",
      description:
        "Veleros, yates y barcos para alquilar en Palma de Mallorca. Consulta disponibilidad y reserva tu charter privado.",
    },
    en: {
      title: "Boat Rental Palma | Fleet & charter rates",
      description:
        "Sailboats, yachts and private boats for hire in Palma. Check availability and book your Mallorca charter.",
    },
    de: {
      title: "Boot mieten Palma | Flotte & Charterpreise",
      description:
        "Yachten und Boote zum Mieten in Palma de Mallorca. Verfügbarkeit prüfen und privaten Charter buchen.",
    },
    fr: {
      title: "Location bateau Palma | Flotte et tarifs",
      description:
        "Voiliers, yachts et bateaux privés à Palma. Vérifiez les disponibilités et réservez votre charter.",
    },
  },
  "/charter-palma": {
    es: {
      title: "Chárter Privado en Palma de Mallorca",
      description:
        "Charter náutico privado con patrón profesional. Salida El Molinar, Palma. Reserva segura y condiciones claras.",
    },
    en: {
      title: "Private Yacht Charter Palma de Mallorca",
      description:
        "Private boat charter with professional skipper. Departure El Molinar, Palma. Secure booking and clear terms.",
    },
    de: {
      title: "Privater Bootscharter Palma de Mallorca",
      description:
        "Privater Yachtcharter mit professionellem Skipper. Abfahrt El Molinar, Palma. Sichere Buchung.",
    },
    fr: {
      title: "Charter privé Palma de Majorque",
      description:
        "Charter nautique privé avec skipper professionnel. Départ El Molinar, Palma. Réservation sécurisée.",
    },
  },
  "/alquiler-barco-mallorca": {
    es: {
      title: "Alquiler de Barco en Mallorca | Charter con patrón",
      description:
        "Alquila barco en Mallorca con salida en Palma. Yates y veleros con patrón profesional, seguro e IVA incluidos. Reserva online.",
    },
    en: {
      title: "Boat Hire Mallorca | Skippered charter from Palma",
      description:
        "Hire a boat in Mallorca with departure from Palma. Yachts and sailboats with professional skipper, insurance and VAT included.",
    },
    de: {
      title: "Boot mieten Mallorca | Charter mit Skipper ab Palma",
      description:
        "Boot mieten auf Mallorca mit Abfahrt in Palma. Yachten mit Skipper, Versicherung und MwSt. inklusive. Online buchen.",
    },
    fr: {
      title: "Location bateau Majorque | Charter avec skipper",
      description:
        "Louez un bateau à Majorque au départ de Palma. Yachts avec skipper, assurance et TVA incluses. Réservation en ligne.",
    },
  },
  "/tarifas": {
    es: {
      title: "Tarifas de Charter en Palma | Precios por temporada",
      description:
        "Precios de alquiler de barco y yacht charter en Palma. Medio día, día completo y atardecer. IVA y patrón incluidos.",
    },
    en: {
      title: "Charter Rates Palma | Seasonal boat hire prices",
      description:
        "Yacht charter and boat hire rates in Palma. Half-day, full-day and sunset slots. VAT and skipper included.",
    },
    de: {
      title: "Charterpreise Palma | Bootscharter-Tarife",
      description:
        "Yachtcharter- und Bootscharter-Preise in Palma. Halbtag, Ganztag und Sonnenuntergang. MwSt. und Skipper inklusive.",
    },
    fr: {
      title: "Tarifs charter Palma | Prix location bateau",
      description:
        "Tarifs de location yacht et bateau à Palma. Demi-journée, journée complète et coucher de soleil. Skipper inclus.",
    },
  },
};

const DEFAULT_CONTACT = {
  email: "info@mallorcaislandyacht.com",
  telephone: "",
  streetAddress: "Carrer del Vicari Joaquim Fuster, 2",
  postalCode: "07006",
  locality: "Palma de Mallorca",
  region: "Illes Balears",
  country: "ES",
};

export function resolveSeoMeta(lang, pathname = "/") {
  const base = SEO_LANG_META[lang] || SEO_LANG_META.es;
  const { basePath } = parseLocalePath(pathname);
  const pathKey = basePath.replace(/\/$/, "") || "/";
  const blogSlice = SEO_BLOG_PATH_META[pathKey]?.[lang] || SEO_BLOG_PATH_META[pathKey]?.es;
  const pathSlice = SEO_PATH_META[pathKey]?.[lang] || SEO_PATH_META[pathKey]?.es;
  const slice = blogSlice || pathSlice;
  const canonicalPath = buildLocalizedPath(pathKey, lang);
  return {
    title: slice?.title || base.title,
    description: slice?.description || base.description,
    keywords: base.keywords,
    canonical: `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`,
    basePath: pathKey,
  };
}

function injectHreflang(basePath) {
  if (typeof document === "undefined" || isNonLocalizedPath(buildLocalizedPath(basePath, "es"))) return;
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  for (const locale of SEO_LOCALES) {
    const href = `${SITE_ORIGIN}${buildLocalizedPath(basePath, locale)}`;
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = locale;
    link.href = href;
    document.head.appendChild(link);
  }
  const xDefault = document.createElement("link");
  xDefault.rel = "alternate";
  xDefault.hreflang = "x-default";
  xDefault.href = `${SITE_ORIGIN}${buildLocalizedPath(basePath, "es")}`;
  document.head.appendChild(xDefault);
}

function buildWebSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    url: SITE_ORIGIN,
    name: "Mallorca Island Yacht",
    inLanguage: ["es-ES", "en", "de", "fr", "sv"],
    publisher: { "@id": `${SITE_ORIGIN}/#localbusiness` },
  };
}

function upsertMeta(attr, key, content) {
  if (!content || typeof document === "undefined") return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href || typeof document === "undefined") return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Updates document title, description, Open Graph, Twitter and html lang. */
export function applySeoMeta(lang, pathname = "/") {
  if (typeof document === "undefined") return resolveSeoMeta(lang, pathname);
  const meta = resolveSeoMeta(lang, pathname);
  document.documentElement.lang = lang === "sv" ? "sv" : lang;
  document.title = meta.title;
  upsertMeta("name", "description", meta.description);
  upsertMeta("name", "keywords", meta.keywords);
  upsertMeta("property", "og:title", meta.title);
  upsertMeta("property", "og:description", meta.description);
  upsertMeta("property", "og:url", meta.canonical);
  upsertMeta("name", "twitter:title", meta.title);
  upsertMeta("name", "twitter:description", meta.description);
  upsertMeta("property", "og:image", SEO_OG_IMAGE);
  upsertMeta("property", "og:image:alt", "Yacht charter y alquiler de barco en Mallorca");
  upsertMeta("name", "twitter:image", SEO_OG_IMAGE);
  upsertLink("canonical", meta.canonical);
  injectHreflang(meta.basePath || "/");
  return meta;
}

/** FAQ copy used on-page and in FAQPage schema (per locale). */
export const SEO_FAQ = {
  es: [
    {
      q: "¿Dónde puedo alquilar un barco en Mallorca?",
      a: "Nuestra base está en El Molinar, Palma de Mallorca. El alquiler de barco incluye salida desde el puerto con patrón profesional; no necesitas licencia náutica para disfrutar del charter.",
    },
    {
      q: "¿Qué incluye el alquiler de barco en Mallorca?",
      a: "Incluye patrón profesional, seguro, IVA, limpieza final y nevera. El combustible, catering y bebidas no están incluidos salvo acuerdo previo.",
    },
    {
      q: "¿Cuánto cuesta alquilar un barco en Mallorca?",
      a: "El precio depende de la embarcación, la temporada y la duración (medio día, día completo o atardecer). Consulta tarifas orientativas en la web y reserva para ver el importe exacto de tu fecha.",
    },
    {
      q: "¿Puedo alquilar un barco por medio día en Palma?",
      a: "Sí. Ofrecemos turnos de mañana, tarde, día completo y atardecer. La disponibilidad se muestra al elegir fecha en el calendario de reservas.",
    },
    {
      q: "¿En qué idiomas puedo reservar el yacht charter?",
      a: "Puedes navegar y reservar en español, inglés, alemán, francés y sueco. El equipo te atiende por WhatsApp, email o Instagram.",
    },
  ],
  en: [
    {
      q: "Where can I hire a boat in Mallorca?",
      a: "We depart from El Molinar, Palma de Mallorca. Every charter includes a professional skipper, so you do not need a sailing licence.",
    },
    {
      q: "What is included in a Mallorca boat charter?",
      a: "Skipper, insurance, VAT, final cleaning and cooler are included. Fuel, catering and drinks are extra unless agreed in advance.",
    },
    {
      q: "How much does boat hire in Mallorca cost?",
      a: "Rates depend on the vessel, season and duration (half-day, full day or sunset). Check indicative prices online and book to see the exact total for your date.",
    },
    {
      q: "Can I book a half-day boat charter in Palma?",
      a: "Yes — morning, afternoon, full-day and sunset slots are available. Availability appears when you select your date.",
    },
    {
      q: "Which languages do you support?",
      a: "The website and support are available in Spanish, English, German, French and Swedish.",
    },
  ],
  de: [
    {
      q: "Wo kann ich auf Mallorca ein Boot mieten?",
      a: "Abfahrt in El Molinar, Palma de Mallorca. Jeder Charter beinhaltet einen professionellen Skipper — kein eigener Führerschein nötig.",
    },
    {
      q: "Was ist im Bootscharter auf Mallorca enthalten?",
      a: "Skipper, Versicherung, MwSt., Endreinigung und Kühlbox sind inklusive. Kraftstoff, Catering und Getränke sind extra, sofern nicht anders vereinbart.",
    },
    {
      q: "Was kostet Boot mieten auf Mallorca?",
      a: "Der Preis hängt von Schiff, Saison und Dauer ab. Orientierungspreise online — beim Buchen sehen Sie den genauen Betrag für Ihr Datum.",
    },
    {
      q: "Gibt es Halbtages-Charter in Palma?",
      a: "Ja: Vormittag, Nachmittag, Ganztag und Sonnenuntergang. Verfügbarkeit im Buchungskalender.",
    },
    {
      q: "In welchen Sprachen kann ich buchen?",
      a: "Website und Betreuung auf Spanisch, Englisch, Deutsch, Französisch und Schwedisch.",
    },
  ],
  fr: [
    {
      q: "Où louer un bateau à Majorque ?",
      a: "Départ depuis El Molinar, Palma. Chaque charter inclut un skipper professionnel — pas de permis requis.",
    },
    {
      q: "Que comprend la location de bateau à Majorque ?",
      a: "Skipper, assurance, TVA, nettoyage final et glacière inclus. Carburant, traiteur et boissons en supplément sauf accord préalable.",
    },
    {
      q: "Quel est le prix d’une location bateau à Majorque ?",
      a: "Le tarif dépend du bateau, de la saison et de la durée. Tarifs indicatifs en ligne ; le montant exact s’affiche à la réservation.",
    },
    {
      q: "Peut-on réserver une demi-journée à Palma ?",
      a: "Oui : matin, après-midi, journée complète et coucher de soleil. Disponibilité au choix de la date.",
    },
    {
      q: "Quelles langues sont disponibles ?",
      a: "Site et assistance en espagnol, anglais, allemand, français et suédois.",
    },
  ],
  sv: [
    {
      q: "Var kan jag hyra båt på Mallorca?",
      a: "Avgång från El Molinar, Palma. Varje charter inkluderar professionell skeppare — inget eget certifikat krävs.",
    },
    {
      q: "Vad ingår i båthyra på Mallorca?",
      a: "Skeppare, försäkring, moms, slutstädning och kylbox ingår. Bränsle, catering och drycker tillkommer om inget annat avtalats.",
    },
    {
      q: "Vad kostar det att hyra båt på Mallorca?",
      a: "Priset beror på fartyg, säsong och längd. Se riktpriser online och boka för exakt summa för ditt datum.",
    },
    {
      q: "Kan jag boka halvdags charter i Palma?",
      a: "Ja — förmiddag, eftermiddag, hel dag och solnedgång. Tillgänglighet visas när du väljer datum.",
    },
    {
      q: "Vilka språk erbjuder ni?",
      a: "Webbplats och support på spanska, engelska, tyska, franska och svenska.",
    },
  ],
};

const BREADCRUMB_LABELS = {
  es: {
    home: "Inicio",
    fleet: "Barcos",
    charter: "Chárter",
    rates: "Tarifas",
    hire: "Alquiler barco Mallorca",
    guideHire: "Guía alquiler barco",
    guideCost: "Precios alquiler",
    guideCoves: "Calas en barco",
    guideSummer: "Verano 2026",
  },
  en: {
    home: "Home",
    fleet: "Boats",
    charter: "Charter",
    rates: "Rates",
    hire: "Boat hire Mallorca",
    guideHire: "Boat hire guide",
    guideCost: "Charter prices",
    guideCoves: "Coves by boat",
    guideSummer: "Summer 2026",
  },
  de: {
    home: "Start",
    fleet: "Boote",
    charter: "Charter",
    rates: "Preise",
    hire: "Boot mieten Mallorca",
    guideHire: "Ratgeber",
    guideCost: "Preise",
    guideCoves: "Buchten",
    guideSummer: "Sommer 2026",
  },
  fr: {
    home: "Accueil",
    fleet: "Bateaux",
    charter: "Charter",
    rates: "Tarifs",
    hire: "Location Majorque",
    guideHire: "Guide location",
    guideCost: "Tarifs",
    guideCoves: "Criques",
    guideSummer: "Été 2026",
  },
  sv: {
    home: "Hem",
    fleet: "Båtar",
    charter: "Charter",
    rates: "Priser",
    hire: "Båthyra Mallorca",
    guideHire: "Guide",
    guideCost: "Priser",
    guideCoves: "Vikar",
    guideSummer: "Sommar 2026",
  },
};

const PATH_BREADCRUMB_KEY = {
  "/barcos-alquiler": "fleet",
  "/charter-palma": "charter",
  "/tarifas": "rates",
  "/alquiler-barco-mallorca": "hire",
  "/guia-alquiler-barco-mallorca": "guideHire",
  "/cuanto-cuesta-alquilar-barco-mallorca": "guideCost",
  "/mejores-calas-barco-palma": "guideCoves",
  "/alquiler-barco-mallorca-verano-2026": "guideSummer",
};

export function getFaqForLang(lang) {
  return SEO_FAQ[lang] || SEO_FAQ.es;
}

export function buildFaqPageJsonLd(lang) {
  const items = getFaqForLang(lang);
  return {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function buildServiceJsonLd(lang) {
  const labels = {
    es: "Alquiler de barco y yacht charter en Mallorca",
    en: "Boat hire and yacht charter in Mallorca",
    de: "Bootscharter und Yachtcharter auf Mallorca",
    fr: "Location de bateau et charter yacht à Majorque",
    sv: "Båthyra och yachtcharter på Mallorca",
  };
  return {
    "@type": "Service",
    "@id": `${SITE_ORIGIN}/#boat-charter-service`,
    name: labels[lang] || labels.es,
    serviceType: "Boat charter",
    provider: { "@id": `${SITE_ORIGIN}/#localbusiness` },
    areaServed: { "@type": "AdministrativeArea", name: "Mallorca, Balearic Islands" },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: SITE_ORIGIN,
      serviceLocation: { "@id": `${SITE_ORIGIN}/#localbusiness` },
    },
  };
}

export function buildBreadcrumbJsonLd(pathname, lang = "es") {
  const { basePath } = parseLocalePath(pathname);
  const pathKey = basePath.replace(/\/$/, "") || "/";
  if (pathKey === "/") return null;
  const labels = BREADCRUMB_LABELS[lang] || BREADCRUMB_LABELS.es;
  const crumbKey = PATH_BREADCRUMB_KEY[pathKey];
  if (!crumbKey) return null;
  const homeUrl = `${SITE_ORIGIN}${buildLocalizedPath("/", lang)}`;
  const pageUrl = `${SITE_ORIGIN}${buildLocalizedPath(pathKey, lang)}`;
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: labels.home,
        item: homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: labels[crumbKey],
        item: pageUrl,
      },
    ],
  };
}

/** Combined structured data graph for a page. */
export function buildSeoGraphJsonLd({ contact, reviewStats, lang = "es", pathname = "/" } = {}) {
  const { basePath } = parseLocalePath(pathname);
  const pathKey = basePath.replace(/\/$/, "") || "/";
  const graph = [
    buildWebSiteJsonLd(),
    buildLocalBusinessJsonLd({ contact, reviewStats }),
    buildServiceJsonLd(lang),
  ];
  if (!isBlogPath(pathKey)) {
    graph.push(buildFaqPageJsonLd(lang));
  }
  const articleLd = isBlogPath(pathKey) ? buildBlogArticleJsonLd(pathKey, lang) : null;
  if (articleLd) graph.push(articleLd);
  const crumbs = buildBreadcrumbJsonLd(pathname, lang);
  if (crumbs) graph.push(crumbs);
  return { "@context": "https://schema.org", "@graph": graph };
}

export function buildLocalBusinessJsonLd({ contact, reviewStats } = {}) {
  const c = { ...DEFAULT_CONTACT, ...(contact && typeof contact === "object" ? contact : {}) };
  const waDigits = String(c.whatsapp || "").replace(/[^\d]/g, "");
  const tel = String(c.telephone || c.phone || "").trim() || (waDigits ? `+${waDigits}` : "");

  const graph = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_ORIGIN}/#localbusiness`,
    name: "Mallorca Island Yacht",
    description:
      "Private yacht and boat charter in Palma de Mallorca. Sailboats, motor yachts and day charters with professional skipper.",
    url: SITE_ORIGIN,
    image: `${SITE_ORIGIN}/icon-master.png`,
    email: String(c.email || DEFAULT_CONTACT.email).trim() || DEFAULT_CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: c.streetAddress || DEFAULT_CONTACT.streetAddress,
      addressLocality: c.locality || DEFAULT_CONTACT.locality,
      addressRegion: c.region || DEFAULT_CONTACT.region,
      postalCode: c.postalCode || DEFAULT_CONTACT.postalCode,
      addressCountry: c.country || DEFAULT_CONTACT.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 39.5693,
      longitude: 2.6512,
    },
    areaServed: {
      "@type": "Place",
      name: "Palma de Mallorca, Balearic Islands",
    },
    priceRange: "€€€",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00",
      closes: "22:00",
    },
  };

  if (tel) graph.telephone = tel;

  const count = Number(reviewStats?.count) || 0;
  const avg = Number(reviewStats?.average) || 0;
  if (count > 0 && avg > 0) {
    graph.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(avg),
      reviewCount: String(count),
      bestRating: "5",
      worstRating: "1",
    };
  }

  return graph;
}

export function injectJsonLd(id, data) {
  if (typeof document === "undefined" || !data) return;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Static HTML snippets for build-time prerender (primary locale: ES). */
export const SEO_PRERENDER_ES = {
  "/": {
    h1: "Alquiler de Barcos en Palma de Mallorca",
    lead:
      "Yacht charter y chárter privado con yates, veleros y embarcaciones desde El Molinar, Palma. Reserva online flexible con patrón profesional.",
    sections: [
      {
        h2: "Barcos en Palma",
        p: "Flota de embarcaciones para alquiler de barco y charter en Palma de Mallorca. Medio día, día completo y atardecer.",
      },
      {
        h2: "Chárter Privado",
        p: "Charter náutico privado con condiciones claras, seguro, IVA y patrón incluidos. Salida desde Palma.",
      },
      {
        h2: "Experiencias",
        p: "Reseñas de clientes que han disfrutado su yacht charter y alquiler de barco con Mallorca Island Yacht.",
      },
    ],
  },
  "/barcos-alquiler": {
    h1: "Alquiler de Barcos en Palma",
    lead:
      "Consulta nuestra flota de veleros, yates y barcos privados disponibles para charter en Palma de Mallorca.",
    sections: [
      {
        h2: "Barcos en Palma",
        p: "Embarcaciones con patrón profesional para grupos y salidas a medida desde el puerto de Palma.",
      },
    ],
  },
  "/charter-palma": {
    h1: "Chárter Privado en Palma de Mallorca",
    lead:
      "Reserva tu yacht charter privado con salida en El Molinar. Servicio multiidioma y condiciones transparentes.",
    sections: [
      {
        h2: "Chárter Privado",
        p: "Incluye seguro, limpieza, nevera y patrón. Política de cancelación clara según antelación y condiciones meteorológicas.",
      },
    ],
  },
  "/tarifas": {
    h1: "Tarifas de Charter en Palma",
    lead:
      "Precios de alquiler de barco y yacht charter según temporada: baja, media y alta. Turnos de mañana, tarde, día completo y atardecer.",
    sections: [
      {
        h2: "Barcos en Palma",
        p: "Tarifas orientativas en la web; el precio final depende de la embarcación, fecha y duración del charter.",
      },
    ],
  },
  "/alquiler-barco-mallorca": {
    h1: "Alquiler de Barco en Mallorca",
    lead:
      "Alquila barco en Mallorca con salida en Palma de Mallorca. Yacht charter privado con patrón, seguro e IVA incluidos.",
    sections: [
      {
        h2: "Preguntas frecuentes",
        p: "¿Dónde alquilar, qué incluye el precio y cómo reservar medio día o día completo? Respuestas sobre alquiler de barco en Mallorca.",
      },
      {
        h2: "Barcos en Palma",
        p: "Flota de yates y veleros para grupos, familias y salidas a medida por la bahía de Palma y la costa mallorquina.",
      },
    ],
  },
};

/** Accessible alt text for fleet photos (locale-aware). */
export function fleetBoatImageAlt(boatName, lang = "es") {
  const name = String(boatName || "").trim() || "Embarcación";
  const templates = {
    es: `${name} — alquiler de barco en Mallorca, Palma`,
    en: `${name} — boat hire Mallorca, Palma`,
    de: `${name} — Boot mieten Mallorca, Palma`,
    fr: `${name} — location bateau Majorque, Palma`,
    sv: `${name} — båthyra Mallorca, Palma`,
  };
  return templates[lang] || templates.es;
}

export const SEO_SITEMAP_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/alquiler-barco-mallorca", changefreq: "weekly", priority: "0.95" },
  { path: "/barcos-alquiler", changefreq: "weekly", priority: "0.9" },
  { path: "/charter-palma", changefreq: "monthly", priority: "0.9" },
  { path: "/tarifas", changefreq: "weekly", priority: "0.85" },
  ...SEO_BLOG_SITEMAP,
];
