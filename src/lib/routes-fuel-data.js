/** Rutas frecuentes desde El Molinar — tiempos y carburante aprox. (ida y vuelta). */

export const ROUTE_IMAGE_FALLBACK = "/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp";

function buildGoogleMapsHref(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsEmbedSrc(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Foto local (public/routes) o API de Google Places en runtime. */
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
    mapsQuery: "Catedral de Mallorca Palma",
    wikipediaTitle: "Palma Cathedral",
    mapsHref: buildGoogleMapsHref("Catedral de Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Catedral de Mallorca"),
    photoAlt: "Catedral de Mallorca vista desde el mar",
  },
  {
    id: "cala-major",
    destination: "Cala Major",
    routeLabel: "Molinar → Cala Major",
    time: "~1 h",
    cost: "50–60 €",
    mapsQuery: "Playa de Cala Major Palma",
    wikipediaTitle: "Cala Major",
    mapsHref: buildGoogleMapsHref("Cala Major Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Major Mallorca"),
    photoAlt: "Playa de Cala Major, Mallorca",
    commonsSearch: ["Cala Major Palma", "Palma de Mallorca beach", "Mallorca turquoise cove"],
  },
  {
    id: "illetas",
    destination: "Illetas",
    routeLabel: "Molinar → Illetas",
    time: "~1 h",
    cost: "52–60 €",
    mapsQuery: "Illetas beach Calvià Mallorca",
    wikipediaTitle: "Illetes",
    mapsHref: buildGoogleMapsHref("Illetas Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Illetas Mallorca"),
    photoAlt: "Playa de Illetas, Mallorca",
    commonsSearch: ["Illetas Calvià", "Illetes beach", "Calvià beach Mallorca"],
  },
  {
    id: "portals-nous",
    destination: "Portals Nous",
    routeLabel: "Molinar → Portals Nous",
    time: "~1 h 20",
    cost: "70–85 €",
    mapsQuery: "Playa de Portals Nous Calvià",
    wikipediaTitle: "Portals Nous",
    mapsHref: buildGoogleMapsHref("Portals Nous Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Portals Nous Mallorca"),
    photoAlt: "Portals Nous y su costa",
  },
  {
    id: "calo-fort",
    destination: "Caló Fort",
    routeLabel: "Molinar → Caló Fort",
    time: "~1 h 20",
    cost: "70–85 €",
    mapsQuery: "Caló des Fort Mallorca",
    wikipediaTitle: "Caló des Fort",
    mapsHref: buildGoogleMapsHref("Caló des Fort Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Caló des Fort Mallorca"),
    photoAlt: "Caló des Fort, Mallorca",
    commonsSearch: ["Caló des Fort", "Mallorca cove", "Balearic beach"],
  },
  {
    id: "cala-mosques",
    destination: "Cala Mosques",
    routeLabel: "Molinar → Cala Mosques",
    time: "~1 h 45",
    cost: "85–110 €",
    mapsQuery: "Caló de ses Mosques Mallorca",
    wikipediaTitle: "Caló de ses Mosques",
    mapsHref: buildGoogleMapsHref("Cala Mosques Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Mosques Mallorca"),
    photoAlt: "Caló de ses Mosques, Mallorca",
    commonsSearch: ["Caló de ses Mosques", "Mallorca cala", "Mediterranean cove"],
  },
  {
    id: "cala-vella",
    destination: "Cala Vella",
    routeLabel: "Molinar → Cala Vella",
    time: "~2 h",
    cost: "100–130 €",
    mapsQuery: "Cala Vella Mallorca",
    wikipediaTitle: "Cala Vella",
    mapsHref: buildGoogleMapsHref("Cala Vella Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Vella Mallorca"),
    photoAlt: "Cala Vella, Mallorca",
    commonsSearch: ["Cala Vella Mallorca", "Es Trenc", "Mallorca beach"],
  },
];
