/** SEO blog / guide articles — market-adapted per locale. */
import { buildLocalizedPath } from "./seo-locales.js";

const SITE_ORIGIN = "https://mallorcaislandyacht.com";

export const SEO_BLOG_PATHS = [
  "/alquiler-barco-mallorca-verano-2026",
  "/guia-alquiler-barco-mallorca",
  "/cuanto-cuesta-alquilar-barco-mallorca",
  "/mejores-calas-barco-palma",
];

/** Home page guide cards — order and short titles per locale. */
export const HOME_GUIDE_CARDS = [
  {
    path: "/alquiler-barco-mallorca-verano-2026",
    featured: true,
    titles: {
      es: "Alquiler de barco en verano 2026",
      en: "Boat hire Mallorca summer 2026",
      de: "Boot mieten Mallorca Sommer 2026",
      fr: "Location bateau été 2026",
      sv: "Båthyra Mallorca sommar 2026",
    },
  },
  {
    path: "/guia-alquiler-barco-mallorca",
    titles: {
      es: "Guía de alquiler de barco",
      en: "Complete boat hire guide",
      de: "Ratgeber Boot mieten",
      fr: "Guide location bateau",
      sv: "Guide båthyra",
    },
  },
  {
    path: "/cuanto-cuesta-alquilar-barco-mallorca",
    titles: {
      es: "¿Cuánto cuesta alquilar?",
      en: "How much does it cost?",
      de: "Was kostet der Charter?",
      fr: "Combien ça coûte ?",
      sv: "Vad kostar det?",
    },
  },
  {
    path: "/mejores-calas-barco-palma",
    titles: {
      es: "Mejores calas en barco",
      en: "Best coves by boat",
      de: "Beste Buchten ab Palma",
      fr: "Meilleures criques",
      sv: "Bästa vikar till sjöss",
    },
  },
];

export const SEO_BLOG_PATH_META = {
  "/alquiler-barco-mallorca-verano-2026": {
    es: {
      title: "Alquiler de Barco en Mallorca Verano 2026 | Consejos",
      description:
        "Planifica tu alquiler de barco en Mallorca en verano 2026: temporada alta, horarios, calas, reservas anticipadas y charter con patrón desde Palma.",
    },
    en: {
      title: "Boat Hire Mallorca Summer 2026 | Planning Tips",
      description:
        "Plan your Mallorca boat hire for summer 2026: peak season, timings, coves, early booking and skippered charters from Palma.",
    },
    de: {
      title: "Boot mieten Mallorca Sommer 2026 | Tipps",
      description:
        "Bootscharter auf Mallorca im Sommer 2026 planen: Hochsaison, Zeiten, Buchten und Buchung mit Skipper ab Palma.",
    },
    fr: {
      title: "Location bateau Majorque été 2026",
      description:
        "Préparez votre location de bateau à Majorque en été 2026 : haute saison, horaires, criques et réservation avec skipper à Palma.",
    },
  },
  "/guia-alquiler-barco-mallorca": {
    es: {
      title: "Guía: Alquiler de Barco en Mallorca 2026 | Consejos",
      description:
        "Guía práctica para alquilar barco en Mallorca: tipos de embarcación, salida en Palma, patrón, precios y cómo reservar tu charter.",
    },
    en: {
      title: "Guide: Boat Hire in Mallorca | Tips & How to Book",
      description:
        "Practical guide to hiring a boat in Mallorca: vessel types, Palma departure, skipper, pricing and how to book your charter.",
    },
    de: {
      title: "Guide: Boot mieten auf Mallorca | Tipps",
      description:
        "Praktischer Leitfaden zum Bootscharter auf Mallorca: Schiffstypen, Abfahrt Palma, Skipper und Buchung.",
    },
    fr: {
      title: "Guide : location bateau à Majorque",
      description:
        "Guide pratique pour louer un bateau à Majorque : types de bateaux, départ Palma, skipper et réservation.",
    },
  },
  "/cuanto-cuesta-alquilar-barco-mallorca": {
    es: {
      title: "¿Cuánto Cuesta Alquilar un Barco en Mallorca? | Precios",
      description:
        "Precios orientativos de alquiler de barco en Mallorca: medio día, día completo, temporadas y qué incluye el charter con patrón.",
    },
    en: {
      title: "How Much Does Boat Hire in Mallorca Cost? | Rates",
      description:
        "Indicative boat hire prices in Mallorca: half-day, full day, seasons and what a skippered charter includes.",
    },
    de: {
      title: "Was kostet Boot mieten auf Mallorca? | Preise",
      description:
        "Orientierungspreise für Bootscharter auf Mallorca: Halbtag, Ganztag, Saisons und enthaltene Leistungen.",
    },
    fr: {
      title: "Prix location bateau Majorque | Tarifs",
      description:
        "Tarifs indicatifs de location de bateau à Majorque : demi-journée, journée, saisons et prestations incluses.",
    },
  },
  "/mejores-calas-barco-palma": {
    es: {
      title: "Mejores Calas en Barco desde Palma | Ruta en Mallorca",
      description:
        "Calas y bahías imprescindibles en barco desde Palma de Mallorca: Es Trenc, Portals, Dragonera y más. Ideas para tu charter.",
    },
    en: {
      title: "Best Coves by Boat from Palma | Mallorca Route Ideas",
      description:
        "Must-see coves and bays by boat from Palma de Mallorca. Route ideas for your private Mallorca charter.",
    },
    de: {
      title: "Beste Buchten ab Palma | Routen-Ideen Mallorca",
      description:
        "Buchten und Buchten ab Palma de Mallorca — Route-Ideen für Ihren privaten Charter auf Mallorca.",
    },
    fr: {
      title: "Meilleures criques en bateau depuis Palma",
      description:
        "Criques et baies à voir en bateau au départ de Palma. Idées d’itinéraire pour votre charter privé.",
    },
  },
};

