/** Rutas frecuentes desde El Molinar — tiempos y carburante aprox. (ida y vuelta). */

function buildGoogleMapsHref(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsEmbedSrc(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function buildUnsplashFeaturedSrc(query) {
  // Nota: estas URLs devuelven imágenes variables pero siempre “paradisíacas”.
  // Si quieres imágenes fijas (siempre las mismas), sustituimos por assets en /public o URLs concretas.
  return `https://source.unsplash.com/1600x1000/?${encodeURIComponent(query)}`;
}

export const ROUTES_FUEL_ITEMS = [
  {
    id: "catedral",
    destination: "Catedral",
    routeLabel: "Molinar → Catedral",
    time: "20–30 min",
    cost: "30–40 €",
    mapsQuery: "Catedral de Mallorca",
    mapsHref: buildGoogleMapsHref("Catedral de Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Catedral de Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Palma cathedral sea boat"), alt: "Catedral de Mallorca vista desde el mar" },
      { src: buildUnsplashFeaturedSrc("Palma de Mallorca bay boat"), alt: "Bahía de Palma con barco" },
      { src: buildUnsplashFeaturedSrc("Mallorca sunset boat"), alt: "Atardecer en Mallorca desde barco" },
    ],
  },
  {
    id: "cala-major",
    destination: "Cala Major",
    routeLabel: "Molinar → Cala Major",
    time: "~1 h",
    cost: "50–60 €",
    mapsQuery: "Cala Major Mallorca",
    mapsHref: buildGoogleMapsHref("Cala Major Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Major Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Cala Major Mallorca crystal water"), alt: "Aguas cristalinas en Cala Major" },
      { src: buildUnsplashFeaturedSrc("Mallorca beach swimmers crystal water"), alt: "Gente bañándose en aguas cristalinas" },
      { src: buildUnsplashFeaturedSrc("Mallorca boat anchorage turquoise water"), alt: "Barco fondeado en aguas turquesas" },
    ],
  },
  {
    id: "illetas",
    destination: "Illetas",
    routeLabel: "Molinar → Illetas",
    time: "~1 h",
    cost: "52–60 €",
    mapsQuery: "Illetas Mallorca",
    mapsHref: buildGoogleMapsHref("Illetas Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Illetas Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Illetas Mallorca turquoise water"), alt: "Aguas turquesas en Illetas" },
      { src: buildUnsplashFeaturedSrc("Mallorca cove boat snorkeling"), alt: "Snorkel en cala con barco" },
      { src: buildUnsplashFeaturedSrc("Mallorca coast yachts clear water"), alt: "Yates en costa de Mallorca con aguas claras" },
    ],
  },
  {
    id: "portals-nous",
    destination: "Portals Nous",
    routeLabel: "Molinar → Portals Nous",
    time: "~1 h 20",
    cost: "70–85 €",
    mapsQuery: "Portals Nous Mallorca",
    mapsHref: buildGoogleMapsHref("Portals Nous Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Portals Nous Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Portals Nous marina yachts"), alt: "Puerto deportivo y yates en Portals Nous" },
      { src: buildUnsplashFeaturedSrc("Mallorca luxury yacht water"), alt: "Yate en Mallorca sobre el agua" },
      { src: buildUnsplashFeaturedSrc("Mallorca cove clear water boat"), alt: "Cala de aguas claras con barco" },
    ],
  },
  {
    id: "calo-fort",
    destination: "Caló Fort",
    routeLabel: "Molinar → Caló Fort",
    time: "~1 h 20",
    cost: "70–85 €",
    mapsQuery: "Caló des Fort Mallorca",
    mapsHref: buildGoogleMapsHref("Caló des Fort Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Caló des Fort Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Mallorca hidden cove turquoise water"), alt: "Cala escondida de aguas turquesas" },
      { src: buildUnsplashFeaturedSrc("Mallorca rocks clear water swim"), alt: "Baño en aguas claras junto a rocas" },
      { src: buildUnsplashFeaturedSrc("Mallorca boat swim platform crystal"), alt: "Plataforma de baño de barco en agua cristalina" },
    ],
  },
  {
    id: "cala-mosques",
    destination: "Cala Mosques",
    routeLabel: "Molinar → Cala Mosques",
    time: "~1 h 45",
    cost: "85–110 €",
    mapsQuery: "Cala Mosques Mallorca",
    mapsHref: buildGoogleMapsHref("Cala Mosques Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Mosques Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Mallorca wild cove crystal water"), alt: "Cala salvaje de aguas cristalinas" },
      { src: buildUnsplashFeaturedSrc("Mallorca snorkeling clear water"), alt: "Snorkel en agua clara" },
      { src: buildUnsplashFeaturedSrc("Mallorca boat anchored turquoise"), alt: "Barco fondeado en agua turquesa" },
    ],
  },
  {
    id: "cala-vella",
    destination: "Cala Vella",
    routeLabel: "Molinar → Cala Vella",
    time: "~2 h",
    cost: "100–130 €",
    mapsQuery: "Cala Vella Mallorca",
    mapsHref: buildGoogleMapsHref("Cala Vella Mallorca"),
    mapsEmbedSrc: buildGoogleMapsEmbedSrc("Cala Vella Mallorca"),
    images: [
      { src: buildUnsplashFeaturedSrc("Cala Vella Mallorca crystal water"), alt: "Aguas cristalinas en Cala Vella" },
      { src: buildUnsplashFeaturedSrc("Mallorca turquoise lagoon swimmers"), alt: "Gente bañándose en agua turquesa" },
      { src: buildUnsplashFeaturedSrc("Mallorca boat day trip clear water"), alt: "Salida en barco con aguas claras" },
    ],
  },
];
