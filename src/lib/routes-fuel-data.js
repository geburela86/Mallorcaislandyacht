/** Rutas frecuentes desde El Molinar — tiempos y carburante aprox. (ida y vuelta). */

export const ROUTE_IMAGE_FALLBACK = "/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp";

function buildGoogleMapsHref(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsEmbedSrc(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export const ROUTES_FUEL_ITEMS = [
  {
    id: "catedral",
    destination: "Catedral",
    routeLabel: "Molinar → Catedral",
    time: "20–30 min",
    cost: "30–40 €",
    photoSrc: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    photoAlt: "Catedral de Mallorca",
    mapsHref: buildGoogleMapsHref("Catedral de Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Catedral de Mallorca"),
  },
  {
    id: "cala-major",
    destination: "Cala Major",
    routeLabel: "Molinar → Cala Major",
    time: "~1 h",
    cost: "50–60 €",
    photoSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
    photoAlt: "Playa cristalina, Cala Major",
    mapsHref: buildGoogleMapsHref("Cala Major Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Major Mallorca"),
  },
  {
    id: "illetas",
    destination: "Illetas",
    routeLabel: "Molinar → Illetas",
    time: "~1 h",
    cost: "52–60 €",
    photoSrc: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400",
    photoAlt: "Illetas, costa de Mallorca",
    mapsHref: buildGoogleMapsHref("Illetas Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Illetas Mallorca"),
  },
  {
    id: "portals-nous",
    destination: "Portals Nous",
    routeLabel: "Molinar → Portals Nous",
    time: "~1 h 20",
    cost: "70–85 €",
    photoSrc: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400",
    photoAlt: "Puerto y costa, Portals Nous",
    mapsHref: buildGoogleMapsHref("Portals Nous Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Portals Nous Mallorca"),
  },
  {
    id: "calo-fort",
    destination: "Caló Fort",
    routeLabel: "Molinar → Caló Fort",
    time: "~1 h 20",
    cost: "70–85 €",
    photoSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    photoAlt: "Playa, Caló Fort",
    mapsHref: buildGoogleMapsHref("Caló des Fort Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Caló des Fort Mallorca"),
  },
  {
    id: "cala-mosques",
    destination: "Cala Mosques",
    routeLabel: "Molinar → Cala Mosques",
    time: "~1 h 45",
    cost: "85–110 €",
    photoSrc: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400",
    photoAlt: "Aguas azules, Cala Mosques",
    mapsHref: buildGoogleMapsHref("Cala Mosques Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Mosques Mallorca"),
  },
  {
    id: "cala-vella",
    destination: "Cala Vella",
    routeLabel: "Molinar → Cala Vella",
    time: "~2 h",
    cost: "100–130 €",
    photoSrc: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400",
    photoAlt: "Cala Vella, Mallorca",
    mapsHref: buildGoogleMapsHref("Cala Vella Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Vella Mallorca"),
  },
];