export const SEO_BLOG_PRERENDER_ES = {
  "/alquiler-barco-mallorca-verano-2026": {
    h1: "Alquiler de barco en Mallorca en verano 2026",
    lead:
      "Consejos para reservar tu yacht charter en temporada alta: cuándo salir, qué llevar y cómo asegurar disponibilidad en Palma.",
    sections: [
      {
        h2: "Temporada alta junio–septiembre",
        p: "Verano es la época más demandada para alquilar barco en Mallorca. Reserva con antelación, especialmente en julio y agosto.",
      },
      {
        h2: "Horarios recomendados",
        p: "Salidas tempranas evitan calor intenso y puertos más concurridos; el atardecer es ideal para grupos que buscan ambiente y fotos.",
      },
    ],
  },
  "/guia-alquiler-barco-mallorca": {
    h1: "Guía de alquiler de barco en Mallorca",
    lead:
      "Todo lo esencial para planificar un yacht charter o alquiler de barco privado con salida en Palma de Mallorca.",
    sections: [
      {
        h2: "Tipos de embarcación",
        p: "Veleros, lanchas motoras y yates: elige según grupo, confort y tipo de jornada en la bahía o la costa sur.",
      },
      {
        h2: "Patrón profesional",
        p: "En Mallorca Island Yacht el patrón va incluido: navegas sin licencia y con seguridad en aguas de la isla.",
      },
    ],
  },
  "/cuanto-cuesta-alquilar-barco-mallorca": {
    h1: "¿Cuánto cuesta alquilar un barco en Mallorca?",
    lead:
      "Precios según embarcación, temporada y duración del charter. IVA y patrón suelen estar incluidos en la tarifa publicada.",
    sections: [
      {
        h2: "Turnos y temporadas",
        p: "Medio día, día completo y atardecer; temporadas baja, media y alta entre noviembre y septiembre.",
      },
    ],
  },
  "/mejores-calas-barco-palma": {
    h1: "Mejores calas en barco desde Palma",
    lead:
      "Rutas por la bahía de Palma y la costa mallorquina: calas de aguas turquesas accesibles en charter de medio día o jornada completa.",
    sections: [
      {
        h2: "Calas cercanas",
        p: "Portals Vells, Cala Pi o la costa de Calvià son paradas habituales en salidas de 4 u 8 horas desde El Molinar.",
      },
    ],
  },
};

export const SEO_BLOG_SITEMAP = SEO_BLOG_PATHS.map((path) => ({
  path,
  changefreq: path === "/alquiler-barco-mallorca-verano-2026" ? "weekly" : "monthly",
  priority: path === "/alquiler-barco-mallorca-verano-2026" ? "0.85" : "0.8",
}));

