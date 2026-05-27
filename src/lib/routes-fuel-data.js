/** Rutas frecuentes desde El Molinar — tiempos y carburante aprox. (ida y vuelta). */

export const ROUTE_IMAGE_FALLBACK = "/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp";

function embedFromQuery(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

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
    photoAlt: "Catedral de Palma, vista desde el mar",
    mapsHref: "https://maps.app.goo.gl/FWphTkVNpK48AVQu8",
    mapsEmbedSrc: embedFromQuery("Catedral-Basílica de Santa María de Mallorca"),
  },
  {
    id: "cala-major",
    destination: "Cala Major",
    routeLabel: "Molinar → Cala Major",
    time: "~1 h",
    cost: "50–60 €",
    photoAlt: "Platja de Cala Major",
    mapsHref: "https://maps.app.goo.gl/7YuRLk3f6xFZYyL99",
    mapsEmbedSrc: embedFromQuery("Platja de Cala Major Palma"),
  },
  {
    id: "illetas",
    destination: "Illetas",
    routeLabel: "Molinar → Illetas",
    time: "~1 h",
    cost: "52–60 €",
    photoAlt: "Playa de Illetes",
    mapsHref: "https://maps.app.goo.gl/YTPiW7k6qkhjnbAJ8",
    mapsEmbedSrc: embedFromQuery("Playa de Illetes Calvià"),
  },
  {
    id: "portals-nous",
    destination: "Portals Nous",
    routeLabel: "Molinar → Portals Nous",
    time: "~1 h 20",
    cost: "70–85 €",
    photoAlt: "Portals Nous Beach",
    mapsHref: "https://maps.app.goo.gl/ydXoTcT8akumM1jb9",
    mapsEmbedSrc: embedFromQuery("Portals Nous Beach Mallorca"),
  },
  {
    id: "calo-fort",
    destination: "Caló Fort",
    routeLabel: "Molinar → Caló Fort",
    time: "~1 h 20",
    cost: "70–85 €",
    photoAlt: "Caló Fort",
    mapsHref: "https://maps.app.goo.gl/KfyWquR464zHn2uc8",
    mapsEmbedSrc: embedFromQuery("Caló Fort Mallorca"),
  },
  {
    id: "cala-mosques",
    destination: "Cala Mosques",
    routeLabel: "Molinar → Cala Mosques",
    time: "~1 h 45",
    cost: "85–110 €",
    photoAlt: "Cala Mosques",
    mapsHref: "https://maps.app.goo.gl/MgcY2ZXmXQYZS5iZ9",
    mapsEmbedSrc: embedFromQuery("Cala Mosques Mallorca"),
  },
  {
    id: "cala-vella",
    destination: "Cala Vella",
    routeLabel: "Molinar → Cala Vella",
    time: "~2 h",
    cost: "100–130 €",
    photoAlt: "Cala Vella",
    mapsHref: "https://maps.app.goo.gl/gMqBG2wbrFELy5zx8",
    mapsEmbedSrc: embedFromQuery("Cala Vella Mallorca"),
  },
];
