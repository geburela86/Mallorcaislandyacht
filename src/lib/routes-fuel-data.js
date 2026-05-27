/** Rutas frecuentes desde El Molinar — tiempos y carburante aprox. (ida y vuelta). */

export const ROUTE_IMAGE_FALLBACK = "/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp";

function buildGoogleMapsHref(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsEmbedSrc(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Foto local en /public/routes (descargada de Wikimedia Commons — playa real). */
export function routePhotoSrc(id) {
  return `/routes/${id}.webp`;
}

export const ROUTES_FUEL_ITEMS = [
  {
    id: "catedral",
    destination: "Catedral",
    routeLabel: "Molinar → Catedral",
    time: "20–30 min",
    cost: "30–40 €",
    photoAlt: "Catedral de Palma de Mallorca",
    mapsHref: buildGoogleMapsHref("Catedral de Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Catedral de Mallorca"),
  },
  {
    id: "cala-major",
    destination: "Cala Major",
    routeLabel: "Molinar → Cala Major",
    time: "~1 h",
    cost: "50–60 €",
    photoAlt: "Playa de Cala Major, Palma",
    mapsHref: buildGoogleMapsHref("Cala Major Palma"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Major Palma"),
  },
  {
    id: "illetas",
    destination: "Illetas",
    routeLabel: "Molinar → Illetas",
    time: "~1 h",
    cost: "52–60 €",
    photoAlt: "Playa de Illetas, Calvià",
    mapsHref: buildGoogleMapsHref("Illetas Calvià"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Illetas Calvià"),
  },
  {
    id: "portals-nous",
    destination: "Portals Nous",
    routeLabel: "Molinar → Portals Nous",
    time: "~1 h 20",
    cost: "70–85 €",
    photoAlt: "Playa de Portals Nous",
    mapsHref: buildGoogleMapsHref("Portals Nous Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Portals Nous Mallorca"),
  },
  {
    id: "calo-fort",
    destination: "Caló Fort",
    routeLabel: "Molinar → Caló Fort",
    time: "~1 h 20",
    cost: "70–85 €",
    photoAlt: "Cala Fornells, costa de Mallorca",
    mapsHref: buildGoogleMapsHref("Caló des Fort Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Caló des Fort Mallorca"),
  },
  {
    id: "cala-mosques",
    destination: "Cala Mosques",
    routeLabel: "Molinar → Cala Mosques",
    time: "~1 h 45",
    cost: "85–110 €",
    photoAlt: "Caló de ses Mosques, Mallorca",
    mapsHref: buildGoogleMapsHref("Caló de ses Mosques Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Caló de ses Mosques Mallorca"),
  },
  {
    id: "cala-vella",
    destination: "Cala Vella",
    routeLabel: "Molinar → Cala Vella",
    time: "~2 h",
    cost: "100–130 €",
    photoAlt: "Cala Portals Vells, Mallorca",
    mapsHref: "https://maps.app.goo.gl/R86Y2b",
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Vella Mallorca"),
  },
];