const UI = {
  es: {
    home: "Inicio",
    guides: "Guías",
    readMin: "min de lectura",
    updated: "Actualizado",
    ctaTitle: "¿Listo para reservar tu charter?",
    ctaSub: "Consulta disponibilidad y precios de nuestra flota con salida en Palma.",
    ctaBtn: "Ver flota y reservar",
    related: "También te puede interesar",
    backFleet: "Alquiler de barcos",
    backHire: "Alquiler barco Mallorca",
  },
  en: {
    home: "Home",
    guides: "Guides",
    readMin: "min read",
    updated: "Updated",
    ctaTitle: "Ready to book your charter?",
    ctaSub: "Check availability and rates for our Palma-based fleet.",
    ctaBtn: "View fleet & book",
    related: "You may also like",
    backFleet: "Boat hire",
    backHire: "Boat hire Mallorca",
  },
  de: {
    home: "Start",
    guides: "Ratgeber",
    readMin: "Min. Lesezeit",
    updated: "Aktualisiert",
    ctaTitle: "Charter buchen?",
    ctaSub: "Verfügbarkeit und Preise unserer Flotte ab Palma prüfen.",
    ctaBtn: "Flotte & Buchung",
    related: "Das könnte Sie interessieren",
    backFleet: "Boot mieten",
    backHire: "Boot mieten Mallorca",
  },
  fr: {
    home: "Accueil",
    guides: "Guides",
    readMin: "min de lecture",
    updated: "Mis à jour",
    ctaTitle: "Prêt à réserver votre charter ?",
    ctaSub: "Consultez la disponibilité et les tarifs de notre flotte à Palma.",
    ctaBtn: "Voir la flotte",
    related: "À lire aussi",
    backFleet: "Location bateau",
    backHire: "Location Majorque",
  },
  sv: {
    home: "Hem",
    guides: "Guider",
    readMin: "min läsning",
    updated: "Uppdaterad",
    ctaTitle: "Redo att boka charter?",
    ctaSub: "Se tillgänglighet och priser för vår flotta i Palma.",
    ctaBtn: "Se flotta och boka",
    related: "Läs också",
    backFleet: "Båthyra",
    backHire: "Båthyra Mallorca",
  },
};

const ARTICLES = {
  "/alquiler-barco-mallorca-verano-2026": {
    es: {
      kicker: "Verano 2026",
      h1: "Alquiler de barco en Mallorca en verano 2026",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Por qué reservar con antelación",
          paragraphs: [
            "Entre junio y septiembre la demanda de alquiler de barco en Mallorca se dispara: fines de semana, puentes y julio–agosto suelen agotarse las mejores franjas. Si tienes fechas cerradas, conviene reservar con varias semanas de margen, sobre todo para día completo o embarcaciones grandes.",
            "En Mallorca Island Yacht puedes comprobar disponibilidad en tiempo real en la web y confirmar con patrón incluido desde El Molinar, Palma.",
          ],
        },
        {
          h2: "Temporada alta: precios y turnos",
          paragraphs: [
            "El verano corresponde a temporada alta en nuestra tarificación: los importes son superiores a mayo u octubre, pero a cambio tienes las mejores condiciones de baño y días largos.",
          ],
          list: [
            "Medio día mañana (4 h): ideal para familias con niños — mar más calmado y menos calor al mediodía.",
            "Medio día tarde: perfecto si prefieres dormir tranquilo y salir después de comer.",
            "Día completo (8 h): para llegar a calas del sur o combinar navegación y comida.",
            "Atardecer (3 h): muy solicitado en julio y agosto — reserva pronto.",
          ],
        },
        {
          h2: "Calor, viento y seguridad",
          paragraphs: [
            "En verano predominan brisas térmicas y algún día de tramontana o levante. El patrón adapta la ruta: si el viento supera límites seguros, se reprograma o se propone alternativa según nuestra política.",
            "Lleva protector solar, gorra, agua y toalla. El calor en cubierta es real: sombrero y ropa ligera de secado rápido mejoran la experiencia.",
          ],
        },
        {
          h2: "Calas y afluencia en verano",
          paragraphs: [
            "Las calas cercanas a Palma y la costa de Calvià son accesibles en medio día. Para Es Trenc o zonas muy populares, un día completo y salida temprana ayudan a disfrutar más y fondear con tranquilidad.",
            "Consulta nuestra guía de mejores calas en barco desde Palma para inspirarte antes de reservar.",
          ],
        },
        {
          h2: "Qué incluye tu charter de verano",
          paragraphs: [
            "Patrón profesional, seguro, IVA y limpieza final suelen estar incluidos. La nevera te permite llevar bebidas; el combustible y extras de catering se confirman al reservar.",
          ],
        },
        {
          h2: "Reserva tu barco para el verano 2026",
          paragraphs: [
            "Elige embarcación, fecha y turno en la flota online. Si viajas en grupo numeroso o celebras un evento, escríbenos por WhatsApp y te orientamos sobre la mejor opción en Mallorca.",
          ],
        },
      ],
    },
    en: {
      kicker: "Summer 2026",
      h1: "Boat hire in Mallorca — summer 2026",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Book early",
          paragraphs: [
            "June to September is peak season for boat hire in Mallorca. July and August weekends fill up fast — reserve ahead for full-day trips and larger boats.",
          ],
        },
        {
          h2: "Slots & high season rates",
          list: [
            "Morning half-day: calmer sea and cooler temperatures.",
            "Afternoon half-day: relaxed start after lunch.",
            "Full day: reach southern coves.",
            "Sunset: very popular — book early.",
          ],
        },
        {
          h2: "Heat & safety",
          paragraphs: [
            "Your skipper adjusts the route to wind and safety limits. Bring sun protection, water and light clothing.",
          ],
        },
        {
          h2: "Summer coves",
          paragraphs: [
            "Nearby bays work well on a half-day; for Es Trenc plan a full day and an early departure.",
          ],
        },
        {
          h2: "Book online",
          paragraphs: ["Check fleet availability from Palma and confirm your summer charter in a few clicks."],
        },
      ],
    },
    de: {
      kicker: "Sommer 2026",
      h1: "Boot mieten auf Mallorca — Sommer 2026",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Früh buchen",
          paragraphs: [
            "Juni bis September ist Hochsaison. Besonders Juli und August: rechtzeitig reservieren, besonders für Ganztag und größere Yachten.",
          ],
        },
        {
          h2: "Zeiten & Preise",
          list: [
            "Vormittag-Halbtag: ruhigeres Meer.",
            "Nachmittag-Halbtag: entspannter Start.",
            "Ganztag: Südküste möglich.",
            "Sonnenuntergang: sehr gefragt.",
          ],
        },
        {
          h2: "Hitze & Sicherheit",
          paragraphs: ["Skipper passt Route an Wind an. Sonnenschutz und Wasser mitbringen."],
        },
        {
          h2: "Online buchen",
          paragraphs: ["Verfügbarkeit der Flotte ab Palma prüfen und Sommer-Charter bestätigen."],
        },
      ],
    },
    fr: {
      kicker: "Été 2026",
      h1: "Location de bateau à Majorque — été 2026",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Réserver tôt",
          paragraphs: [
            "De juin à septembre, forte demande. Juillet–août : réservez à l’avance pour la journée complète et les bateaux spacieux.",
          ],
        },
        {
          h2: "Créneaux",
          list: [
            "Matin : mer plus calme.",
            "Après-midi : départ détendu.",
            "Journée : criques du sud.",
            "Coucher de soleil : très demandé.",
          ],
        },
        {
          h2: "Chaleur & sécurité",
          paragraphs: ["Le skipper adapte l’itinéraire au vent. Crème solaire et eau indispensables."],
        },
        {
          h2: "Réserver",
          paragraphs: ["Consultez la flotte à Palma et confirmez votre charter d’été en ligne."],
        },
      ],
    },
  },
  "/guia-alquiler-barco-mallorca": {
    es: {
      kicker: "Guía práctica",
      h1: "Guía de alquiler de barco en Mallorca",
      readMin: 7,
      published: "2026-05-23",
      sections: [
        {
          h2: "Por qué alquilar barco en Mallorca",
          paragraphs: [
            "Mallorca combina bahías protegidas, calas de agua clara y vientos regulados que facilitan la navegación agradable gran parte del año. El alquiler de barco privado te permite escapar de las playas masificadas y diseñar tu propia ruta, ya sea un medio día cerca de Palma o una jornada completa hacia la costa sur o las sierras de Tramuntana vistas desde el mar.",
            "A diferencia de las excursiones en barco compartidas, un charter privado adapta horarios, ritmo y paradas a tu grupo: familia, amigos o una celebración especial.",
          ],
        },
        {
          h2: "Tipos de embarcación: velero, lancha o yate",
          paragraphs: [
            "En Palma encontrarás desde veleros ágiles para quienes disfrutan navegar con viento, hasta lanchas motoras y yates para grupos que priorizan espacio, sombra y comodidad a bordo.",
          ],
          list: [
            "Veleros: ideales para quien busca sensación de navegación y rutas tranquilas.",
            "Lanchas motoras: perfectas para medio día, baño en cala y rapidez entre paradas.",
            "Yates y embarcaciones mayores: más capacidad y confort para grupos numerosos o jornadas largas.",
          ],
        },
        {
          h2: "Salida desde Palma (El Molinar)",
          paragraphs: [
            "Nuestra base en El Molinar, a pocos minutos del centro de Palma, permite embarcar sin desplazamientos largos. El patrón conoce la bahía, los fondeaderos autorizados y las condiciones del día, clave para una salida segura y relajada.",
            "No necesitas titulación náutica: el patrón profesional va incluido en el alquiler, cumpliendo la normativa local y las exigencias del seguro del charter.",
          ],
        },
        {
          h2: "Qué incluye normalmente el precio",
          paragraphs: [
            "En un charter privado con operador profesional suele estar incluido el patrón, seguro de la embarcación, IVA y limpieza final. La nevera para tus bebidas también forma parte del servicio en Mallorca Island Yacht.",
            "Suelen quedar fuera del precio base el combustible, el catering elaborado y bebidas premium, salvo que se acuerden antes. Pregunta siempre al reservar para evitar sorpresas.",
          ],
        },
        {
          h2: "Cómo reservar tu charter paso a paso",
          paragraphs: [
            "Elige fecha y duración en el calendario online (medio día mañana o tarde, día completo u horario de atardecer). Indica número de personas, selecciona embarcación y completa el pago o solicitud según el método disponible.",
            "Recibirás confirmación por email y el equipo contactará contigo antes de la salida para coordinar detalles prácticos.",
          ],
        },
        {
          h2: "Consejos para disfrutar al máximo",
          list: [
            "Lleva protección solar, toalla y calzado de goma blanca o descalzo a bordo.",
            "Confirma con antelación si deseas comida a bordo o parada en restaurante costero.",
            "Consulta la política de cancelación por meteorología: en Mallorca Island Yacht priorizamos seguridad con reprogramación o reembolso según condiciones.",
          ],
        },
      ],
    },
    en: {
      kicker: "Practical guide",
      h1: "Boat hire in Mallorca — complete guide",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Why hire a boat in Mallorca",
          paragraphs: [
            "Mallorca offers sheltered bays, clear water and reliable conditions for much of the season. Private boat hire lets you avoid crowded beaches and plan your own route from Palma.",
            "Unlike shared tours, a private charter sets the pace and stops for your group.",
          ],
        },
        {
          h2: "Sailboat, motorboat or yacht",
          paragraphs: ["From agile sailboats to spacious motor yachts — choose by group size, comfort and trip length."],
          list: [
            "Sailboats: best for sailing feel and relaxed routes.",
            "Motorboats: ideal for half-day swims and quick cove hops.",
            "Larger yachts: comfort for bigger groups or full-day trips.",
          ],
        },
        {
          h2: "Departure from Palma (El Molinar)",
          paragraphs: [
            "We depart from El Molinar, minutes from Palma centre. A professional skipper is included — no licence required on your side.",
          ],
        },
        {
          h2: "What is usually included",
          paragraphs: [
            "Skipper, insurance, VAT and final cleaning are typically included. Fuel and catering are usually extra unless agreed in advance.",
          ],
        },
        {
          h2: "How to book",
          paragraphs: [
            "Pick date and slot online, choose your boat and complete payment. You receive email confirmation and we contact you before departure.",
          ],
        },
      ],
    },
    de: {
      kicker: "Ratgeber",
      h1: "Boot mieten auf Mallorca — Leitfaden",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Warum Mallorca",
          paragraphs: [
            "Geschützte Buchten und klares Wasser machen die Insel ideal für privaten Bootscharter ab Palma — ohne überfüllte Strände.",
          ],
        },
        {
          h2: "Schiffstypen",
          list: [
            "Segelboot: für echtes Segelerlebnis.",
            "Motorboot: Halbtages-Ausflüge und Badebuchten.",
            "Yacht: Komfort für größere Gruppen.",
          ],
        },
        {
          h2: "Abfahrt El Molinar",
          paragraphs: ["Kurze Anfahrt ab Palma. Professioneller Skipper inklusive — kein eigener Führerschein nötig."],
        },
        {
          h2: "Inklusive Leistungen",
          paragraphs: ["Skipper, Versicherung, MwSt. und Endreinigung sind enthalten. Kraftstoff und Catering meist extra."],
        },
        {
          h2: "Buchung",
          paragraphs: ["Datum und Dauer online wählen, Boot auswählen und bezahlen. Bestätigung per E-Mail."],
        },
      ],
    },
    fr: {
      kicker: "Guide",
      h1: "Location de bateau à Majorque — guide",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Pourquoi Majorque",
          paragraphs: [
            "Baies abritées et eau claire : la location privée depuis Palma évite les plages bondées et permet votre propre itinéraire.",
          ],
        },
        {
          h2: "Types de bateaux",
          list: [
            "Voilier : sensation de voile.",
            "Bateau à moteur : demi-journée et criques.",
            "Yacht : confort pour groupes.",
          ],
        },
        {
          h2: "Départ El Molinar",
          paragraphs: ["Base proche de Palma. Skipper professionnel inclus — pas de permis requis."],
        },
        {
          h2: "Prestations incluses",
          paragraphs: ["Skipper, assurance, TVA et nettoyage en général inclus. Carburant et traiteur en supplément."],
        },
        {
          h2: "Réserver",
          paragraphs: ["Choisissez date et créneau en ligne, puis confirmation par e-mail."],
        },
      ],
    },
  },
  "/cuanto-cuesta-alquilar-barco-mallorca": {
    es: {
      kicker: "Precios",
      h1: "¿Cuánto cuesta alquilar un barco en Mallorca?",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Factores que marcan el precio",
          paragraphs: [
            "No existe una tarifa única para todo Mallorca: el importe depende de la embarcación, la temporada, la duración del charter y el día concreto (festivos o demanda alta pueden variar).",
          ],
          list: [
            "Embarcación: eslora, capacidad y equipamiento.",
            "Temporada: baja (nov–abr), media (may y oct) y alta (jun–sep).",
            "Duración: medio día (4 h), día completo (8 h) o atardecer (3 h).",
          ],
        },
        {
          h2: "Rangos orientativos en Palma",
          paragraphs: [
            "En yacht charter privado con patrón en Palma, los precios publicados en web suelen partir de varios cientos de euros en medio día y aumentar en día completo o embarcaciones premium. Consulta siempre la flota actual: cada barco muestra tarifas según temporada en el calendario de reserva.",
            "Lo habitual es que IVA, seguro, patrón y limpieza final estén incluidos; el combustible se factura aparte en muchos contratos de alquiler.",
          ],
        },
        {
          h2: "Comparar ofertas sin equivocarte",
          paragraphs: [
            "Compara el mismo tipo de jornada (mañana vs tarde vs día entero) y verifica qué extras son obligatorios. Un precio muy bajo sin patrón puede exigir licencia náutica que muchos turistas no tienen.",
            "Reservar directamente con una empresa local en Palma suele ofrecer mejor comunicación ante cambios de viento o reprogramación.",
          ],
        },
        {
          h2: "Formas de ahorrar",
          list: [
            "Temporada baja y días entre semana suelen ser más económicos.",
            "Medio día para grupos pequeños puede ser suficiente para varias calas cercanas.",
            "Revisa promociones activas en la web al reservar.",
          ],
        },
        {
          h2: "Cómo ver el precio exacto de tu fecha",
          paragraphs: [
            "Entra en la flota, elige barco y fecha: el total aparece antes de confirmar. Así sabes el coste real de tu alquiler de barco en Mallorca antes de pagar.",
          ],
        },
      ],
    },
    en: {
      kicker: "Pricing",
      h1: "How much does boat hire in Mallorca cost?",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "What affects the price",
          list: [
            "Vessel size and equipment.",
            "Season: low, mid or high.",
            "Duration: half-day, full day or sunset.",
          ],
        },
        {
          h2: "Indicative ranges in Palma",
          paragraphs: [
            "Skippered private charters typically start from several hundred euros for a half-day and rise for full days or premium boats. VAT, insurance and skipper are usually included; fuel is often extra.",
          ],
        },
        {
          h2: "Compare fairly",
          paragraphs: [
            "Match the same slot length and check if a licence is required. Booking locally in Palma helps when weather changes plans.",
          ],
        },
        {
          h2: "See your exact quote",
          paragraphs: ["Select boat and date on our fleet page — the total shows before you confirm."],
        },
      ],
    },
    de: {
      kicker: "Preise",
      h1: "Was kostet Boot mieten auf Mallorca?",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Preisfaktoren",
          list: ["Schiff", "Saison", "Dauer (Halbtag, Ganztag, Sonnenuntergang)"],
        },
        {
          h2: "Orientierung ab Palma",
          paragraphs: [
            "Mit Skipper ab mehreren hundert Euro für einen Halbtag — Ganztag und Premium-Schiffe mehr. MwSt., Versicherung und Skipper meist inklusive.",
          ],
        },
        {
          h2: "Exakten Preis sehen",
          paragraphs: ["Boot und Datum in der Flotte wählen — Summe vor Bestätigung sichtbar."],
        },
      ],
    },
    fr: {
      kicker: "Tarifs",
      h1: "Combien coûte une location de bateau à Majorque ?",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Facteurs de prix",
          list: ["Bateau", "saison", "durée (demi-journée, journée, coucher de soleil)"],
        },
        {
          h2: "Ordres de grandeur",
          paragraphs: [
            "Charter avec skipper à partir de quelques centaines d’euros la demi-journée. TVA, assurance et skipper en général inclus.",
          ],
        },
        {
          h2: "Prix exact",
          paragraphs: ["Choisissez bateau et date sur la flotte — total affiché avant validation."],
        },
      ],
    },
  },
  "/mejores-calas-barco-palma": {
    es: {
      kicker: "Rutas",
      h1: "Mejores calas en barco desde Palma",
      readMin: 6,
      published: "2026-05-23",
      sections: [
        {
          h2: "Bahía de Palma y costa cercana",
          paragraphs: [
            "En un medio día desde El Molinar puedes alcanzar calas de la bahía de Palma y el litoral de Calvià: aguas tranquilas ideales para baño y paddle surf a bordo. El patrón elige el fondeo según viento y oleaje del momento.",
          ],
        },
        {
          h2: "Hacia el sur: Es Trenc y más allá",
          paragraphs: [
            "Con jornada completa o salida temprana, muchos grupos apuntan a la costa sur — Es Trenc es famosa por su arena blanca, aunque conviene planificar horario para evitar saturación y respetar zonas de fondeo reguladas.",
          ],
        },
        {
          h2: "Serra de Tramuntana desde el mar",
          paragraphs: [
            "La costa norte es espectacular pero más expuesta; en charter privado se valora según previsión. Para días de norte fuerte, la bahía sur suele ser la opción más cómoda.",
          ],
        },
        {
          h2: "Calas para charter de atardecer",
          paragraphs: [
            "El turno de atardecer (unas tres horas) es perfecto para fotos, brindis y baño tranquilo cerca de Palma sin dedicar el día entero.",
          ],
        },
        {
          h2: "Consejos de tripulación local",
          list: [
            "Lleva mascarilla y tubo si te gusta snorkel — muchas calas tienen posidonia y vida marina.",
            "Respeta boyas y fondeos autorizados; el patrón conoce la normativa de cada zona.",
            "Combustible y tiempo de ida/vuelta limitan la distancia — comenta tu cala deseada al reservar.",
          ],
        },
        {
          h2: "Reserva tu ruta a medida",
          paragraphs: [
            "Cuéntanos tu idea (calas, comida, celebración) al reservar. Adaptamos la ruta a la duración contratada y las condiciones del día para un alquiler de barco seguro y memorable en Mallorca.",
          ],
        },
      ],
    },
    en: {
      kicker: "Routes",
      h1: "Best coves by boat from Palma",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Palma bay & nearby coast",
          paragraphs: [
            "A half-day from El Molinar covers calm coves in the bay and Calvià coast — ideal for swimming. Your skipper picks the anchorage for the day’s wind.",
          ],
        },
        {
          h2: "South coast & Es Trenc",
          paragraphs: [
            "Full-day charters can reach the famous south beaches; timing matters to avoid crowds and respect anchoring rules.",
          ],
        },
        {
          h2: "Sunset slot",
          paragraphs: [
            "A three-hour sunset trip is perfect for photos and a relaxed swim near Palma without a full day at sea.",
          ],
        },
        {
          h2: "Plan with us",
          paragraphs: ["Tell us your wish list when booking — we adapt the route to duration and weather."],
        },
      ],
    },
    de: {
      kicker: "Routen",
      h1: "Beste Buchten ab Palma",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Bucht von Palma",
          paragraphs: ["Halbtag reicht für ruhige Buchten und Badestopps — der Skipper wählt den Ankerplatz."],
        },
        {
          h2: "Südküste",
          paragraphs: ["Ganztag für Es Trenc und südliche Strände — Wetter und Zeitplan beachten."],
        },
        {
          h2: "Sonnenuntergang",
          paragraphs: ["Kurzer Charter am Abend — ideal für Fotos nahe Palma."],
        },
      ],
    },
    fr: {
      kicker: "Itinéraires",
      h1: "Meilleures criques en bateau depuis Palma",
      readMin: 5,
      published: "2026-05-23",
      sections: [
        {
          h2: "Baie de Palma",
          paragraphs: [
            "En demi-journée depuis El Molinar : criques calmes pour la baignade — le skipper choisit le mouillage.",
          ],
        },
        {
          h2: "Côte sud",
          paragraphs: ["Journée complète pour Es Trenc et le sud — respect des zones de mouillage."],
        },
        {
          h2: "Coucher de soleil",
          paragraphs: ["Créneau court le soir — photos et baignade près de Palma."],
        },
      ],
    },
  },
};

const RELATED = {
  "/alquiler-barco-mallorca-verano-2026": [
    { path: "/mejores-calas-barco-palma" },
    { path: "/cuanto-cuesta-alquilar-barco-mallorca" },
    { path: "/barcos-alquiler" },
  ],
  "/guia-alquiler-barco-mallorca": [
    { path: "/alquiler-barco-mallorca-verano-2026" },
    { path: "/cuanto-cuesta-alquilar-barco-mallorca" },
    { path: "/mejores-calas-barco-palma" },
    { path: "/alquiler-barco-mallorca" },
  ],
  "/cuanto-cuesta-alquilar-barco-mallorca": [
    { path: "/guia-alquiler-barco-mallorca" },
    { path: "/tarifas" },
    { path: "/barcos-alquiler" },
  ],
  "/mejores-calas-barco-palma": [
    { path: "/guia-alquiler-barco-mallorca" },
    { path: "/charter-palma" },
    { path: "/barcos-alquiler" },
  ],
};

const RELATED_LABELS = {
  "/alquiler-barco-mallorca-verano-2026": {
    es: "Verano 2026",
    en: "Summer 2026",
    de: "Sommer 2026",
    fr: "Été 2026",
  },
  "/guia-alquiler-barco-mallorca": {
    es: "Guía alquiler barco",
    en: "Boat hire guide",
    de: "Ratgeber Boot mieten",
    fr: "Guide location",
  },
  "/cuanto-cuesta-alquilar-barco-mallorca": {
    es: "Precios en Mallorca",
    en: "Mallorca pricing",
    de: "Preise Mallorca",
    fr: "Prix Majorque",
  },
  "/mejores-calas-barco-palma": {
    es: "Calas desde Palma",
    en: "Coves from Palma",
    de: "Buchten ab Palma",
    fr: "Criques depuis Palma",
  },
  "/alquiler-barco-mallorca": {
    es: "Alquiler barco Mallorca",
    en: "Boat hire Mallorca",
    de: "Boot mieten Mallorca",
    fr: "Location Majorque",
  },
  "/tarifas": { es: "Tarifas", en: "Rates", de: "Preise", fr: "Tarifs" },
  "/barcos-alquiler": { es: "Flota", en: "Fleet", de: "Flotte", fr: "Flotte" },
  "/charter-palma": { es: "Chárter Palma", en: "Charter Palma", de: "Charter Palma", fr: "Charter Palma" },
};

export function getBlogArticleUi(lang) {
  return UI[lang] || UI.es;
}

/** Guide cards for the home page “Guías” section. */
export function getHomeGuides(lang = "es") {
  return HOME_GUIDE_CARDS.map((card) => {
    const meta = getBlogArticleMeta(card.path, lang);
    const article = ARTICLES[card.path]?.[lang] || ARTICLES[card.path]?.es;
    const title = card.titles[lang] || card.titles.es;
    return {
      href: card.path,
      featured: !!card.featured,
      title,
      excerpt: meta?.description || "",
      readMin: article?.readMin || 5,
    };
  });
}

export function getBlogArticle(path, lang = "es") {
  const article = ARTICLES[path]?.[lang] || ARTICLES[path]?.es;
  if (!article) return null;
  const ui = getBlogArticleUi(lang);
  const related = (RELATED[path] || []).map((r) => ({
    href: r.path,
    label: RELATED_LABELS[r.path]?.[lang] || RELATED_LABELS[r.path]?.es || r.path,
  }));
  return { ...article, ui, related, path };
}

export function getBlogArticleMeta(path, lang = "es") {
  return SEO_BLOG_PATH_META[path]?.[lang] || SEO_BLOG_PATH_META[path]?.es || null;
}

export function isBlogPath(pathname) {
  const key = pathname.replace(/\/$/, "") || "/";
  return SEO_BLOG_PATHS.includes(key);
}

/** WebPage JSON-LD for guides (evita @type Article que activa Safari Vista lector). */
export function buildBlogArticleJsonLd(path, lang = "es") {
  const meta = getBlogArticleMeta(path, lang);
  const article = getBlogArticle(path, lang);
  if (!meta || !article) return null;
  const localized = buildLocalizedPath(path, lang);
  const url = `${SITE_ORIGIN}${localized === "/" ? "" : localized}`;
  return {
    "@type": "WebPage",
    name: article.h1,
    description: meta.description,
    datePublished: article.published,
    dateModified: article.published,
    url,
    isPartOf: { "@type": "WebSite", name: "Mallorca Island Yacht", url: SITE_ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "Mallorca Island Yacht",
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/icon-master.png` },
    },
    image: `${SITE_ORIGIN}/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp`,
  };
}
