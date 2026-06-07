import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { preferWebpUrl } from "./lib/prefer-webp-url.js";
import {
  normalizeBoatsForClient,
  normalizeBoatDesc,
  getBoatDescription,
  getBoatSpecs,
  normalizeSpecsI18nObject,
  parseCommaSeparatedSpecs,
  LS_LANG_KEY,
} from "./lib/boats-normalize.js";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation, Link, Routes, Route } from "react-router-dom";
import { SiteIcon, ContactInlineIcon, BrandWhatsAppIcon, BrandInstagramIcon, AdminNavIcon, DashboardStatIcon, Check, X } from "./site-icons.jsx";
import { Mail } from "lucide-react";
const ReviewsSection = lazy(() =>
  import("./ReviewsSection.jsx").then((m) => ({ default: m.ReviewsSection })),
);
const ReviewSubmitRoute = lazy(() =>
  import("./ReviewSubmitRoute.jsx").then((m) => ({ default: m.ReviewSubmitRoute })),
);
const SiteAnalyticsTracker = lazy(() =>
  import("./SiteAnalyticsTracker.jsx").then((m) => ({ default: m.SiteAnalyticsTracker })),
);
const AdminAnalyticsTab = lazy(() =>
  import("./AdminAnalyticsTab.jsx").then((m) => ({ default: m.AdminAnalyticsTab })),
);
const CheckoutPaymentPage = lazy(() =>
  import("./CheckoutPaymentPages.jsx").then((m) => ({ default: m.CheckoutPaymentSuccessPage })),
);
const CheckoutPaymentCancelPage = lazy(() =>
  import("./CheckoutPaymentPages.jsx").then((m) => ({ default: m.CheckoutPaymentCancelPage })),
);
import { createStripeCheckoutSession, refundStripePayment } from "./lib/checkout-api.js";
import { buildE164FromParts } from "../lib/phone.js";
import { DEFAULT_PHONE_COUNTRY_ISO } from "../lib/phone-countries.js";
import { BookingPhoneField } from "./components/BookingPhoneField.jsx";
import { SeoManager } from "./components/SeoManager.jsx";
import { FaqSection } from "./components/FaqSection.jsx";
import { BlogArticlePage } from "./components/BlogArticlePage.jsx";
import { GuidesSection } from "./components/GuidesSection.jsx";
import { RoutesFuelSection } from "./components/RoutesFuelSection.jsx";
import { EquipmentSection } from "./components/EquipmentSection.jsx";
import { FloatingBookingAccess } from "./components/FloatingBookingAccess.jsx";
import { SiteText } from "./components/SiteText.jsx";
import { fleetBoatImageAlt, parseLocalePath, buildLocalizedPath, localizeHref } from "./lib/seo.js";
import { SEO_BLOG_PATHS } from "./lib/seo-blog.js";
import { SEO_LOCALES } from "./lib/seo-locales.js";
import {
  subscribeReviews,
  adminUpdateReview,
  adminDeleteReview,
  adminSaveReviewGateToken,
  firebaseSignOut,
  isFirebaseConfigured,
} from "./lib/reviews-api.js";
import { formatFirebaseAuthError } from "./lib/firebase-auth-diagnostics.js";
import { getFirebaseAuth, getFirebaseRuntimeSummary, getFirestoreDb, getFirebaseConfigForPublicDebug } from "./lib/firebase-app.js";
import {
  subscribeLiveSitePublic,
  subscribeLiveSiteAdmin,
  pushLiveSiteSnapshot,
  getLiveSitePublicRawOnce,
  getLiveSitePublicOnce,
  readPublicSiteBootCache,
  writePublicSiteBootCache,
  normalizeSitePublicDocForClient,
  extractSitePublicLiveDocBoatsArray,
  mergePublishBoatsToSitePublicLive,
  filterBoatsForPublicLiveDoc,
  noteRemoteLiveSiteFingerprint,
} from "./lib/site-sync-api.js";
import {
  commitPublicBooking,
  subscribeFirestoreBlockedSlots,
  subscribeFirestoreBookings,
  updateBookingFirestore,
  cancelBookingFirestore,
  deleteBookingAndSlotFirestore,
  ensureBookingSlotBlockedFirestore,
} from "./lib/bookings-firestore.js";
import {
  VIP_CHARTER_DISCOUNT_PCT,
  DISCOUNT_PCT_OPTIONS,
  DISCOUNT_MAX_USES_OPTIONS,
  isAllowedDiscountPct,
  normalizeVipDiscountCode,
  generateRandomVipCode,
  resolveActiveDiscountCodePublic,
  subscribeDiscountCodesAdmin,
  createDiscountCodeFirestore,
  createMultiUseDiscountCodeFirestore,
  deleteDiscountCodeFirestore,
  isVipCodeAvailableLocal,
  markLocalVipCodeUsedOnce,
} from "./lib/discount-codes-firestore.js";
import brandLogo from "./assets/mallorca-island-yacht-logo-clean.png";
import brandLogoOnDark from "./assets/mallorca-island-yacht-logo-transparent.png";

/** Served from /public — not bundled in JS (saves ~5 MB on first load). */
const DEFAULT_SITE_BG_URL = "/2025-02-09-15-43-10-400.webp";
const DEFAULT_BOOKING_HERO_URL = "/71A7AFB6-CBFC-41D5-885B-D1040C3437E3.webp";

let backupsApiModule = null;
function loadBackupsApi() {
  backupsApiModule ||= import("./lib/backups-api.js");
  return backupsApiModule;
}
let firebaseAdminAuthModule = null;
function loadFirebaseAdminAuth() {
  firebaseAdminAuthModule ||= import("./lib/firebase-admin-auth.js");
  return firebaseAdminAuthModule;
}

function RouteChunkFallback() {
  return <div style={{ minHeight: "40vh" }} aria-hidden />;
}


// ═══════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════
const LANG_NAMES = { en:"English", es:"Español", de:"Deutsch", fr:"Français", sv:"Svenska" };
const T = {
  en:{
    bookBtn:"Book Now",adminLink:"Admin",
    navBrand:{kicker:"Mallorca Island Yacht",place:"Palma de Mallorca"},
    hero:{
      kicker:"Private Yacht Charter",
      title:"Yacht Charter in Palma, Mallorca",
      sub:"Sailboats, motor yachts and private boats. Flexible bookings with a professional skipper.",
      cta:"Book Your Charter",cta2:"Explore Fleet",
      offer:"✦  Special Offer — 25% off all June bookings  ✦",scroll:"Scroll to explore"
    },
    fleet:{title:"Boats in Palma",sub:"Private vessels for day charter and yacht hire from Palma de Mallorca",book:"Book This Boat",more:"More Photos",empty:"No vessels published yet.",emptyHint:"Add boats in Admin — they appear here automatically.",prevPhoto:"Previous photo",nextPhoto:"Next photo"},
    guides:{
      kicker:"Guides",
      title:"Boat hire in Mallorca — expert guides",
      sub:"Tips, prices, coves and summer 2026 planning from Palma",
      featured:"Featured",
      readMore:"Read guide",
      minRead:"min read",
    },
    faq:{
      kicker:"FAQ",
      title:"Boat hire in Mallorca — common questions",
      sub:"Quick answers before you book your private charter from Palma",
    },
    equipment:{
      kicker:"Equipment",
      title:"On-board equipment",
      sub:"Activities and extras to make the most of your day at sea",
      includedTitle:"Included at no extra cost",
      extraTitle:"Optional extra",
      badgeIncluded:"Included",
      badgeExtra:"Extra",
      consultPrice:"Ask for price",
      waMessage:"Hello, I would like to ask about the price for Video & Photo with Drone.",
      items:{
        seaScooter:{title:"Sea Scooter WattSup",desc:"Glide through the water with ease and explore the coast."},
        snorkel:{title:"Snorkel Kit",desc:"Mask, snorkel and fins to discover the underwater world."},
        paddle:{title:"Paddle Surf",desc:"Stand-up paddle board for calm bays and fun on the water."},
        drone:{title:"Video & Photo with Drone",desc:"Professional aerial footage and photos of your charter day."},
      },
    },
    routes:{
      kicker:"Routes",
      title:"Popular routes & approximate fuel cost",
      sub:"Indicative sailing times and fuel from El Molinar (round trip)",
      tableAria:"Frequent routes and approximate fuel consumption",
      colRoute:"Route",
      colTime:"Sailing time (approx., round trip)",
      colCost:"Fuel cost (approx., round trip)",
      open:"View map & photos",
      modalTitle:"Route",
      modalKicker:"Destination",
      photosAria:"Destination photo gallery",
      mapTitle:"Map",
      timeLabel:"Time (round trip)",
      costLabel:"Fuel (round trip)",
      openMap:"Open in Google Maps",
      close:"Close",
      disclaimer:"Approximate fuel consumption for reference only. Actual cost depends on the number of guests on board, cruising speed and sea conditions.",
    },
    policy:{
      title:"Private Charter",sub:"Your private boat charter in Mallorca — clear booking terms",
      items:[
        {icon:"refund_full",t:"Full Refund",d:"Cancellation 20+ days before the charter, or if wind gusts exceed 25 knots preventing safe departure"},
        {icon:"refund_half",t:"50% Refund",d:"Cancellations between 19 days and 48 hours before the charter"},
        {icon:"refund_none",t:"No Refund",d:"Less than 48 hours’ notice or no-show."},
        {icon:"included",t:"Always Included",d:"VAT · Insurance · Final cleaning · Professional skipper · Cooler"},
        {icon:"excluded",t:"Not Included",d:"Fuel · Catering · Drinks · Additional extras unless previously agreed"},
        {icon:"commitment",t:"Our Commitment",d:"In case of poor weather or crew or vessel unavailability, we offer rescheduling or a full refund. If we cannot deliver the reserved vessel, we will propose another similar vessel when possible, or an immediate full refund."}
      ]
    },
    contact:{title:"Ready to Set Sail?",sub:"Book your exclusive charter today",wa:"WhatsApp",dep:"Departure: El Molinar, Palma",ig:"Instagram",labelEmail:"Email",socialHeading:"WhatsApp, Instagram & email",ariaWa:"Open WhatsApp chat",ariaIg:"Open Instagram profile",ariaMail:"Send email",mapsAria:"Open meeting point in Google Maps"},
    floatingAccess:{
      regionAria:"Quick booking access",
      bookLabel:"Book",
      bookSub:"Online booking",
      bookAria:"Open online booking",
      waLabel:"WhatsApp",
      waSub:"Enquiries & bookings",
      waAria:"Contact or book via WhatsApp",
      waMessage:"Hi, I'd like to check availability and book a yacht charter in Mallorca.",
    },
    privacy:{
      linkLabel:"Data protection",
      close:"Close",
      title:"Privacy policy & personal data",
      updated:"Last updated: 9 May 2026",
      intro:"This notice describes how Mallorca Island Yacht S.L. processes personal data when you use our website, contact us, or book a private boat charter, in accordance with Regulation (EU) 2016/679 (GDPR) and applicable Spanish law (including Organic Law 3/2018 on personal data protection).",
      sections:[
        {title:"Data controller",body:"The controller is Mallorca Island Yacht S.L., offering private yacht charters in Mallorca. For privacy matters you can reach us at the email address shown below."},
        {title:"Purpose and legal basis",body:"We process identification and contact details (name, email, phone), booking information (dates, guests, vessel), messages you send us, and data needed to manage payments where applicable. Processing is necessary for the performance of a contract (Art. 6(1)(b) GDPR), compliance with legal obligations (Art. 6(1)(c)), and, where relevant, our legitimate interest in responding to enquiries and operating our services securely (Art. 6(1)(f))."},
        {title:"Retention",body:"Data are kept only as long as needed for these purposes, including statutory retention for accounting and tax records, and are then deleted or anonymised where possible."},
        {title:"Recipients",body:"Data may be processed on our behalf by trusted providers (e.g. hosting, booking or payment tools) under appropriate safeguards. Any international transfer will rely on mechanisms permitted under GDPR."},
        {title:"Your rights",body:"You may access, rectify, erase or restrict processing of your data, object to certain processing, and request portability where applicable. Where processing is based on consent, you may withdraw it at any time without affecting prior lawful processing."},
        {title:"Complaints",body:"You may lodge a complaint with the Spanish supervisory authority (Agencia Española de Protección de Datos — www.aepd.es), without prejudice to contacting us first."}
      ],
      contactLead:"Privacy enquiries and exercising your rights:"
    },
    reviewsNav:"Reviews",
    menuAria:"Open navigation menu",
    menuClose:"Close",
    navFleet:"Fleet",
    navGuides:"Guides",
    navContact:"Contact",
    reviews:{
      kicker:"Experiences",
      title:"Experiences",
      sub:"What guests say after their yacht charter from Palma",
      avgLabel:"Average rating",
      countWord:"reviews",
      empty:"No reviews published yet.",
      qrHint:"To leave a review, scan the QR code we share with guests after your charter.",
      expandComments:"Read guest comments",
      commentsGroupedHint:"Comments are grouped by star rating. Open each row to read them.",
      replyLabel:"Our reply",
      submitCopy:{
        loading:"Checking link…",
        deniedTitle:"Invalid link",
        deniedBody:"Reviews can only be submitted using the QR code link provided to guests.",
        home:"Back to website",
        thanksTitle:"Thank you!",
        thanksBody:"Your review has been saved and may appear on our website after moderation.",
        formTitle:"Leave a review",
        formSub:"Rate your experience on a private charter with us.",
        labelName:"Your name",
        labelStars:"Rating",
        labelText:"Your comments",
        submit:"Send review",
        sending:"Sending…",
        errSave:"Could not save your review. Please try again.",
      },
    },
    footer:{
      tagline:"Experience Mallorca from a different perspective",
      rights:"All rights reserved · Mallorca Island Yacht S.L.",
      seoLinks:[
        { href:"/alquiler-barco-mallorca", label:"Boat hire Mallorca" },
        { href:"/barcos-alquiler", label:"Boat hire Palma" },
        { href:"/charter-palma", label:"Yacht charter Palma" },
        { href:"/tarifas", label:"Charter rates" },
      ],
      blogGuides:[
        { href:"/alquiler-barco-mallorca-verano-2026", label:"Summer 2026" },
        { href:"/guia-alquiler-barco-mallorca", label:"Boat hire guide" },
        { href:"/cuanto-cuesta-alquilar-barco-mallorca", label:"Prices in Mallorca" },
        { href:"/mejores-calas-barco-palma", label:"Coves by boat" },
      ],
    },
    bk:{
      title:"Reserve Your Charter",steps:["Date & Duration","Your Details","Payment","Confirmed!"],
      selectDate:"Select a date",noDate:"Please select a date",
      pickDateFirst:"Select a date to see available charter slots.",
      slotsTitle:"Charter slots",
      fullDayTitle:"Full day",
      slotTaken:"Booked",
      partialBookedLegend:"Limited availability",
      slotUnavailable:"That slot is no longer available. Choose another.",
      dateBeyondHorizon:"Bookings can only be made up to 180 days in advance. Please choose an earlier date.",
      durs:[
        {id:"half_am",name:"Half Day · 4 hours (Morning)",price:550,sub:"9:00–13:00"},
        {id:"half_pm",name:"Half Day · 4 hours (Afternoon)",price:550,sub:"14:00–18:00"},
        {id:"full",name:"Full Day · 8 hours",price:850,sub:"11:00–19:00"},
        {id:"sunset",name:"Sunset · 3 hours",price:450,sub:"19:00–22:00"}
      ],
      skipper:"Skipper included",skipP:0,total:"Total",
      inc:"VAT · Insurance · Cleaning · Cooler included",
      notInc:"Fuel · Catering · Drinks not included",
      next:"Continue",back:"Back",pay:"Confirm & Pay Now",
      fname:"Full Name",femail:"Email Address",fphone:"Mobile phone",
      fphoneCountry:"Country",
      phoneCountrySearch:"Search country…",
      fphoneHint:"Select your country and enter your mobile number without the prefix. Required for SMS verification when paying by card.",
      phonePlaceholder:"612 345 678",
      phoneInvalid:"Enter a valid mobile number for the selected country.",
      stripePhoneNotice:"When paying by card, your bank or Stripe may send a verification SMS. Use the same number shown below at checkout.",
      stripeCheckoutRedirect:"After confirming, you’ll be redirected to Stripe Checkout to pay by card. Your slot is held while you complete payment.",
      fguests:"Number of guests (max {max})",fnotes:"Special Requests (optional)",
      secure:"Payment required to confirm the booking",
      confTitle:"Booking Confirmed!",
      confMsg:"Your charter has been reserved and fully paid. A confirmation has been sent to your email and our team will contact you 24h before.",
      confMsgProof:"Your booking request is saved. Please send proof of payment (screenshot or receipt) by email or WhatsApp quoting your booking reference so we can confirm your charter.",
      confRef:"Booking Reference",confBtn:"Return to Home",
      req:"Please complete all required fields",
      guestsOverCapacity:"This vessel allows a maximum of {max} guests. Please reduce the number.",
      paymentIntro:"Choose a payment method and follow the instructions below.",
      sendProofNotice:"After paying by Bizum or bank transfer, please send proof of payment (screenshot or PDF receipt) by email or WhatsApp. Include your booking reference in the message.",
      payCard:"Card (Stripe Checkout)",
      payBizum:"Bizum",
      payBank:"Bank transfer",
      payMethodLabel:"Payment mode",
      payChannelCard:"Card",
      payChannelCardSub:"Apple Pay, PayPal",
      payChannelOther:"Other",
      payChannelOtherSub:"Bizum, bank transfer",
      payCardHint:"Secure payment via Stripe. Your slot is held while you complete payment.",
      payCtaCard:"Pay {total}€ securely",
      payConfirmOther:"Confirm booking",
      paymentOtherIntro:"Pay by Bizum or bank transfer using the details below, then send us proof of payment.",
      payOtherUnavailable:"Alternative payment is not available online. Please contact us to book.",
      promoLabel:"VIP discount code (optional)",
      promoPlaceholder:"Enter your code",
      promoApply:"Apply",
      promoAppliedShort:"VIP code applied.",
      promoAppliedBadge:"VIP code applied: {code} (−{pct}%)",
      promoInvalid:"That code is not valid.",
      promoClear:"Remove",
      promoChecking:"Checking…",
      promoAlreadyUsed:"This code is no longer valid or has already been used.",
      promoExcludedSpecialDay:"This date is not eligible for promotional codes.",
      promoValidExceptSpecial:"Valid on all days except non-promotional dates.",
      stripeNeedsBackend:"Card payment requires Firebase and the deployed checkout API (Vercel).",
      stripeCheckoutError:"We could not start the card payment. Please try again or choose another payment method.",
    }
  },
  es:{
    bookBtn:"Reservar",adminLink:"Admin",
    navBrand:{kicker:"Mallorca Island Yacht",place:"Palma de Mallorca"},
    hero:{
      kicker:"Chárter privado en Palma",
      title:"Alquiler de Barcos en Palma de Mallorca",
      sub:"Embarcaciones privadas. Reserva flexible con patrón profesional incluido.",
      cta:"Reserva tu Chárter",cta2:"Ver Flota",
      offer:"✦  Oferta Especial — 25% dto. todas las reservas de junio  ✦",scroll:"Explorar"
    },
    fleet:{title:"Barcos en Palma",sub:"Embarcaciones para alquiler de barco y yacht charter desde Palma de Mallorca",book:"Reservar",more:"Más Fotos",empty:"Aún no hay embarcaciones publicadas.",emptyHint:"Añade barcos en Admin y aparecerán aquí al guardar.",prevPhoto:"Foto anterior",nextPhoto:"Foto siguiente"},
    guides:{
      kicker:"Guías",
      title:"Todo sobre alquiler de barco en Mallorca",
      sub:"Consejos, precios, calas y planificación del verano 2026",
      featured:"Destacado",
      readMore:"Ver guía",
      minRead:"min",
    },
    faq:{
      kicker:"Preguntas frecuentes",
      title:"Alquiler de barco en Mallorca — dudas habituales",
      sub:"Respuestas antes de reservar tu yacht charter desde Palma",
    },
    equipment:{
      kicker:"Equipamiento",
      title:"Equipamiento a bordo",
      sub:"Actividades y extras para disfrutar al máximo tu día en el mar",
      includedTitle:"Incluido sin coste",
      extraTitle:"Extra opcional",
      badgeIncluded:"Incluido",
      badgeExtra:"Extra",
      consultPrice:"Consultar precio",
      waMessage:"Hola, me gustaría consultar el precio del servicio de Vídeo y Foto con Drone.",
      items:{
        seaScooter:{title:"Sea Scooter WattSup",desc:"Deslízate por el agua y explora la costa con facilidad."},
        snorkel:{title:"Equipo de Snorkel",desc:"Máscara, tubo y aletas para descubrir el fondo marino."},
        paddle:{title:"Paddle Surf",desc:"Tabla de paddle para calas tranquilas y diversión en el agua."},
        drone:{title:"Vídeo y Foto con Drone",desc:"Grabación y fotografía aérea profesional de tu día de chárter."},
      },
    },
    routes:{
      kicker:"Rutas",
      title:"Rutas frecuentes y carburante aproximado",
      sub:"Tiempos de navegación y coste orientativo desde El Molinar (ida y vuelta)",
      tableAria:"Rutas frecuentes y consumo aproximado de carburante",
      colRoute:"Ruta",
      colTime:"Tiempo de navegación aprox. (ida y vuelta)",
      colCost:"Coste carburante aprox. (ida y vuelta)",
      open:"Ver mapa y fotos",
      modalTitle:"Ruta",
      modalKicker:"Destino",
      photosAria:"Galería de fotos del destino",
      mapTitle:"Mapa",
      timeLabel:"Tiempo (ida y vuelta)",
      costLabel:"Carburante (ida y vuelta)",
      openMap:"Abrir en Google Maps",
      close:"Cerrar",
      photoCredit:"Fotos de referencia de cada destino (Google Maps / lugares públicos).",
      disclaimer:"Importes aproximados de consumo de carburante para tener referencias; el importe varía en función de la cantidad de personas a bordo, la velocidad de desplazamiento y el estado de la mar.",
    },
    policy:{
      title:"Chárter Privado",sub:"Tu charter náutico privado en Mallorca — condiciones de reserva claras",
      items:[
        {icon:"refund_full",t:"Reembolso Total",d:"Cancelación con 20+ días de antelación o si el viento supera 25 nudos impidiendo la salida segura"},
        {icon:"refund_half",t:"Reembolso del 50%",d:"Cancelaciones entre 19 días y 48 horas antes del chárter"},
        {icon:"refund_none",t:"Sin Reembolso",d:"Cancelaciones con menos de 48 horas de antelación o no presentación."},
        {icon:"included",t:"Siempre Incluido",d:"IVA · Seguro · Limpieza final · Patrón profesional · Nevera"},
        {icon:"excluded",t:"No Incluido",d:"Combustible · Catering · Bebidas · Extras adicionales salvo acuerdo previo"},
        {icon:"commitment",t:"Nuestro Compromiso",d:"Ante mal tiempo o la indisponibilidad de tripulación o embarcación, ofrecemos reprogramación o devolución íntegra. Si no pudiéramos cumplir con la embarcación reservada, propondremos otra embarcación similar si es posible, o el reembolso completo de forma inmediata."}
      ]
    },
    contact:{title:"¿Listo para Zarpar?",sub:"Reserva tu chárter exclusivo hoy",wa:"WhatsApp",dep:"Salida: El Molinar, Palma",ig:"Instagram",labelEmail:"Correo",socialHeading:"WhatsApp, Instagram y correo",ariaWa:"Abrir WhatsApp",ariaIg:"Abrir Instagram",ariaMail:"Enviar correo",mapsAria:"Abrir el punto de encuentro en Google Maps"},
    floatingAccess:{
      regionAria:"Acceso rápido a reserva",
      bookLabel:"Reservar",
      bookSub:"Reserva online",
      bookAria:"Abrir reserva online",
      waLabel:"WhatsApp",
      waSub:"Consultas y reservas",
      waAria:"Consultar o reservar por WhatsApp",
      waMessage:"Hola, me gustaría consultar disponibilidad y reservar un chárter en Mallorca.",
    },
    privacy:{
      linkLabel:"Protección de datos",
      close:"Cerrar",
      title:"Política de privacidad y datos personales",
      updated:"Última actualización: 9 de mayo de 2026",
      intro:"En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de protección de datos personales y garantía de los derechos digitales (LOPDGDD), Mallorca Island Yacht S.L. le informa sobre el tratamiento de sus datos al usar esta web, contactarnos o contratar servicios de chárter náutico.",
      sections:[
        {title:"Responsable del tratamiento",body:"Responsable: Mallorca Island Yacht S.L. El tratamiento tiene como finalidades principales gestionar consultas y reservas, mantener la relación contractual, cumplir obligaciones legales y atender sus comunicaciones."},
        {title:"Datos y legitimación",body:"Tratamos datos identificativos y de contacto (nombre, email, teléfono), datos de la reserva (fechas, número de personas, embarcación), información necesaria para el cobro cuando proceda, y el contenido de sus mensajes. La base jurídica es la ejecución del contrato o medidas precontractuales (art. 6.1.b RGPD), el cumplimiento de obligaciones legales (art. 6.1.c) y, en su caso, el interés legítimo en responder solicitudes y garantizar el servicio (art. 6.1.f)."},
        {title:"Conservación",body:"Los datos se conservan el tiempo necesario para las finalidades indicadas y los plazos legales aplicables en materia mercantil, fiscal y contable; después se suprimen o anonimizan cuando ya no sean necesarios."},
        {title:"Destinatarios",body:"Podrán acceder a sus datos encargados de tratamiento estrictamente necesarios (alojamiento web, gestión de reservas o cobros), con las garantías exigidas por la normativa. Las transferencias internacionales, si las hubiera, se realizan con las salvaguardas previstas en el RGPD."},
        {title:"Derechos",body:"Puede ejercer los derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición, así como retirar el consentimiento en su caso, escribiendo al correo indicado. También puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es)."}
      ],
      contactLead:"Consultas de privacidad y ejercicio de derechos:"
    },
    reviewsNav:"Reseñas",
    menuAria:"Abrir menú de navegación",
    menuClose:"Cerrar",
    navFleet:"Flota",
    navGuides:"Guías",
    navContact:"Contacto",
    reviews:{
      kicker:"Experiencias",
      title:"Experiencias",
      sub:"La opinión de quienes han disfrutado su alquiler de barco y chárter con nosotros",
      avgLabel:"Valoración media",
      countWord:"reseñas",
      empty:"Aún no hay reseñas publicadas.",
      qrHint:"Para dejar una reseña, escanea el código QR que facilitamos a los clientes tras el chárter.",
      expandComments:"Leer comentarios de clientes",
      commentsGroupedHint:"Los comentarios están agrupados por valoración. Abre cada apartado para leerlos.",
      replyLabel:"Respuesta",
      submitCopy:{
        loading:"Verificando enlace…",
        deniedTitle:"Enlace no válido",
        deniedBody:"Las reseñas solo se pueden enviar con el enlace del código QR facilitado a los clientes.",
        home:"Volver al sitio",
        thanksTitle:"¡Gracias!",
        thanksBody:"Tu reseña se ha guardado y puede publicarse en la web tras revisión.",
        formTitle:"Tu reseña",
        formSub:"Valora tu experiencia de chárter con nosotros.",
        labelName:"Tu nombre",
        labelStars:"Valoración",
        labelText:"Comentario",
        submit:"Enviar reseña",
        sending:"Enviando…",
        errSave:"No se pudo guardar. Inténtalo de nuevo.",
      },
    },
    footer:{
      tagline:"Experimenta Mallorca desde otra perspectiva",
      rights:"Todos los derechos reservados · Mallorca Island Yacht S.L.",
      seoLinks:[
        { href:"/alquiler-barco-mallorca", label:"Alquiler barco Mallorca" },
        { href:"/barcos-alquiler", label:"Alquiler de barcos" },
        { href:"/charter-palma", label:"Chárter en Palma" },
        { href:"/tarifas", label:"Tarifas" },
      ],
      blogGuides:[
        { href:"/alquiler-barco-mallorca-verano-2026", label:"Verano 2026" },
        { href:"/guia-alquiler-barco-mallorca", label:"Guía alquiler barco" },
        { href:"/cuanto-cuesta-alquilar-barco-mallorca", label:"¿Cuánto cuesta?" },
        { href:"/mejores-calas-barco-palma", label:"Mejores calas" },
      ],
    },
    bk:{
      title:"Reserva tu Chárter",steps:["Fecha y Duración","Tus Datos","Pago","¡Confirmado!"],
      selectDate:"Selecciona una fecha",noDate:"Por favor selecciona una fecha",
      pickDateFirst:"Elige una fecha para ver los turnos disponibles.",
      slotsTitle:"Turnos disponibles",
      fullDayTitle:"Día completo",
      slotTaken:"Reservado",
      partialBookedLegend:"Plazas limitadas",
      slotUnavailable:"Ese turno ya no está disponible. Elige otro.",
      dateBeyondHorizon:"Las reservas solo pueden hacerse con hasta 180 días de antelación. Elige una fecha más cercana.",
      durs:[
        {id:"half_am",name:"Medio Día · 4 horas (Mañana)",price:550,sub:"9:00–13:00 h"},
        {id:"half_pm",name:"Medio Día · 4 horas (Tarde)",price:550,sub:"14:00–18:00 h"},
        {id:"full",name:"Día Completo · 8 horas",price:850,sub:"11:00–19:00 h"},
        {id:"sunset",name:"Atardecer · 3 horas",price:450,sub:"19:00–22:00 h"}
      ],
      skipper:"Patrón incluido",skipP:0,total:"Total",
      inc:"IVA · Seguro · Limpieza · Nevera incluido",
      notInc:"Combustible · Catering · Bebidas no incluido",
      next:"Continuar",back:"Volver",pay:"Confirmar y Pagar",
      fname:"Nombre Completo",femail:"Email",fphone:"Teléfono móvil",
      fphoneCountry:"País",
      phoneCountrySearch:"Buscar país…",
      fphoneHint:"Elige tu país e introduce el móvil sin prefijo. Necesario para el SMS de verificación al pagar con tarjeta.",
      phonePlaceholder:"612 345 678",
      phoneInvalid:"Introduce un móvil válido para el país seleccionado.",
      stripePhoneNotice:"Al pagar con tarjeta, tu banco o Stripe pueden enviarte un SMS de verificación. Usa el mismo número que aparece abajo en el pago.",
      stripeCheckoutRedirect:"Al confirmar, serás redirigido a Stripe Checkout para pagar con tarjeta. Tu plaza queda reservada mientras completas el pago.",
      fguests:"Número de personas (máx. {max})",fnotes:"Solicitudes Especiales (opcional)",
      secure:"Pago requerido para confirmar la reserva",
      confTitle:"¡Reserva Confirmada!",
      confMsg:"Tu chárter ha sido reservado y pagado. Se ha enviado confirmación a tu email y el equipo contactará contigo 24h antes.",
      confMsgProof:"Tu solicitud de reserva está registrada. Envíanos el comprobante de pago (captura o PDF) por email o WhatsApp indicando la referencia de reserva para confirmar el chárter.",
      confRef:"Referencia de Reserva",confBtn:"Volver al Inicio",req:"Rellena todos los campos requeridos",
      guestsOverCapacity:"Esta embarcación admite un máximo de {max} personas. Reduce el número.",
      paymentIntro:"Elige la forma de pago y sigue las instrucciones.",
      sendProofNotice:"Después de pagar por Bizum o transferencia, envíanos el comprobante de pago (captura o PDF) por email o WhatsApp. Indica siempre la referencia de tu reserva.",
      payCard:"Tarjeta (Stripe Checkout)",
      payBizum:"Bizum",
      payBank:"Transferencia bancaria",
      payMethodLabel:"Modo de pago",
      payChannelCard:"Tarjeta",
      payChannelCardSub:"Apple Pay, PayPal",
      payChannelOther:"Otros",
      payChannelOtherSub:"Bizum, Transferencia",
      payCardHint:"Pago seguro con Stripe. Tu plaza queda reservada mientras completas el pago.",
      payCtaCard:"Pagar {total}€ de forma segura",
      payConfirmOther:"Confirmar reserva",
      paymentOtherIntro:"Realiza el pago por Bizum o transferencia con los datos siguientes y envíanos el comprobante.",
      payOtherUnavailable:"El pago alternativo no está disponible en la web. Contáctanos para reservar.",
      stripeNeedsBackend:"El pago con tarjeta requiere Firebase y la API de checkout desplegada (Vercel).",
      stripeCheckoutError:"No se pudo iniciar el pago con tarjeta. Inténtalo de nuevo u elige otro método.",
      promoLabel:"Código VIP de descuento (opcional)",
      promoPlaceholder:"Introduce tu código",
      promoApply:"Aplicar",
      promoAppliedShort:"Código VIP aplicado.",
      promoAppliedBadge:"Código VIP aplicado: {code} (−{pct}%)",
      promoInvalid:"Ese código no es válido.",
      promoClear:"Quitar",
      promoChecking:"Comprobando…",
      promoAlreadyUsed:"Este código ya no es válido o ya se ha utilizado.",
      promoExcludedSpecialDay:"Este día no está sujeto a promoción.",
      promoValidExceptSpecial:"Válido para todos los días excepto días no promocionales.",
    }
  },
  de:{
    bookBtn:"Buchen",adminLink:"Admin",
    navBrand:{kicker:"Mallorca Island Yacht",place:"Palma de Mallorca"},
    hero:{
      kicker:"Privater Bootscharter",
      title:"Boot mieten & Yachtcharter in Palma",
      sub:"Yachten, Segelboote und Motorboote ab Palma de Mallorca. Flexible Buchung mit Skipper.",
      cta:"Jetzt Buchen",cta2:"Flotte ansehen",
      offer:"✦  Sonderangebot — 25% Rabatt auf alle Juni-Buchungen  ✦",scroll:"Entdecken"
    },
    fleet:{title:"Boote in Palma",sub:"Boote und Yachten zum Charter und Mieten ab Palma de Mallorca",book:"Buchen",more:"Mehr Fotos",prevPhoto:"Vorheriges Foto",nextPhoto:"Nächstes Foto"},
    guides:{
      kicker:"Ratgeber",
      title:"Boot mieten auf Mallorca — Guides",
      sub:"Tipps, Preise, Buchten und Sommer 2026 ab Palma",
      featured:"Highlight",
      readMore:"Guide lesen",
      minRead:"Min.",
    },
    faq:{
      kicker:"FAQ",
      title:"Boot mieten auf Mallorca — häufige Fragen",
      sub:"Antworten vor Ihrer Charter-Buchung ab Palma",
    },
    equipment:{
      kicker:"Ausstattung",
      title:"Ausstattung an Bord",
      sub:"Aktivitäten und Extras für einen perfekten Tag auf dem Meer",
      includedTitle:"Ohne Aufpreis inklusive",
      extraTitle:"Optionales Extra",
      badgeIncluded:"Inklusive",
      badgeExtra:"Extra",
      consultPrice:"Preis anfragen",
      waMessage:"Hallo, ich möchte den Preis für Video & Foto mit Drohne erfragen.",
      items:{
        seaScooter:{title:"Sea Scooter WattSup",desc:"Gleiten Sie mühelos durchs Wasser und erkunden Sie die Küste."},
        snorkel:{title:"Schnorchelausrüstung",desc:"Maske, Schnorchel und Flossen für die Unterwasserwelt."},
        paddle:{title:"Paddle Surf",desc:"Stand-up-Paddle für ruhige Buchten und Spaß auf dem Wasser."},
        drone:{title:"Video & Foto mit Drohne",desc:"Professionelle Luftaufnahmen und Fotos Ihres Charter-Tages."},
      },
    },
    routes:{
      kicker:"Routen",
      title:"Häufige Routen & ungefährer Kraftstoffverbrauch",
      sub:"Orientierungszeiten und Kraftstoff ab El Molinar (Hin- und Rückfahrt)",
      tableAria:"Häufige Routen und ungefährer Kraftstoffverbrauch",
      colRoute:"Route",
      colTime:"Fahrtzeit ca. (Hin und Rück)",
      colCost:"Kraftstoff ca. (Hin und Rück)",
      open:"Karte & Fotos ansehen",
      modalTitle:"Route",
      modalKicker:"Ziel",
      photosAria:"Fotogalerie des Ziels",
      mapTitle:"Karte",
      timeLabel:"Zeit (Hin und Rück)",
      costLabel:"Kraftstoff (Hin und Rück)",
      openMap:"In Google Maps öffnen",
      close:"Schließen",
      disclaimer:"Ungefähre Kraftstoffkosten nur als Orientierung. Der tatsächliche Betrag hängt von der Personenzahl an Bord, der Reisegeschwindigkeit und dem Seegang ab.",
    },
    policy:{
      title:"Privater Charter",sub:"Ihr privater Yachtcharter auf Mallorca — transparente Buchungsbedingungen",
      items:[
        {icon:"refund_full",t:"Volle Erstattung",d:"Stornierung 20+ Tage vorher oder bei Windböen über 25 Knoten"},
        {icon:"refund_half",t:"50% Erstattung",d:"Stornierungen zwischen 19 Tagen und 48 Stunden vor dem Charter"},
        {icon:"refund_none",t:"Keine Erstattung",d:"Weniger als 48 Stunden Vorankündigung oder Nichterscheinen."},
        {icon:"included",t:"Immer Inklusive",d:"MwSt. · Versicherung · Endreinigung · Skipper · Getränke & Kühlbox"},
        {icon:"excluded",t:"Nicht Inklusive",d:"Kraftstoff · Catering · Extras (sofern nicht vereinbart)"},
        {icon:"commitment",t:"Unser Versprechen",d:"Bei schlechtem Wetter oder Ausfall von Crew oder Schiff bieten wir Umbuchung oder volle Erstattung. Können wir das gebuchte Schiff nicht bereitstellen, schlagen wir —sofern möglich— ein vergleichbares Ersatzschiff oder eine sofortige Vollerstattung vor."}
      ]
    },
    contact:{title:"Bereit zum Ablegen?",sub:"Buchen Sie Ihren exklusiven Charter heute",wa:"WhatsApp",dep:"Abfahrt: El Molinar, Palma",ig:"Instagram",labelEmail:"E-Mail",socialHeading:"WhatsApp, Instagram und E-Mail",ariaWa:"WhatsApp öffnen",ariaIg:"Instagram-Profil öffnen",ariaMail:"E-Mail senden",mapsAria:"Treffpunkt in Google Maps öffnen"},
    floatingAccess:{
      regionAria:"Schneller Buchungszugang",
      bookLabel:"Buchen",
      bookSub:"Online buchen",
      bookAria:"Online-Buchung öffnen",
      waLabel:"WhatsApp",
      waSub:"Anfragen & Buchung",
      waAria:"Per WhatsApp anfragen oder buchen",
      waMessage:"Hallo, ich möchte Verfügbarkeit prüfen und einen Yachtcharter auf Mallorca buchen.",
    },
    privacy:{
      linkLabel:"Datenschutz",
      close:"Schließen",
      title:"Datenschutzerklärung",
      updated:"Stand: 9. Mai 2026",
      intro:"Mallorca Island Yacht S.L. informiert gemäß DSGVO und spanischem Datenschutzrecht über die Verarbeitung personenbezogener Daten bei Nutzung dieser Website, Anfragen und Charterbuchungen.",
      sections:[
        {title:"Verantwortlicher",body:"Verantwortlich: Mallorca Island Yacht S.L. Kontakt für Datenschutz: siehe E-Mail unten."},
        {title:"Zwecke und Rechtsgrundlagen",body:"Wir verarbeiten Kontakt- und Buchungsdaten zur Vertragsanbahnung und -erfüllung, zur Erfüllung rechtlicher Pflichten und zur Bearbeitung Ihrer Anfragen (Art. 6 Abs. 1 lit. b, c, f DSGVO)."},
        {title:"Speicherdauer",body:"Daten werden nur so lange gespeichert, wie es für diese Zwecke und gesetzliche Aufbewahrungsfristen erforderlich ist."},
        {title:"Empfänger",body:"Einsatz von Auftragsverarbeitern (z. B. Hosting, Zahlungsabwicklung) unter datenschutzrechtlichen Vereinbarungen. Internationale Übermittlungen nur mit geeigneten Garantien."},
        {title:"Ihre Rechte",body:"Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Beschwerde bei einer Aufsichtsbehörde (z. B. Spanien: AEPD) bleibt unberührt."}
      ],
      contactLead:"Datenschutz-Anfragen und Rechte:"
    },
    reviewsNav:"Bewertungen",
    menuAria:"Navigationsmenü öffnen",
    menuClose:"Schließen",
    navFleet:"Flotte",
    navGuides:"Ratgeber",
    navContact:"Kontakt",
    reviews:{
      kicker:"Erlebnisse",
      title:"Erlebnisse",
      sub:"Was Gäste nach ihrem Bootscharter und Yachtcharter in Palma berichten",
      avgLabel:"Durchschnitt",
      countWord:"Bewertungen",
      empty:"Noch keine Bewertungen.",
      qrHint:"Um eine Bewertung abzugeben, scannen Sie den QR-Code, den wir Gästen nach dem Charter zur Verfügung stellen.",
      expandComments:"Gästekommentare lesen",
      commentsGroupedHint:"Kommentare sind nach Sternen gruppiert. Öffnen Sie jede Zeile zum Lesen.",
      replyLabel:"Antwort",
      submitCopy:{
        loading:"Link wird geprüft…",
        deniedTitle:"Ungültiger Link",
        deniedBody:"Bewertungen sind nur über den QR-Code-Link für Gäste möglich.",
        home:"Zur Website",
        thanksTitle:"Danke!",
        thanksBody:"Ihre Bewertung wurde gespeichert.",
        formTitle:"Bewertung abgeben",
        formSub:"Wie war Ihr Charter mit uns?",
        labelName:"Ihr Name",
        labelStars:"Sterne",
        labelText:"Kommentar",
        submit:"Senden",
        sending:"Wird gesendet…",
        errSave:"Speichern fehlgeschlagen. Bitte erneut versuchen.",
      },
    },
    footer:{
      tagline:"Erleben Sie Mallorca aus einer anderen Perspektive",
      rights:"Alle Rechte vorbehalten · Mallorca Island Yacht S.L.",
      seoLinks:[
        { href:"/alquiler-barco-mallorca", label:"Boot mieten Mallorca" },
        { href:"/barcos-alquiler", label:"Boot mieten Palma" },
        { href:"/charter-palma", label:"Yachtcharter Palma" },
        { href:"/tarifas", label:"Charterpreise" },
      ],
      blogGuides:[
        { href:"/alquiler-barco-mallorca-verano-2026", label:"Sommer 2026" },
        { href:"/guia-alquiler-barco-mallorca", label:"Ratgeber" },
        { href:"/cuanto-cuesta-alquilar-barco-mallorca", label:"Preise" },
        { href:"/mejores-calas-barco-palma", label:"Buchten" },
      ],
    },
    bk:{
      title:"Charter Buchen",steps:["Datum & Dauer","Ihre Daten","Zahlung","Bestätigt!"],
      selectDate:"Datum auswählen",noDate:"Bitte wählen Sie ein Datum",
      pickDateFirst:"Wählen Sie ein Datum, um freie Termine zu sehen.",
      slotsTitle:"Charter-Zeiten",
      fullDayTitle:"Ganztägig",
      slotTaken:"Gebucht",
      partialBookedLegend:"Begrenzte Verfügbarkeit",
      slotUnavailable:"Dieser Termin ist nicht mehr frei. Bitte andere Wahl.",
      dateBeyondHorizon:"Buchungen sind nur bis zu 180 Tage im Voraus möglich. Bitte ein früheres Datum wählen.",
      durs:[
        {id:"half_am",name:"Halbtag · 4 Std. (Vormittag)",price:550,sub:"9–13 Uhr"},
        {id:"half_pm",name:"Halbtag · 4 Std. (Nachmittag)",price:550,sub:"14–18 Uhr"},
        {id:"full",name:"Ganztag · 8 Stunden",price:850,sub:"11–19 Uhr"},
        {id:"sunset",name:"Sonnenuntergang · 3 Std.",price:450,sub:"19–22 Uhr"}
      ],
      skipper:"Skipper inklusive",skipP:0,total:"Gesamt",
      inc:"MwSt. · Versicherung · Reinigung · Getränke inkl.",
      notInc:"Kraftstoff · Catering nicht inkl.",
      next:"Weiter",back:"Zurück",pay:"Bestätigen & Zahlen",
      fname:"Vollständiger Name",femail:"E-Mail",fphone:"Mobiltelefon",
      fphoneCountry:"Land",
      fphoneHint:"Land wählen und Mobilnummer ohne Vorwahl eingeben. Für die SMS-Bestätigung bei Kartenzahlung erforderlich.",
      phonePlaceholder:"612 345 678",
      phoneInvalid:"Bitte eine gültige Mobilnummer für das gewählte Land eingeben.",
      stripePhoneNotice:"Bei Kartenzahlung kann Ihre Bank oder Stripe eine Bestätigungs-SMS senden. Verwenden Sie dieselbe Nummer wie unten angezeigt.",
      stripeCheckoutRedirect:"Nach der Bestätigung werden Sie zu Stripe Checkout weitergeleitet. Ihr Termin bleibt reserviert, bis die Zahlung abgeschlossen ist.",
      fguests:"Anzahl Gäste (max. {max})",fnotes:"Besondere Wünsche (optional)",
      secure:"Zahlung erforderlich, um die Buchung zu bestätigen",
      confTitle:"Buchung Bestätigt!",
      confMsg:"Ihr Charter ist gebucht. Bestätigung an Ihre E-Mail gesendet. Unser Team kontaktiert Sie 24h vorher.",
      confMsgProof:"Ihre Buchungsanfrage ist gespeichert. Bitte senden Sie uns den Zahlungsnachweis (Screenshot oder PDF) per E-Mail oder WhatsApp mit der Buchungsreferenz zur Bestätigung.",
      confRef:"Buchungsreferenz",confBtn:"Zurück zur Startseite",req:"Bitte alle Pflichtfelder ausfüllen",
      guestsOverCapacity:"Für dieses Schiff sind maximal {max} Gäste möglich. Bitte die Anzahl verringern.",
      paymentIntro:"Wählen Sie eine Zahlungsart und folgen Sie den Anweisungen.",
      sendProofNotice:"Nach Zahlung per Bizum oder Überweisung senden Sie uns bitte den Zahlungsnachweis (Screenshot oder PDF) per E-Mail oder WhatsApp. Geben Sie immer Ihre Buchungsreferenz an.",
      payCard:"Karte (Stripe Checkout)",
      payBizum:"Bizum",
      payBank:"Banküberweisung",
      payMethodLabel:"Zahlungsmodus",
      payChannelCard:"Karte",
      payChannelCardSub:"Apple Pay, PayPal",
      payChannelOther:"Sonstige",
      payChannelOtherSub:"Bizum, Überweisung",
      payCardHint:"Sichere Zahlung über Stripe. Ihr Termin bleibt reserviert, bis die Zahlung abgeschlossen ist.",
      payCtaCard:"{total}€ sicher bezahlen",
      payConfirmOther:"Buchung bestätigen",
      paymentOtherIntro:"Zahlen Sie per Bizum oder Überweisung mit den untenstehenden Daten und senden Sie uns den Zahlungsnachweis.",
      payOtherUnavailable:"Alternative Zahlung ist online nicht verfügbar. Bitte kontaktieren Sie uns.",
      stripeNeedsBackend:"Kartenzahlung erfordert Firebase und die bereitgestellte Checkout-API (Vercel).",
      stripeCheckoutError:"Kartenzahlung konnte nicht gestartet werden. Bitte erneut versuchen oder eine andere Zahlungsart wählen.",
      promoLabel:"VIP-Rabattcode (optional)",
      promoPlaceholder:"Code eingeben",
      promoApply:"Anwenden",
      promoAppliedShort:"VIP-Code angewendet.",
      promoAppliedBadge:"VIP-Code angewendet: {code} (−{pct}%)",
      promoInvalid:"Dieser Code ist ungültig.",
      promoClear:"Entfernen",
      promoChecking:"Wird geprüft…",
      promoAlreadyUsed:"Dieser Code ist ungültig oder wurde bereits verwendet.",
      promoExcludedSpecialDay:"An diesem Datum sind keine Aktionscodes gültig.",
      promoValidExceptSpecial:"Gültig an allen Tagen außer nicht werbefähigen Tagen.",
    }
  },
  fr:{
    bookBtn:"Réserver",adminLink:"Admin",
    navBrand:{kicker:"Mallorca Island Yacht",place:"Palma de Majorque"},
    hero:{
      kicker:"Charter privé à Palma",
      title:"Location de bateau à Palma de Majorque",
      sub:"Yachts, voiliers et bateaux privés. Réservation flexible avec skipper professionnel.",
      cta:"Réserver Votre Charter",cta2:"Voir la Flotte",
      offer:"✦  Offre Spéciale — 25% de réduction sur toutes les réservations de juin  ✦",scroll:"Explorer"
    },
    fleet:{title:"Bateaux à Palma",sub:"Embarcations pour location yacht et charter privé au départ de Palma",book:"Réserver",more:"Plus de Photos",empty:"Aucun bateau publié pour le moment.",emptyHint:"Ajoutez des bateaux dans l’admin — ils s’affichent ici.",prevPhoto:"Photo précédente",nextPhoto:"Photo suivante"},
    guides:{
      kicker:"Guides",
      title:"Location de bateau à Majorque — nos guides",
      sub:"Conseils, tarifs, criques et été 2026 au départ de Palma",
      featured:"À la une",
      readMore:"Lire le guide",
      minRead:"min",
    },
    faq:{
      kicker:"Questions fréquentes",
      title:"Location de bateau à Majorque — FAQ",
      sub:"Réponses avant de réserver votre charter au départ de Palma",
    },
    equipment:{
      kicker:"Équipement",
      title:"Équipement à bord",
      sub:"Activités et extras pour profiter au maximum de votre journée en mer",
      includedTitle:"Inclus sans frais",
      extraTitle:"Extra optionnel",
      badgeIncluded:"Inclus",
      badgeExtra:"Extra",
      consultPrice:"Demander le prix",
      waMessage:"Bonjour, je souhaite connaître le prix du service Vidéo et Photo avec Drone.",
      items:{
        seaScooter:{title:"Sea Scooter WattSup",desc:"Glissez sur l'eau et explorez la côte en toute simplicité."},
        snorkel:{title:"Équipement de Snorkel",desc:"Masque, tuba et palmes pour découvrir les fonds marins."},
        paddle:{title:"Paddle Surf",desc:"Planche de paddle pour les criques calmes et le plaisir sur l'eau."},
        drone:{title:"Vidéo et Photo avec Drone",desc:"Prises de vue aériennes et photos professionnelles de votre charter."},
      },
    },
    routes:{
      kicker:"Itinéraires",
      title:"Itinéraires fréquents & carburant approximatif",
      sub:"Temps de navigation et coût indicatif depuis El Molinar (aller-retour)",
      tableAria:"Itinéraires fréquents et consommation de carburant approximative",
      colRoute:"Itinéraire",
      colTime:"Temps de navigation env. (aller-retour)",
      colCost:"Carburant env. (aller-retour)",
      open:"Voir carte et photos",
      modalTitle:"Itinéraire",
      modalKicker:"Destination",
      photosAria:"Galerie de photos de la destination",
      mapTitle:"Carte",
      timeLabel:"Temps (aller-retour)",
      costLabel:"Carburant (aller-retour)",
      openMap:"Ouvrir dans Google Maps",
      close:"Fermer",
      disclaimer:"Montants approximatifs de carburant à titre indicatif ; le coût réel varie selon le nombre de personnes à bord, la vitesse de croisière et l’état de la mer.",
    },
    policy:{
      title:"Charter Privé",sub:"Votre charter nautique privé à Majorque — conditions de réservation claires",
      items:[
        {icon:"refund_full",t:"Remboursement Total",d:"Annulation 20+ jours avant, ou si vents dépassent 25 nœuds empêchant le départ"},
        {icon:"refund_half",t:"Remboursement 50%",d:"Annulations entre 19 jours et 48 heures avant le charter"},
        {icon:"refund_none",t:"Sans Remboursement",d:"Moins de 48 heures de préavis ou non-présentation."},
        {icon:"included",t:"Toujours Inclus",d:"TVA · Assurance · Nettoyage · Skipper professionnel · Boissons & glacière"},
        {icon:"excluded",t:"Non Inclus",d:"Carburant · Traiteur · Extras (sauf accord préalable)"},
        {icon:"commitment",t:"Notre Engagement",d:"En cas de mauvais temps ou d’indisponibilité de l’équipage ou du bateau, nous proposons un report ou un remboursement intégral. Si nous ne pouvons pas honorer l’embarcation réservée, nous proposerons une autre embarcation similaire lorsque c’est possible, ou un remboursement total sans délai."}
      ]
    },
    contact:{title:"Prêt à Prendre la Mer ?",sub:"Réservez votre charter exclusif aujourd'hui",wa:"WhatsApp",dep:"Départ : El Molinar, Palma",ig:"Instagram",labelEmail:"E-mail",socialHeading:"WhatsApp, Instagram et e-mail",ariaWa:"Ouvrir WhatsApp",ariaIg:"Ouvrir Instagram",ariaMail:"Envoyer un e-mail",mapsAria:"Ouvrir le lieu de rendez-vous dans Google Maps"},
    floatingAccess:{
      regionAria:"Accès rapide à la réservation",
      bookLabel:"Réserver",
      bookSub:"Réservation en ligne",
      bookAria:"Ouvrir la réservation en ligne",
      waLabel:"WhatsApp",
      waSub:"Questions et réservations",
      waAria:"Contacter ou réserver via WhatsApp",
      waMessage:"Bonjour, je souhaite vérifier la disponibilité et réserver un charter à Majorque.",
    },
    privacy:{
      linkLabel:"Protection des données",
      close:"Fermer",
      title:"Politique de confidentialité",
      updated:"Dernière mise à jour : 9 mai 2026",
      intro:"Mallorca Island Yacht S.L. décrit ici le traitement des données personnelles lors de l’utilisation du site, de vos demandes et des réservations de charter, conformément au RGPD et à la législation espagnole applicable.",
      sections:[
        {title:"Responsable du traitement",body:"Responsable : Mallorca Island Yacht S.L. Pour toute question relative aux données : voir l’adresse e-mail ci-dessous."},
        {title:"Finalités et bases légales",body:"Données d’identification, de contact et de réservation traitées pour l’exécution du contrat ou de mesures précontractuelles, le respect d’obligations légales et l’intérêt légitime de répondre à vos messages (art. 6 RGPD)."},
        {title:"Durée de conservation",body:"Les données sont conservées pendant la durée nécessaire aux finalités et aux obligations légales, puis supprimées ou anonymisées."},
        {title:"Destinataires",body:"Sous-traitants techniques ou de paiement soumis à des garanties appropriées. Transferts hors UE uniquement avec mécanismes prévus par le RGPD."},
        {title:"Vos droits",body:"Droit d’accès, rectification, effacement, limitation, portabilité et opposition selon les cas. Réclamation auprès de l’autorité de contrôle (ex. AEPD en Espagne)."}
      ],
      contactLead:"Demandes confidentialité et exercice des droits :"
    },
    reviewsNav:"Avis",
    menuAria:"Ouvrir le menu",
    menuClose:"Fermer",
    navFleet:"Flotte",
    navGuides:"Guides",
    navContact:"Contact",
    reviews:{
      kicker:"Expériences",
      title:"Expériences",
      sub:"Ce que disent nos clients après leur location de bateau et charter à Palma",
      avgLabel:"Note moyenne",
      countWord:"avis",
      empty:"Pas encore d’avis publiés.",
      qrHint:"Pour laisser un avis, scannez le QR code fourni aux clients après le charter.",
      expandComments:"Lire les commentaires des clients",
      commentsGroupedHint:"Les commentaires sont regroupés par note. Ouvrez chaque section pour les lire.",
      replyLabel:"Réponse",
      submitCopy:{
        loading:"Vérification du lien…",
        deniedTitle:"Lien non valide",
        deniedBody:"Les avis ne peuvent être envoyés qu’avec le lien du QR code fourni aux clients.",
        home:"Retour au site",
        thanksTitle:"Merci !",
        thanksBody:"Votre avis a été enregistré.",
        formTitle:"Votre avis",
        formSub:"Évaluez votre expérience de charter avec nous.",
        labelName:"Votre nom",
        labelStars:"Note",
        labelText:"Commentaire",
        submit:"Envoyer",
        sending:"Envoi…",
        errSave:"Enregistrement impossible. Réessayez.",
      },
    },
    footer:{
      tagline:"Découvrez Majorque sous un autre angle",
      rights:"Tous droits réservés · Mallorca Island Yacht S.L.",
      seoLinks:[
        { href:"/alquiler-barco-mallorca", label:"Location Majorque" },
        { href:"/barcos-alquiler", label:"Location bateau" },
        { href:"/charter-palma", label:"Charter Palma" },
        { href:"/tarifas", label:"Tarifs" },
      ],
      blogGuides:[
        { href:"/alquiler-barco-mallorca-verano-2026", label:"Été 2026" },
        { href:"/guia-alquiler-barco-mallorca", label:"Guide location" },
        { href:"/cuanto-cuesta-alquilar-barco-mallorca", label:"Tarifs" },
        { href:"/mejores-calas-barco-palma", label:"Criques" },
      ],
    },
    bk:{
      title:"Réserver Votre Charter",steps:["Date & Durée","Vos Coordonnées","Paiement","Confirmé !"],
      selectDate:"Choisir une date",noDate:"Veuillez sélectionner une date",
      pickDateFirst:"Choisissez une date pour voir les créneaux disponibles.",
      slotsTitle:"Créneaux",
      fullDayTitle:"Journée complète",
      slotTaken:"Complet",
      partialBookedLegend:"Places limitées",
      slotUnavailable:"Ce créneau n’est plus disponible. Choisissez-en un autre.",
      dateBeyondHorizon:"Les réservations sont possibles au maximum 180 jours à l’avance. Choisissez une date plus proche.",
      durs:[
        {id:"half_am",name:"Demi-journée · 4 h (Matin)",price:550,sub:"9 h – 13 h"},
        {id:"half_pm",name:"Demi-journée · 4 h (Après-midi)",price:550,sub:"14 h – 18 h"},
        {id:"full",name:"Journée Complète · 8 heures",price:850,sub:"11 h – 19 h"},
        {id:"sunset",name:"Coucher de Soleil · 3 heures",price:450,sub:"19 h – 22 h"}
      ],
      skipper:"Skipper inclus",skipP:0,total:"Total",
      inc:"TVA · Assurance · Nettoyage · Boissons inclus",
      notInc:"Carburant · Traiteur non inclus",
      next:"Continuer",back:"Retour",pay:"Confirmer & Payer",
      fname:"Nom Complet",femail:"Email",fphone:"Téléphone mobile",
      fphoneCountry:"Pays",
      phoneCountrySearch:"Rechercher un pays…",
      fphoneHint:"Choisissez votre pays et saisissez le mobile sans indicatif. Requis pour le SMS de vérification lors du paiement par carte.",
      phonePlaceholder:"612 345 678",
      phoneInvalid:"Saisissez un numéro mobile valide pour le pays sélectionné.",
      stripePhoneNotice:"Lors du paiement par carte, votre banque ou Stripe peut envoyer un SMS de vérification. Utilisez le même numéro qu’indiqué ci-dessous.",
      stripeCheckoutRedirect:"Après confirmation, vous serez redirigé vers Stripe Checkout pour payer par carte. Votre créneau reste réservé pendant le paiement.",
      fguests:"Nombre de personnes (max. {max})",fnotes:"Demandes Spéciales (facultatif)",
      secure:"Paiement requis pour confirmer la réservation",
      confTitle:"Réservation Confirmée !",
      confMsg:"Votre charter est réservé et payé. Confirmation envoyée à votre email. Notre équipe vous contactera 24h avant.",
      confMsgProof:"Votre demande de réservation est enregistrée. Envoyez-nous une preuve de paiement (capture ou PDF) par e-mail ou WhatsApp avec votre référence pour confirmer le charter.",
      confRef:"Référence de Réservation",confBtn:"Retour à l'Accueil",req:"Veuillez remplir tous les champs",
      guestsOverCapacity:"Cette embarcation accepte au maximum {max} personnes. Veuillez réduire le nombre.",
      paymentIntro:"Choisissez un mode de paiement et suivez les instructions ci-dessous.",
      sendProofNotice:"Après paiement par Bizum ou virement, envoyez-nous une preuve de paiement (capture ou PDF) par e-mail ou WhatsApp. Indiquez toujours votre référence de réservation.",
      payCard:"Carte (Stripe Checkout)",
      payBizum:"Bizum",
      payBank:"Virement bancaire",
      payMethodLabel:"Mode de paiement",
      payChannelCard:"Carte",
      payChannelCardSub:"Apple Pay, PayPal",
      payChannelOther:"Autres",
      payChannelOtherSub:"Bizum, virement",
      payCardHint:"Paiement sécurisé via Stripe. Votre créneau reste réservé pendant le paiement.",
      payCtaCard:"Payer {total}€ en toute sécurité",
      payConfirmOther:"Confirmer la réservation",
      paymentOtherIntro:"Payez par Bizum ou virement avec les coordonnées ci-dessous, puis envoyez-nous une preuve de paiement.",
      payOtherUnavailable:"Le paiement alternatif n’est pas disponible en ligne. Contactez-nous pour réserver.",
      stripeNeedsBackend:"Le paiement par carte nécessite Firebase et l’API checkout déployée (Vercel).",
      stripeCheckoutError:"Impossible de démarrer le paiement par carte. Réessayez ou choisissez un autre mode.",
      promoLabel:"Code VIP de réduction (facultatif)",
      promoPlaceholder:"Saisissez votre code",
      promoApply:"Appliquer",
      promoAppliedShort:"Code VIP appliqué.",
      promoAppliedBadge:"Code VIP appliqué : {code} (−{pct}%)",
      promoInvalid:"Ce code n’est pas valide.",
      promoClear:"Retirer",
      promoChecking:"Vérification…",
      promoAlreadyUsed:"Ce code n’est plus valide ou a déjà été utilisé.",
      promoExcludedSpecialDay:"Cette date n’est pas éligible aux codes promotionnels.",
      promoValidExceptSpecial:"Valable tous les jours sauf les dates non promotionnelles.",
    }
  },
  sv:{
    bookBtn:"Boka",adminLink:"Admin",
    navBrand:{kicker:"Mallorca Island Yacht",place:"Palma de Mallorca"},
    hero:{
      kicker:"Privata båtcharter",title:"Upptäck Mallorca från havet",
      cta:"Boka Din Charter",cta2:"Se Flotta",
      offer:"✦  Specialerbjudande — 25% rabatt på alla juni-bokningar  ✦",scroll:"Utforska"
    },
    fleet:{title:"Vår Flotta",sub:"Välj ditt perfekta fartyg",book:"Boka",more:"Fler Foton",empty:"Inga fartyg publicerade ännu.",emptyHint:"Lägg till båtar i Admin — de visas här automatiskt.",prevPhoto:"Föregående foto",nextPhoto:"Nästa foto"},
    equipment:{
      kicker:"Utrustning",
      title:"Utrustning ombord",
      sub:"Aktiviteter och tillval för att få ut mesta möjliga av din dag till sjöss",
      includedTitle:"Ingår utan extra kostnad",
      extraTitle:"Valfritt tillval",
      badgeIncluded:"Ingår",
      badgeExtra:"Extra",
      consultPrice:"Fråga om pris",
      waMessage:"Hej, jag skulle vilja fråga om priset för Video & Foto med Drönare.",
      items:{
        seaScooter:{title:"Sea Scooter WattSup",desc:"Glid genom vattnet och utforska kusten med lätthet."},
        snorkel:{title:"Snorkelutrustning",desc:"Mask, snorkel och fenor för att upptäcka undervattensvärlden."},
        paddle:{title:"Paddle Surf",desc:"Paddleboard för lugna vikar och nöje på vattnet."},
        drone:{title:"Video & Foto med Drönare",desc:"Professionella flygbilder och foton från din charterdag."},
      },
    },
    routes:{
      kicker:"Rutter",
      title:"Vanliga rutter & ungefärlig bränslekostnad",
      sub:"Ungefärliga tider och bränsle från El Molinar (tur och retur)",
      tableAria:"Vanliga rutter och ungefärlig bränsleförbrukning",
      colRoute:"Rutt",
      colTime:"Seglingstid ca. (tur och retur)",
      colCost:"Bränsle ca. (tur och retur)",
      open:"Se karta och bilder",
      modalTitle:"Rutt",
      modalKicker:"Destination",
      photosAria:"Bildgalleri för destinationen",
      mapTitle:"Karta",
      timeLabel:"Tid (tur och retur)",
      costLabel:"Bränsle (tur och retur)",
      openMap:"Öppna i Google Maps",
      close:"Stäng",
      disclaimer:"Ungefärliga bränslekostnader endast som referens. Faktisk kostnad beror på antal gäster ombord, farthastighet och sjöläge.",
    },
    policy:{
      title:"Boknings- & Avbokningsvillkor",sub:"Tydliga villkor för din trygghet",
      items:[
        {icon:"refund_full",t:"Full Återbetalning",d:"Avbokning 20+ dagar innan, eller om vindbyar överstiger 25 knop"},
        {icon:"refund_half",t:"50% Återbetalning",d:"Avbokningar mellan 19 dagar och 48 timmar före charter"},
        {icon:"refund_none",t:"Ingen Återbetalning",d:"Mindre än 48 timmars varsel eller uteblivelse."},
        {icon:"included",t:"Alltid Inkluderat",d:"Moms · Försäkring · Slutstädning · Skeppare · Drycker & kylbox"},
        {icon:"excluded",t:"Ej Inkluderat",d:"Bränsle · Catering · Extras (om ej avtalat)"},
        {icon:"commitment",t:"Vårt Löfte",d:"Vid dåligt väder eller om besättning eller fartyg inte är tillgängligt erbjuder vi ombokning eller full återbetalning. Om vi inte kan leverera det bokade fartyget föreslår vi ett liknande fartyg när det är möjligt, eller omedelbar full återbetalning."}
      ]
    },
    contact:{title:"Redo att Sätta Segel?",sub:"Boka din exklusiva charter idag",wa:"WhatsApp",dep:"Avgång: El Molinar, Palma",ig:"Instagram",labelEmail:"E-post",socialHeading:"WhatsApp, Instagram och e-post",ariaWa:"Öppna WhatsApp",ariaIg:"Öppna Instagram",ariaMail:"Skicka e-post",mapsAria:"Öppna mötesplatsen i Google Maps"},
    floatingAccess:{
      regionAria:"Snabb bokningsåtkomst",
      bookLabel:"Boka",
      bookSub:"Boka online",
      bookAria:"Öppna onlinebokning",
      waLabel:"WhatsApp",
      waSub:"Frågor och bokning",
      waAria:"Kontakta eller boka via WhatsApp",
      waMessage:"Hej, jag vill kolla tillgänglighet och boka en yachtcharter på Mallorca.",
    },
    privacy:{
      linkLabel:"Dataskydd",
      close:"Stäng",
      title:"Integritetspolicy",
      updated:"Senast uppdaterad: 9 maj 2026",
      intro:"Mallorca Island Yacht S.L. beskriver hur personuppgifter behandlas vid användning av webbplatsen, förfrågningar och bokning av charter, i enlighet med GDPR och tillämplig spansk lagstiftning.",
      sections:[
        {title:"Personuppgiftsansvarig",body:"Ansvarig: Mallorca Island Yacht S.L. Kontakt för dataskydd: se e-post nedan."},
        {title:"Ändamål och rättslig grund",body:"Vi behandlar kontakt- och bokningsuppgifter för avtal, rättsliga krav och för att hantera dina meddelanden (art. 6 GDPR)."},
        {title:"Lagring",body:"Uppgifterna sparas endast så länge det behövs för ändamålen och enligt lagstadgade tider."},
        {title:"Mottagare",body:"Leverantörer (t.ex. hosting, betalning) med lämpliga avtal. Internationella överföringar endast med godkända skyddsåtgärder."},
        {title:"Dina rättigheter",body:"Rätt till tillgång, rättelse, radering, begränsning, dataportabilitet och invändning. Klagomål till tillsynsmyndighet (t.ex. AEPD) är möjligt."}
      ],
      contactLead:"Frågor om dataskydd och utövande av rättigheter:"
    },
    reviewsNav:"Omdömen",
    menuAria:"Öppna meny",
    menuClose:"Stäng",
    navFleet:"Flotta",
    navContact:"Kontakt",
    reviews:{
      kicker:"Omdömen",
      title:"Kundomdömen",
      sub:"Vad våra chartergäster säger",
      avgLabel:"Medelbetyg",
      countWord:"omdömen",
      empty:"Inga omdömen ännu.",
      qrHint:"För att lämna ett omdöme, skanna QR-koden vi delar med gäster efter charter.",
      expandComments:"Läs gästkommentarer",
      commentsGroupedHint:"Kommentarerna grupperas efter betyg. Öppna varje rad för att läsa.",
      replyLabel:"Svar",
      submitCopy:{
        loading:"Kontrollerar länk…",
        deniedTitle:"Ogiltig länk",
        deniedBody:"Omdömen kan bara skickas via QR-länken till gäster.",
        home:"Till webbplatsen",
        thanksTitle:"Tack!",
        thanksBody:"Ditt omdöme har sparats.",
        formTitle:"Ditt omdöme",
        formSub:"Betygsätt din charter med oss.",
        labelName:"Ditt namn",
        labelStars:"Betyg",
        labelText:"Kommentar",
        submit:"Skicka",
        sending:"Skickar…",
        errSave:"Kunde inte spara. Försök igen.",
      },
    },
    footer:{tagline:"Upplev Mallorca från ett annat perspektiv",rights:"Alla rättigheter förbehållna · Mallorca Island Yacht S.L."},
    bk:{
      title:"Boka Din Charter",steps:["Datum & Varaktighet","Dina Uppgifter","Betalning","Bekräftad!"],
      selectDate:"Välj ett datum",noDate:"Välj ett datum",
      pickDateFirst:"Välj ett datum för att se lediga tider.",
      slotsTitle:"Tider",
      fullDayTitle:"Heldag",
      slotTaken:"Bokad",
      partialBookedLegend:"Begränsad tillgång",
      slotUnavailable:"Den tiden är inte längre tillgänglig. Välj en annan.",
      dateBeyondHorizon:"Bokningar kan bara göras upp till 180 dagar i förväg. Välj ett tidigare datum.",
      durs:[
        {id:"half_am",name:"Halvdag · 4 timmar (Morgon)",price:550,sub:"9:00–13:00"},
        {id:"half_pm",name:"Halvdag · 4 timmar (Eftermiddag)",price:550,sub:"14:00–18:00"},
        {id:"full",name:"Heldag · 8 timmar",price:850,sub:"11:00–19:00"},
        {id:"sunset",name:"Solnedgång · 3 timmar",price:450,sub:"19:00–22:00"}
      ],
      skipper:"Skeppare ingår",skipP:0,total:"Totalt",
      inc:"Moms · Försäkring · Städning · Drycker inkl.",
      notInc:"Bränsle · Catering ej inkl.",
      next:"Fortsätt",back:"Tillbaka",pay:"Bekräfta & Betala",
      fname:"Fullständigt Namn",femail:"E-post",fphone:"Mobilnummer",
      fphoneCountry:"Land",
      phoneCountrySearch:"Sök land…",
      fphoneHint:"Välj land och ange mobilnummer utan landskod. Krävs för SMS-verifiering vid kortbetalning.",
      phonePlaceholder:"612 345 678",
      phoneInvalid:"Ange ett giltigt mobilnummer för valt land.",
      stripePhoneNotice:"Vid kortbetalning kan banken eller Stripe skicka ett verifierings-SMS. Använd samma nummer som visas nedan.",
      stripeCheckoutRedirect:"Efter bekräftelse omdirigeras du till Stripe Checkout för kortbetalning. Din tid hålls reserverad medan du betalar.",
      fguests:"Antal gäster (max {max})",fnotes:"Önskemål (valfritt)",
      secure:"Betalning krävs för att bekräfta bokningen",
      confTitle:"Bokning Bekräftad!",
      confMsg:"Din charter är bokad och betald. Bekräftelse skickad till din e-post. Teamet kontaktar dig 24h innan.",
      confMsgProof:"Din bokningsförfrågan är sparad. Skicka betalningsbevis (skärmdump eller PDF) via e-post eller WhatsApp med bokningsreferensen så att vi kan bekräfta chartern.",
      confRef:"Bokningsreferens",confBtn:"Tillbaka till Startsidan",req:"Fyll i alla obligatoriska fält",
      guestsOverCapacity:"Detta fartyg tar högst {max} gäster. Minska antalet.",
      paymentIntro:"Välj betalsätt och följ instruktionerna nedan.",
      sendProofNotice:"Efter betalning med Bizum eller banköverföring, skicka betalningsbevis (skärmdump eller PDF) via e-post eller WhatsApp. Ange alltid din bokningsreferens.",
      payCard:"Kort (Stripe Checkout)",
      payBizum:"Bizum",
      payBank:"Banköverföring",
      payMethodLabel:"Betalsätt",
      payChannelCard:"Kort",
      payChannelCardSub:"Apple Pay, PayPal",
      payChannelOther:"Övrigt",
      payChannelOtherSub:"Bizum, banköverföring",
      payCardHint:"Säker betalning via Stripe. Din tid hålls reserverad medan du betalar.",
      payCtaCard:"Betala {total}€ säkert",
      payConfirmOther:"Bekräfta bokning",
      paymentOtherIntro:"Betala med Bizum eller banköverföring enligt uppgifterna nedan och skicka betalningsbevis.",
      payOtherUnavailable:"Alternativ betalning är inte tillgänglig online. Kontakta oss för att boka.",
      stripeNeedsBackend:"Kortbetalning kräver Firebase och den utplacerade checkout-API:n (Vercel).",
      stripeCheckoutError:"Kortbetalningen kunde inte startas. Försök igen eller välj ett annat betalsätt.",
      promoLabel:"VIP-rabattkod (valfritt)",
      promoPlaceholder:"Ange din kod",
      promoApply:"Använd",
      promoAppliedShort:"VIP-kod tillämpad.",
      promoAppliedBadge:"VIP-kod tillämpad: {code} (−{pct}%)",
      promoInvalid:"Koden är ogiltig.",
      promoClear:"Ta bort",
      promoChecking:"Kontrollerar…",
      promoAlreadyUsed:"Koden är ogiltig eller har redan använts.",
      promoExcludedSpecialDay:"Detta datum omfattas inte av kampanjkoder.",
      promoValidExceptSpecial:"Gäller alla dagar utom icke-kampanjdatum.",
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════
const INIT_BOOKINGS = [];
const ROLES_CFG = {
  owner:{label:"Owner — Full Control",c:"#C9A047",bg:"rgba(201,160,71,.15)"},
  bookings:{label:"Manage Bookings",c:"#4ECDC4",bg:"rgba(78,205,196,.15)"},
  design:{label:"Design & Content",c:"#a855f7",bg:"rgba(168,85,247,.15)"},
};
/** Rol legado `viewer` (solo dashboard / “modo lector”) → `bookings`. */
function normalizeAdminCredentialRole(role){
  const r = typeof role==="string" ? role.trim().toLowerCase() : "";
  if(r==="viewer" || r==="view only" || r==="view-only" || r==="lector" || r==="read only" || r==="readonly") return "bookings";
  if(r==="owner"||r==="bookings"||r==="design") return r;
  return "bookings";
}
function patchAdminCredsRole(creds, email, role){
  const em = String(email || "").trim().toLowerCase();
  if(!Array.isArray(creds) || !em) return creds;
  const norm = normalizeAdminCredentialRole(role);
  let changed = false;
  const next = creds.map((c)=>{
    if(String(c.email || "").trim().toLowerCase() !== em) return c;
    if(c.role === norm) return c;
    changed = true;
    return {...c, role: norm};
  });
  return changed ? next : creds;
}
function mapUserRowStripViewer(u){
  if(!u || typeof u!=="object") return u;
  const norm = normalizeAdminCredentialRole(u.role);
  return norm === u.role ? u : {...u, role: norm};
}
/** Secciones del panel según rol (evita pantalla vacía si `section` no coincide con permisos). */
function getAdminNavSectionKeys(role){
  const r = normalizeAdminCredentialRole(role);
  if(r==="owner") return ["dashboard","bookings","fleet","agenda","content","reviews","analytics","users","settings"];
  if(r==="bookings") return ["dashboard","bookings","agenda","analytics","settings","reviews"];
  if(r==="design") return ["dashboard","fleet","content","settings","agenda","reviews"];
  return ["dashboard","bookings","fleet","content","settings","agenda","reviews"];
}
// No demo credentials. Admin access is configured via localStorage.
const ADMIN_CREDS = [];
const DUR_PRICES = {half:550,full:850,sunset:450};

const PRICING_FIELD_KEYS = ["half","full","sunset","skipper"];
const SEASON_KEYS = ["low","medium","high"];

/** Nov–Apr → low, May & Oct → medium, Jun–Sep → high */
function seasonKeyFromMonthKey(mk){
  if(typeof mk!=="string" || !/^\d{2}$/.test(mk)) return "low";
  const m = parseInt(mk,10);
  if(m===11||m===12||m>=1&&m<=4) return "low";
  if(m===5||m===10) return "medium";
  return "high";
}

// ═══════════════════════════════════════════════════════════════════════
// LOCAL STORAGE (PERSISTENT ADMIN DATA)
// ═══════════════════════════════════════════════════════════════════════
const LS_BOATS_KEY = "miy_boats_v1";
const LS_BOOKINGS_KEY = "miy_bookings_v1";
const LS_USERS_KEY = "miy_users_v1";
const LS_SETTINGS_KEY = "miy_admin_settings_v1";
const LS_BLOCKED_DATES_KEY = "miy_blocked_dates_v1";
const LS_TRANSL_OVERRIDES_KEY = "miy_translation_overrides_v1";
const LS_ADMIN_CREDS_KEY = "miy_admin_creds_v1";
const LS_ADMIN_REMEMBER_KEY = "miy_admin_remember_v1";
const LS_ADMIN_LAST_LOGIN_KEY = "miy_admin_last_login_v1";
/** Contraseña de la sesión actual (sessionStorage) para reconectar Firebase sin “Remember me”. */
const SS_ADMIN_SESSION_KEY = "miy_admin_session_v1";

/** Empty defaults: public site and admin show only data you save (localStorage). */
const DEFAULT_ADMIN_SETTINGS = {
  contact:{
    whatsapp:"",
    email:"",
    departure:"",
    instagram:"",
  },
  pricing:{
    half:0,
    full:0,
    sunset:0,
    skipper:0,
  },
  pricingByMonth:{},
  /** Fechas especiales: precios/horarios por turno sin bloquear el día. */
  specialDays:{},
  pricingSeasons:{
    low:{ half:0, full:0, sunset:0, skipper:0 },
    medium:{ half:0, full:0, sunset:0, skipper:0 },
    high:{ half:0, full:0, sunset:0, skipper:0 },
  },
  payment:{
    bizum:"",
    iban:"",
    beneficiary:"",
  },
  offer:{
    discount:0,
    banner:"",
    /** Solo modo sin Firebase: códigos alfanuméricos que aplican -20% (en Firebase usar colección discountCodes). */
    vipCodes:[],
  },
  visual:{
    siteBackgroundUrl:"",
    bookingHeroUrl:"",
  },
  reviewGateToken:"",
};

/** Normalized contact + `wa.me`, Instagram profile, and `mailto:` URLs for the public site. */
function publicContactDerived(settings) {
  const contact = {
    ...DEFAULT_ADMIN_SETTINGS.contact,
    ...(settings?.contact && typeof settings.contact === "object" ? settings.contact : {}),
  };
  const waDigits = String(contact.whatsapp || "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "";
  const igUser = String(contact.instagram || "").replace(/^@/, "").trim();
  const igHref = igUser ? `https://www.instagram.com/${igUser}/` : "";
  const emailTrim = String(contact.email || "").trim();
  const mailHref = emailTrim ? `mailto:${emailTrim}` : "";
  return { contact, waHref, igHref, mailHref };
}

const DEFAULT_DEPARTURE_MAPS_QUERY = "Carrer del Vicari Joaquim Fuster, 2, 07006 Palma, Illes Balears, España";
/** Google Maps link for the home port (Club Marítimo Molinar de Levante). */
const MOLINAR_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DEFAULT_DEPARTURE_MAPS_QUERY)}`;
/** Departure strings (custom or default) that should resolve to the fixed Molinar pin. */
const MOLINAR_DEPARTURE_KEYWORDS = ["molinar"];

/** Opens Google Maps; uses fixed short link for the Molinar base port, else a search URL for custom departures. */
function googleMapsSearchUrlForDeparture(contactDeparture) {
  const raw = String(contactDeparture || "").trim();
  if (!raw) return MOLINAR_MAP_URL;
  const norm = raw.toLowerCase();
  if (MOLINAR_DEPARTURE_KEYWORDS.some((k) => norm.includes(k))) return MOLINAR_MAP_URL;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
}

function normalizePricingSeasons(raw, basePricing){
  const base = {...DEFAULT_ADMIN_SETTINGS.pricing, ...basePricing};
  const out = {};
  for(const sk of SEASON_KEYS){
    out[sk] = {};
    const src = raw && typeof raw==="object" ? raw[sk] : null;
    for(const k of PRICING_FIELD_KEYS){
      out[sk][k] = Number.isFinite(+src?.[k]) ? +src[k] : base[k];
    }
  }
  return out;
}

function monthKeyFromDateStr(dateStr){
  if(typeof dateStr!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  return dateStr.slice(5,7);
}
function slotKeyFromDur(dur){
  if(dur==="full") return "full";
  if(dur==="half_am") return "am";
  if(dur==="half_pm") return "pm";
  if(dur==="sunset") return "sunset";
  if(dur==="half") return "am"; // backward compatibility
  return "";
}
function blockKey(dateStr, slot){
  if(!dateStr) return "";
  if(slot==="full" || !slot) return dateStr;
  return `${dateStr}|${slot}`;
}

/** Treats paid / confirmed / pending / active pending_payment holds as blocking the public calendar. */
function bookingCountsAsCalendarBlock(b, nowMs){
  const t = typeof nowMs === "number" ? nowMs : Date.now();
  if(!b || typeof b.date !== "string") return false;
  if(b.status==="paid" || b.status==="confirmed" || b.status==="pending") return true;
  if(b.status==="pending_payment"){
    const ex = b.paymentHoldExpiresAt ?? b.holdExpiresAt;
    let ms = 0;
    if(ex && typeof ex.toMillis === "function") ms = ex.toMillis();
    else if(typeof ex === "number" && Number.isFinite(ex)) ms = ex;
    else if(ex && typeof ex.seconds === "number") ms = ex.seconds * 1000 + (Number(ex.nanoseconds) || 0) / 1e6;
    if(!ms) return true;
    return ms > t;
  }
  return false;
}

function isDayFullyBlocked(dateStr, keys){
  if(keys.has(dateStr)) return true;
  return keys.has(`${dateStr}|am`) && keys.has(`${dateStr}|pm`) && keys.has(`${dateStr}|sunset`);
}
function isSlotBlocked(dateStr, slot, keys){
  if(!dateStr) return false;
  if(keys.has(dateStr)) return true; // full day blocks everything
  if(slot==="full"){
    return keys.has(dateStr) || keys.has(`${dateStr}|am`) || keys.has(`${dateStr}|pm`) || keys.has(`${dateStr}|sunset`);
  }
  return keys.has(`${dateStr}|${slot}`);
}

function formatLocalYMD(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
/** Client bookings may not exceed this many days ahead (lets admin refresh seasonal pricing). */
const MAX_BOOKING_ADVANCE_DAYS = 180;
function maxBookingDateStrAfterToday(){
  const t=new Date();
  t.setHours(0,0,0,0);
  t.setDate(t.getDate()+MAX_BOOKING_ADVANCE_DAYS);
  return formatLocalYMD(t);
}

function computeBookedCalendarInfo(blockedDates, bookings){
  const keys = new Set();
  (Array.isArray(blockedDates) ? blockedDates : []).forEach(d=>typeof d==="string" && d && keys.add(d));
  (Array.isArray(bookings) ? bookings : []).forEach(b=>{
    if(!b || typeof b!=="object" || typeof b.date!=="string") return;
    if(!bookingCountsAsCalendarBlock(b)) return;
    const slot = typeof b.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b.dur);
    const k = blockKey(b.date, slot);
    if(k) keys.add(k);
  });
  const daySet = new Set();
  for(const k of keys){
    const day = k.split("|")[0];
    if(isDayFullyBlocked(day, keys)) daySet.add(day);
  }
  const partialSet = new Set();
  for(const k of keys){
    const day = k.split("|")[0];
    if(typeof day==="string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && !isDayFullyBlocked(day, keys)){
      partialSet.add(day);
    }
  }
  return { keys, days: Array.from(daySet), partialDays: Array.from(partialSet).sort() };
}

/**
 * Block keys written to `sitePublic/live` so anonymous devices see the same calendar as admin,
 * without reading the protected `bookings` collection (Firestore rules).
 */
function mergeBlockedDatesForPublicSync(blockedDates, bookings){
  const keys = new Set();
  (Array.isArray(blockedDates) ? blockedDates : []).forEach(d=>typeof d==="string" && d && keys.add(d));
  (Array.isArray(bookings) ? bookings : []).forEach(b=>{
    if(!b || typeof b!=="object" || typeof b.date!=="string") return;
    if(!bookingCountsAsCalendarBlock(b)) return;
    const slot = typeof b.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b.dur);
    const k = blockKey(b.date, slot);
    if(k) keys.add(k);
  });
  return Array.from(keys).sort();
}
/** The three charter shifts shown after picking a date (morning, afternoon, sunset). */
const BOOKING_SHIFT_IDS = ["half_am","half_pm","sunset"];
const ALL_BOOKING_SLOT_IDS = ["half_am","half_pm","sunset","full"];
const DEFAULT_SLOT_SCHEDULE = {
  half_am:"9:00–13:00",
  half_pm:"14:00–18:00",
  full:"11:00–19:00",
  sunset:"19:00–22:00",
};

function normalizeSpecialDayEntry(raw){
  if(!raw || typeof raw!=="object") return null;
  const prices = {};
  const schedule = {};
  const labels = {};
  const slots = [];
  const srcPrices = raw.prices && typeof raw.prices==="object" ? raw.prices : raw;
  const srcLabels = raw.labels && typeof raw.labels==="object" ? raw.labels : raw.titles && typeof raw.titles==="object" ? raw.titles : {};
  for(const sid of ALL_BOOKING_SLOT_IDS){
    if(Number.isFinite(+srcPrices[sid]) && +srcPrices[sid]>0) prices[sid] = Math.round(+srcPrices[sid]);
    const sub = raw.schedule?.[sid] ?? raw[`sub_${sid}`] ?? srcPrices[`sub_${sid}`];
    if(typeof sub==="string" && sub.trim()) schedule[sid] = sub.trim().slice(0,80);
    const lab = srcLabels[sid] ?? raw[`label_${sid}`];
    if(typeof lab==="string" && lab.trim()) labels[sid] = lab.trim().slice(0,100);
  }
  if(Number.isFinite(+srcPrices.half) && +srcPrices.half>0){
    if(!prices.half_am) prices.half_am = Math.round(+srcPrices.half);
    if(!prices.half_pm) prices.half_pm = Math.round(+srcPrices.half);
  }
  for(const k of ["half","full","sunset","skipper"]){
    if(Number.isFinite(+srcPrices[k]) && +srcPrices[k]>0) prices[k] = Math.round(+srcPrices[k]);
  }
  const slotSrc = Array.isArray(raw.slots) ? raw.slots : null;
  if(slotSrc){
    for(const sid of slotSrc){
      if(ALL_BOOKING_SLOT_IDS.includes(sid)) slots.push(sid);
    }
  } else {
    for(const sid of ALL_BOOKING_SLOT_IDS){
      if(prices[sid] || schedule[sid] || labels[sid]) slots.push(sid);
    }
  }
  if(!slots.length && !Object.keys(prices).length && !Object.keys(schedule).length && !Object.keys(labels).length) return null;
  const out = {};
  if(Object.keys(prices).length) out.prices = prices;
  if(Object.keys(schedule).length) out.schedule = schedule;
  if(Object.keys(labels).length) out.labels = labels;
  if(slots.length) out.slots = [...new Set(slots)];
  else if(Object.keys(prices).length || Object.keys(schedule).length) out.slots = [...ALL_BOOKING_SLOT_IDS];
  return out;
}

function normalizeSpecialDaysMap(raw, legacyPricingByDate){
  const out = {};
  if(raw && typeof raw==="object"){
    for(const [ds,v] of Object.entries(raw)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
      const one = normalizeSpecialDayEntry(v);
      if(one) out[ds] = one;
    }
  }
  if(legacyPricingByDate && typeof legacyPricingByDate==="object"){
    for(const [ds,v] of Object.entries(legacyPricingByDate)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(ds) || out[ds]) continue;
      if(!v || typeof v!=="object") continue;
      const one = normalizeSpecialDayEntry({ prices: v, slots: ALL_BOOKING_SLOT_IDS });
      if(one) out[ds] = one;
    }
  }
  return out;
}

function getSpecialDayEntry(settings, dateStr){
  if(typeof dateStr!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const sd = settings?.specialDays;
  if(!sd || typeof sd!=="object") return null;
  return normalizeSpecialDayEntry(sd[dateStr]);
}

function listSpecialDayDates(settings){
  const sd = settings?.specialDays;
  if(!sd || typeof sd!=="object") return [];
  return Object.keys(sd).filter((ds)=>/^\d{4}-\d{2}-\d{2}$/.test(ds) && normalizeSpecialDayEntry(sd[ds])).sort();
}

function getSpecialDayEnabledSlots(settings, dateStr){
  const entry = getSpecialDayEntry(settings, dateStr);
  if(!entry?.slots?.length) return null;
  return entry.slots.filter((sid)=>ALL_BOOKING_SLOT_IDS.includes(sid));
}

function getSpecialDaySlotSchedule(settings, dateStr, durId, fallbackSub){
  const entry = getSpecialDayEntry(settings, dateStr);
  const sub = entry?.schedule?.[durId];
  return typeof sub==="string" && sub.trim() ? sub.trim() : fallbackSub;
}

/** En días especiales el título de reserva no lleva duración fija (cada turno puede tener otro horario). */
function bookingDurDisplayName(settings, dateStr, durName){
  if(!getSpecialDayEntry(settings, dateStr)) return durName;
  const n = String(durName || "").trim();
  if(!n) return n;
  return n
    .replace(/\s*·\s*\d+\s*(?:hours?|horas?|Std\.?|heures?|timmar|h)\b[^·]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*·\s*$/,"")
    .trim();
}

/** Título del turno en reserva: etiqueta admin del día especial, o nombre sin horas, o texto del sitio. */
function getSpecialDaySlotTitle(settings, dateStr, durId, fallbackName){
  const entry = getSpecialDayEntry(settings, dateStr);
  const custom = entry?.labels?.[durId];
  if(typeof custom==="string" && custom.trim()) return custom.trim();
  if(entry) return bookingDurDisplayName(settings, dateStr, fallbackName);
  return fallbackName;
}

function seasonPriceForSlot(settings, dateStr, durId){
  const pricing = getMonthlyPricing(settings, dateStr);
  const key = durId==="half_am"||durId==="half_pm" ? "half" : durId;
  const raw = Number.isFinite(+pricing?.[key]) ? +pricing[key] : 0;
  if(raw>0) return raw;
  return DUR_PRICES[key] ?? 0;
}

function buildSpecialDayDraft(settings, dateStr){
  const entry = getSpecialDayEntry(settings, dateStr);
  const slots = {};
  for(const sid of ALL_BOOKING_SLOT_IDS){
    const seasonP = seasonPriceForSlot(settings, dateStr, sid);
    let price = seasonP;
    if(entry?.prices?.[sid]) price = entry.prices[sid];
    else if((sid==="half_am"||sid==="half_pm") && entry?.prices?.half) price = entry.prices.half;
    const enabled = entry ? (entry.slots || ALL_BOOKING_SLOT_IDS).includes(sid) : true;
    slots[sid] = {
      enabled,
      title: entry?.labels?.[sid] ? String(entry.labels[sid]) : "",
      price: String(Math.round(Number(price)||0)),
      sub: getSpecialDaySlotSchedule(settings, dateStr, sid, DEFAULT_SLOT_SCHEDULE[sid]),
    };
  }
  const skipperRaw = entry?.prices?.skipper ?? getMonthlyPricing(settings, dateStr).skipper ?? 0;
  return { slots, skipper: String(Math.round(Number(skipperRaw)||0)) };
}

function draftToSpecialDayEntry(draft){
  if(!draft?.slots || typeof draft.slots!=="object") return null;
  const prices = {};
  const schedule = {};
  const labels = {};
  const slots = [];
  for(const sid of ALL_BOOKING_SLOT_IDS){
    const row = draft.slots[sid];
    if(!row?.enabled) continue;
    slots.push(sid);
    const p = parseInt(String(row.price||"").replace(/\D/g,""),10);
    if(Number.isFinite(p) && p>0) prices[sid] = p;
    const sub = String(row.sub||"").trim();
    if(sub) schedule[sid] = sub.slice(0,80);
    const title = String(row.title||"").trim();
    if(title) labels[sid] = title.slice(0,100);
  }
  const skipper = parseInt(String(draft.skipper||"").replace(/\D/g,""),10);
  if(Number.isFinite(skipper) && skipper>0) prices.skipper = skipper;
  if(!slots.length) return null;
  return normalizeSpecialDayEntry({ prices, schedule, labels, slots });
}

function getMonthlyPricing(settings, dateStr, opts){
  const base = {...DEFAULT_ADMIN_SETTINGS.pricing, ...(settings?.pricing&&typeof settings.pricing==="object"?settings.pricing:{})};
  const mk = monthKeyFromDateStr(dateStr);
  const seasonKey = mk ? seasonKeyFromMonthKey(mk) : "low";
  const seasons = settings?.pricingSeasons && typeof settings.pricingSeasons==="object" ? settings.pricingSeasons : {};
  const tier = seasons[seasonKey] && typeof seasons[seasonKey]==="object" ? seasons[seasonKey] : null;
  const out = {...base};
  if(tier){
    for(const k of PRICING_FIELD_KEYS){
      if(Number.isFinite(+tier[k])) out[k] = +tier[k];
    }
  }
  const byMonth = settings?.pricingByMonth && typeof settings.pricingByMonth==="object" ? settings.pricingByMonth : {};
  const override = mk && byMonth?.[mk] && typeof byMonth[mk]==="object" ? byMonth[mk] : null;
  if(override){
    for(const k of PRICING_FIELD_KEYS){
      if(Number.isFinite(+override[k])) out[k] = +override[k];
    }
  }
  return out;
}

/**
 * Effective charter € for a duration on a date (matches `charterBaseEuros` in api/lib/pricing.js).
 * Positive admin prices win; otherwise legacy display amounts in DUR_PRICES (same as server FALLBACK_DUR).
 */
function charterBaseEurosClient(settings, dateStr, durId){
  const special = getSpecialDayEntry(settings, dateStr);
  if(special?.prices){
    const direct = special.prices[durId];
    if(Number.isFinite(+direct) && +direct>0) return +direct;
    if((durId==="half_am"||durId==="half_pm") && Number.isFinite(+special.prices.half) && +special.prices.half>0){
      return +special.prices.half;
    }
  }
  const pricing = getMonthlyPricing(settings, dateStr);
  const key = durId==="half_am"||durId==="half_pm" ? "half" : durId;
  const raw = Number.isFinite(+pricing?.[key]) ? +pricing[key] : 0;
  if(raw > 0) return raw;
  return DUR_PRICES[key] ?? 0;
}

function safeJsonParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function readSavedArray(key){
  try{
    const raw = window.localStorage.getItem(key);
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    if(!Array.isArray(parsed)) return null;
    return parsed.filter(Boolean);
  } catch {
    return null;
  }
}

function readSavedBoats(){
  const parsed = readSavedArray(LS_BOATS_KEY);
  if(!parsed) return null;
  // Backward compatible: ensure boats always have imgs[]
  return parsed.map(b=>{
    const imgs = Array.isArray(b?.imgs) ? b.imgs.filter(Boolean) : [];
    const img = typeof b?.img==="string" ? b.img : "";
    const nextImgs = imgs.length ? imgs : (img ? [img] : []);
    const nextImg = img || nextImgs[0] || "";
    return {...b, img: nextImg, imgs: nextImgs};
  });
}

function readSavedBookings(){ return readSavedArray(LS_BOOKINGS_KEY); }
function readSavedUsers(){ return readSavedArray(LS_USERS_KEY); }
function readSavedBlockedDates(){ return readSavedArray(LS_BLOCKED_DATES_KEY); }
function readSavedAdminCreds(){
  try{
    const raw = window.localStorage.getItem(LS_ADMIN_CREDS_KEY);
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    if(!Array.isArray(parsed)) return null;
    const clean = parsed
      .filter(x=>x && typeof x==="object")
      .map(x=>({
        email: typeof x.email==="string" ? x.email.trim() : "",
        password: typeof x.password==="string" ? x.password : "",
        role: normalizeAdminCredentialRole(typeof x.role==="string" ? x.role : ""),
      }))
      .filter(x=>x.email && x.password && x.role);
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}

function readSavedTranslationOverrides(){
  try{
    const raw = window.localStorage.getItem(LS_TRANSL_OVERRIDES_KEY);
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    if(!parsed || typeof parsed!=="object") return null;
    return stripDeprecatedMooringFromOverrides(parsed).overrides;
  } catch {
    return null;
  }
}

/** Instagram handle for storage and links: strips full URLs and leading @. */
function normalizeInstagramHandle(raw){
  if(raw==null) return "";
  let t = String(raw).trim();
  if(!t) return "";
  const m = t.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
  if(m) t = m[1];
  t = t.replace(/^@+/,"").trim();
  return t.slice(0,120);
}

/** Normalize settings object (from localStorage or Firestore). */
function normalizeSettingsFromObject(parsed){
  if(!parsed || typeof parsed!=="object") return null;
  try{
    const c = parsed.contact || {};
    const p = parsed.pricing || {};
    const pbm = parsed.pricingByMonth || {};
    const ps = parsed.pricingSeasons;
    const pay = parsed.payment || {};
    const o = parsed.offer || {};
    const vis = parsed.visual || {};
    const migratedEmail =
      typeof c.email==="string" && c.email==="gburela@mallorcaisland.com"
        ? "info@mallorcaislandyacht.com"
        : c.email;
    const pricingByMonth = {};
    if(pbm && typeof pbm==="object"){
      for(const [mk,v] of Object.entries(pbm)){
        if(!/^\d{2}$/.test(mk)) continue;
        if(!v || typeof v!=="object") continue;
        const one = {};
        for(const k of ["half","full","sunset","skipper"]){
          if(Number.isFinite(+v[k])) one[k] = +v[k];
        }
        if(Object.keys(one).length) pricingByMonth[mk] = one;
      }
    }
    const specialDays = normalizeSpecialDaysMap(parsed.specialDays, parsed.pricingByDate);
    const igRaw =
      typeof c.instagram === "string"
        ? c.instagram
        : typeof c.ig === "string"
          ? c.ig
          : typeof c.insta === "string"
            ? c.insta
            : "";
    const instagramNorm = normalizeInstagramHandle(igRaw);
    return {
      contact:{
        whatsapp: typeof c.whatsapp==="string" ? c.whatsapp : DEFAULT_ADMIN_SETTINGS.contact.whatsapp,
        email: typeof migratedEmail==="string" ? migratedEmail : DEFAULT_ADMIN_SETTINGS.contact.email,
        departure: typeof c.departure==="string" ? c.departure : DEFAULT_ADMIN_SETTINGS.contact.departure,
        instagram: instagramNorm,
      },
      pricing:{
        half: Number.isFinite(+p.half) ? +p.half : DEFAULT_ADMIN_SETTINGS.pricing.half,
        full: Number.isFinite(+p.full) ? +p.full : DEFAULT_ADMIN_SETTINGS.pricing.full,
        sunset: Number.isFinite(+p.sunset) ? +p.sunset : DEFAULT_ADMIN_SETTINGS.pricing.sunset,
        skipper: Number.isFinite(+p.skipper) ? +p.skipper : DEFAULT_ADMIN_SETTINGS.pricing.skipper,
      },
      pricingSeasons: normalizePricingSeasons(ps, {
        half: Number.isFinite(+p.half) ? +p.half : DEFAULT_ADMIN_SETTINGS.pricing.half,
        full: Number.isFinite(+p.full) ? +p.full : DEFAULT_ADMIN_SETTINGS.pricing.full,
        sunset: Number.isFinite(+p.sunset) ? +p.sunset : DEFAULT_ADMIN_SETTINGS.pricing.sunset,
        skipper: Number.isFinite(+p.skipper) ? +p.skipper : DEFAULT_ADMIN_SETTINGS.pricing.skipper,
      }),
      pricingByMonth,
      specialDays,
      payment:{
        bizum: typeof pay.bizum==="string" ? pay.bizum : DEFAULT_ADMIN_SETTINGS.payment.bizum,
        iban: typeof pay.iban==="string" ? pay.iban : DEFAULT_ADMIN_SETTINGS.payment.iban,
        beneficiary: typeof pay.beneficiary==="string" ? pay.beneficiary : DEFAULT_ADMIN_SETTINGS.payment.beneficiary,
      },
      offer:{
        discount: Number.isFinite(+o.discount) ? +o.discount : DEFAULT_ADMIN_SETTINGS.offer.discount,
        banner: typeof o.banner==="string" ? o.banner : DEFAULT_ADMIN_SETTINGS.offer.banner,
        vipCodes: Array.isArray(o.vipCodes)
          ? [...new Set(o.vipCodes.filter((x)=>typeof x==="string").map((x)=>normalizeVipDiscountCode(x)).filter(Boolean))]
          : [...DEFAULT_ADMIN_SETTINGS.offer.vipCodes],
      },
      visual:{
        siteBackgroundUrl: typeof vis.siteBackgroundUrl==="string" ? vis.siteBackgroundUrl : DEFAULT_ADMIN_SETTINGS.visual.siteBackgroundUrl,
        bookingHeroUrl: typeof vis.bookingHeroUrl==="string" ? vis.bookingHeroUrl : DEFAULT_ADMIN_SETTINGS.visual.bookingHeroUrl,
      },
      reviewGateToken: typeof parsed.reviewGateToken==="string" ? parsed.reviewGateToken : DEFAULT_ADMIN_SETTINGS.reviewGateToken,
    };
  } catch {
    return null;
  }
}

function readSavedSettings(){
  try{
    const raw = window.localStorage.getItem(LS_SETTINGS_KEY);
    if(!raw) return null;
    const parsed = safeJsonParse(raw);
    return normalizeSettingsFromObject(parsed);
  } catch {
    return null;
  }
}

/**
 * When Firebase sync is enabled, never seed the UI from localStorage for site data (boats, settings, etc.).
 * Admin credentials still use localStorage. Firestore `subscribeLiveSitePublic` is the single source of truth.
 */
/** Apply `sitePublic/live` fields to React (listener + post-save server read). */
function applySitePublicDocToReactState(raw, {
  setBoats,
  setBlockedDates,
  setSettings,
  setTranslationOverrides,
}){
  const data = normalizeSitePublicDocForClient(raw);
  if(!data || typeof data !== "object") return;
  if(Array.isArray(data.boats)) setBoats(normalizeBoatsForClient(data.boats));
  if(Array.isArray(data.blockedDates)) setBlockedDates(data.blockedDates);
  if(data.settings && typeof data.settings === "object"){
    const n = normalizeSettingsFromObject(data.settings);
    if(n) setSettings(n);
  }
  if(data.translationOverrides && typeof data.translationOverrides === "object"){
    setTranslationOverrides(stripDeprecatedMooringFromOverrides(data.translationOverrides).overrides);
  }
}

function getInitialSyncedSiteState(){
  if(!isFirebaseConfigured()){
    const savedBoats = readSavedBoats();
    const savedBookings = readSavedBookings();
    const savedUsers = readSavedUsers();
    const savedBlocked = readSavedBlockedDates();
    return {
      boats: savedBoats !== null ? savedBoats : [],
      bookings: savedBookings !== null ? savedBookings : INIT_BOOKINGS,
      users: savedUsers !== null ? savedUsers : [],
      settings: readSavedSettings() || DEFAULT_ADMIN_SETTINGS,
      blockedDates: savedBlocked !== null ? savedBlocked : [],
      translationOverrides: stripDeprecatedMooringFromOverrides(readSavedTranslationOverrides() || {}).overrides,
    };
  }
  const boot = readPublicSiteBootCache();
  if(boot){
    return {
      boats: normalizeBoatsForClient(boot.boats || []),
      bookings: [],
      users: [],
      settings: normalizeSettingsFromObject(boot.settings) || DEFAULT_ADMIN_SETTINGS,
      blockedDates: boot.blockedDates,
      translationOverrides: stripDeprecatedMooringFromOverrides(boot.translationOverrides || {}).overrides,
    };
  }
  return {
    boats: [],
    bookings: [],
    users: [],
    settings: DEFAULT_ADMIN_SETTINGS,
    blockedDates: [],
    translationOverrides: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY HOOKS & HELPERS
// ═══════════════════════════════════════════════════════════════════════
function genRef(){return "MIY-2025-"+(100+Math.floor(Math.random()*900));}
function formatDate(d){
  if(!d) return "";
  const [y,m,day]=d.split("-");
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[parseInt(m)-1]} ${y}`;
}

function sendBookingEmailNotification(booking, settings){
  try{
    const to = String(settings?.contact?.email ?? "").trim();
    if(!to) return;
    const subject = `New booking ${booking?.id || ""}`.trim();
    const body = [
      "New booking received:",
      "",
      `Ref: ${booking?.id || ""}`,
      `Guest: ${booking?.guest || ""}`,
      `Email: ${booking?.email || ""}`,
      `Phone: ${booking?.phone || ""}`,
      `Date: ${booking?.date ? formatDate(booking.date) : ""}`,
      `Duration: ${booking?.dur || ""}`,
      `Boat: ${booking?.boat || ""}`,
      `Guests: ${booking?.guests ?? ""}`,
      ...(booking?.promoCode && isAllowedDiscountPct(booking?.discountPct) && booking?.subtotal != null
        ? [
            `Subtotal (charter): ${booking.subtotal}€`,
            `VIP code: ${booking.promoCode} (-${booking.discountPct}%)`,
            `Total: ${booking?.total ?? ""}€`,
          ]
        : [`Total: ${booking?.total ?? ""}€`]),
      `Payment: ${booking?.payment || ""}`,
      booking?.notes ? `Notes: ${booking.notes}` : "",
      ...(booking?.payment==="bizum"||booking?.payment==="bank" ? ["Awaiting payment proof from guest (Bizum / transfer)."] : []),
    ].filter(Boolean).join("\n");
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  } catch {}
}

function sendGuestBookingEmail(booking, settings, type){
  try{
    const guestTo = String(booking?.email || "").trim();
    if(!guestTo) return;
    const contactEmail = String(settings?.contact?.email ?? "").trim();
    const p = settings?.payment || DEFAULT_ADMIN_SETTINGS.payment;
    const ref = booking?.id || "";
    const when = booking?.date ? formatDate(booking.date) : "";
    const subject =
      type==="confirmed"
        ? `Booking confirmed ${ref}`.trim()
        : `Booking received ${ref}`.trim();
    const payLines =
      type==="confirmed"
        ? []
        : [
            "Payment information:",
            p?.bizum ? `- Bizum: ${p.bizum}` : "",
            p?.iban ? `- Bank transfer IBAN: ${p.iban}` : "",
            p?.beneficiary ? `- Beneficiary: ${p.beneficiary}` : "",
          ].filter(Boolean);
    const needsProof = booking?.payment==="bizum" || booking?.payment==="bank";
    const body = [
      type==="confirmed"
        ? "Your booking has been confirmed. Thank you!"
        : "We received your booking request.",
      "",
      `Ref: ${ref}`,
      `Boat: ${booking?.boat || ""}`,
      `Date: ${when}`,
      `Duration: ${booking?.dur || ""}`,
      `Guests: ${booking?.guests ?? ""}`,
      ...(booking?.promoCode && isAllowedDiscountPct(booking?.discountPct) && booking?.subtotal != null
        ? [
            `Charter price before discount: ${booking.subtotal}€`,
            `VIP code ${booking.promoCode}: -${booking.discountPct}%`,
            `Total to pay: ${booking?.total ?? ""}€`,
          ]
        : [`Total: ${booking?.total ?? ""}€`]),
      booking?.notes ? `Notes: ${booking.notes}` : "",
      "",
      ...(payLines.length ? payLines : []),
      ...(needsProof && type!=="confirmed"
        ? [
            "",
            "After paying by Bizum or bank transfer, please email us proof of payment (screenshot or PDF receipt) quoting your booking reference above.",
          ]
        : []),
      "",
      contactEmail ? `If you have any questions, contact us at ${contactEmail}.` : "If you have any questions, contact us using the details on our website.",
    ]
      .filter(Boolean)
      .join("\n");
    const href = `mailto:${encodeURIComponent(guestTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  } catch {}
}

function deepMerge(base, override){
  if(!override || typeof override!=="object") return base;
  if(!base || typeof base!=="object") return override;
  if(Array.isArray(base) || Array.isArray(override)) return override;
  const out = {...base};
  for(const [k,v] of Object.entries(override)){
    if(v && typeof v==="object" && !Array.isArray(v) && base[k] && typeof base[k]==="object" && !Array.isArray(base[k])){
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Old site copy mentioned exterior moorings; strip matching bullet segments from “not included” lines. */
const MOORING_BULLET_SEGMENT =
  /\bmooring|moorings\b|liegepl[aä]tz|amarrages?\s+ext|amarrajes?\s+ext|amarres\s+exteri|exterior\s+moor|externa\s+fört|externe\s+liegepl|förtöjning/i;

function sanitizeExcludedBulletLine(text, fallback) {
  if (typeof text !== "string" || !text.trim()) return fallback;
  const parts = text.split("·").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return fallback;
  const kept = parts.filter((p) => !MOORING_BULLET_SEGMENT.test(p));
  if (!kept.length) return fallback;
  if (kept.length === parts.length) return text;
  return kept.join(" · ");
}

function stripDeprecatedMooringFromOverrides(overrides) {
  if (!overrides || typeof overrides !== "object") return { overrides: {}, changed: false };
  const out = { ...overrides };
  let changed = false;
  for (const [lang, slice] of Object.entries(out)) {
    if (!slice || typeof slice !== "object" || Array.isArray(slice)) continue;
    const baseLang = T[lang] || T.en;
    const next = { ...slice };
    if (next.bk && typeof next.bk === "object" && !Array.isArray(next.bk)) {
      const bk = { ...next.bk };
      if (typeof bk.notInc === "string") {
        const cleaned = sanitizeExcludedBulletLine(bk.notInc, baseLang.bk?.notInc);
        if (cleaned !== bk.notInc) {
          bk.notInc = cleaned;
          changed = true;
        }
      }
      if (Object.keys(bk).length === 0) delete next.bk;
      else next.bk = bk;
    }
    if (next.policy?.items && Array.isArray(next.policy.items)) {
      const baseExcluded = baseLang.policy?.items?.find((x) => x?.icon === "excluded");
      const items = next.policy.items.map((it) => {
        if (it?.icon === "excluded" && typeof it?.d === "string") {
          const cleaned = sanitizeExcludedBulletLine(it.d, baseExcluded?.d);
          if (cleaned !== it.d) {
            changed = true;
            return { ...it, d: cleaned };
          }
        }
        return it;
      });
      next.policy = { ...next.policy, items };
    }
    out[lang] = next;
  }
  return { overrides: out, changed };
}

/** Keeps `t.contact` a full object even if overrides set `contact` to null or a non-object (would crash the public UI). */
function safeMergedContactSlice(baseContact, mergedContact) {
  const bc =
    baseContact && typeof baseContact === "object" && !Array.isArray(baseContact)
      ? baseContact
      : T.en.contact;
  if (mergedContact && typeof mergedContact === "object" && !Array.isArray(mergedContact)) {
    return { ...bc, ...mergedContact };
  }
  return bc;
}

function safeMergedBkSlice(baseBk, mergedBk) {
  const bb =
    baseBk && typeof baseBk === "object" && !Array.isArray(baseBk)
      ? baseBk
      : T.en.bk;
  if (!mergedBk || typeof mergedBk !== "object" || Array.isArray(mergedBk)) return bb;
  const out = { ...bb, ...mergedBk };
  if (typeof out.notInc === "string") {
    out.notInc = sanitizeExcludedBulletLine(out.notInc, bb.notInc);
  }
  return out;
}

function safeMergedPolicySlice(basePolicy, mergedPolicy) {
  const bp =
    basePolicy && typeof basePolicy === "object" && !Array.isArray(basePolicy)
      ? basePolicy
      : T.en.policy;
  if (!mergedPolicy || typeof mergedPolicy !== "object" || Array.isArray(mergedPolicy)) return bp;
  const out = { ...bp, ...mergedPolicy };
  const baseExcluded = bp.items?.find((x) => x?.icon === "excluded");
  if (Array.isArray(out.items) && baseExcluded?.d && typeof baseExcluded.d === "string") {
    out.items = out.items.map((it) => {
      if (it?.icon === "excluded" && typeof it?.d === "string") {
        const cleaned = sanitizeExcludedBulletLine(it.d, baseExcluded.d);
        if (cleaned !== it.d) return { ...it, d: cleaned };
      }
      return it;
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// LOGO
// ═══════════════════════════════════════════════════════════════════════
// `onDark` switches the artwork variant:
//   - false (default): navy + gold transparent logo, ideal for the light
//                      website background (navbar, footer, hero areas).
//   - true: silver + gold transparent logo, ideal for dark surfaces
//                      (admin login screen, admin top bar).
// `light` is accepted for backward-compatibility but no longer affects
// rendering — surface contrast is now driven exclusively by `onDark`.
const Logo = ({ onDark = false, size = 1, prominent = false, onClick, light: _light }) => {
  const src = onDark ? brandLogoOnDark : brandLogo;
  const isInteractive = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Mallorca Island Yacht"
      style={{
        cursor: isInteractive ? "pointer" : "default",
        background: "transparent",
        border: "none",
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        transform: `scale(${size})`,
        transformOrigin: "left center",
        transition: "transform .35s ease, filter .35s ease",
      }}
      onMouseEnter={(e) => {
        if (isInteractive) e.currentTarget.style.transform = `scale(${size * 1.04})`;
      }}
      onMouseLeave={(e) => {
        if (isInteractive) e.currentTarget.style.transform = `scale(${size})`;
      }}
    >
      <img
        src={src}
        alt="Mallorca Island Yacht"
        draggable={false}
        style={{
          height: prominent ? 78 : 56,
          width: "auto",
          display: "block",
          // Subtle, brand-aware glow:
          //  · light bg → faint navy lift + gold halo
          //  · dark bg  → soft gold halo so the silver letters read clearly
          filter: onDark
            ? "drop-shadow(0 6px 18px rgba(0,0,0,.45)) drop-shadow(0 0 22px rgba(201,160,71,.28))"
            : "drop-shadow(0 8px 20px rgba(11,31,58,.18)) drop-shadow(0 0 14px rgba(201,160,71,.18))",
        }}
      />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════════════════
const MNS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MNS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DNS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

const SEASON_LABEL_PUBLIC = {
  en:{ low:"Low season · Nov–Apr", medium:"Mid season · May & Oct", high:"High season · Jun–Sep" },
  es:{ low:"Temporada baja · nov–abr", medium:"Temporada media · may y oct", high:"Temporada alta · jun–sep" },
};

const FLEET_UI_LABELS = {
  en:{
    vesselsKicker:"· Our Vessels ·",
    privateCharter:"Private Charter",
    specCapacity:"Capacity",
    specLength:"Length",
    specEngine:"Engine",
    specYear:"Year",
    specGuests:"{n} guests",
    charterRates:"Charter Rates",
    halfDay:"Half Day",
    fullDay:"Full Day",
    sunset:"Sunset",
    skipperNote:"Professional skipper included · VAT included",
  },
  es:{
    vesselsKicker:"· Nuestras embarcaciones ·",
    privateCharter:"Chárter privado",
    specCapacity:"Capacidad",
    specLength:"Eslora",
    specEngine:"Motor",
    specYear:"Año",
    specGuests:"{n} personas",
    charterRates:"Tarifas de chárter",
    halfDay:"Medio día",
    fullDay:"Día completo",
    sunset:"Sunset",
    skipperNote:"Patrón profesional incluido · IVA incluido",
  },
  de:{
    vesselsKicker:"· Unsere Flotte ·",
    privateCharter:"Privater Charter",
    specCapacity:"Kapazität",
    specLength:"Länge",
    specEngine:"Motor",
    specYear:"Baujahr",
    specGuests:"{n} Gäste",
    charterRates:"Charterpreise",
    halfDay:"Halbtags",
    fullDay:"Ganztags",
    sunset:"Sonnenuntergang",
    skipperNote:"Professioneller Skipper inkl. · MwSt. inkl.",
  },
  fr:{
    vesselsKicker:"· Notre flotte ·",
    privateCharter:"Charter privé",
    specCapacity:"Capacité",
    specLength:"Longueur",
    specEngine:"Moteur",
    specYear:"Année",
    specGuests:"{n} personnes",
    charterRates:"Tarifs charter",
    halfDay:"Demi-journée",
    fullDay:"Journée complète",
    sunset:"Coucher de soleil",
    skipperNote:"Skipper professionnel inclus · TVA incluse",
  },
  sv:{
    vesselsKicker:"· Vår flotta ·",
    privateCharter:"Privat charter",
    specCapacity:"Kapacitet",
    specLength:"Längd",
    specEngine:"Motor",
    specYear:"Årsmodell",
    specGuests:"{n} gäster",
    charterRates:"Charterpriser",
    halfDay:"Halvdag",
    fullDay:"Heldag",
    sunset:"Solnedgång",
    skipperNote:"Professionell skeppare ingår · Moms ingår",
  },
};
const AGENDA_SEASON_CARDS = [
  { key:"low", title:"Temporada baja", months:"Noviembre – abril" },
  { key:"medium", title:"Temporada media", months:"Mayo y octubre" },
  { key:"high", title:"Temporada alta", months:"Junio – septiembre" },
];
const AGENDA_PRICE_FIELDS = [
  ["Medio día (4 h)","half"],
  ["Día completo (8 h)","full"],
  ["Sunset (3 h)","sunset"],
  ["Patrón","skipper"],
];
const AGENDA_TABLE_TH = {fontSize:10,letterSpacing:".12em",color:"#64748b",fontWeight:700,textTransform:"uppercase",padding:"10px 14px",textAlign:"left"};
const AGENDA_TABLE_TD = {padding:"12px 14px",fontSize:14,color:"#0f172a",borderBottom:"1px solid #e2e8f0"};

const Calendar = ({
  selected,
  onSelect,
  bookedDates=[],
  partialDates=[],
  partialLegend="",
  customPriceDates=[],
  maxDateStr=null,
  mode="single",
  multiSelected=[],
  onMultiToggle,
  onViewMonthChange,
}) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(()=>new Date(today.getFullYear(),today.getMonth(),1));
  const onViewMonthChangeRef = useRef(onViewMonthChange);
  onViewMonthChangeRef.current = onViewMonthChange;
  const lastMonthNotifySigRef = useRef("");
  useEffect(()=>{
    const y = view.getFullYear(), mo = view.getMonth();
    const sig = `${y}-${mo}`;
    if(lastMonthNotifySigRef.current === sig) return;
    lastMonthNotifySigRef.current = sig;
    onViewMonthChangeRef.current?.(y, mo);
  },[view]);
  const y=view.getFullYear(), m=view.getMonth();
  const daysInM = new Date(y,m+1,0).getDate();
  let startDay = new Date(y,m,1).getDay(); if(startDay===0) startDay=7;
  const cells=[];
  for(let i=1;i<startDay;i++) cells.push(null);
  for(let d=1;d<=daysInM;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dt=new Date(y,m,d);
    const booked = bookedDates.includes(ds);
    const partial = !booked && partialDates.includes(ds);
    const customPrice = customPriceDates.includes(ds);
    const tooFar = !!(maxDateStr && ds > maxDateStr);
    cells.push({d,ds,past:dt<today,booked,partial,customPrice,today:dt.getTime()===today.getTime(),tooFar});
  }
  const canPrev = new Date(y,m,1)>new Date(today.getFullYear(),today.getMonth(),1);
  return (
    <div style={{background:"rgba(255,255,255,.75)",border:"1px solid rgba(11,31,58,.14)",borderRadius:12,padding:16,userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>canPrev&&setView(new Date(y,m-1,1))} style={{background:"none",border:"none",color:canPrev?"rgba(11,31,58,.86)":"rgba(11,31,58,.35)",fontSize:20,padding:"2px 8px",opacity:canPrev?1:.25}}>‹</button>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(11,31,58,.92)",letterSpacing:".05em"}}>{MNS[m]} {y}</span>
        <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>setView(new Date(y,m+1,1))} style={{background:"none",border:"none",color:"rgba(11,31,58,.86)",fontSize:20,padding:"2px 8px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
        {DNS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"rgba(11,31,58,.60)",padding:"2px 0",fontWeight:700}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((c,i)=>{
          if(!c) return <div key={`e${i}`}/>;
          const sel = mode==="multi" ? multiSelected.includes(c.ds) : selected===c.ds;
          const dis = mode==="multi" ? c.past : (c.past||c.booked||c.tooFar);
          const borderStyle =
            sel ? "1px solid transparent"
              : c.partial ? "1px solid rgba(245,158,11,.55)"
              : (mode==="multi" && c.booked) ? "1px solid rgba(239,68,68,.42)"
              : c.customPrice ? "1px solid rgba(34,197,94,.45)"
              : c.today ? "1px solid rgba(11,31,58,.18)"
              : "1px solid transparent";
          return (
            <button
              type="button"
              key={c.ds}
              onMouseDown={(e)=>{ e.preventDefault(); }}
              onClick={()=>{
              if(dis) return;
              if(mode==="multi") onMultiToggle?.(c.ds);
              else onSelect(c.ds);
            }} style={{
              background:sel?"linear-gradient(135deg,rgba(201,160,71,.95),rgba(201,160,71,.72))":c.today?"rgba(201,160,71,.14)":"transparent",
              color:dis?"rgba(11,31,58,.32)":sel?"rgba(11,31,58,.92)":"rgba(11,31,58,.86)",
              border:borderStyle,
              borderRadius:6,padding:"7px 0",fontSize:12,fontWeight:sel?700:400,
              cursor:dis?"not-allowed":"pointer",opacity:dis?0.3:1,transition:"all .15s",
              position:"relative",
            }}>{c.d}{c.customPrice && !sel ? (
              <span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#22c55e",display:"block"}} aria-hidden />
            ) : null}</button>
          );
        })}
      </div>
      <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:10,fontSize:10,color:"rgba(11,31,58,.62)",fontWeight:700}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",display:"inline-block"}}/>Booked</span>
        {partialLegend?(
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,border:"1px solid rgba(245,158,11,.75)",background:"rgba(245,158,11,.12)",display:"inline-block"}}/>{partialLegend}</span>
        ):null}
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"linear-gradient(135deg,#C9A047,#E8CC7E)",borderRadius:2,display:"inline-block"}}/>Selected</span>
        {customPriceDates.length>0?(
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>Día especial</span>
        ):null}
      </div>
    </div>
  );
};

/** Stable identity — must not be defined inside Admin render (would remount all tab content every state update). */
function AdminScrollPanel({ children }) {
  return (
    <div className="admin-scroll-panel">
      <div className="admin-scroll-panel-inner">{children}</div>
    </div>
  );
}
function AdminTableTh({ children, style = {} }) {
  return <th style={{fontSize:10,letterSpacing:".12em",color:"#64748b",fontWeight:700,textTransform:"uppercase",padding:"10px 14px",textAlign:"left",...style}}>{children}</th>;
}
function AdminTableTd({ children, style = {} }) {
  return <td style={{padding:"12px 14px",fontSize:14,color:"#0f172a",borderBottom:"1px solid #e2e8f0",...style}}>{children}</td>;
}

/**
 * Agenda temporada price: keeps local text while typing so parent `settings` updates never remount
 * the input (avoids caret flicker / focus loss when React key included the numeric value).
 */
function AgendaPriceField({ label, seasonKey, priceKey, committed, setSettings, onAfterCommit }) {
  const safe = Number.isFinite(Number(committed)) ? Math.round(Number(committed)) : 0;
  const [text, setText] = useState(() => String(safe));

  useEffect(() => {
    setText(String(safe));
  }, [safe]);

  const onBlur = useCallback(() => {
    const raw = String(text || "").replace(/\D/g, "");
    const parsed = raw === "" ? 0 : parseInt(raw, 10);
    const n = Number.isFinite(parsed) ? parsed : 0;
    if (n === safe) return;
    setSettings((s) => {
      const next = { ...(s || {}) };
      const seasons = {
        ...(next.pricingSeasons ||
          normalizePricingSeasons(null, next.pricing || DEFAULT_ADMIN_SETTINGS.pricing)),
      };
      const tier = { ...(seasons[seasonKey] || {}) };
      tier[priceKey] = n;
      seasons[seasonKey] = tier;
      next.pricingSeasons = seasons;
      return next;
    });
    if (typeof onAfterCommit === "function") {
      window.setTimeout(() => onAfterCommit(), 80);
    }
  }, [text, safe, seasonKey, priceKey, setSettings, onAfterCommit]);

  return (
    <div style={{ marginBottom: 10 }}>
      <label
        htmlFor={`agenda-${seasonKey}-${priceKey}`}
        style={{
          display: "block",
          fontSize: 9,
          letterSpacing: ".06em",
          color: "#64748b",
          marginBottom: 4,
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label} (€)
      </label>
      <input
        id={`agenda-${seasonKey}-${priceKey}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
        onBlur={onBlur}
        style={{
          width: "100%",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "8px 10px",
          color: "#0f172a",
          fontSize: 13,
          cursor: "text",
        }}
      />
    </div>
  );
}

const AGENDA_SLOT_LABELS = {
  half_am:"Mañana (medio día)",
  half_pm:"Tarde (medio día)",
  full:"Día completo",
  sunset:"Sunset",
};

/** Editor de fecha especial: borrador local + Guardar (el día sigue reservable, no bloqueado). */
function AgendaSpecialDayEditor({ dateStr, settings, setSettings, setToast, onFlushCloud, firebaseAuthUser }) {
  const [draft, setDraft] = useState(() => buildSpecialDayDraft(settings, dateStr));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildSpecialDayDraft(settings, dateStr));
  }, [dateStr, settings]);

  const seasonTitle = useMemo(() => {
    const mk = monthKeyFromDateStr(dateStr);
    const sk = mk ? seasonKeyFromMonthKey(mk) : "low";
    return AGENDA_SEASON_CARDS.find((c) => c.key === sk)?.title || "";
  }, [dateStr]);

  const onSave = useCallback(() => {
    const entry = draftToSpecialDayEntry(draft);
    if (!entry) {
      setToast("Activa al menos un turno con precio.");
      return;
    }
    setSaving(true);
    setSettings((s) => {
      const next = { ...(s || {}) };
      const sd = { ...(next.specialDays && typeof next.specialDays === "object" ? next.specialDays : {}) };
      sd[dateStr] = entry;
      next.specialDays = sd;
      return next;
    });
    setToast(`Fecha especial guardada: ${formatDate(dateStr)}`);
    if (isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud === "function") {
      window.setTimeout(() => {
        void onFlushCloud({}, { immediate: true }).finally(() => setSaving(false));
      }, 60);
    } else {
      setSaving(false);
    }
  }, [draft, dateStr, setSettings, setToast, onFlushCloud, firebaseAuthUser]);

  const onRestoreSeason = useCallback(() => {
    setSettings((s) => {
      const next = { ...(s || {}) };
      const sd = { ...(next.specialDays && typeof next.specialDays === "object" ? next.specialDays : {}) };
      delete sd[dateStr];
      next.specialDays = sd;
      return next;
    });
    setDraft(buildSpecialDayDraft(settings, dateStr));
    setToast(`Restaurada temporada en ${formatDate(dateStr)}.`);
    if (isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud === "function") {
      void onFlushCloud({}, { immediate: true });
    }
  }, [dateStr, settings, setSettings, setToast, onFlushCloud, firebaseAuthUser]);

  return (
    <div>
      <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, margin: "0 0 14px" }}>
        Día especial: reservable con normalidad. Título, precio y horario por turno (visible al cliente al reservar).
        {seasonTitle ? (
          <span style={{ display: "block", marginTop: 6, color: "#94a3b8" }}>
            Sin guardar especial, aplica <b style={{ color: "#64748b" }}>{seasonTitle}</b>.
          </span>
        ) : null}
      </p>
      {ALL_BOOKING_SLOT_IDS.map((sid) => {
        const row = draft.slots[sid] || { enabled: true, title: "", price: "0", sub: DEFAULT_SLOT_SCHEDULE[sid] };
        const seasonP = seasonPriceForSlot(settings, dateStr, sid);
        return (
          <div
            key={sid}
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              background: row.enabled ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              opacity: row.enabled ? 1 : 0.72,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!row.enabled}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    slots: { ...d.slots, [sid]: { ...d.slots[sid], enabled: e.target.checked } },
                  }))
                }
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{AGENDA_SLOT_LABELS[sid]}</span>
            </label>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Título para el cliente</label>
              <input
                type="text"
                disabled={!row.enabled}
                value={row.title || ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    slots: { ...d.slots, [sid]: { ...d.slots[sid], title: e.target.value } },
                  }))
                }
                placeholder={`Ej: ${AGENDA_SLOT_LABELS[sid]} (vacío = nombre del sitio sin horas)`}
                maxLength={100}
                style={{
                  width: "100%",
                  marginTop: 4,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "7px 9px",
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Precio (€)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!row.enabled}
                  value={row.price}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      slots: { ...d.slots, [sid]: { ...d.slots[sid], price: e.target.value.replace(/\D/g, "") } },
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "7px 9px",
                    fontSize: 13,
                  }}
                />
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Temporada: {seasonP} €</div>
              </div>
              <div>
                <label style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Horario</label>
                <input
                  type="text"
                  disabled={!row.enabled}
                  value={row.sub}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      slots: { ...d.slots, [sid]: { ...d.slots[sid], sub: e.target.value } },
                    }))
                  }
                  placeholder={DEFAULT_SLOT_SCHEDULE[sid]}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "7px 9px",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Patrón (€, opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          value={draft.skipper}
          onChange={(e) => setDraft((d) => ({ ...d, skipper: e.target.value.replace(/\D/g, "") }))}
          style={{
            width: "100%",
            marginTop: 4,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "7px 9px",
            fontSize: 13,
          }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={onSave} disabled={saving} className="btn-gold" style={{ fontSize: 12, padding: "10px 18px", fontWeight: 700, flex: 1, minWidth: 140 }}>
          {saving ? "Guardando…" : "Guardar día especial"}
        </button>
        {getSpecialDayEntry(settings, dateStr) ? (
          <button
            type="button"
            onClick={onRestoreSeason}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#475569",
              fontSize: 12,
              padding: "10px 14px",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Quitar especial
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Admin Agenda tab: price fields use local state + blur commit (see AgendaPriceField). */
function AdminAgendaTab({
  blockedDates,
  setBlockedDates,
  bookings,
  settings,
  setSettings,
  agendaPick,
  setAgendaPick,
  agendaViewMonth,
  setAgendaViewMonth,
  setToast,
  onFlushCloud,
  firebaseAuthUser,
}){
  const agendaCalendarInfo = useMemo(()=>computeBookedCalendarInfo(blockedDates, bookings),[blockedDates, bookings]);
  const agendaCalMk = String(agendaViewMonth.getMonth()+1).padStart(2,"0");
  const agendaCalSeason = seasonKeyFromMonthKey(agendaCalMk);
  const agendaCalMonthLabel = `${MNS[agendaViewMonth.getMonth()]} ${agendaViewMonth.getFullYear()}`;
  const customPriceDates = useMemo(()=>listSpecialDayDates(settings),[settings?.specialDays]);
  const agendaPriceDay = agendaPick.length===1 ? agendaPick[0] : null;
  const agendaPriceDayIsSpecial = !!(agendaPriceDay && getSpecialDayEntry(settings, agendaPriceDay));

  const noopCalendarSelect = useCallback(()=>{}, []);
  const onCalendarMonthChange = useCallback((y,m)=>{
    setAgendaViewMonth((prev)=>{
      if(prev && prev.getFullYear()===y && prev.getMonth()===m) return prev;
      return new Date(y,m,1);
    });
  },[setAgendaViewMonth]);
  const onCalendarMultiToggle = useCallback((ds)=>{
    setAgendaPick(prev=>{
      const next = new Set(Array.isArray(prev)?prev:[]);
      if(next.has(ds)) next.delete(ds);
      else next.add(ds);
      return Array.from(next).sort();
    });
  },[setAgendaPick]);

  const flushIfCloud = useCallback(()=>{
    if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
      window.setTimeout(()=> void onFlushCloud(), 80);
    }
  },[firebaseAuthUser, onFlushCloud]);

  const onBlockSelected = useCallback(()=>{
    if(!agendaPick.length) return;
    let added = 0;
    const arr = Array.isArray(blockedDates)?blockedDates:[];
    const set = new Set(arr);
    for(const d of agendaPick){
      if(!set.has(d)){ set.add(d); added++; }
    }
    const nextBlocked = Array.from(set).sort();
    setBlockedDates(nextBlocked);
    setToast(added ? `Bloqueados ${added} día(s) nuevos (día completo).` : "Esos días ya estaban bloqueados.");
    setAgendaPick([]);
    if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
      void onFlushCloud({ blockedDates: nextBlocked });
    }
  },[agendaPick, blockedDates, setBlockedDates, setAgendaPick, setToast, firebaseAuthUser, onFlushCloud]);

  const onUnblockSelected = useCallback(()=>{
    if(!agendaPick.length) return;
    const pick = new Set(agendaPick);
    const arr = Array.isArray(blockedDates)?blockedDates:[];
    const nextBlocked = arr.filter(k=>{
      const day = String(k).split("|")[0];
      return !pick.has(day);
    });
    setBlockedDates(nextBlocked);
    setToast(`Desbloqueados ${agendaPick.length} día(s).`);
    setAgendaPick([]);
    if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
      void onFlushCloud({ blockedDates: nextBlocked });
    }
  },[agendaPick, blockedDates, setBlockedDates, setAgendaPick, setToast, firebaseAuthUser, onFlushCloud]);

  const onClearSelection = useCallback(()=>setAgendaPick([]),[setAgendaPick]);

  const onRemoveBlockedEntry = useCallback((e)=>{
    const entry = e.currentTarget.getAttribute("data-entry");
    if(typeof entry!=="string" || !entry) return;
    const arr = Array.isArray(blockedDates)?blockedDates:[];
    const nextBlocked = arr.filter(x=>x!==entry);
    setBlockedDates(nextBlocked);
    setToast("Entrada eliminada.");
    if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
      void onFlushCloud({ blockedDates: nextBlocked });
    }
  },[blockedDates, setBlockedDates, setToast, firebaseAuthUser, onFlushCloud]);

  return (
    <>
      <div style={{marginBottom:28}}>
        <h2 className="playfair" style={{fontSize:26,color:"#0b1f3a",marginBottom:10}}>Agenda</h2>
        <p style={{fontSize:13,color:"#64748b",lineHeight:1.65,maxWidth:820,margin:0}}>
          <b>Precios:</b> las tres temporadas (baja, media, alta) se pueden editar <b>a la vez</b>. Escribe el importe y <b>sal del campo</b> (Tab o clic fuera) para guardar en este navegador. El borde dorado en una tarjeta solo indica qué temporada aplica al <b>mes del calendario</b>, no bloquea el resto.
          <span style={{display:"block",marginTop:8}}>
            <b>Calendario:</b> bloquea días si no quieres reservas, o selecciona <b>un día</b> para configurar precios y horarios especiales (el día sigue abierto a reservas).
          </span>
        </p>
      </div>

      <div className="card" style={{padding:"22px 24px",borderRadius:14,marginBottom:22}}>
        <div style={{fontSize:11,fontWeight:800,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase",marginBottom:8}}>Precios charter por temporada (€)</div>
        <p style={{fontSize:12,color:"#64748b",lineHeight:1.6,margin:"0 0 18px",maxWidth:720}}>
          Mes del calendario (abajo) — solo referencia visual: <b style={{color:"#0f172a"}}>{AGENDA_SEASON_CARDS.find(c=>c.key===agendaCalSeason)?.title}</b>
          <span style={{color:"#94a3b8"}}> · {agendaCalMonthLabel}</span>
          <span style={{display:"block",marginTop:6,color:"#94a3b8"}}>Puedes cambiar precios en cualquier tarjeta; no hace falta cambiar de mes.</span>
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
          {AGENDA_SEASON_CARDS.map(card=>{
            const sk = card.key;
            const highlightCalendarMonth = agendaCalSeason===sk;
            return (
              <div
                key={sk}
                style={{
                  background:"#fafbfc",
                  border:highlightCalendarMonth?"2px solid rgba(201,160,71,.55)":"1px solid #e2e8f0",
                  borderRadius:12,
                  padding:"16px 16px 14px",
                  boxShadow:highlightCalendarMonth?"0 4px 20px rgba(201,160,71,.1)":"none",
                  opacity:1,
                  pointerEvents:"auto",
                }}
              >
                <div style={{fontSize:13,fontWeight:800,color:"#0b1f3a",marginBottom:4}}>{card.title}</div>
                <div style={{fontSize:11,color:"#64748b",marginBottom:14,lineHeight:1.45}}>{card.months}</div>
                {AGENDA_PRICE_FIELDS.map(([label,pk])=>{
                  const resolved = settings?.pricingSeasons?.[sk]?.[pk] ?? settings?.pricing?.[pk] ?? DEFAULT_ADMIN_SETTINGS.pricing[pk];
                  return (
                    <AgendaPriceField
                      key={pk}
                      label={label}
                      seasonKey={sk}
                      priceKey={pk}
                      committed={resolved}
                      setSettings={setSettings}
                      onAfterCommit={flushIfCloud}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{padding:"22px 24px",borderRadius:14,marginBottom:22}}>
        <div style={{fontSize:11,fontWeight:800,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase",marginBottom:12}}>Calendario y bloqueos</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),420px))",gap:24,alignItems:"start"}}>
          <div style={{maxWidth:420}}>
            <Calendar
              mode="multi"
              selected=""
              onSelect={noopCalendarSelect}
              multiSelected={agendaPick}
              onMultiToggle={onCalendarMultiToggle}
              bookedDates={agendaCalendarInfo.days}
              partialDates={agendaCalendarInfo.partialDays}
              partialLegend="Partial"
              customPriceDates={customPriceDates}
              onViewMonthChange={onCalendarMonthChange}
            />
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14,minWidth:0}}>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Mes en pantalla</div>
              <div style={{fontSize:15,color:"#0f172a",fontWeight:700}}>{agendaCalMonthLabel}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:8,lineHeight:1.5}}>
                Para reservas en este mes se aplican los precios de <b style={{color:"#0b1f3a"}}>{AGENDA_SEASON_CARDS.find(c=>c.key===agendaCalSeason)?.title}</b>.
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              <button type="button" onClick={onBlockSelected} className="btn-gold" style={{fontSize:12,padding:"10px 16px",fontWeight:700}}>Bloquear selección ({agendaPick.length})</button>
              <button type="button" onClick={onUnblockSelected} style={{background:"#f8fafc",border:"1px solid #cbd5e1",color:"#475569",fontSize:12,padding:"10px 16px",borderRadius:8,fontWeight:600}}>Desbloquear selección ({agendaPick.length})</button>
              <button type="button" onClick={onClearSelection} style={{background:"transparent",border:"1px solid #e2e8f0",color:"#64748b",fontSize:12,padding:"10px 16px",borderRadius:8,fontWeight:600}}>Quitar selección</button>
            </div>
            {agendaPriceDay ? (
              <div style={{background:"#fffbeb",border:"1px solid rgba(201,160,71,.35)",borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#C9A047",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>
                  Día especial (precios y horarios)
                </div>
                <div style={{fontSize:15,color:"#0f172a",fontWeight:700,marginBottom:4}}>{formatDate(agendaPriceDay)}</div>
                {agendaPriceDayIsSpecial ? (
                  <span style={{display:"block",fontSize:11,color:"#16a34a",fontWeight:700,marginBottom:10}}>Guardado — visible para clientes al reservar.</span>
                ) : null}
                <AgendaSpecialDayEditor
                  dateStr={agendaPriceDay}
                  settings={settings}
                  setSettings={setSettings}
                  setToast={setToast}
                  onFlushCloud={onFlushCloud}
                  firebaseAuthUser={firebaseAuthUser}
                />
              </div>
            ) : agendaPick.length>1 ? (
              <p style={{fontSize:12,color:"#94a3b8",lineHeight:1.5,margin:0}}>
                Para configurar un día especial, selecciona <b style={{color:"#64748b"}}>solo un día</b> en el calendario.
              </p>
            ) : (
              <p style={{fontSize:12,color:"#94a3b8",lineHeight:1.5,margin:0}}>
                Selecciona un día para precios y horarios exclusivos (no bloquea la fecha).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{padding:0,borderRadius:14,overflow:"hidden",marginBottom:8}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",background:"#fafbfc"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase"}}>Entradas bloqueadas</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Días completos o franjas no disponibles para reserva.</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
            <thead style={{background:"#f1f5f9"}}>
              <tr>
                <th style={{...AGENDA_TABLE_TH}}>Fecha / franja</th>
                <th style={{...AGENDA_TABLE_TH,textAlign:"right"}}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(blockedDates||[]).slice().sort().map(d=>(
                <tr key={d} onMouseEnter={e=>{ e.currentTarget.style.background="#f8fafc"; }} onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
                  <td style={{...AGENDA_TABLE_TD,fontSize:13}}>{d.includes("|") ? `${formatDate(d.split("|")[0])} · ${d.split("|")[1]}` : formatDate(d)}</td>
                  <td style={{...AGENDA_TABLE_TD,textAlign:"right"}}>
                    <button type="button" data-entry={d} onClick={onRemoveBlockedEntry} style={{background:"none",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:11,padding:"6px 12px",borderRadius:8,fontWeight:600}}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {(!blockedDates || blockedDates.length===0) && (
                <tr><td style={{...AGENDA_TABLE_TD,color:"#64748b",padding:"18px 20px"}} colSpan={2}>No hay bloqueos. Usa el calendario arriba para añadir.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BOOKING MODAL
// ═══════════════════════════════════════════════════════════════════════
/** Public booking cap from admin vessel capacity (1..99). Handles number, numeric string, and bad/empty values. */
function maxGuestsFromBoatCapacity(capacity){
  if(typeof capacity==="number" && Number.isFinite(capacity)){
    return Math.max(1, Math.min(99, Math.floor(capacity)));
  }
  const n = Number.parseInt(String(capacity ?? "").trim(), 10);
  if(Number.isFinite(n) && n >= 1) return Math.max(1, Math.min(99, n));
  return 6;
}

const BookingModal = ({boat,bk,lang="es",onClose,onBooked,settings,bookedDays=[],partialDays=[],bookedKeys=[],bookingHeroSrc}) => {
  const t = bk || T.en.bk;
  const maxBookDateStr = useMemo(()=>maxBookingDateStrAfterToday(),[]);
  const [step,setStep]=useState(0);
  const [date,setDate]=useState("");
  const [dur,setDur]=useState("half_am");
  const [form,setForm]=useState({
    name:"",
    email:"",
    phoneCountry:DEFAULT_PHONE_COUNTRY_ISO,
    phoneNational:"",
    guests:"2",
    notes:"",
  });
  const resolveFormPhone = useCallback(
    ()=>buildE164FromParts(form.phoneCountry, form.phoneNational),
    [form.phoneCountry, form.phoneNational],
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [altPayMethod, setAltPayMethod] = useState("bizum");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [ref,setRef]=useState("");
  const [promoInput,setPromoInput]=useState("");
  const [vipPromoNormalized,setVipPromoNormalized]=useState("");
  const [vipPromoPct,setVipPromoPct]=useState(null);
  const [promoBusy,setPromoBusy]=useState(false);
  const [promoHint,setPromoHint]=useState("");
  const bookedKeysSet = useMemo(()=>new Set(Array.isArray(bookedKeys)?bookedKeys:[]),[bookedKeys]);
  const maxGuests = useMemo(()=>maxGuestsFromBoatCapacity(boat?.capacity), [boat?.capacity]);

  useEffect(()=>{
    setForm((f)=>{
      const n = Number.parseInt(f.guests, 10);
      if(Number.isFinite(n) && n > maxGuests) return {...f, guests:String(maxGuests)};
      if(!Number.isFinite(n) || n < 1) return {...f, guests:String(Math.min(2, maxGuests))};
      return f;
    });
  },[maxGuests]);

  const specialEnabledSlots = useMemo(
    ()=>(date ? getSpecialDayEnabledSlots(settings, date) : null),
    [settings, date],
  );

  useEffect(()=>{
    if(!date) return;
    if(date > maxBookDateStr){ setDate(""); return; }
    const slot = slotKeyFromDur(dur);
    if(!isSlotBlocked(date, slot, bookedKeysSet)) return;
    const order = [...BOOKING_SHIFT_IDS,"full"].filter((d)=>!specialEnabledSlots || specialEnabledSlots.includes(d));
    const nextDur = order.find(d=>!isSlotBlocked(date, slotKeyFromDur(d), bookedKeysSet));
    if(nextDur) setDur(nextDur);
  },[date, bookedKeysSet, dur, maxBookDateStr, specialEnabledSlots]);
  
  useEffect(()=>{
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return ()=>{ document.body.style.overflow = prev; };
  },[]);

  const durObj = t.durs.find(d=>d.id===dur)||t.durs[0];
  const isSpecialBookingDate = useMemo(
    ()=>!!(date && getSpecialDayEntry(settings, date)),
    [settings, date],
  );
  const durTitle = useMemo(
    ()=>getSpecialDaySlotTitle(settings, date, dur, durObj?.name),
    [settings, date, dur, durObj?.name],
  );
  const slotDurTitle = useCallback(
    (durId, name)=>getSpecialDaySlotTitle(settings, date, durId, name),
    [settings, date],
  );
  const slotSub = useCallback(
    (durId, fallbackSub)=>{
      if(!date) return fallbackSub;
      return getSpecialDaySlotSchedule(settings, date, durId, fallbackSub);
    },
    [settings, date],
  );
  const isSlotOffered = useCallback(
    (durId)=>{
      if(!specialEnabledSlots) return true;
      return specialEnabledSlots.includes(durId);
    },
    [specialEnabledSlots],
  );
  const priceForDur = useCallback(
    (durId)=>charterBaseEurosClient(settings, date, durId),
    [settings, date],
  );
  const charterBase = priceForDur(dur);
  const promoAllowed = !isSpecialBookingDate;
  const total = promoAllowed && vipPromoNormalized && isAllowedDiscountPct(vipPromoPct)
    ? Math.max(0, Math.round(charterBase * (100 - vipPromoPct) / 100))
    : charterBase;
  const durPrice = charterBase;
  const paymentSettings = settings?.payment || DEFAULT_ADMIN_SETTINGS.payment;
  const hasBizumPay = typeof paymentSettings.bizum==="string" && paymentSettings.bizum.trim();
  const hasIbanPay = typeof paymentSettings.iban==="string" && paymentSettings.iban.trim();
  const otherPayAvailable = !!(hasBizumPay || hasIbanPay);
  const stripePayAvailable = isFirebaseConfigured();
  const anyPaymentAvailable = stripePayAvailable || otherPayAvailable;
  const paymentReady = useMemo(()=>{
    if(paymentMethod==="card") return stripePayAvailable;
    if(paymentMethod==="other") return otherPayAvailable;
    return false;
  },[paymentMethod, stripePayAvailable, otherPayAvailable]);

  const displaySteps = useMemo(()=>{
    if(paymentMethod==="card") return [t.steps[0], t.steps[1], t.steps[3]];
    return t.steps;
  },[paymentMethod, t.steps]);

  const displayStepIndex = useMemo(()=>{
    if(paymentMethod==="card"){
      if(step===0) return 0;
      if(step===1) return 1;
      if(step>=3) return 2;
      return 1;
    }
    return Math.min(step, displaySteps.length - 1);
  },[paymentMethod, step, displaySteps.length]);

  const primaryCtaLabel = useMemo(()=>{
    if(step===0) return t.next;
    if(step===1){
      if(paymentMethod==="card"){
        const tpl = typeof t.payCtaCard==="string" ? t.payCtaCard : "Pay {total}€ securely";
        return tpl.replace(/\{total\}/g, String(total));
      }
      return t.next;
    }
    if(step===2) return typeof t.payConfirmOther==="string" ? t.payConfirmOther : t.pay;
    return t.next;
  },[step, paymentMethod, total, t.next, t.payCtaCard, t.payConfirmOther, t.pay]);

  useEffect(()=>{
    if(!stripePayAvailable && otherPayAvailable) setPaymentMethod("other");
  },[stripePayAvailable, otherPayAvailable]);

  useEffect(()=>{
    if(hasBizumPay && !hasIbanPay) setAltPayMethod("bizum");
    else if(!hasBizumPay && hasIbanPay) setAltPayMethod("bank");
  },[hasBizumPay, hasIbanPay]);

  useEffect(()=>{
    if(!isSpecialBookingDate) return;
    setVipPromoNormalized("");
    setVipPromoPct(null);
    setPromoInput("");
    setPromoHint(typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción.");
  },[date, isSpecialBookingDate, t.promoExcludedSpecialDay]);

  const applyVipPromo = useCallback(async ()=>{
    if(isSpecialBookingDate){
      setPromoHint(typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción.");
      return;
    }
    setPromoHint("");
    const raw = promoInput.trim();
    const norm = normalizeVipDiscountCode(raw);
    if(norm.length < 4){
      setPromoHint(typeof t.promoInvalid==="string" ? t.promoInvalid : "Invalid code");
      return;
    }
    setPromoBusy(true);
    try{
      let pct = null;
      if(isFirebaseConfigured()){
        const resolved = await resolveActiveDiscountCodePublic(norm);
        if(resolved) pct = resolved.pct;
      } else if(isVipCodeAvailableLocal(norm, settings)) {
        pct = VIP_CHARTER_DISCOUNT_PCT;
      }
      if(!isAllowedDiscountPct(pct)){
        setVipPromoNormalized("");
        setVipPromoPct(null);
        setPromoHint(typeof t.promoInvalid==="string" ? t.promoInvalid : "Invalid code");
        return;
      }
      setVipPromoNormalized(norm);
      setVipPromoPct(pct);
      setPromoInput(norm);
      setPromoHint(typeof t.promoAppliedShort==="string" ? t.promoAppliedShort : "Applied");
    } catch {
      setVipPromoNormalized("");
      setVipPromoPct(null);
      setPromoHint(typeof t.promoInvalid==="string" ? t.promoInvalid : "Invalid code");
    } finally {
      setPromoBusy(false);
    }
  },[promoInput, settings, isSpecialBookingDate, t.promoAppliedShort, t.promoInvalid, t.promoExcludedSpecialDay]);

  const validateBookingDetails = useCallback(()=>{
    if(!form.name||!form.email||!String(form.phoneNational||"").trim()){setErr(t.req);return false;}
    if(!resolveFormPhone().ok){
      setErr(typeof t.phoneInvalid==="string" ? t.phoneInvalid : "Enter a valid mobile number for the selected country.");
      return false;
    }
    const g = Number.parseInt(String(form.guests).trim(), 10);
    if(!Number.isFinite(g) || g < 1){setErr(t.req);return false;}
    if(g > maxGuests){
      const msg = typeof t.guestsOverCapacity === "string"
        ? t.guestsOverCapacity.replace(/\{max\}/g, String(maxGuests))
        : `Maximum ${maxGuests} guests for this vessel.`;
      setErr(msg);
      return false;
    }
    return true;
  },[form, resolveFormPhone, maxGuests, t.req, t.phoneInvalid, t.guestsOverCapacity]);

  const handleStripeCheckoutError = useCallback((e)=>{
    const code = e?.code || String(e?.message||e);
    if(code==="slot_unavailable"){
      setErr(typeof t.slotUnavailable==="string" ? t.slotUnavailable : "That slot is no longer available.");
    }else if(code==="invalid_promo"){
      setVipPromoNormalized("");
      setVipPromoPct(null);
      setPromoHint("");
      setErr(typeof t.promoAlreadyUsed==="string" ? t.promoAlreadyUsed : "This discount code is no longer valid or has already been used.");
    }else if(code==="promo_excluded_date"){
      setVipPromoNormalized("");
      setVipPromoPct(null);
      setPromoHint(typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción.");
      setErr(typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción.");
    }else if(code==="guests_over_capacity"){
      const max = e?.payload?.maxGuests;
      const msg = typeof t.guestsOverCapacity==="string" && max
        ? t.guestsOverCapacity.replace(/\{max\}/g, String(max))
        : "Too many guests for this vessel.";
      setErr(msg);
    }else if(code==="stripe_not_configured" || code==="server_misconfigured"){
      setErr(typeof t.stripeNeedsBackend==="string" ? t.stripeNeedsBackend : "Payment server is not configured.");
    }else if(code==="invalid_phone"){
      setErr(typeof t.phoneInvalid==="string" ? t.phoneInvalid : "Enter a valid mobile number with country code.");
    }else{
      setErr(typeof t.stripeCheckoutError==="string" ? t.stripeCheckoutError : "Could not start card payment. Please try again.");
    }
    setLoading(false);
  },[t]);

  const startStripeCheckout = useCallback(()=>{
    if(!stripePayAvailable){
      setErr(typeof t.stripeNeedsBackend==="string" ? t.stripeNeedsBackend : "Card payment requires Firebase and the deployed checkout API.");
      return;
    }
    setErr("");
    setLoading(true);
    (async ()=>{
      try{
        const parsedG = Number.parseInt(String(form.guests).trim(), 10);
        const guestCount = Math.min(maxGuests, Math.max(1, Number.isFinite(parsedG) ? parsedG : 1));
        const phoneForPay = resolveFormPhone();
        if(!phoneForPay.ok){
          setErr(typeof t.phoneInvalid==="string" ? t.phoneInvalid : "Invalid phone number.");
          setLoading(false);
          return;
        }
        const payload = {
          guest:String(form.name||"").trim(),
          email:String(form.email||"").trim(),
          phone: phoneForPay.e164,
          guests:guestCount,
          notes:String(form.notes||""),
          date,
          dur,
          boatId:boat?.id!=null ? String(boat.id) : "",
          boatName:String(boat?.name||"").trim(),
          ...(promoAllowed && vipPromoNormalized ? { promoCode: vipPromoNormalized } : {}),
        };
        const out = await createStripeCheckoutSession(payload);
        if(out?.bookingId){
          try{
            window.sessionStorage.setItem("miy_last_checkout_booking", String(out.bookingId));
          }catch{
            /* private mode / blocked storage */
          }
        }
        if(out?.url) window.location.href = out.url;
        else throw new Error("checkout_no_url");
      }catch(e){
        handleStripeCheckoutError(e);
      }
    })();
  },[stripePayAvailable, form, maxGuests, resolveFormPhone, date, dur, boat, promoAllowed, vipPromoNormalized, t, handleStripeCheckoutError]);

  const confirmManualBooking = useCallback(()=>{
    const method = altPayMethod==="bank" ? "bank" : "bizum";
    if((method==="bizum" && !hasBizumPay) || (method==="bank" && !hasIbanPay)){
      setErr("Payment method not configured. Please choose another option.");
      return;
    }
    setErr("");
    setLoading(true);
    (async ()=>{
      try{
        const r = genRef();
        const parsedG = Number.parseInt(String(form.guests).trim(), 10);
        const guestCount = Math.min(maxGuests, Math.max(1, Number.isFinite(parsedG) ? parsedG : 1));
        const phoneNorm = resolveFormPhone();
        const booking = {
          id:r,
          guest:form.name,
          email:form.email,
          phone: phoneNorm.ok ? phoneNorm.e164 : String(form.phoneNational||"").trim(),
          date,
          dur,
          boat:boat.name,
          guests:guestCount,
          total,
          status:"pending",
          notes:form.notes,
          payment:method,
          slot:slotKeyFromDur(dur),
          ...(promoAllowed && vipPromoNormalized && isAllowedDiscountPct(vipPromoPct)
            ? {
                promoCode: vipPromoNormalized,
                subtotal: charterBase,
                discountPct: vipPromoPct,
              }
            : {}),
        };
        await Promise.resolve(onBooked(booking));
        setRef(r);
        setLoading(false);
        setStep(3);
      }catch(e){
        const msg = String(e?.message||e);
        if(msg==="slot_taken"){
          setErr(typeof t.slotUnavailable==="string" ? t.slotUnavailable : "That slot is no longer available.");
        }else if(msg==="invalid_promo"){
          setVipPromoNormalized("");
          setPromoHint("");
          setErr(typeof t.promoAlreadyUsed==="string" ? t.promoAlreadyUsed : "This discount code is no longer valid or has already been used.");
        }else if(msg.includes("permission")||msg.includes("PERMISSION_DENIED")){
          setErr("Could not save booking to the server. Check Firebase rules and configuration.");
        }else{
          setErr(msg && msg.length<180 ? msg : "Could not complete booking. Please try again.");
        }
        setLoading(false);
      }
    })();
  },[altPayMethod, hasBizumPay, hasIbanPay, form, maxGuests, resolveFormPhone, date, dur, boat, total, promoAllowed, vipPromoNormalized, vipPromoPct, charterBase, onBooked, t]);

  const next = ()=>{
    if(step===0){
      if(!date){setErr(t.noDate);return;}
      if(date > maxBookDateStr){
        setErr(typeof t.dateBeyondHorizon==="string" ? t.dateBeyondHorizon : "That date is too far in advance.");
        return;
      }
      const slot = slotKeyFromDur(dur);
      if(isSlotBlocked(date, slot, bookedKeysSet)){
        setErr(typeof t.slotUnavailable==="string" ? t.slotUnavailable : "Selected time is not available. Please choose another option.");
        return;
      }
      setErr("");setStep(1);
    } else if(step===1){
      if(!validateBookingDetails()) return;
      if(!anyPaymentAvailable){
        setErr(typeof t.payOtherUnavailable==="string" ? t.payOtherUnavailable : "No payment method is available online. Please contact us.");
        return;
      }
      setErr("");
      if(paymentMethod==="card"){
        if(!stripePayAvailable){
          setErr(typeof t.stripeNeedsBackend==="string" ? t.stripeNeedsBackend : "Card payment is not available.");
          return;
        }
        startStripeCheckout();
        return;
      }
      if(!otherPayAvailable){
        setErr(typeof t.payOtherUnavailable==="string" ? t.payOtherUnavailable : "Alternative payment is not available. Please contact us.");
        return;
      }
      if(altPayMethod==="bizum" && !hasBizumPay && hasIbanPay) setAltPayMethod("bank");
      else if(altPayMethod==="bank" && !hasIbanPay && hasBizumPay) setAltPayMethod("bizum");
      setStep(2);
    } else if(step===2){
      if(paymentMethod!=="other"){
        setStep(1);
        return;
      }
      confirmManualBooking();
    }
  };

  return (
    <div className="booking-modal-root" style={{position:"fixed",inset:0,zIndex:1000,display:"flex",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&step<3&&onClose()}>
      <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.62)",backdropFilter:"blur(10px)"}} onClick={step<3?onClose:undefined}/>
      <div className="surface booking-modal-surface" style={{position:"relative",overflowY:"auto",animation:"fadeUp .4s ease"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontSize:10,letterSpacing:".2em",color:"rgba(11,31,58,.62)",marginBottom:6,textTransform:"uppercase",fontWeight:900}}>Mallorca Island Yacht</div>
            <h2 className="playfair" style={{fontSize:22,fontWeight:700,color:"rgba(11,31,58,.94)"}}>{t.title}</h2>
          </div>
          {step<3&&<button onClick={onClose} style={{background:"none",border:"none",color:"rgba(11,31,58,.55)",fontSize:22,lineHeight:1,marginTop:-4}}>✕</button>}
        </div>
        
        {/* Steps */}
        <div style={{display:"flex",gap:4,marginBottom:28}}>
          {displaySteps.map((s,i)=>(
            <div key={s} style={{flex:1,textAlign:"center"}}>
              <div style={{height:2,borderRadius:1,background:i<=displayStepIndex?"linear-gradient(90deg,rgba(201,160,71,.95),rgba(201,160,71,.70))":"rgba(11,31,58,.10)",marginBottom:6,transition:"background .3s"}}/>
              <span style={{fontSize:9,letterSpacing:".08em",color:i<=displayStepIndex?"rgba(11,31,58,.78)":"rgba(11,31,58,.48)",fontWeight:i===displayStepIndex?900:700,textTransform:"uppercase"}}>{s}</span>
            </div>
          ))}
        </div>
        
        {err&&<div style={{background:"rgba(239,68,68,.10)",border:"1px solid rgba(239,68,68,.22)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"rgba(127,29,29,.95)",marginBottom:16,fontWeight:700}}>{err}</div>}
        
        {/* STEP 0: Date & Duration */}
        {step===0&&(
          <div style={{animation:"fadeIn .4s ease"}}>
            <div className="booking-step0-row" style={{marginBottom:22}}>
              <div className="booking-step0-photo" aria-hidden={true}>
                <img src={preferWebpUrl(bookingHeroSrc) || DEFAULT_BOOKING_HERO_URL} alt="" decoding="async" fetchPriority="high" />
              </div>
              <div className="booking-step0-cal">
                <label style={{display:"block",fontSize:11,letterSpacing:".12em",color:"rgba(11,31,58,.70)",marginBottom:10,textTransform:"uppercase",fontWeight:900}}>{t.selectDate}</label>
                <Calendar
                  selected={date}
                  onSelect={setDate}
                  bookedDates={bookedDays}
                  partialDates={partialDays}
                  partialLegend={typeof t.partialBookedLegend==="string" ? t.partialBookedLegend : ""}
                  maxDateStr={maxBookDateStr}
                />
              </div>
            </div>
            <div>
              {!date&&(
                <div style={{background:"rgba(255,255,255,.72)",border:"1px dashed rgba(11,31,58,.18)",borderRadius:12,padding:"14px 16px",marginBottom:16,fontSize:12,color:"rgba(11,31,58,.76)",fontWeight:800,lineHeight:1.45}}>
                  {typeof t.pickDateFirst==="string" ? t.pickDateFirst : "Select a date first."}
                </div>
              )}
              {date&&(
                <>
                  {isSpecialBookingDate ? (
                    <div className="booking-promo-special-notice" role="status">
                      {typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción."}
                    </div>
                  ) : null}
                  <label style={{display:"block",fontSize:11,letterSpacing:".12em",color:"rgba(11,31,58,.70)",marginBottom:10,textTransform:"uppercase",fontWeight:900}}>{typeof t.slotsTitle==="string" ? t.slotsTitle : "Slots"}</label>
                  {BOOKING_SHIFT_IDS.map(sid=>{
                    const d = t.durs.find(x=>x.id===sid);
                    if(!d || !isSlotOffered(sid)) return null;
                    const blocked = isSlotBlocked(date, slotKeyFromDur(sid), bookedKeysSet);
                    const sel = dur===sid;
                    const subLabel = slotSub(sid, d.sub);
                    return (
                      <button key={sid} type="button" disabled={blocked} onClick={()=>!blocked&&setDur(sid)} style={{
                        width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"14px 16px",marginBottom:8,borderRadius:10,textAlign:"left",
                        background:sel?"rgba(201,160,71,.16)":"rgba(255,255,255,.70)",
                        border:`1px solid ${sel?"rgba(11,31,58,.22)":"rgba(11,31,58,.12)"}`,
                        opacity:blocked?0.48:1,cursor:blocked?"not-allowed":"pointer",transition:"all .2s"
                      }}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:900,color:"rgba(11,31,58,.92)"}}>{slotDurTitle(sid, d.name)}</div>
                          <div style={{fontSize:11,color:"rgba(11,31,58,.62)",marginTop:2,fontWeight:700}}>{subLabel}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                          {blocked&&(
                            <span style={{fontSize:10,letterSpacing:".06em",fontWeight:900,textTransform:"uppercase",color:"rgba(239,68,68,.95)",whiteSpace:"nowrap"}}>{typeof t.slotTaken==="string" ? t.slotTaken : "Booked"}</span>
                          )}
                          <span style={{fontSize:18,fontWeight:800,color:"rgba(11,31,58,.92)",fontFamily:"'Playfair Display',serif"}}>{priceForDur(sid)}€</span>
                        </div>
                      </button>
                    );
                  })}
                  {(()=>{
                    const d = t.durs.find(x=>x.id==="full");
                    if(!d || !isSlotOffered("full")) return null;
                    const blocked = isSlotBlocked(date, "full", bookedKeysSet);
                    const sel = dur==="full";
                    const fullSub = slotSub("full", d.sub);
                    return (
                      <>
                        <label style={{display:"block",fontSize:11,letterSpacing:".12em",color:"rgba(11,31,58,.70)",marginTop:14,marginBottom:10,textTransform:"uppercase",fontWeight:900}}>{typeof t.fullDayTitle==="string" ? t.fullDayTitle : "Full day"}</label>
                        <button type="button" disabled={blocked} onClick={()=>!blocked&&setDur("full")} style={{
                          width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:"14px 16px",marginBottom:8,borderRadius:10,textAlign:"left",
                          background:sel?"rgba(201,160,71,.16)":"rgba(255,255,255,.70)",
                          border:`1px solid ${sel?"rgba(11,31,58,.22)":"rgba(11,31,58,.12)"}`,
                          opacity:blocked?0.48:1,cursor:blocked?"not-allowed":"pointer",transition:"all .2s"
                        }}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:900,color:"rgba(11,31,58,.92)"}}>{slotDurTitle("full", d.name)}</div>
                            <div style={{fontSize:11,color:"rgba(11,31,58,.62)",marginTop:2,fontWeight:700}}>{fullSub}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                            {blocked&&(
                              <span style={{fontSize:10,letterSpacing:".06em",fontWeight:900,textTransform:"uppercase",color:"rgba(239,68,68,.95)",whiteSpace:"nowrap"}}>{typeof t.slotTaken==="string" ? t.slotTaken : "Booked"}</span>
                            )}
                            <span style={{fontSize:18,fontWeight:800,color:"rgba(11,31,58,.92)",fontFamily:"'Playfair Display',serif"}}>{priceForDur("full")}€</span>
                          </div>
                        </button>
                      </>
                    );
                  })()}
                  <div className="booking-total-summary">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:"rgba(11,31,58,.66)",fontWeight:800}}>{durTitle}</span>
                      <span style={{fontSize:12,color:"rgba(11,31,58,.92)",fontWeight:900}}>{durPrice}€</span>
                    </div>
                    <div style={{fontSize:11,color:"rgba(11,31,58,.60)",marginBottom:10,fontWeight:700}}>
                      {typeof t.skipper==="string" ? t.skipper : "Skipper included"}
                    </div>
                    {promoAllowed && vipPromoNormalized ? (
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:12,color:"rgba(11,31,58,.62)",fontWeight:700}}>Charter</span>
                          <span style={{fontSize:12,color:"rgba(11,31,58,.52)",fontWeight:700,textDecoration:"line-through"}}>{charterBase}€</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,gap:8,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:"rgba(11,31,58,.52)",fontWeight:600}}>VIP {vipPromoNormalized}</span>
                          <span style={{fontSize:11,color:"rgba(21,101,52,.9)",fontWeight:600}}>−{vipPromoPct}%</span>
                        </div>
                      </>
                    ) : null}
                    <div className="booking-total-row">
                      <span className="booking-total-label">{t.total}</span>
                      <span className="playfair booking-total-amount">{total}€</span>
                    </div>
                  </div>
                </>
              )}
              <div style={{marginTop:10,fontSize:11,color:"rgba(11,31,58,.62)",fontWeight:700,display:"flex",alignItems:"flex-start",gap:8,lineHeight:1.45}}>
                <Check size={14} strokeWidth={2.4} color="rgba(22,101,52,.88)" style={{flexShrink:0,marginTop:1}} aria-hidden />
                <span>{t.inc}</span>
              </div>
              <div style={{fontSize:11,color:"rgba(11,31,58,.54)",marginTop:6,fontWeight:700,display:"flex",alignItems:"flex-start",gap:8,lineHeight:1.45}}>
                <X size={14} strokeWidth={2.4} color="rgba(180,83,9,.9)" style={{flexShrink:0,marginTop:1}} aria-hidden />
                <span>{t.notInc}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* STEP 1: Details */}
        {step===1&&(
          <div style={{animation:"fadeIn .4s ease"}}>
            {[
              {k:"name",l:t.fname,type:"text"},{k:"email",l:t.femail,type:"email"},
            ].map(({k,l,type})=>(
              <div key={k} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:10,letterSpacing:".12em",color:"rgba(11,31,58,.70)",marginBottom:6,textTransform:"uppercase",fontWeight:900}}>{l}</label>
                {type==="textarea"?(
                  <textarea value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                    rows={3} style={{width:"100%",background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.14)",borderRadius:10,padding:"10px 12px",color:"rgba(11,31,58,.88)",fontSize:13,resize:"vertical"}}/>
                ):(
                  <input
                    type={type}
                    value={form[k]}
                    onChange={(e)=>{
                      if(k==="guests"){
                        const digits = String(e.target.value).replace(/\D/g,"").slice(0,2);
                        if(digits===""){
                          setForm(f=>({...f, guests:""}));
                          return;
                        }
                        let n = Number.parseInt(digits, 10);
                        if(!Number.isFinite(n)) return;
                        if(n > maxGuests) n = maxGuests;
                        if(n < 1) n = 1;
                        setForm(f=>({...f, guests:String(n)}));
                        return;
                      }
                      setForm(f=>({...f,[k]:e.target.value}));
                    }}
                    max={type==="number"&&k==="guests"?maxGuests:undefined}
                    min={type==="number"&&k==="guests"?1:undefined}
                    inputMode={k==="guests"?"numeric":undefined}
                    autoComplete={k==="guests"?"off":undefined}
                    onBlur={k==="guests"?(e)=>{
                      const n = Number.parseInt(e.target.value, 10);
                      if(!Number.isFinite(n) || e.target.value.trim()===""){
                        setForm(f=>({...f, guests:String(Math.min(Math.max(1, Number.parseInt(f.guests,10)||1), maxGuests))}));
                        return;
                      }
                      if(n > maxGuests) setForm(f=>({...f, guests:String(maxGuests)}));
                      if(n < 1) setForm(f=>({...f, guests:"1"}));
                    }:undefined}
                    style={{width:"100%",background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.14)",borderRadius:10,padding:"10px 12px",color:"rgba(11,31,58,.88)",fontSize:13}}/>
                )}
              </div>
            ))}
            <BookingPhoneField
              lang={lang}
              countryIso={form.phoneCountry}
              nationalValue={form.phoneNational}
              onCountryChange={(iso)=>setForm((f)=>({...f, phoneCountry:iso}))}
              onNationalChange={(national)=>setForm((f)=>({...f, phoneNational:national}))}
              label={t.fphone}
              hint={typeof t.fphoneHint==="string" ? t.fphoneHint : ""}
              placeholder={typeof t.phonePlaceholder==="string" ? t.phonePlaceholder : "612 345 678"}
              countryAriaLabel={typeof t.fphoneCountry==="string" ? t.fphoneCountry : "Country"}
              countrySearchPlaceholder={typeof t.phoneCountrySearch==="string" ? t.phoneCountrySearch : undefined}
            />
            {[
              {k:"guests",l:String(t.fguests||"").replace(/\{max\}/g, String(maxGuests)),type:"number"},
              {k:"notes",l:t.fnotes,type:"textarea"}
            ].map(({k,l,type})=>(
              <div key={k} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:10,letterSpacing:".12em",color:"rgba(11,31,58,.70)",marginBottom:6,textTransform:"uppercase",fontWeight:900}}>{l}</label>
                {type==="textarea"?(
                  <textarea value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                    rows={3} style={{width:"100%",background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.14)",borderRadius:10,padding:"10px 12px",color:"rgba(11,31,58,.88)",fontSize:13,resize:"vertical"}}/>
                ):(
                  <input
                    type={type}
                    value={form[k]}
                    onChange={(e)=>{
                      if(k==="guests"){
                        const digits = String(e.target.value).replace(/\D/g,"").slice(0,2);
                        if(digits===""){
                          setForm(f=>({...f, guests:""}));
                          return;
                        }
                        let n = Number.parseInt(digits, 10);
                        if(!Number.isFinite(n)) return;
                        if(n > maxGuests) n = maxGuests;
                        if(n < 1) n = 1;
                        setForm(f=>({...f, guests:String(n)}));
                        return;
                      }
                      setForm(f=>({...f,[k]:e.target.value}));
                    }}
                    max={type==="number"&&k==="guests"?maxGuests:undefined}
                    min={type==="number"&&k==="guests"?1:undefined}
                    inputMode={k==="guests"?"numeric":undefined}
                    autoComplete={k==="guests"?"off":undefined}
                    onBlur={k==="guests"?(e)=>{
                      const n = Number.parseInt(e.target.value, 10);
                      if(!Number.isFinite(n) || e.target.value.trim()===""){
                        setForm(f=>({...f, guests:String(Math.min(Math.max(1, Number.parseInt(f.guests,10)||1), maxGuests))}));
                        return;
                      }
                      if(n > maxGuests) setForm(f=>({...f, guests:String(maxGuests)}));
                      if(n < 1) setForm(f=>({...f, guests:"1"}));
                    }:undefined}
                    style={{width:"100%",background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.14)",borderRadius:10,padding:"10px 12px",color:"rgba(11,31,58,.88)",fontSize:13}}/>
                )}
              </div>
            ))}
            <div className="booking-promo-section">
              <label className="booking-promo-label">{typeof t.promoLabel==="string" ? t.promoLabel : "Discount code"}</label>
              <input
                className={`booking-promo-input${vipPromoNormalized && promoAllowed ? " is-applied" : ""}`}
                value={promoInput}
                onChange={(e)=>{ if(!isSpecialBookingDate) { setPromoInput(e.target.value.toUpperCase()); setPromoHint(""); } }}
                placeholder={typeof t.promoPlaceholder==="string" ? t.promoPlaceholder : ""}
                autoComplete="off"
                spellCheck={false}
                disabled={!!vipPromoNormalized || isSpecialBookingDate}
              />
              <div className="booking-promo-actions">
                {vipPromoNormalized && promoAllowed ? (
                  <button type="button" onClick={()=>{ setVipPromoNormalized(""); setVipPromoPct(null); setPromoInput(""); setPromoHint(""); }} className="btn-outline">{typeof t.promoClear==="string" ? t.promoClear : "Remove"}</button>
                ) : (
                  <button type="button" onClick={()=>void applyVipPromo()} disabled={promoBusy || isSpecialBookingDate} className="btn-gold" style={{opacity:promoBusy||isSpecialBookingDate?0.65:1}}>
                    {promoBusy ? (typeof t.promoChecking==="string" ? t.promoChecking : "…") : (typeof t.promoApply==="string" ? t.promoApply : "Apply")}
                  </button>
                )}
              </div>
              {vipPromoNormalized && promoAllowed ? (
                <div className="booking-promo-applied-badge">
                  {typeof t.promoAppliedBadge==="string"
                    ? t.promoAppliedBadge
                        .replace(/\{code\}/g, vipPromoNormalized)
                        .replace(/\{pct\}/g, String(vipPromoPct ?? ""))
                    : `VIP code applied: ${vipPromoNormalized} (−${vipPromoPct}%)`}
                </div>
              ) : null}
              {isSpecialBookingDate ? (
                <div className="booking-promo-hint is-info">{typeof t.promoExcludedSpecialDay==="string" ? t.promoExcludedSpecialDay : "Este día no está sujeto a promoción."}</div>
              ) : promoHint ? (
                <div className={`booking-promo-hint${vipPromoNormalized ? " is-success" : " is-error"}`}>{promoHint}</div>
              ) : null}
              <p className="booking-promo-footnote">{typeof t.promoValidExceptSpecial==="string" ? t.promoValidExceptSpecial : "Válido para todos los días excepto días no promocionales."}</p>
            </div>
            <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"rgba(11,31,58,.72)"}}>
              <div style={{color:"rgba(11,31,58,.92)",fontWeight:900,marginBottom:4}}>Booking Summary</div>
              <div>{boat.name} · {formatDate(date)} · {durTitle}</div>
              {promoAllowed && vipPromoNormalized ? (
                <div style={{marginTop:6,fontSize:11,fontWeight:600,color:"rgba(11,31,58,.55)"}}>
                  <span style={{textDecoration:"line-through",marginRight:8}}>{charterBase}€</span>
                  <span style={{color:"rgba(22,101,52,.88)"}}>{vipPromoNormalized} · −{vipPromoPct}%</span>
                </div>
              ) : null}
              <div style={{marginTop:4,fontFamily:"'Playfair Display',serif",fontSize:16,color:"rgba(11,31,58,.94)",fontWeight:900}}>Total: {total}€</div>
            </div>

            <div className="booking-pay-mode" role="radiogroup" aria-label={typeof t.payMethodLabel==="string" ? t.payMethodLabel : "Payment mode"}>
              <p className="booking-pay-mode-title">{typeof t.payMethodLabel==="string" ? t.payMethodLabel : "Payment mode"}</p>
              <div className="booking-pay-mode-options">
                <label className={`booking-pay-mode-option${paymentMethod==="card" ? " is-selected" : ""}${!stripePayAvailable ? " is-disabled" : ""}`}>
                  <input type="radio" name="bookingPaymentMethod" value="card" checked={paymentMethod==="card"} disabled={!stripePayAvailable} onChange={()=>setPaymentMethod("card")} />
                  <span className="booking-pay-mode-option-title">{typeof t.payChannelCard==="string" ? t.payChannelCard : "Card"}</span>
                  <span className="booking-pay-mode-option-sub">{typeof t.payChannelCardSub==="string" ? t.payChannelCardSub : "Apple Pay, PayPal"}</span>
                </label>
                <label className={`booking-pay-mode-option${paymentMethod==="other" ? " is-selected" : ""}${!otherPayAvailable ? " is-disabled" : ""}`}>
                  <input type="radio" name="bookingPaymentMethod" value="other" checked={paymentMethod==="other"} disabled={!otherPayAvailable} onChange={()=>setPaymentMethod("other")} />
                  <span className="booking-pay-mode-option-title">{typeof t.payChannelOther==="string" ? t.payChannelOther : "Other"}</span>
                  <span className="booking-pay-mode-option-sub">{typeof t.payChannelOtherSub==="string" ? t.payChannelOtherSub : "Bizum, bank transfer"}</span>
                </label>
              </div>
              {paymentMethod==="card" && stripePayAvailable && typeof t.payCardHint==="string" ? <p className="booking-pay-mode-hint">{t.payCardHint}</p> : null}
              {paymentMethod==="card" && !stripePayAvailable ? <p className="booking-pay-mode-hint is-error">{typeof t.stripeNeedsBackend==="string" ? t.stripeNeedsBackend : "Card payment is not available."}</p> : null}
              {!anyPaymentAvailable ? <p className="booking-pay-mode-hint is-error">{typeof t.payOtherUnavailable==="string" ? t.payOtherUnavailable : "No payment method is available online."}</p> : null}
            </div>
          </div>
        )}
        
        {/* STEP 2: Alternative payment (Bizum / transfer) */}
        {step===2&&paymentMethod==="other"&&(
          <div style={{animation:"fadeIn .4s ease"}}>
            <div style={{background:"rgba(34,197,94,.10)",border:"1px solid rgba(34,197,94,.20)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"rgba(11,31,58,.78)",marginBottom:16,fontWeight:700}}>
              {typeof t.paymentOtherIntro==="string" ? t.paymentOtherIntro : "Pay by Bizum or bank transfer using the details below."}
            </div>
            {(hasBizumPay && hasIbanPay) ? (
              <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:14,padding:16,marginBottom:14}}>
                <div style={{fontSize:10,letterSpacing:".15em",color:"rgba(11,31,58,.70)",textTransform:"uppercase",marginBottom:10,fontWeight:900}}>{typeof t.payMethodLabel==="string" ? t.payMethodLabel : "Payment method"}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
                  {hasBizumPay ? (
                    <button type="button" onClick={()=>setAltPayMethod("bizum")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",borderRadius:10,textAlign:"left",background:altPayMethod==="bizum"?"rgba(201,160,71,.16)":"rgba(255,255,255,.82)",border:`1px solid ${altPayMethod==="bizum"?"rgba(11,31,58,.22)":"rgba(11,31,58,.12)"}`,color:"rgba(11,31,58,.90)",cursor:"pointer"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{typeof t.payBizum==="string" ? t.payBizum : "Bizum"}</span>
                      {altPayMethod==="bizum" ? <span style={{fontSize:12}}>✓</span> : null}
                    </button>
                  ) : null}
                  {hasIbanPay ? (
                    <button type="button" onClick={()=>setAltPayMethod("bank")} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",borderRadius:10,textAlign:"left",background:altPayMethod==="bank"?"rgba(201,160,71,.16)":"rgba(255,255,255,.82)",border:`1px solid ${altPayMethod==="bank"?"rgba(11,31,58,.22)":"rgba(11,31,58,.12)"}`,color:"rgba(11,31,58,.90)",cursor:"pointer"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{typeof t.payBank==="string" ? t.payBank : "Bank transfer"}</span>
                      {altPayMethod==="bank" ? <span style={{fontSize:12}}>✓</span> : null}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {hasBizumPay ? (
              <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"rgba(11,31,58,.70)",lineHeight:1.6,marginBottom:10,fontWeight:700}}>
                <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(11,31,58,.55)",marginBottom:6,fontWeight:900}}>{typeof t.payBizum==="string" ? t.payBizum : "Bizum"}</div>
                <span style={{color:"rgba(11,31,58,.92)",fontWeight:800}}>{paymentSettings.bizum}</span>
              </div>
            ) : null}
            {hasIbanPay ? (
              <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"rgba(11,31,58,.70)",lineHeight:1.6,marginBottom:14,fontWeight:700}}>
                <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(11,31,58,.55)",marginBottom:6,fontWeight:900}}>{typeof t.payBank==="string" ? t.payBank : "Bank transfer"}</div>
                IBAN: <span style={{color:"rgba(11,31,58,.92)",fontWeight:800}}>{paymentSettings.iban}</span>
                <br/>Beneficiary: <span style={{color:"rgba(11,31,58,.92)",fontWeight:800}}>{paymentSettings.beneficiary||"Mallorca Island Yacht"}</span>
              </div>
            ) : null}
            {typeof t.sendProofNotice==="string" ? (
              <div style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.35)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"rgba(120,53,15,.95)",lineHeight:1.65,marginBottom:14,fontWeight:700}}>{t.sendProofNotice}</div>
            ) : null}
            <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:12,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"rgba(11,31,58,.72)",fontWeight:800}}>{boat.name} · {formatDate(date)}</span>
                <span className="playfair" style={{fontSize:22,fontWeight:900,color:"rgba(11,31,58,.94)"}}>{total}€</span>
              </div>
              {promoAllowed && vipPromoNormalized ? (
                <div style={{marginTop:8,fontSize:11,fontWeight:700,color:"rgba(11,31,58,.62)"}}>
                  <span style={{textDecoration:"line-through",marginRight:8}}>{charterBase}€</span>
                  <span style={{color:"rgba(22,101,52,.92)"}}>VIP −{vipPromoPct}%</span>
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {/* STEP 3: Confirmed */}
        {step===3&&(
          <div style={{textAlign:"center",padding:"20px 0",animation:"fadeIn .6s ease"}}>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <h3 className="playfair" style={{fontSize:24,color:"rgba(11,31,58,.94)",marginBottom:12}}>{t.confTitle}</h3>
            <p style={{fontSize:14,color:"rgba(11,31,58,.70)",lineHeight:1.7,marginBottom:20,fontWeight:700}}>
              {paymentMethod==="other"&&typeof t.confMsgProof==="string" ? t.confMsgProof : t.confMsg}
            </p>
            <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:14,padding:16,marginBottom:24}}>
              <div style={{fontSize:10,letterSpacing:".2em",color:"rgba(11,31,58,.70)",marginBottom:6,textTransform:"uppercase",fontWeight:900}}>{t.confRef}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"rgba(11,31,58,.94)",letterSpacing:2}}>{ref}</div>
              <div style={{fontSize:12,color:"rgba(11,31,58,.62)",marginTop:6,fontWeight:700}}>{boat.name} · {formatDate(date)} · {isSpecialBookingDate ? durTitle : ((dur==="half_am"||dur==="half_pm"||dur==="half")?"4h":dur==="full"?"8h":"3h")} · {total}€</div>
            </div>
            <div style={{fontSize:12,color:"rgba(11,31,58,.60)",marginBottom:20,fontWeight:700}}>📧 Notification sent to info@mallorcaislandyacht.com</div>
            <button onClick={onClose} className="btn-gold" style={{width:"100%"}}>{t.confBtn}</button>
          </div>
        )}
        
        {/* Navigation buttons */}
        {step<3&&(
          <div className="booking-step-row-mobile" style={{display:"flex",gap:12,marginTop:24}}>
            {step>0&&<button type="button" onClick={()=>setStep(s=>s-1)} className="btn-outline" style={{flex:1}}>{t.back}</button>}
            <button type="button" onClick={next} className="btn-gold" style={{flex:2,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} disabled={loading || (step===1 && !paymentReady)}>
              {loading?(
                <><div style={{width:14,height:14,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#091829",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> Processing...</>
              ):primaryCtaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════════
const Navbar = ({lang,setLang,t,onBook,elevated,homeTo="/",navigate}) => {
  const [langOpen,setLangOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const solid = elevated;
  const nb = t.navBrand || {kicker:"",place:""};
  const closeMenu = ()=>setMenuOpen(false);
  const scrollToId = (id)=>{
    const el = document.getElementById(id);
    if(el){
      el.scrollIntoView({behavior:"smooth"});
      closeMenu();
      return;
    }
    if(typeof navigate==="function" && homeTo){
      const base = String(homeTo).replace(/\/+$/,"") || "/";
      navigate(`${base}#${id}`);
      closeMenu();
    }
  };
  useEffect(()=>{
    if(!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e)=>{ if(e.key==="Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return ()=>{
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  },[menuOpen]);

  return (
    <>
      <nav className="site-nav-bar" style={{
        position:"fixed",top:0,left:0,right:0,zIndex:500,
        background:solid?"rgba(255,255,255,.72)":"linear-gradient(to bottom, rgba(255,255,255,.65), rgba(255,255,255,0))",
        backdropFilter:"blur(16px)",
        borderBottom:solid?"1px solid rgba(11,31,58,.12)":"1px solid rgba(255,255,255,.25)",
        transition:"all .4s ease",
      }}>
        <div className="site-navbar-inner">
          <div className="site-navbar-logo-slot" style={{display:"flex",alignItems:"center"}}>
            <Logo prominent size={1} onClick={()=>{ if(typeof navigate==="function") navigate(homeTo); window.scrollTo({top:0,behavior:"smooth"}); }}/>
          </div>

          <div className="site-navbar-brand-slot">
            <div style={{
              fontSize:"clamp(8px,.85vw,10px)",letterSpacing:".32em",color:"rgba(11,31,58,.52)",
              textTransform:"uppercase",fontWeight:800,marginBottom:5,lineHeight:1.2
            }}>{nb.kicker}</div>
            <div className="playfair navbar-center-brand" style={{
              fontSize:"clamp(14px,2.1vw,18px)",fontWeight:600,color:"rgba(11,31,58,.93)",
              letterSpacing:".03em",lineHeight:1.15
            }}>{nb.place}</div>
            <div style={{
              width:"clamp(48px,12vw,72px)",height:1,margin:"8px auto 0",
              background:"linear-gradient(90deg, transparent, rgba(201,160,71,.85), transparent)"
            }} aria-hidden />
          </div>
          
          <div className="site-navbar-actions-slot">
            {/* Language switcher */}
            <div style={{position:"relative"}}>
              <button type="button" onClick={()=>{setLangOpen(o=>!o); setMenuOpen(false);}} style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.14)",borderRadius:8,padding:"8px 12px",minHeight:40,color:"rgba(11,31,58,.78)",fontSize:11,fontWeight:700,letterSpacing:".1em",display:"flex",alignItems:"center",gap:5}}>
                {lang.toUpperCase()} <span style={{fontSize:8,opacity:.6}}>▼</span>
              </button>
              {langOpen&&(
                <div className="surface lang-dd-panel" style={{position:"absolute",top:"calc(100% + 8px)",right:0,borderRadius:12,overflow:"hidden",minWidth:"min(200px, calc(100vw - 48px))",zIndex:100}}>
                  {Object.entries(LANG_NAMES).map(([k,v])=>(
                    <button type="button" key={k} onClick={()=>{setLang(k);setLangOpen(false);}} style={{width:"100%",padding:"12px 14px",background:lang===k?"rgba(201,160,71,.16)":"transparent",border:"none",color:lang===k?"rgba(11,31,58,.92)":"rgba(11,31,58,.76)",fontSize:12,fontWeight:700,textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                      {v} {lang===k&&<span style={{color:"#C9A047"}}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="site-nav-desktop-only">
              <button
                type="button"
                onClick={()=>scrollToId("fleet")}
                style={{background:"none",border:"none",color:"rgba(11,31,58,.72)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",cursor:"pointer",display:"inline-flex",alignItems:"center",fontWeight:700}}
                onMouseEnter={e=>{ e.currentTarget.style.color="rgba(11,31,58,.9)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="rgba(11,31,58,.72)"; }}
              >{typeof t.navFleet==="string" ? t.navFleet : "Fleet"}</button>
              <button
                type="button"
                onClick={()=>scrollToId("guias")}
                style={{background:"none",border:"none",color:"rgba(11,31,58,.72)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",cursor:"pointer",display:"inline-flex",alignItems:"center",fontWeight:700}}
                onMouseEnter={e=>{ e.currentTarget.style.color="rgba(11,31,58,.9)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="rgba(11,31,58,.72)"; }}
              >{typeof t.navGuides==="string" ? t.navGuides : "Guides"}</button>
              <button
                type="button"
                onClick={()=>document.getElementById("reviews")?.scrollIntoView({behavior:"smooth"})}
                style={{background:"none",border:"none",color:"rgba(11,31,58,.72)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",cursor:"pointer",display:"inline-flex",alignItems:"center",fontWeight:700}}
                onMouseEnter={e=>{ e.currentTarget.style.color="rgba(11,31,58,.9)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="rgba(11,31,58,.72)"; }}
              >{t.reviewsNav || "Reviews"}</button>
              <Link
                to="/admin"
                style={{background:"none",border:"none",color:"rgba(11,31,58,.55)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",cursor:"pointer",display:"inline-flex",alignItems:"center",fontWeight:700}}
                onMouseEnter={e=>{ e.currentTarget.style.color="rgba(11,31,58,.9)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="rgba(11,31,58,.55)"; }}
              >{t.adminLink}</Link>
              <button type="button" onClick={onBook} className="btn-gold" style={{padding:"9px 20px",fontSize:11}}>{t.bookBtn}</button>
            </div>

            <button type="button" onClick={()=>{setLangOpen(false); onBook();}} className="site-nav-mobile-cta btn-gold">{t.bookBtn}</button>
            <button
              type="button"
              className="site-nav-burger-btn"
              aria-expanded={menuOpen}
              aria-controls="site-mobile-drawer"
              aria-label={typeof t.menuAria==="string" ? t.menuAria : "Menu"}
              onClick={()=>{setLangOpen(false); setMenuOpen(o=>!o);}}
            >
              <span className="site-nav-burger-bars" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </nav>
      {langOpen&&<div style={{position:"fixed",inset:0,zIndex:499}} onClick={()=>setLangOpen(false)}/>}

      {menuOpen&&(
        <div className="site-mobile-nav-root" role="presentation">
          <button type="button" className="site-mobile-nav-scrim" aria-label={typeof t.menuClose==="string" ? t.menuClose : "Close"} onClick={closeMenu} />
          <aside id="site-mobile-drawer" className="surface site-mobile-nav-aside" role="dialog" aria-modal="true" aria-label={typeof t.menuAria==="string" ? t.menuAria : "Menu"}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:6}}>
              <span style={{fontSize:10,letterSpacing:".22em",textTransform:"uppercase",fontWeight:900,color:"rgba(11,31,58,.48)"}}>
                Mallorca Island Yacht
              </span>
              <button type="button" onClick={closeMenu} style={{background:"rgba(11,31,58,.06)",border:"1px solid rgba(11,31,58,.12)",borderRadius:10,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} aria-label={typeof t.menuClose==="string" ? t.menuClose : "Close"}>
                <X size={18} strokeWidth={2.2} color="rgba(11,31,58,.72)" />
              </button>
            </div>
            <nav className="site-mobile-nav-row" aria-label={typeof t.menuAria==="string" ? t.menuAria : "Menu"}>
              <button type="button" className="site-mobile-nav-item" onClick={()=>scrollToId("fleet")}>{typeof t.navFleet==="string" ? t.navFleet : "Fleet"}</button>
              <button type="button" className="site-mobile-nav-item" onClick={()=>scrollToId("guias")}>{typeof t.navGuides==="string" ? t.navGuides : "Guides"}</button>
              <button type="button" className="site-mobile-nav-item" onClick={()=>scrollToId("reviews")}>{t.reviewsNav || "Reviews"}</button>
              <button type="button" className="site-mobile-nav-item" onClick={()=>scrollToId("contact")}>{typeof t.navContact==="string" ? t.navContact : "Contact"}</button>
              <div className="site-mobile-nav-divider" aria-hidden />
              <Link to="/admin" className="site-mobile-nav-item site-mobile-nav-item--muted" onClick={closeMenu}>{t.adminLink}</Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════
/** Franja superior de oferta (ancho completo, bajo la navbar; hueco reservado con .site-hero--with-offer). */
/** Reserva altura del banner mientras llega Firestore (evita salto en móvil / PWA). */
function HeroOfferBannerPlaceholder() {
  return (
    <div className="hero-offer-slot" aria-hidden>
      <div className="hero-offer-banner hero-offer-banner--reserve" style={{ visibility: "hidden", pointerEvents: "none" }} aria-hidden>
        &nbsp;
      </div>
    </div>
  );
}

function HeroOfferBannerSlot({ offerText }) {
  const raw = String(offerText || "").trim();
  if (!raw) return null;
  const condensed = raw.replace(/✦/g, " ").replace(/\s+/g, " ").trim();
  const pctLead = condensed.match(/^(\d{1,2})\s*%\s*(.+)$/);
  if (pctLead) {
    const rest = pctLead[2].trim();
    return (
      <div className="hero-offer-slot">
        <div
          className="hero-offer-banner hero-offer-banner--split"
          aria-label={`${pctLead[1]}% ${rest}`}
        >
          <span className="hero-offer-pct">{pctLead[1]}%</span>
          <span className="hero-offer-rest">{rest}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="hero-offer-slot">
      <div className="hero-offer-banner">
        <span className="hero-offer-banner__text">{offerText}</span>
      </div>
    </div>
  );
}

function heroCopyFromT(t) {
  const kicker = String(t?.kicker ?? t?.badge ?? "").trim();
  const title = String(t?.title ?? "").trim()
    || [t?.h1a, t?.h1b].filter(Boolean).map(String).join(" — ").trim();
  const sub = String(t?.sub ?? "").trim();
  return { kicker, title, sub };
}

const Hero = ({t,onBook,offerText,heroBgSrc,onExploreFleet,reserveOfferSlot=false}) => {
  const hasOffer = !!(offerText && String(offerText).trim());
  const offerLayout = hasOffer || reserveOfferSlot;
  const { kicker, title, sub } = heroCopyFromT(t);
  return (
  <section id="hero" className={`site-hero${offerLayout ? " site-hero--with-offer" : ""}`} style={{position:"relative",overflow:"hidden"}}>
    {hasOffer ? <HeroOfferBannerSlot offerText={offerText} /> : reserveOfferSlot ? <HeroOfferBannerPlaceholder /> : null}
    <div
      className="site-hero-visual"
      style={{
        position:"relative",
        width:"100%",
        maxWidth:"min(960px, calc(100vw - 36px))",
        margin:"0 18px",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        borderRadius:22,
        overflow:"hidden",
        border:"1px solid rgba(255,255,255,.28)",
        boxShadow:"0 28px 70px rgba(11,31,58,.28), 0 12px 36px rgba(0,0,0,.15)",
      }}
    >
      <div
        aria-hidden
        style={{
          position:"absolute",
          inset:0,
          backgroundImage:`url(${preferWebpUrl(heroBgSrc) || DEFAULT_BOOKING_HERO_URL})`,
          backgroundSize:"cover",
          backgroundPosition:"center",
        }}
      />
      <div className="hero-photo-overlay" aria-hidden />
      <div style={{position:"relative",zIndex:1,width:"100%",padding:"clamp(28px,5vw,44px) clamp(16px,3vw,28px)"}}>
        <div className="hero-copy-block">
          {kicker ? (
            <div className="fade-up hero-kicker" style={{fontSize:10,letterSpacing:".35em",color:"rgba(255,255,255,.88)",textTransform:"uppercase",marginBottom:12,fontWeight:800,textShadow:"0 2px 14px rgba(0,0,0,.45)"}}>
              {kicker}
            </div>
          ) : null}
          <div className="gold-line fade-up" style={{maxWidth:56,margin:"0 auto 16px",opacity:.95}} />
          <h1 className="playfair fade-up-1" style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontWeight:600,lineHeight:1.12,marginBottom:12,color:"#fff",textShadow:"0 4px 36px rgba(0,0,0,.55), 0 2px 12px rgba(0,0,0,.45)"}}>
            {title}
          </h1>
          {sub ? (
            <SiteText className="cormorant fade-up-2 hero-sub" style={{fontSize:"clamp(1rem,2vw,1.3rem)",color:"rgba(255,255,255,.9)",maxWidth:560,margin:"0 auto 28px",lineHeight:1.6,fontStyle:"italic",textShadow:"0 2px 18px rgba(0,0,0,.45)"}}>
              {sub}
            </SiteText>
          ) : null}
          <div className="fade-up-3" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button type="button" onClick={onBook} className="btn-gold" style={{fontSize:13,padding:"15px 38px",boxShadow:"0 10px 32px rgba(0,0,0,.25)"}}>{t.cta}</button>
            <button type="button" onClick={()=>typeof onExploreFleet==="function"&&onExploreFleet()} className="btn-outline-light" style={{padding:"14px 32px",fontSize:13}}>{t.cta2}</button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Scroll indicator */}
    <div className="hero-scroll-hint" style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:.5,animation:"pulse 2s ease infinite",zIndex:6}}>
      <span style={{fontSize:9,letterSpacing:".3em",color:"rgba(11,31,58,.72)",textTransform:"uppercase",fontWeight:800}}>{t.scroll}</span>
      <div style={{width:1,height:40,background:"linear-gradient(to bottom,rgba(11,31,58,.35),transparent)"}}/>
    </div>
  </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// FLEET SECTION
// ═══════════════════════════════════════════════════════════════════════
const FLEET_PHOTO_AUTO_MS = 5000;

const FleetSection = ({t,lang,onBook,boats,settings,fleetTitleId}) => {
  const [imgIdx,setImgIdx]=useState({});
  const [fleetAutoplayStopped,setFleetAutoplayStopped]=useState({});
  const fleetSectionRef=useRef(null);
  const [fleetInView,setFleetInView]=useState(true);
  const fleetAutoplayStoppedRef=useRef({});
  const boatsRef=useRef(boats);
  boatsRef.current=boats;
  useEffect(()=>{ fleetAutoplayStoppedRef.current=fleetAutoplayStopped; },[fleetAutoplayStopped]);

  useEffect(()=>{
    const el = fleetSectionRef.current;
    if(!el || typeof IntersectionObserver==="undefined") return undefined;
    const io = new IntersectionObserver(
      (entries)=>{
        const e = entries[0];
        setFleetInView(e ? e.isIntersecting : false);
      },
      { root:null, rootMargin:"100px 0px 160px 0px", threshold:0.01 },
    );
    io.observe(el);
    return ()=>io.disconnect();
  },[boats.length]);

  useEffect(()=>{
    if(!boats.length || !fleetInView) return undefined;
    if(typeof window!=="undefined" && window.matchMedia("(hover: none)").matches) return undefined;
    const tid=window.setInterval(()=>{
      if(document.visibilityState==="hidden") return;
      const boatList=boatsRef.current;
      if(!Array.isArray(boatList)||!boatList.length) return;
      setImgIdx((prev)=>{
        const stopped=fleetAutoplayStoppedRef.current;
        const next={...prev};
        let changed=false;
        for(const boat of boatList){
          const len=boat.imgs?.length??0;
          if(len<=1) continue;
          if(stopped[boat.id]) continue;
          const cur=prev[boat.id]??0;
          next[boat.id]=(cur+1)%len;
          changed=true;
        }
        return changed?next:prev;
      });
    },FLEET_PHOTO_AUTO_MS);
    return ()=>window.clearInterval(tid);
  },[boats.length, fleetInView]);

  const stopFleetAutoplay=useCallback((boatId)=>{
    setFleetAutoplayStopped((s)=>({...s,[boatId]:true}));
  },[]);

  const todayStr = formatLocalYMD(new Date());
  const halfShow = charterBaseEurosClient(settings, todayStr, "half_am");
  const fullShow = charterBaseEurosClient(settings, todayStr, "full");
  const sunsetShow = charterBaseEurosClient(settings, todayStr, "sunset");
  const mk = monthKeyFromDateStr(todayStr);
  const seasonKey = mk ? seasonKeyFromMonthKey(mk) : "low";
  const labels = SEASON_LABEL_PUBLIC[lang] || SEASON_LABEL_PUBLIC.en;
  const seasonLine = labels[seasonKey] || labels.low;
  const fleetLabels = FLEET_UI_LABELS[lang] || FLEET_UI_LABELS.en;
  const [yy,mm] = [todayStr.slice(0,4), todayStr.slice(5,7)];
  const mi = parseInt(mm,10)-1;
  const monthYearLine =
    lang==="es"
      ? `${MNS_ES[mi]} ${yy} · ${seasonLine}`
      : `${MNS[mi]} ${yy} · ${seasonLine}`;
  return (
    <section id="fleet" ref={fleetSectionRef} className="public-site-section">
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:64}}>
          <div style={{fontSize:10,letterSpacing:".35em",color:"rgba(11,31,58,.62)",marginBottom:12,textTransform:"uppercase",fontWeight:800}}>{fleetLabels.vesselsKicker}</div>
          <h2 id={fleetTitleId || undefined} className="playfair" style={{fontSize:"clamp(2rem,4vw,3rem)",fontWeight:600,marginBottom:12}}>{t.fleet.title}</h2>
          <SiteText className="cormorant" style={{fontSize:"clamp(1rem,2vw,1.3rem)",color:"rgba(11,31,58,.70)"}}>{t.fleet.sub}</SiteText>
          <div className="gold-line" style={{maxWidth:300,margin:"20px auto 0"}}/>
        </div>
        {boats.length===0 ? (
        <div className="surface" style={{textAlign:"center",padding:"48px 28px",borderRadius:16,maxWidth:560,margin:"0 auto"}}>
          <SiteText className="cormorant" style={{fontSize:"clamp(1.05rem,2.2vw,1.3rem)",color:"rgba(11,31,58,.78)",marginBottom:10}}>{t.fleet?.empty || "No vessels published yet."}</SiteText>
          <SiteText style={{fontSize:13,color:"rgba(11,31,58,.55)",lineHeight:1.6,margin:0}}>{t.fleet?.emptyHint || "Add boats in Admin."}</SiteText>
        </div>
        ) : boats.map(boat=>{
          const ci = imgIdx[boat.id]||0;
          const nImg = boat.imgs?.length ?? 0;
          const ariaPrev = t.fleet?.prevPhoto || "Previous photo";
          const ariaNext = t.fleet?.nextPhoto || "Next photo";
          return (
            <div key={boat.id} className="surface fleet-card">
              {/* Image side */}
              <div className="fleet-card-media">
                <img src={preferWebpUrl(boat.imgs[ci])} alt={fleetBoatImageAlt(boat.name, lang)} loading="lazy" decoding="async"/>
                <div className="fleet-img-overlay" aria-hidden />
                {nImg > 1 && (
                  <div className="fleet-photo-nav">
                    <button
                      type="button"
                      className="fleet-photo-nav-btn"
                      aria-label={ariaPrev}
                      onClick={()=>{
                        stopFleetAutoplay(boat.id);
                        setImgIdx((x)=>{
                          const cur=x[boat.id]??0;
                          return {...x,[boat.id]:(cur-1+nImg)%nImg};
                        });
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="fleet-photo-nav-btn"
                      aria-label={ariaNext}
                      onClick={()=>{
                        stopFleetAutoplay(boat.id);
                        setImgIdx((x)=>{
                          const cur=x[boat.id]??0;
                          return {...x,[boat.id]:(cur+1)%nImg};
                        });
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}
                {/* Image nav */}
                <div style={{position:"absolute",bottom:20,left:20,display:"flex",gap:6,zIndex:3}}>
                  {boat.imgs.map((_,i)=>(
                    <button
                      key={i}
                      type="button"
                      onClick={()=>{
                        stopFleetAutoplay(boat.id);
                        setImgIdx((x)=>({...x,[boat.id]:i}));
                      }}
                      aria-label={`${i + 1} / ${nImg}`}
                      style={{width:i===ci?24:8,height:8,borderRadius:4,background:i===ci?"rgba(11,31,58,.86)":"rgba(255,255,255,.85)",border:"1px solid rgba(11,31,58,.18)",transition:"all .3s",padding:0,cursor:"pointer"}}
                    />
                  ))}
                </div>
                {/* Badges */}
                <div style={{position:"absolute",top:20,left:20,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <span style={{background:"linear-gradient(135deg,rgba(201,160,71,.95),rgba(201,160,71,.72))",color:"rgba(11,31,58,.96)",fontSize:9,fontWeight:900,padding:"5px 10px",borderRadius:20,letterSpacing:".1em",textTransform:"uppercase"}}>{fleetLabels.privateCharter}</span>
                  <span style={{background:"rgba(255,255,255,.78)",border:"1px solid rgba(11,31,58,.14)",color:"rgba(11,31,58,.86)",fontSize:9,fontWeight:800,padding:"5px 10px",borderRadius:20}}>{boat.year}</span>
                </div>
              </div>
              
              {/* Info side */}
              <div className="fleet-card-body">
                <div style={{fontSize:10,letterSpacing:".25em",color:"rgba(11,31,58,.62)",marginBottom:8,textTransform:"uppercase",fontWeight:900}}>{boat.type}</div>
                <h3 className="playfair" style={{fontSize:"clamp(1.8rem,3vw,2.4rem)",fontWeight:600,marginBottom:6}}>{boat.name}</h3>
                <a
                  href={MOLINAR_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="El Molinar, Palma · Mallorca — Maps"
                  className="cormorant"
                  style={{fontSize:"1.1rem",color:"rgba(11,31,58,.70)",marginBottom:20,fontStyle:"italic",display:"inline-block",textDecoration:"underline",textDecorationColor:"rgba(11,31,58,.22)",textUnderlineOffset:3,cursor:"pointer",transition:"color .2s, text-decoration-color .2s"}}
                  onMouseEnter={(e)=>{ e.currentTarget.style.color="#b3882f"; e.currentTarget.style.textDecorationColor="#b3882f"; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.color="rgba(11,31,58,.70)"; e.currentTarget.style.textDecorationColor="rgba(11,31,58,.22)"; }}
                >
                  El Molinar, Palma · Mallorca
                </a>
                
                <SiteText style={{fontSize:13,color:"rgba(11,31,58,.72)",lineHeight:1.8,marginBottom:24}}>{getBoatDescription(boat, lang)}</SiteText>
                
                {/* Specs */}
                <div className="fleet-spec-grid">
                  {[
                    {icon:"spec_capacity",l:fleetLabels.specCapacity,v:String(fleetLabels.specGuests || "{n} guests").replace(/\{n\}/g, String(boat.capacity ?? ""))},
                    {icon:"spec_length",l:fleetLabels.specLength,v:boat.length},
                    {icon:"spec_engine",l:fleetLabels.specEngine,v:boat.engine},
                    {icon:"spec_year",l:fleetLabels.specYear,v:boat.year}
                  ].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:"rgba(11,31,58,.60)",marginBottom:2,letterSpacing:".06em",textTransform:"uppercase",fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
                        <SiteIcon name={s.icon} size={14} color="rgba(11,31,58,.55)" style={{flexShrink:0}} />
                        <span>{s.l}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:"rgba(11,31,58,.92)"}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                
                {/* Features chips */}
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:28}}>
                  {getBoatSpecs(boat, lang).map((s,i)=>(
                    <span key={i} style={{background:"rgba(201,160,71,.18)",border:"1px solid rgba(11,31,58,.12)",color:"rgba(11,31,58,.86)",fontSize:10,padding:"4px 10px",borderRadius:20,fontWeight:800,display:"inline-flex",alignItems:"center",gap:5}}>
                      <Check size={12} strokeWidth={2.5} color="rgba(11,31,58,.65)" aria-hidden />
                      {s}
                    </span>
                  ))}
                </div>
                
                {/* Pricing */}
                <div style={{background:"rgba(255,255,255,.72)",border:"1px solid rgba(11,31,58,.12)",borderRadius:14,padding:"16px 18px",marginBottom:20}}>
                  <div style={{fontSize:10,letterSpacing:".15em",color:"rgba(11,31,58,.62)",marginBottom:10,textTransform:"uppercase",fontWeight:900}}>{fleetLabels.charterRates}</div>
                  <div style={{fontSize:11,color:"rgba(11,31,58,.58)",fontWeight:700,marginBottom:12,lineHeight:1.45}}>{monthYearLine}</div>
                  <div className="fleet-price-grid">
                    {[
                      [fleetLabels.halfDay,"4h",`${halfShow}€`],
                      [fleetLabels.fullDay,"8h",`${fullShow}€`],
                      [fleetLabels.sunset,"3h",`${sunsetShow}€`],
                    ].map(([n,h,p])=>(
                      <div key={n} className="fleet-price-row">
                        <div className="fleet-price-row-text">
                          <div className="fleet-price-row-name">{n}</div>
                          <div className="fleet-price-row-hours">{h}</div>
                        </div>
                        <div className="fleet-price-row-price playfair">{p}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:10,color:"rgba(11,31,58,.62)",borderTop:"1px solid rgba(11,31,58,.10)",paddingTop:8,fontWeight:700}}>{fleetLabels.skipperNote}</div>
                </div>
                
                <button onClick={()=>onBook(boat)} className="btn-gold" style={{fontSize:12,letterSpacing:".15em"}}>{t.fleet.book}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// POLICY SECTION
// ═══════════════════════════════════════════════════════════════════════
const PolicySection = ({t}) => {
  const iconSize=22;
  const iconBlock=(item)=>(
    <div className="policy-card-icon-wrap" style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
      <div className="policy-card-icon-inner" style={{width:46,height:46,borderRadius:12,background:"rgba(11,31,58,.05)",border:"1px solid rgba(11,31,58,.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <SiteIcon name={item.icon} size={iconSize} color="rgba(11,31,58,.80)" />
      </div>
    </div>
  );
  return (
  <section id="policy" className="public-site-section">
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <div className="policy-section-head" style={{textAlign:"center"}}>
        <div className="policy-kicker" style={{fontSize:10,letterSpacing:".35em",color:"rgba(11,31,58,.62)",marginBottom:12,textTransform:"uppercase",fontWeight:900}}>· Policies ·</div>
        <h2 className="playfair policy-h2" style={{fontSize:"clamp(1.8rem,3.5vw,2.8rem)",fontWeight:600,marginBottom:10}}>{t.policy.title}</h2>
        <div className="cormorant policy-sub" style={{fontSize:"clamp(.9rem,1.8vw,1.2rem)",color:"rgba(11,31,58,.70)"}}>{t.policy.sub}</div>
        <div className="gold-line policy-goldline" style={{maxWidth:300,margin:"18px auto 0"}}/>
      </div>
      <div className="policy-cards-grid">
        {t.policy.items.map((item,i)=>(
          <div key={i} className="card policy-card policy-card-static" style={{padding:"24px 24px",transition:"all .25s",borderRadius:14}}>
            {iconBlock(item)}
            <div className="policy-card-title" style={{fontWeight:900,color:"rgba(11,31,58,.92)",fontSize:14,marginBottom:8,letterSpacing:".01em"}}>{item.t}</div>
            <div className="policy-card-desc site-text" style={{fontSize:12,color:"rgba(11,31,58,.68)",lineHeight:1.7}}>{item.d}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CONTACT / CTA
// ═══════════════════════════════════════════════════════════════════════
const ContactSection = ({ t, onBook, contactLinks }) => {
  const { contact, waHref, igHref, mailHref } = contactLinks ?? publicContactDerived({});
  const igUser = String(contact.instagram || "").replace(/^@/, "").trim();
  const igDisplay = igUser ? `@${igUser}` : t.contact.ig;
  const hasChannels = Boolean(waHref || igHref || mailHref);
  const departureLabel = contact.departure || t.contact.dep;
  const mapsHref = googleMapsSearchUrlForDeparture(contact.departure);
  const mapsAria = typeof t.contact.mapsAria === "string" ? t.contact.mapsAria : "Google Maps";
  return (
  <section id="contact" className="public-site-section" style={{position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:-120,right:-120,width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,160,71,.14) 0%,transparent 70%)"}}/>
    <div className="surface contact-cta-card" style={{position:"relative",maxWidth:880,margin:"0 auto",textAlign:"center",borderRadius:22}}>
      <div style={{fontSize:10,letterSpacing:".35em",color:"rgba(11,31,58,.62)",marginBottom:16,textTransform:"uppercase",fontWeight:900}}>· Ready? ·</div>
      <h2 className="playfair" style={{fontSize:"clamp(2rem,5vw,3.5rem)",fontWeight:600,marginBottom:12}}>{t.contact.title}</h2>
      <SiteText className="cormorant" style={{fontSize:"clamp(1rem,2vw,1.3rem)",color:"rgba(11,31,58,.70)",marginBottom:28}}>{t.contact.sub}</SiteText>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <button type="button" onClick={onBook} className="btn-gold" style={{fontSize:14,padding:"16px 48px"}}>{t.bookBtn}</button>
        {hasChannels ? (
          <>
            <SiteText style={{fontSize:11,letterSpacing:".2em",textTransform:"uppercase",fontWeight:900,color:"rgba(11,31,58,.48)",margin:0}}>{t.contact.socialHeading}</SiteText>
            <div className="public-contact-channels">
              {waHref ? (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="public-contact-pill public-contact-pill--wa" aria-label={`${t.contact.ariaWa}: ${contact.whatsapp}`}>
                  <BrandWhatsAppIcon size={26} />
                  <span className="public-contact-pill__label">
                    <span className="public-contact-pill__title">{t.contact.wa}</span>
                    <span className="public-contact-pill__value">{contact.whatsapp}</span>
                  </span>
                </a>
              ) : null}
              {igHref ? (
                <a href={igHref} target="_blank" rel="noopener noreferrer" className="public-contact-pill public-contact-pill--ig" aria-label={`${t.contact.ariaIg}: ${igDisplay}`}>
                  <BrandInstagramIcon size={26} />
                  <span className="public-contact-pill__label">
                    <span className="public-contact-pill__title">{t.contact.ig}</span>
                    <span className="public-contact-pill__value">{igDisplay}</span>
                  </span>
                </a>
              ) : null}
              {mailHref ? (
                <a href={mailHref} className="public-contact-pill public-contact-pill--mail" aria-label={`${t.contact.ariaMail}: ${contact.email}`}>
                  <ContactInlineIcon variant="mail" size={24} />
                  <span className="public-contact-pill__label">
                    <span className="public-contact-pill__title">{t.contact.labelEmail}</span>
                    <span className="public-contact-pill__value">{contact.email}</span>
                  </span>
                </a>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="gold-line" style={{margin:"40px auto",maxWidth:200}}/>
      <div className="contact-meta-row">
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${mapsAria}: ${departureLabel}`}
          style={{
            display:"inline-flex",alignItems:"center",gap:6,
            color:"inherit",textDecoration:"underline",
            textDecorationColor:"rgba(11,31,58,.28)",textUnderlineOffset:4,
            cursor:"pointer",transition:"color .2s, text-decoration-color .2s",
          }}
          onMouseEnter={(e)=>{ e.currentTarget.style.color="#b3882f"; e.currentTarget.style.textDecorationColor="#b3882f"; }}
          onMouseLeave={(e)=>{ e.currentTarget.style.color="inherit"; e.currentTarget.style.textDecorationColor="rgba(11,31,58,.28)"; }}
        >
          <ContactInlineIcon variant="pin" size={15} /> {departureLabel}
        </a>
      </div>
    </div>
  </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// PRIVACY / DATA PROTECTION MODAL
// ═══════════════════════════════════════════════════════════════════════
const PrivacyModal = ({ open, onClose, privacy, email }) => {
  const p = privacy || {};
  if (!open) return null;
  const mail = (typeof email === "string" && email.trim()) ? email.trim() : "";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      style={{
        position:"fixed",inset:0,zIndex:950,
        background:"rgba(11,31,58,.52)",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:"clamp(16px,4vw,32px)",
        backdropFilter:"blur(7px)",
        WebkitBackdropFilter:"blur(7px)",
      }}
      onClick={onClose}
      onKeyDown={(e)=>{ if(e.key==="Escape") onClose(); }}
    >
      <div
        className="surface"
        onClick={(e)=>e.stopPropagation()}
        style={{
          width:"100%",maxWidth:720,
          maxHeight:"min(85vh, 920px)",overflowY:"auto",
          borderRadius:18,
          padding:"clamp(20px,4vw,36px)",
          boxShadow:"0 28px 80px rgba(11,31,58,.22)",
        }}
      >
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18}}>
          <h2 id="privacy-modal-title" className="playfair" style={{fontSize:"clamp(1.35rem,3vw,1.85rem)",fontWeight:600,color:"rgba(11,31,58,.94)",margin:0,lineHeight:1.25}}>{p.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={p.close || "Close"}
            style={{
              flexShrink:0,background:"rgba(11,31,58,.06)",border:"1px solid rgba(11,31,58,.12)",
              borderRadius:10,width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
            }}
          >
            <X size={18} strokeWidth={2.2} color="rgba(11,31,58,.75)" />
          </button>
        </div>
        <SiteText style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,color:"rgba(11,31,58,.48)",marginBottom:18}}>{p.updated}</SiteText>
        <SiteText style={{fontSize:13,color:"rgba(11,31,58,.78)",lineHeight:1.75,marginBottom:22}}>{p.intro}</SiteText>
        {(p.sections || []).map((s,i)=>(
          <div key={i} style={{marginBottom:18}}>
            <h3 style={{fontSize:13,fontWeight:800,color:"rgba(11,31,58,.92)",marginBottom:8,letterSpacing:".02em"}}>{s.title}</h3>
            <SiteText style={{fontSize:13,color:"rgba(11,31,58,.72)",lineHeight:1.75,margin:0}}>{s.body}</SiteText>
          </div>
        ))}
        <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid rgba(11,31,58,.12)"}}>
          <SiteText style={{fontSize:12,fontWeight:800,color:"rgba(11,31,58,.85)",marginBottom:10}}>{p.contactLead}</SiteText>
          {mail ? (
            <a href={`mailto:${encodeURIComponent(mail)}`} style={{fontSize:14,fontWeight:700,color:"#b3882f",wordBreak:"break-all"}}>{mail}</a>
          ) : (
            <SiteText style={{fontSize:13,color:"rgba(11,31,58,.62)",margin:0}}>Configure your contact email in Admin.</SiteText>
          )}
          <SiteText className="playfair" style={{fontSize:13,fontWeight:600,color:"rgba(11,31,58,.88)",marginTop:16}}>Mallorca Island Yacht S.L.</SiteText>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════
const Footer = ({t,settings,contactLinks,lang="es"}) => {
  const [privacyOpen,setPrivacyOpen]=useState(false);
  const contact = contactLinks?.contact ?? {...DEFAULT_ADMIN_SETTINGS.contact, ...(settings?.contact&&typeof settings.contact==="object"?settings.contact:{})};
  const { waHref, igHref, mailHref } = contactLinks ?? publicContactDerived(settings);
  const year = new Date().getFullYear();
  const privacy = t.privacy;
  const hasSocial = Boolean(waHref || igHref || mailHref);
  return (
  <footer style={{padding:"48px clamp(16px,4vw,48px)"}}>
    <div className="surface" style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:24,borderRadius:20,padding:"22px 22px"}}>
      <Logo prominent size={0.9}/>
      <div style={{textAlign:"center",flex:"1 1 240px"}}>
        <SiteText className="cormorant" style={{fontSize:"1.1rem",color:"rgba(11,31,58,.70)",fontStyle:"italic"}}>{t.footer.tagline}</SiteText>
        <SiteText style={{fontSize:10,color:"rgba(11,31,58,.50)",marginTop:6,letterSpacing:".08em",fontWeight:700}}>© {year} {t.footer.rights}</SiteText>
        {Array.isArray(t.footer?.seoLinks) && t.footer.seoLinks.length > 0 ? (
          <nav aria-label="SEO" style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",justifyContent:"center",marginTop:14}}>
            {t.footer.seoLinks.map((item) => (
              <Link
                key={item.href}
                to={localizeHref(item.href, lang)}
                style={{
                  fontSize:10,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",
                  color:"rgba(11,31,58,.48)",textDecoration:"underline",textUnderlineOffset:4,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {Array.isArray(t.footer?.blogGuides) && t.footer.blogGuides.length > 0 ? (
          <nav aria-label="Guides" style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",justifyContent:"center",marginTop:10}}>
            {t.footer.blogGuides.map((item) => (
              <Link
                key={item.href}
                to={localizeHref(item.href, lang)}
                style={{
                  fontSize:10,fontWeight:700,letterSpacing:".1em",
                  color:"rgba(11,31,58,.42)",textDecoration:"underline",textUnderlineOffset:4,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {privacy?.linkLabel && (
          <button
            type="button"
            onClick={()=>setPrivacyOpen(true)}
            style={{
              marginTop:12,background:"none",border:"none",cursor:"pointer",
              fontSize:10,fontWeight:800,letterSpacing:".18em",textTransform:"uppercase",
              color:"rgba(11,31,58,.52)",
              textDecoration:"underline",textUnderlineOffset:4,
              padding:"4px 8px",
            }}
          >
            {privacy.linkLabel}
          </button>
        )}
      </div>
      {hasSocial ? (
      <div className="footer-social-block">
        <div className="footer-social-caption">{t.contact.socialHeading}</div>
        <div className="footer-social-icons">
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="site-nav-social-link" aria-label={`${t.contact.ariaWa}: ${contact.whatsapp}`} title={`${t.contact.wa} — ${contact.whatsapp}`}><BrandWhatsAppIcon size={20} /></a>
          ) : null}
          {igHref ? (
            <a href={igHref} target="_blank" rel="noopener noreferrer" className="site-nav-social-link" aria-label={`${t.contact.ariaIg}`} title={t.contact.ig}><BrandInstagramIcon size={20} /></a>
          ) : null}
          {mailHref ? (
            <a href={mailHref} className="site-nav-social-link" aria-label={`${t.contact.ariaMail}: ${contact.email}`} title={contact.email}><Mail size={18} strokeWidth={2} color="rgba(11,31,58,.78)" aria-hidden /></a>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
    <PrivacyModal open={privacyOpen} onClose={()=>setPrivacyOpen(false)} privacy={privacy} email={contact.email} />
  </footer>
  );
};

const SITE_MEDIA_JSON = import.meta.env.DEV ? "/__site-media.json" : "/site-media.json";

function SiteMediaPickerModal({onClose, onPick}){
  const [items,setItems]=useState([]);
  const [q,setQ]=useState("");
  useEffect(()=>{
    let alive=true;
    fetch(`${SITE_MEDIA_JSON}?t=${Date.now()}`, { cache: "no-store" })
      .then(r=>r.ok?r.json():Promise.reject())
      .then(j=>{
        if(!alive) return;
        setItems(Array.isArray(j)?j.filter(x=>typeof x==="string"):[]);
      })
      .catch(()=>{ if(alive) setItems([]); });
    return ()=>{alive=false;};
  },[]);
  const filtered = useMemo(()=>{
    const t=q.trim().toLowerCase();
    if(!t) return items;
    return items.filter(p=>p.toLowerCase().includes(t));
  },[items,q]);
  return (
    <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(15,23,42,.42)"}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:14,maxWidth:760,width:"100%",maxHeight:"86vh",display:"flex",flexDirection:"column",border:"1px solid #e2e8f0",boxShadow:"0 22px 50px rgba(15,23,42,.2)"}} onMouseDown={e=>e.stopPropagation()}>
        <div style={{padding:"16px 18px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:800,color:"#0f172a",letterSpacing:".08em"}}>IMÁGENES EN LA CARPETA PUBLIC</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4,lineHeight:1.5}}>Incluye imágenes de <code style={{fontSize:11}}>public/</code> y, si existe la carpeta <code style={{fontSize:11}}>dist/</code> (tras <code style={{fontSize:11}}>npm run build</code>), también todo lo publicado en <code style={{fontSize:11}}>dist/assets/</code>. En producción, el listado completo va en <code style={{fontSize:11}}>site-media.json</code> al construir.</div>
          </div>
          <button type="button" onClick={onClose} style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 12px",color:"#334155",fontSize:12,fontWeight:600}}>Cerrar</button>
        </div>
        <div style={{padding:"12px 18px"}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre de archivo…" autoComplete="off" spellCheck={false}
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:15,color:"#0f172a",background:"#fff"}}/>
        </div>
        <div style={{overflowY:"auto",padding:"8px 18px 18px",flex:1}}>
          {filtered.length===0 ? (
            <div style={{fontSize:14,color:"#64748b",padding:20,textAlign:"center",lineHeight:1.6}}>No hay imágenes en el índice. Añade archivos en <code>public/</code> y vuelve a generar con <code>npm run media:index</code>.</div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))",gap:10}}>
              {filtered.map(src=>(
                <button key={src} type="button" onClick={()=>onPick(src)}
                  style={{border:"1px solid #e2e8f0",borderRadius:10,padding:6,background:"#f8fafc",cursor:"pointer",textAlign:"left"}}
                >
                  <div style={{aspectRatio:"4/3",borderRadius:6,overflow:"hidden",background:"#e2e8f0",marginBottom:6}}>
                    <img src={preferWebpUrl(src)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                  </div>
                  <div style={{fontSize:10,color:"#475569",wordBreak:"break-all",lineHeight:1.35}}>{src}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteMediaPickerButton({onPick, children}){
  const [open,setOpen]=useState(false);
  return (
    <>
      <button type="button" onClick={()=>setOpen(true)} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,color:"#0f172a",fontSize:13,padding:"8px 14px",fontWeight:700,whiteSpace:"nowrap"}}>
        {children||"Examinar"}
      </button>
      {open&&<SiteMediaPickerModal onClose={()=>setOpen(false)} onPick={(u)=>{ onPick(u); setOpen(false); }}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════

/** Publica snapshot actual (contacto, ajustes, etc.) en `sitePublic/live`. A nivel de módulo para que el nombre exista siempre en el bundle (Settings → Guardar). */
async function flushAdminSettingsToCloud({ setToast, onFlushCloud, firebaseAuthUser, firebaseConfigured }) {
  if (!firebaseConfigured) {
    setToast("Sin Firebase en este build, los cambios se aplican solo en este navegador.");
    return { ok: false, reason: "no_firebase" };
  }
  if (!firebaseAuthUser) {
    setToast("Inicia sesión con Firebase (barra superior) para publicar en la nube.");
    return { ok: false, reason: "not_authenticated" };
  }
  if (typeof onFlushCloud !== "function") {
    setToast("Publicación a la nube no disponible.");
    return { ok: false, reason: "no_flush" };
  }
  try {
    const r = await onFlushCloud({}, { immediate: true });
    if (r?.ok === false) {
      const detail = String(r?.reason || r?.message || "error");
      setToast(`No se pudo guardar: ${detail}`);
      return r;
    }
    if (r?.skipped) {
      setToast("Sin cambios nuevos en la nube (ya estaba guardado).");
      return r;
    }
    setToast("Guardado en la nube (sitePublic/live).");
    return r ?? { ok: true };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[MIY] flushAdminSettingsToCloud:", msg);
    setToast(`Error: ${msg}`);
    return { ok: false, reason: msg };
  }
}

const AdminPanel = ({
  onExit,
  boats, setBoats,
  bookings, setBookings,
  users, setUsers,
  adminCreds, setAdminCreds,
  settings, setSettings,
  blockedDates, setBlockedDates,
  translationOverrides, setTranslationOverrides,
  /** Firebase Auth session (required for Firestore writes when cloud is configured). */
  firebaseAuthUser,
  /** Last cloud push outcome for admin feedback. */
  cloudPushStatus,
  /** Lectura pública `sitePublic/live` (snapshot / errores). */
  publicLiveReadStatus = { ok: true },
  /** Listener colección `blockedSlots` (calendario en la web pública). */
  blockedSlotsPublicReadStatus = { ok: true },
  /** Immediate Firestore snapshot write (bypasses debounce / snapshot gate). */
  onFlushCloud,
  /** TEMP: merge-write `sitePublic/live.boats` only + server read-back log. */
  onManualPublishFleet,
}) => {
  const [adminUser,setAdminUser]=useState(null);
  const [section,setSection]=useState("dashboard");
  const [loginForm,setLoginForm]=useState({email:"",pass:""});
  const [loginErr,setLoginErr]=useState("");
  const [setupForm,setSetupForm]=useState({email:"info@mallorcaislandyacht.com",pass:""});
  const [rememberMe,setRememberMe]=useState(()=> {
    try { return window.localStorage.getItem(LS_ADMIN_REMEMBER_KEY)==="1"; } catch { return false; }
  });
  const [toast,setToast]=useState("");
  const [textLang,setTextLang]=useState("en");
  const [textJson,setTextJson]=useState("");
  const [textErr,setTextErr]=useState("");
  const [agendaPick,setAgendaPick]=useState([]);
  const [fleetEditId,setFleetEditId]=useState(null);
  const [fleetDraft,setFleetDraft]=useState(null);
  const [agendaViewMonth,setAgendaViewMonth]=useState(()=>{ const t=new Date(); return new Date(t.getFullYear(),t.getMonth(),1); });
  const [pwDraft,setPwDraft]=useState(()=>Object.fromEntries((adminCreds||[]).map(c=>[c.email,c.password])));
  const [reviewRows,setReviewRows]=useState([]);
  const [revEditing,setRevEditing]=useState(null);
  const backupFileRef = useRef(null);
  const vipCodeSaveBtnRef = useRef(null);
  const multiCodeSaveBtnRef = useRef(null);
  const backupDataRef = useRef({ boats, bookings, blockedDates, settings, users });
  const [pendingRestore, setPendingRestore] = useState(null);
  const [cloudBackups, setCloudBackups] = useState([]);
  const [cloudBackupsLoading, setCloudBackupsLoading] = useState(false);
  const [reviewQrDataUrl, setReviewQrDataUrl] = useState("");
  const [reviewQrLoading, setReviewQrLoading] = useState(false);
  const [firebaseTestBusy, setFirebaseTestBusy] = useState(false);
  const [firebaseConnectBusy, setFirebaseConnectBusy] = useState(false);
  /** Persistent auth / Firestore-after-login error (toast alone was too short to read). */
  const [firebaseAuthBanner, setFirebaseAuthBanner] = useState("");
  /** Modal explícito: email/contraseña de Firebase Auth (no depende de la contraseña guardada en Admin). */
  const [firebaseLoginModalOpen, setFirebaseLoginModalOpen] = useState(false);
  const [firebaseLoginEmail, setFirebaseLoginEmail] = useState("");
  const [firebaseLoginPass, setFirebaseLoginPass] = useState("");
  /** Error exacto del último intento (código + mensaje Firebase + texto legible). */
  const [firebaseLoginModalError, setFirebaseLoginModalError] = useState("");
  const [manualFleetPublishBusy, setManualFleetPublishBusy] = useState(false);
  const [stripeRefundModal, setStripeRefundModal] = useState(null);
  const [stripeRefundPartialEuros, setStripeRefundPartialEuros] = useState("");
  const [stripeRefundBusy, setStripeRefundBusy] = useState(false);
  const [discountCodeRows, setDiscountCodeRows] = useState([]);
  const [discountCodeDraft, setDiscountCodeDraft] = useState("");
  const [multiDiscountCodeDraft, setMultiDiscountCodeDraft] = useState("");
  const [multiDiscountPct, setMultiDiscountPct] = useState(5);
  const [multiDiscountMaxUses, setMultiDiscountMaxUses] = useState(20);
  const [discountCodeBusy, setDiscountCodeBusy] = useState(false);
  const [offlineVipDraft, setOfflineVipDraft] = useState("");
  const [adminNavOpen, setAdminNavOpen] = useState(false);

  useEffect(()=>{
    if(!firebaseAuthUser || !isFirebaseConfigured() || section!=="settings") return;
    return subscribeDiscountCodesAdmin(setDiscountCodeRows, (err) => {
      console.warn("[MIY] discountCodes admin list:", err?.message || err);
    });
  },[firebaseAuthUser, section]);

  useEffect(()=>{
    if(firebaseAuthUser) setFirebaseAuthBanner("");
  }, [firebaseAuthUser]);


  useEffect(()=>{
    backupDataRef.current = { boats, bookings, blockedDates, settings, users };
  },[boats, bookings, blockedDates, settings, users]);

  useEffect(()=>{
    setPwDraft(Object.fromEntries((adminCreds||[]).map(c=>[c.email,c.password])));
  },[adminCreds]);

  useEffect(()=>{
    if(!adminUser || section!=="reviews") return;
    return subscribeReviews(setReviewRows);
  },[adminUser, section]);

  useEffect(()=>{
    if(section!=="settings"){
      setReviewQrDataUrl("");
      setReviewQrLoading(false);
      return;
    }
    const tok = String(settings?.reviewGateToken ?? "").trim();
    if(!tok){
      setReviewQrDataUrl("");
      setReviewQrLoading(false);
      return;
    }
    let cancelled = false;
    setReviewQrLoading(true);
    const origin = typeof window!=="undefined" ? window.location.origin : "";
    const reviewUrl = `${origin}/dejar-resena?t=${encodeURIComponent(tok)}`;
    const qrOpts = {
      width: 260,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1f3a", light: "#ffffff" },
    };
    /** SVG avoids canvas edge cases; encode as data URL for <img>. */
    void import("qrcode").then((mod)=>{
      const QRCode = mod?.default ?? mod;
      return QRCode.toString(reviewUrl, { ...qrOpts, type: "svg" })
        .then((svg)=>{
          if(cancelled || typeof svg!=="string") return;
          const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          setReviewQrDataUrl(src);
        })
        .catch(()=> QRCode.toDataURL(reviewUrl, qrOpts).then((dataUrl)=>{
          if(!cancelled) setReviewQrDataUrl(dataUrl);
        }))
        .catch(()=>{
          if(!cancelled) setReviewQrDataUrl("");
        })
        .finally(()=>{
          if(!cancelled) setReviewQrLoading(false);
        });
    }).catch(()=>{
      if(!cancelled){
        setReviewQrDataUrl("");
        setReviewQrLoading(false);
      }
    });
    return ()=>{ cancelled = true; };
  },[section, settings?.reviewGateToken]);

  const saveRevEdit = useCallback(async ()=>{
    if(!revEditing?.id) return;
    try{
      await adminUpdateReview(revEditing.id,{
        name: revEditing.name,
        rating: Number(revEditing.rating) || 5,
        text: revEditing.text,
        reply: revEditing.reply,
      });
      setRevEditing(null);
      setToast("Reseña guardada.");
    }catch{
      setToast("No se pudo guardar. Conecta Firebase («Conectar Firebase») e inicia sesión con la cuenta admin.");
    }
  },[revEditing]);

  const deleteRev = useCallback(async (id)=>{
    if(!window.confirm("¿Eliminar esta reseña de forma permanente?")) return;
    try{
      await adminDeleteReview(id);
      if(revEditing?.id===id) setRevEditing(null);
      setToast("Reseña eliminada.");
    }catch{
      setToast("No se pudo eliminar. Conecta Firebase o revisa permisos en Firestore.");
    }
  },[revEditing]);

  const applyRestoreFromValidated = useCallback((data)=>{
    console.log("[backup] import applied", { timestamp: data.timestamp });
    setBoats(data.boats);
    setBookings(data.bookings);
    setBlockedDates(data.blockedDates);
    setSettings(data.settings);
    setUsers(Array.isArray(data.users) ? data.users.map(mapUserRowStripViewer) : data.users);
    setToast("Backup restaurado.");
  },[setBoats,setBookings,setBlockedDates,setSettings,setUsers,setToast]);

  const downloadFullBackup = useCallback(async ()=>{
    const api = await loadBackupsApi();
    const snap = api.buildBackupSnapshot(backupDataRef.current);
    console.log("[backup] export", {
      timestamp: snap.timestamp,
      counts:{ boats:snap.boats.length, bookings:snap.bookings.length, blockedDates:snap.blockedDates.length, users:snap.users.length },
    });
    const blob = new Blob([JSON.stringify(snap,null,2)],{ type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = api.formatBackupFilename(new Date(snap.timestamp));
    a.click();
    URL.revokeObjectURL(url);
    setToast("Backup descargado.");
  },[setToast]);

  const refreshCloudBackups = useCallback(async ()=>{
    if(!isFirebaseConfigured()){
      setCloudBackups([]);
      return;
    }
    setCloudBackupsLoading(true);
    try{
      const api = await loadBackupsApi();
      const rows = await api.listFirestoreBackups(7);
      setCloudBackups(rows);
    } catch {
      setCloudBackups([]);
    } finally {
      setCloudBackupsLoading(false);
    }
  },[]);

  const onBackupFileSelected = useCallback(async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = safeJsonParse(text);
      const api = await loadBackupsApi();
      const v = api.validateBackupPayload(parsed);
      if(!v.ok){
        console.warn("[backup] import validation failed", v.errors);
        setToast(`Backup inválido: ${v.errors[0] || "formato incorrecto"}`);
        e.target.value = "";
        return;
      }
      console.log("[backup] import file parsed", { timestamp: v.data.timestamp });
      setPendingRestore(v.data);
      setToast("Backup cargado — confirma para restaurar o cancela.");
    } catch {
      setToast("No se pudo leer el archivo.");
    }
    e.target.value = "";
  },[setToast]);

  const confirmRestorePending = useCallback(()=>{
    if(!pendingRestore) return;
    if(!window.confirm("Esto sobrescribirá todos los datos. ¿Continuar?")) return;
    applyRestoreFromValidated(pendingRestore);
    setPendingRestore(null);
  },[pendingRestore,applyRestoreFromValidated]);

  const cancelPendingRestore = useCallback(()=>{
    setPendingRestore(null);
    if(backupFileRef.current) backupFileRef.current.value = "";
  },[]);

  const restoreFromCloudId = useCallback(async (id)=>{
    if(!window.confirm("Esto sobrescribirá todos los datos. ¿Continuar?")) return;
    try{
      const api = await loadBackupsApi();
      const v = await api.fetchFirestoreBackupDoc(id);
      if(!v.ok){
        setToast(v.errors[0] || "Backup en la nube inválido.");
        return;
      }
      console.log("[backup] import from Firestore", { id, timestamp: v.data.timestamp });
      applyRestoreFromValidated(v.data);
    } catch {
      setToast("No se pudo leer el backup (¿Firebase Auth activo?).");
    }
  },[applyRestoreFromValidated,setToast]);

  useEffect(()=>{
    if(!adminUser || !isFirebaseConfigured()) return;
    let cancelled = false;
    let interval = null;
    const tick = async ()=>{
      if(cancelled) return;
      try{
        const api = await loadBackupsApi();
        const snap = api.buildBackupSnapshot(backupDataRef.current);
        await api.saveFirestoreBackup(snap);
        console.log("[backup] firestore auto snapshot ok", snap.timestamp);
        if(!cancelled){
          try{
            const rows = await api.listFirestoreBackups(7);
            setCloudBackups(rows);
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn("[backup] firestore auto snapshot failed", e?.message || e);
      }
    };
    void loadBackupsApi().then((api)=>{
      if(cancelled) return;
      void tick();
      interval = setInterval(tick, api.AUTO_FIRESTORE_BACKUP_MS);
    });
    return ()=>{
      cancelled = true;
      if(interval) clearInterval(interval);
    };
  },[adminUser]);

  useEffect(()=>{
    if(!adminUser || section !== "settings") return;
    refreshCloudBackups();
  },[adminUser, section, refreshCloudBackups]);
  
  useEffect(()=>{
    try{
      if(!rememberMe) return;
      const raw = window.localStorage.getItem(LS_ADMIN_LAST_LOGIN_KEY);
      const parsed = safeJsonParse(raw);
      if(parsed && typeof parsed==="object" && typeof parsed.email==="string" && typeof parsed.pass==="string"){
        setLoginForm({email: parsed.email, pass: parsed.pass});
      }
    } catch {}
  },[]);

  const openFirebaseLoginModal = useCallback(()=>{
    if(!adminUser || !isFirebaseConfigured()) return;
    setFirebaseAuthBanner("");
    setFirebaseLoginModalError("");
    setFirebaseLoginEmail(String(adminUser.email || "").trim());
    setFirebaseLoginPass("");
    setFirebaseLoginModalOpen(true);
  }, [adminUser]);

  const submitFirebaseLoginModal = useCallback(async ()=>{
    if(!adminUser || !isFirebaseConfigured()) return;
    const em = String(firebaseLoginEmail || "").trim().toLowerCase();
    const pass = String(firebaseLoginPass || "");
    if(!em || !pass){
      setFirebaseLoginModalError("Completa email y contraseña.");
      setFirebaseAuthBanner("Introduce el email y la contraseña de la cuenta en Firebase Authentication.");
      setToast("Error: completa email y contraseña de Firebase.");
      return;
    }
    setFirebaseAuthBanner("");
    setFirebaseLoginModalError("");
    setFirebaseConnectBusy(true);
    try{
      const summary = getFirebaseRuntimeSummary();
      console.log("[MIY] Firebase login (modal) → signInWithEmailAndPassword", { projectId: summary.projectId, authDomain: summary.authDomain, email: em });
      const { firebaseSignInAsAdmin } = await loadFirebaseAdminAuth();
      const r = await firebaseSignInAsAdmin(em, pass);
      if(r.ok){
        try{
          const { firebaseReadSitePublicLiveFromServerWithTimeout } = await import("./lib/firebase-debug.js");
          const rr = await firebaseReadSitePublicLiveFromServerWithTimeout(8000);
          if(rr.exists){
            setFirebaseAuthBanner("");
            setToast("Firebase conectado (sitePublic/live OK).");
          } else {
            setFirebaseAuthBanner("Auth OK: el documento sitePublic/live aún no existe (créalo publicando desde la flota).");
            setToast("Firebase conectado; falta sitePublic/live en Firestore.");
          }
          setFirebaseLoginModalOpen(false);
          setFirebaseLoginPass("");
          setFirebaseLoginModalError("");
        } catch (e2){
          const code2 = typeof e2?.code === "string" ? e2.code : "";
          const msg2 = typeof e2?.message === "string" ? e2.message : String(e2 ?? "");
          const hint = formatFirebaseAuthError(e2, { host: typeof window !== "undefined" ? window.location.hostname : "" });
          const exact = [code2 && `code: ${code2}`, msg2 && `message: ${msg2}`, hint && `detalle: ${hint}`].filter(Boolean).join("\n");
          setFirebaseLoginModalError(exact);
          setFirebaseAuthBanner(`Sesión Firebase OK, pero la lectura de prueba a Firestore falló: ${hint}`);
          setToast(`Error: ${hint}`);
        }
      }else{
        const code = typeof r.code === "string" ? r.code : "";
        const msg = typeof r.message === "string" ? r.message : "";
        const reason = String(r.reason || "error_desconocido");
        const exact = [code && `code: ${code}`, msg && `message: ${msg}`, reason && `detalle: ${reason}`].filter(Boolean).join("\n");
        setFirebaseLoginModalError(exact || reason);
        setFirebaseAuthBanner(reason);
        setToast(`Error: ${reason}`);
      }
    }catch(e){
      const code = typeof e?.code === "string" ? e.code : "";
      const msg = typeof e?.message === "string" ? e.message : String(e ?? "");
      const hint = formatFirebaseAuthError(e, { host: typeof window !== "undefined" ? window.location.hostname : "" });
      const exact = [code && `code: ${code}`, msg && `message: ${msg}`, hint && `detalle: ${hint}`].filter(Boolean).join("\n");
      setFirebaseLoginModalError(exact || hint);
      setFirebaseAuthBanner(hint);
      setToast(`Error: ${hint}`);
    }finally{
      setFirebaseConnectBusy(false);
    }
  }, [adminUser, firebaseLoginEmail, firebaseLoginPass]);

  const persistSettingsToCloud = useCallback(()=>{
    return flushAdminSettingsToCloud({
      setToast,
      onFlushCloud,
      firebaseAuthUser,
      firebaseConfigured: isFirebaseConfigured(),
    });
  }, [firebaseAuthUser, onFlushCloud]);

  const tryFirebaseSignInAfterAdminLogin = useCallback(async (email, password) => {
    if (!isFirebaseConfigured()) return { ok: true, skipped: true };
    const em = String(email || "").trim().toLowerCase();
    const pass = String(password || "");
    if (!em || !pass) return { ok: false, reason: "missing_credentials" };
    const { firebaseSignInAsAdmin } = await loadFirebaseAdminAuth();
    const r = await firebaseSignInAsAdmin(em, pass);
    if (r.ok) {
      setFirebaseAuthBanner("");
      return { ok: true };
    }
    const hint = String(r.reason || "error_desconocido");
    setFirebaseAuthBanner(
      `Panel OK. Firebase no conectó (${hint}). Crea este email en Firebase Authentication o pulsa «Conectar Firebase».`,
    );
    return { ok: false, reason: hint };
  }, []);

  const doLogin = async ()=>{
    const creds = Array.isArray(adminCreds) ? adminCreds : [];
    const em = String(loginForm.email || "").trim().toLowerCase();
    const pass = String(loginForm.pass || "");
    const u = creds.find(
      (c) => String(c.email || "").trim().toLowerCase() === em && c.password === pass,
    );
    if(u){
      setLoginErr("");
      const normRole = normalizeAdminCredentialRole(u.role);
      try{
        window.localStorage.setItem(LS_ADMIN_REMEMBER_KEY, rememberMe ? "1" : "0");
        if(rememberMe){
          window.localStorage.setItem(LS_ADMIN_LAST_LOGIN_KEY, JSON.stringify({email: loginForm.email, pass: loginForm.pass}));
        } else {
          window.localStorage.removeItem(LS_ADMIN_LAST_LOGIN_KEY);
        }
        window.sessionStorage.setItem(SS_ADMIN_SESSION_KEY, JSON.stringify({email: loginForm.email, pass: loginForm.pass}));
      } catch {}
      setAdminCreds((creds)=>patchAdminCredsRole(creds, u.email, normRole));
      setAdminUser({...u, role: normRole});
      if (isFirebaseConfigured()) {
        const fr = await tryFirebaseSignInAfterAdminLogin(em, pass);
        if (fr.ok) setToast("Admin y Firebase conectados.");
        else setToast("Admin OK. Conecta Firebase arriba para guardar en todos los dispositivos.");
      }
    } else {
      setLoginErr("Invalid credentials. Check email and password.");
    }
  };

  useEffect(()=>{
    if(!adminUser) return;
    const cur = translationOverrides?.[textLang] || {};
    setTextJson(JSON.stringify(cur, null, 2));
    setTextErr("");
  },[adminUser, textLang]);

  useEffect(()=>{
    if(!toast) return;
    const long = toast.startsWith("Error:") || toast.includes("No se pudo conectar") || toast.includes("Firestore:");
    const ms = long ? 16000 : 2600;
    const t = setTimeout(()=>setToast(""), ms);
    return ()=>clearTimeout(t);
  },[toast]);

  /** Rol `viewer` u otro inválido en sesión activa (p. ej. bundle antiguo en caché móvil). */
  useEffect(()=>{
    if(!adminUser) return;
    const norm = normalizeAdminCredentialRole(adminUser.role);
    if(norm === adminUser.role) return;
    setAdminUser((u)=>({...u, role:norm}));
    setAdminCreds((creds)=>patchAdminCredsRole(creds, adminUser.email, norm));
  },[adminUser, setAdminCreds]);

  /** Si la sección actual no está permitida, volver al primer menú visible (evita panel “vacío” / modo lector). */
  useEffect(()=>{
    if(!adminUser) return;
    const allowed = getAdminNavSectionKeys(adminUser.role);
    if(!allowed.includes(section)) setSection(allowed[0] || "dashboard");
  },[adminUser, section]);

  /** iOS/Android: Firebase Auth suele caducar al volver del background → reconectar con credenciales de sesión. */
  const attemptFirebaseReconnect = useCallback(async ()=>{
    if(!adminUser || !isFirebaseConfigured() || firebaseAuthUser) return;
    const adminEm = String(adminUser.email || "").trim().toLowerCase();
    if(!adminEm) return;
    let pass = "";
    try{
      const sess = safeJsonParse(window.sessionStorage.getItem(SS_ADMIN_SESSION_KEY));
      if(sess && typeof sess==="object"){
        const em = String(sess.email || "").trim().toLowerCase();
        if(em === adminEm) pass = String(sess.pass || "");
      }
      if(!pass){
        const parsed = safeJsonParse(window.localStorage.getItem(LS_ADMIN_LAST_LOGIN_KEY));
        if(parsed && typeof parsed==="object"){
          const em = String(parsed.email || "").trim().toLowerCase();
          if(em === adminEm) pass = String(parsed.pass || "");
        }
      }
      if(!pass){
        const draft = String(pwDraft?.[adminUser.email] ?? pwDraft?.[adminEm] ?? "");
        if(draft) pass = draft;
      }
    }catch{}
    if(!pass) return;
    try{
      await tryFirebaseSignInAfterAdminLogin(adminEm, pass);
    }catch{}
  },[adminUser, firebaseAuthUser, pwDraft, tryFirebaseSignInAfterAdminLogin]);

  useEffect(()=>{
    if(!adminUser) return;
    void attemptFirebaseReconnect();
  },[adminUser, attemptFirebaseReconnect]);

  useEffect(()=>{
    if(!adminUser) return;
    const onVis = ()=>{
      if(document.visibilityState==="visible") void attemptFirebaseReconnect();
    };
    const onPageShow = (e)=>{ if(e.persisted) void attemptFirebaseReconnect(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    return ()=>{
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  },[adminUser, attemptFirebaseReconnect]);

  const doFirstSetup = async ()=>{
    const email = String(setupForm.email||"").trim();
    const pass = String(setupForm.pass||"");
    if(!email || !pass){
      setLoginErr("Set an email and password to create the admin account.");
      return;
    }
    const next = [{email, password: pass, role:"owner"}];
    setLoginErr("");
    try{
      window.localStorage.setItem(LS_ADMIN_REMEMBER_KEY, "1");
      window.localStorage.setItem(LS_ADMIN_LAST_LOGIN_KEY, JSON.stringify({email, pass}));
      window.sessionStorage.setItem(SS_ADMIN_SESSION_KEY, JSON.stringify({email, pass}));
    } catch {}
    setAdminCreds(next);
    setAdminUser(next[0]);
    if (isFirebaseConfigured()) {
      void tryFirebaseSignInAfterAdminLogin(email, pass);
    }
  };

  useEffect(()=>{
    if(!adminNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e)=>{ if(e.key==="Escape") setAdminNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return ()=>{
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  },[adminNavOpen]);
  
  if(!adminUser) return (
    <div className="admin-light" style={{position:"fixed",inset:0,background:"linear-gradient(165deg,#eef2f7,#e8eef5 45%,#f8fafc)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <Logo onDark={false} size={1.1}/>
          <div style={{marginTop:24}}>
            <h2 className="playfair" style={{fontSize:22,color:"#0b1f3a",marginBottom:4}}>Admin Access</h2>
            <p style={{fontSize:14,color:"#64748b"}}>Mallorca Island Yacht — Management Panel</p>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:32,boxShadow:"0 16px 40px rgba(15,23,42,.08)"}}>
          {loginErr&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.28)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#b91c1c",marginBottom:16,fontWeight:600}}>{loginErr}</div>}
          {(!adminCreds || adminCreds.length===0) ? (
            <>
              <div style={{fontSize:13,color:"#64748b",marginBottom:14,lineHeight:1.55}}>
                First-time setup: create the owner admin account.
              </div>
              {[{l:"Email",k:"email",t:"email"},{l:"Password",k:"pass",t:"password"}].map(({l,k,t})=>(
                <div key={k} style={{marginBottom:14}}>
                  <label style={{display:"block",fontSize:10,letterSpacing:".15em",color:"#0b1f3a",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>{l}</label>
                  <input
                    type={t}
                    value={setupForm[k]}
                    onChange={e=>setSetupForm(f=>({...f,[k]:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&doFirstSetup()}
                    autoComplete="off"
                    style={{width:"100%",background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"11px 14px",color:"#0f172a",fontSize:15,lineHeight:1.5}}
                  />
                </div>
              ))}
              <button onClick={doFirstSetup} className="btn-gold" style={{width:"100%",marginTop:8}}>Create Admin</button>
            </>
          ) : (
            <>
          {[{l:"Email",k:"email",t:"email"},{l:"Password",k:"pass",t:"password"}].map(({l,k,t})=>(
            <div key={k} style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:10,letterSpacing:".15em",color:"#0b1f3a",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>{l}</label>
              <input type={t} value={loginForm[k]} onChange={e=>setLoginForm(f=>({...f,[k]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&doLogin()}
                autoComplete="off"
                style={{width:"100%",background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"11px 14px",color:"#0f172a",fontSize:15,lineHeight:1.5}}/>
            </div>
          ))}
          <label style={{display:"flex",alignItems:"center",gap:10,marginTop:4,color:"#475569",fontSize:13}}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e=>{
                const v = e.target.checked;
                setRememberMe(v);
                try { window.localStorage.setItem(LS_ADMIN_REMEMBER_KEY, v ? "1" : "0"); } catch {}
              }}
              style={{accentColor:"#C9A047"}}
            />
            Remember me (keep admin password)
          </label>
          <button onClick={doLogin} className="btn-gold" style={{width:"100%",marginTop:8}}>Sign In</button>
            </>
          )}
        </div>
        <button onClick={onExit} style={{display:"block",margin:"20px auto 0",background:"none",border:"none",color:"#64748b",fontSize:13,letterSpacing:".08em",textDecoration:"underline"}}>← Back to Website</button>
      </div>
    </div>
  );
  
  const canSee = (s)=> getAdminNavSectionKeys(adminUser.role).includes(s);
  
  const navItems = [
    {k:"dashboard",l:"Dashboard"},
    {k:"bookings",l:"Bookings"},
    {k:"fleet",l:"Fleet"},
    {k:"agenda",l:"Agenda"},
    {k:"content",l:"Text & Translations"},
    {k:"reviews",l:"Reviews"},
    {k:"analytics",l:"Estadísticas"},
    {k:"users",l:"Users"},
    {k:"settings",l:"Settings"},
  ].filter(n=>canSee(n.k));
  const currentNavLabel = navItems.find((n)=>n.k===section)?.l || "Admin";
  
  const confirmed=bookings.filter(b=>b.status==="confirmed"||b.status==="paid").length;
  const pending=bookings.filter(b=>b.status==="pending"||b.status==="pending_payment").length;
  const revenue=bookings.filter(b=>b.status==="confirmed"||b.status==="paid").reduce((a,b)=>a+b.total,0);
  const today=new Date().toISOString().split("T")[0];
  const upcoming=bookings.filter(b=>b.date>=today&&(b.status==="confirmed"||b.status==="paid")).length;

  const startBoatEdit = (boat)=>{
    const desc = normalizeBoatDesc(boat);
    const specsMap = normalizeSpecsI18nObject(boat);
    setFleetEditId(boat?.id ?? "new");
    setFleetDraft({
      id: boat?.id ?? "new",
      name: boat?.name ?? "",
      type: boat?.type ?? "",
      length: boat?.length ?? "",
      engine: boat?.engine ?? "",
      capacity: boat?.capacity ?? 6,
      year: boat?.year ?? new Date().getFullYear(),
      available: boat?.available ?? true,
      imgsText: Array.isArray(boat?.imgs) ? boat.imgs.join("\n") : (boat?.img ? String(boat.img) : ""),
      specsText_en: specsMap.en.join(", "),
      specsText_es: specsMap.es.join(", "),
      specsText_de: specsMap.de.join(", "),
      specsText_fr: specsMap.fr.join(", "),
      specsText_sv: specsMap.sv.join(", "),
      desc_en: desc.en,
      desc_es: desc.es,
      desc_de: desc.de,
      desc_fr: desc.fr,
      desc_sv: desc.sv,
    });
  };

  const saveBoatDraft = ()=>{
    if(!fleetDraft) return;
    const imgs = String(fleetDraft.imgsText||"").split("\n").map(s=>s.trim()).filter(Boolean);
    const specs = {
      en: parseCommaSeparatedSpecs(fleetDraft.specsText_en),
      es: parseCommaSeparatedSpecs(fleetDraft.specsText_es),
      de: parseCommaSeparatedSpecs(fleetDraft.specsText_de),
      fr: parseCommaSeparatedSpecs(fleetDraft.specsText_fr),
      sv: parseCommaSeparatedSpecs(fleetDraft.specsText_sv),
    };
    const nextBoat = {
      id: fleetEditId==="new" ? Date.now() : fleetDraft.id,
      name: String(fleetDraft.name||"").trim(),
      type: String(fleetDraft.type||"").trim(),
      length: String(fleetDraft.length||"").trim(),
      engine: String(fleetDraft.engine||"").trim(),
      capacity: Math.max(1, Math.min(99, parseInt(fleetDraft.capacity || 0) || 1)),
      year: parseInt(fleetDraft.year || 0) || new Date().getFullYear(),
      img: imgs[0] || "",
      imgs: imgs.length ? imgs : [""].filter(Boolean),
      desc: {
        en: String(fleetDraft.desc_en||""),
        es: String(fleetDraft.desc_es||""),
        de: String(fleetDraft.desc_de||""),
        fr: String(fleetDraft.desc_fr||""),
        sv: String(fleetDraft.desc_sv||""),
      },
      specs,
      available: !!fleetDraft.available,
      published: true,
      draft: false,
    };
    if(!nextBoat.name){
      setToast("Boat name is required.");
      return;
    }
    const prevArr = Array.isArray(boats) ? boats : [];
    const existing = fleetEditId !== "new" ? prevArr.find((x) => x.id === fleetEditId) : null;
    const nextBoatWithPublish = {
      ...nextBoat,
      published: existing ? existing.published !== false : true,
      draft: existing ? !!existing.draft : false,
    };
    const nextFleet = fleetEditId==="new"
      ? [...prevArr, nextBoatWithPublish]
      : prevArr.map(b=>b.id===fleetEditId ? nextBoatWithPublish : b);
    setBoats(nextFleet);
    setFleetEditId(null);
    setFleetDraft(null);
    const cloudOk = !isFirebaseConfigured() || firebaseAuthUser;
    if(cloudOk && isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
      void onFlushCloud({ boats: nextFleet }, { immediate: true }).then((r)=>{
        if (r?.ok && !r?.skipped) setToast("Barco guardado y publicado en la web.");
        else if (r?.skipped) setToast("Barco guardado (sin cambios nuevos en la nube).");
        else setToast(`No se publicó: ${r?.reason || "Firebase"}`);
      });
    } else {
      setToast(cloudOk ? "Boat saved." : "Barco guardado en sesión. Usa «Conectar Firebase» arriba para publicar en la web.");
    }
  };
  
  const cloudSyncReady = !isFirebaseConfigured() || !!firebaseAuthUser;

  return (
    <div className="admin-light" style={{position:"fixed",inset:0,overflow:"hidden",background:"#e8eef5",zIndex:600,display:"flex",flexDirection:"column",color:"#0f172a"}}>
      {/* Top bar */}
      <div className="admin-panel-topbar" style={{background:"#ffffff",borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",height:60,gap:16,flexShrink:0,boxShadow:"0 1px 0 rgba(15,23,42,.04)"}}>
        <button
          type="button"
          className="admin-nav-burger-btn"
          aria-label={adminNavOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={adminNavOpen}
          onClick={()=>setAdminNavOpen((o)=>!o)}
        >
          <span className="admin-nav-burger-bars" aria-hidden>
            <span /><span /><span />
          </span>
        </button>
        <Logo onDark={false} size={0.8}/>
        <div className="admin-panel-current-section">{currentNavLabel}</div>
        <div className="admin-topbar-title" style={{flex:1,fontSize:12,color:"#64748b",marginLeft:8,fontWeight:600,minWidth:0}}>Management Panel</div>
        <div className="admin-topbar-compact">
          {isFirebaseConfigured() && !!adminUser && firebaseAuthUser && (
            <div
              className="admin-topbar-hide-narrow"
              title="Sesión activa de Firebase Auth (Firestore / publicar)"
              style={{
                background:"rgba(34,197,94,.14)",
                border:"1px solid rgba(34,197,94,.35)",
                color:"#166534",
                fontSize:11,
                fontWeight:800,
                padding:"7px 12px",
                borderRadius:8,
                letterSpacing:".04em",
                whiteSpace:"nowrap",
              }}
            >
              Conectado · {firebaseAuthUser.email || firebaseAuthUser.uid}
            </div>
          )}
          {isFirebaseConfigured() && !!adminUser && !firebaseAuthUser && (
            <button
              type="button"
              disabled={firebaseConnectBusy}
              onClick={openFirebaseLoginModal}
              title="Solo email/contraseña de Firebase Authentication (sin Google)"
              style={{
                background:"linear-gradient(135deg,#dc2626,#ea580c)",
                border:"none",
                borderRadius:8,
                color:"#fff",
                fontSize:12,
                padding:"8px 14px",
                letterSpacing:".04em",
                fontWeight:800,
                cursor:firebaseConnectBusy?"wait":"pointer",
                opacity:firebaseConnectBusy?0.85:1,
                whiteSpace:"nowrap",
              }}
            >
              Conectar Firebase
            </button>
          )}
          <div style={{...ROLES_CFG[adminUser.role],background:ROLES_CFG[adminUser.role]?.bg,color:ROLES_CFG[adminUser.role]?.c,fontSize:9,fontWeight:600,padding:"4px 10px",borderRadius:20,letterSpacing:".1em",textTransform:"uppercase"}}>
            {ROLES_CFG[adminUser.role]?.label || adminUser.role || "Admin"}
          </div>
          <span className="admin-topbar-hide-narrow" style={{fontSize:13,color:"#475569",fontWeight:600}}>{adminUser.email}</span>
          <button
            onClick={()=>{
              setAdminUser(null);
              firebaseSignOut();
              try { window.sessionStorage.removeItem(SS_ADMIN_SESSION_KEY); } catch {}
              if(!rememberMe){
                try { window.localStorage.removeItem(LS_ADMIN_LAST_LOGIN_KEY); } catch {}
              }
            }}
            style={{background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:8,color:"#334155",fontSize:12,padding:"6px 12px",letterSpacing:".04em",fontWeight:600}}
          >
            Logout
          </button>
          <button onClick={onExit} style={{background:"linear-gradient(135deg,#b3882f,#c9a047)",border:"none",borderRadius:8,color:"#081628",fontSize:12,padding:"6px 14px",letterSpacing:".06em",fontWeight:800}}>← Website</button>
        </div>
      </div>

      {isFirebaseConfigured() && !!firebaseAuthBanner && (
        <div style={{flexShrink:0,background:"rgba(254,226,226,.96)",borderBottom:"1px solid rgba(220,38,38,.28)",padding:"10px 24px",fontSize:12,color:"#991b1b",fontWeight:700,lineHeight:1.55}}>
          <b>Firebase Auth / conexión:</b> {firebaseAuthBanner}
          <div style={{marginTop:8,fontSize:11,fontWeight:600,color:"#7f1d1d",opacity:0.95}}>
            Consola: revisa <code style={{fontSize:10}}>[MIY][FirebaseAuth]</code>, <code style={{fontSize:10}}>auth/unauthorized-domain</code> y errores <b>403</b> a <code style={{fontSize:10}}>identitytoolkit</code> (restricciones de API key en Google Cloud).
            Authorized domains: <code style={{fontSize:10}}>mallorcaislandyacht.com</code>, <code style={{fontSize:10}}>www.mallorcaislandyacht.com</code>, tu <code style={{fontSize:10}}>*.netlify.app</code>, <code style={{fontSize:10}}>localhost</code>.
            Variables: <code style={{fontSize:10}}>VITE_FIREBASE_API_KEY</code>, <code style={{fontSize:10}}>VITE_FIREBASE_AUTH_DOMAIN</code>, <code style={{fontSize:10}}>VITE_FIREBASE_PROJECT_ID</code>.
          </div>
        </div>
      )}

      {isFirebaseConfigured() && cloudSyncReady && cloudPushStatus && cloudPushStatus.ok === false && cloudPushStatus.message && (
        <div style={{flexShrink:0,background:"rgba(254,243,199,.95)",borderBottom:"1px solid rgba(217,119,6,.3)",padding:"10px 24px",fontSize:12,color:"#92400e",fontWeight:700}}>
          Error al guardar en la nube: {cloudPushStatus.message}
        </div>
      )}

      {isFirebaseConfigured() && publicLiveReadStatus && publicLiveReadStatus.ok === false && publicLiveReadStatus.message && (
        <div style={{flexShrink:0,background:"rgba(224,231,255,.96)",borderBottom:"1px solid rgba(79,70,229,.28)",padding:"10px 24px",fontSize:12,color:"#3730a3",fontWeight:800,lineHeight:1.55}}>
          <b>Firebase público (sitePublic/live):</b>{" "}
          No se puede leer en tiempo real ({publicLiveReadStatus.code || "snapshot_error"}): {publicLiveReadStatus.message}
          <div style={{marginTop:8,fontSize:11,fontWeight:650,color:"#312e81",opacity:0.95}}>
            Si ves <code style={{fontSize:10}}>permission-denied</code> sin estar en admin: en Firebase Console las reglas deben permitir <b>lectura anónima</b> de la colección <code style={{fontSize:10}}>sitePublic</code>. Despliega el archivo del proyecto:{" "}
            <code style={{fontSize:10}}>firebase deploy --only firestore:rules</code>
          </div>
          <div style={{marginTop:6,fontSize:11,fontWeight:650,color:"#312e81",opacity:0.95}}>
            Comprueba el mismo <code style={{fontSize:10}}>projectId</code> en todas las pestañas (<code style={{fontSize:10}}>PUBLIC_FIREBASE_CONFIG</code>).
          </div>
        </div>
      )}

      {isFirebaseConfigured() && blockedSlotsPublicReadStatus && blockedSlotsPublicReadStatus.ok === false && blockedSlotsPublicReadStatus.message && (
        <div style={{flexShrink:0,background:"rgba(254,243,199,.96)",borderBottom:"1px solid rgba(217,119,6,.35)",padding:"10px 24px",fontSize:12,color:"#92400e",fontWeight:800,lineHeight:1.55}}>
          <b>Calendario (blockedSlots):</b>{" "}
          No se puede leer en tiempo real ({blockedSlotsPublicReadStatus.code || "error"}): {blockedSlotsPublicReadStatus.message}
          <div style={{marginTop:8,fontSize:11,fontWeight:700,color:"#78350f"}}>
            Las reglas deben incluir lectura pública de la colección <code style={{fontSize:10}}>blockedSlots</code>. Mismo deploy: <code style={{fontSize:10}}>firebase deploy --only firestore:rules</code>
          </div>
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",top:76,right:20,zIndex:9999,background:"#fff",border:"1px solid #e2e8f0",color:"#0b1f3a",padding:"11px 16px",borderRadius:10,fontSize:13,letterSpacing:".02em",boxShadow:"0 12px 40px rgba(15,23,42,.15)",fontWeight:600}}>
          {toast}
        </div>
      )}

      {isFirebaseConfigured() && firebaseLoginModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="firebase-login-title"
          style={{position:"fixed",inset:0,zIndex:10050,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(15,23,42,.45)"}}
          onMouseDown={(e)=>{ if(e.target===e.currentTarget && !firebaseConnectBusy){ setFirebaseLoginModalOpen(false); setFirebaseLoginPass(""); setFirebaseLoginModalError(""); } }}
        >
          <div
            onMouseDown={(e)=>e.stopPropagation()}
            style={{width:"100%",maxWidth:420,background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",boxShadow:"0 24px 60px rgba(15,23,42,.2)",padding:"26px 24px 22px"}}
          >
            <h2 id="firebase-login-title" className="playfair" style={{fontSize:20,color:"#0b1f3a",marginBottom:6,fontWeight:700}}>Iniciar sesión en Firebase</h2>
            <p style={{fontSize:13,color:"#64748b",lineHeight:1.55,marginBottom:18}}>
              Solo <b>email y contraseña</b> de Firebase Console → Authentication → Users (Email/Password). No se usa Google ni ventanas popup OAuth.
            </p>
            {!!firebaseLoginModalError && (
              <pre
                style={{
                  marginBottom:14,
                  padding:"12px 14px",
                  borderRadius:8,
                  background:"rgba(254,226,226,.95)",
                  border:"1px solid rgba(220,38,38,.35)",
                  color:"#7f1d1d",
                  fontSize:12,
                  lineHeight:1.5,
                  whiteSpace:"pre-wrap",
                  wordBreak:"break-word",
                  fontFamily:"ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                  maxHeight:180,
                  overflowY:"auto",
                }}
              >
                {firebaseLoginModalError}
              </pre>
            )}
            {String(adminUser?.email || "").toLowerCase() !== String(firebaseLoginEmail || "").trim().toLowerCase() && String(firebaseLoginEmail || "").trim() && (
              <p style={{fontSize:12,color:"#b45309",background:"rgba(251,191,36,.12)",border:"1px solid rgba(217,119,6,.25)",borderRadius:8,padding:"8px 10px",marginBottom:12}}>
                El email no coincide con el usuario con el que abriste el panel; puedes continuar si esta cuenta existe en Firebase.
              </p>
            )}
            <label style={{display:"block",fontSize:10,letterSpacing:".12em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:800}}>Email</label>
            <input
              type="email"
              autoComplete="username"
              value={firebaseLoginEmail}
              onChange={(e)=>setFirebaseLoginEmail(e.target.value)}
              disabled={firebaseConnectBusy}
              style={{width:"100%",marginBottom:14,padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:15,color:"#0f172a"}}
            />
            <label style={{display:"block",fontSize:10,letterSpacing:".12em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:800}}>Contraseña Firebase</label>
            <input
              type="password"
              autoComplete="current-password"
              value={firebaseLoginPass}
              onChange={(e)=>setFirebaseLoginPass(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==="Enter" && !firebaseConnectBusy) void submitFirebaseLoginModal(); }}
              disabled={firebaseConnectBusy}
              style={{width:"100%",marginBottom:20,padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:15,color:"#0f172a"}}
            />
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button
                type="button"
                disabled={firebaseConnectBusy}
                onClick={()=>{ if(!firebaseConnectBusy){ setFirebaseLoginModalOpen(false); setFirebaseLoginPass(""); setFirebaseLoginModalError(""); } }}
                style={{background:"#f1f5f9",border:"1px solid #cbd5e1",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:700,color:"#475569",cursor:firebaseConnectBusy?"not-allowed":"pointer"}}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={firebaseConnectBusy}
                onClick={()=>void submitFirebaseLoginModal()}
                style={{
                  background:firebaseConnectBusy?"#94a3b8":"linear-gradient(135deg,#dc2626,#ea580c)",
                  border:"none",
                  borderRadius:8,
                  padding:"10px 20px",
                  fontSize:13,
                  fontWeight:800,
                  color:"#fff",
                  cursor:firebaseConnectBusy?"wait":"pointer",
                  letterSpacing:".04em",
                }}
              >
                {firebaseConnectBusy ? "Conectando…" : "Iniciar sesión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeRefundModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stripe-refund-title"
          style={{position:"fixed",inset:0,zIndex:10060,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(15,23,42,.45)"}}
          onMouseDown={(e)=>{ if(e.target===e.currentTarget && !stripeRefundBusy){ setStripeRefundModal(null); setStripeRefundPartialEuros(""); } }}
        >
          <div
            onMouseDown={(e)=>e.stopPropagation()}
            style={{width:"100%",maxWidth:440,background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",boxShadow:"0 24px 60px rgba(15,23,42,.2)",padding:"26px 24px 22px"}}
          >
            <h2 id="stripe-refund-title" className="playfair" style={{fontSize:20,color:"#0b1f3a",marginBottom:8,fontWeight:700}}>Confirmar reembolso Stripe</h2>
            <p style={{fontSize:13,color:"#64748b",lineHeight:1.55,marginBottom:14}}>
              Se procesará un reembolso en Stripe y se actualizará la reserva en Firestore. El cliente recibirá un email de aviso (si hay dirección válida).
            </p>
            <div style={{fontSize:12,color:"#0f172a",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",marginBottom:14,lineHeight:1.5}}>
              <div><b>Ref:</b> {stripeRefundModal.id}</div>
              <div><b>Huésped:</b> {stripeRefundModal.guest}</div>
              <div><b>Total reserva:</b> {stripeRefundModal.total}€</div>
              <div style={{wordBreak:"break-all",marginTop:6}}><b>Session:</b> {stripeRefundModal.stripeCheckoutSessionId}</div>
            </div>
            <label style={{display:"block",fontSize:10,letterSpacing:".12em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:800}}>Importe (€), opcional</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder={`Vacío = reembolso completo (${stripeRefundModal.total}€)`}
              value={stripeRefundPartialEuros}
              onChange={(e)=>setStripeRefundPartialEuros(e.target.value)}
              disabled={stripeRefundBusy}
              style={{width:"100%",marginBottom:16,padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14,color:"#0f172a"}}
            />
            <p style={{fontSize:11,color:"#94a3b8",marginTop:-10,marginBottom:16,lineHeight:1.45}}>
              Solo cuentas Firebase autorizadas (variable <code style={{fontSize:10}}>ADMIN_REFUND_ALLOWED_EMAILS</code> en Vercel o claim <code style={{fontSize:10}}>admin:true</code>).
            </p>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button
                type="button"
                disabled={stripeRefundBusy}
                onClick={()=>{ if(!stripeRefundBusy){ setStripeRefundModal(null); setStripeRefundPartialEuros(""); } }}
                style={{background:"#f1f5f9",border:"1px solid #cbd5e1",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:700,color:"#475569",cursor:stripeRefundBusy?"not-allowed":"pointer"}}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={stripeRefundBusy || !firebaseAuthUser}
                onClick={()=>{
                  void (async ()=>{
                    if(!firebaseAuthUser || !stripeRefundModal?.stripeCheckoutSessionId) return;
                    setStripeRefundBusy(true);
                    try{
                      const idToken = await firebaseAuthUser.getIdToken();
                      const raw = String(stripeRefundPartialEuros || "").trim().replace(",", ".");
                      let amountEuros = null;
                      if(raw){
                        const n = Number(raw);
                        if(!Number.isFinite(n) || n <= 0){
                          setToast("Importe inválido: usa un número en euros o deja vacío para el total.");
                          return;
                        }
                        amountEuros = n;
                      }
                      const out = await refundStripePayment({
                        sessionId: stripeRefundModal.stripeCheckoutSessionId,
                        amountEuros,
                        idToken,
                      });
                      setToast(out?.emailSent === false ? `Reembolso ${out.refundId} OK (email no enviado — revisa Resend).` : `Reembolso OK: ${out.refundId}`);
                      setStripeRefundModal(null);
                      setStripeRefundPartialEuros("");
                    }catch(e){
                      const msg = e?.message || String(e);
                      setToast(`Reembolso: ${msg}`);
                    }finally{
                      setStripeRefundBusy(false);
                    }
                  })();
                }}
                style={{
                  background:stripeRefundBusy||!firebaseAuthUser?"#94a3b8":"linear-gradient(135deg,#475569,#334155)",
                  border:"none",
                  borderRadius:8,
                  padding:"10px 20px",
                  fontSize:13,
                  fontWeight:800,
                  color:"#fff",
                  cursor:stripeRefundBusy||!firebaseAuthUser?"wait":"pointer",
                  letterSpacing:".04em",
                }}
              >
                {stripeRefundBusy ? "Procesando…" : "Confirmar reembolso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {navItems.length > 1 && (
        <nav className="admin-mobile-nav-strip" aria-label="Secciones del panel">
          {navItems.map(({k,l})=>(
            <button
              key={k}
              type="button"
              className="admin-nav-btn"
              onClick={()=>setSection(k)}
              style={{
                display:"flex",alignItems:"center",gap:8,borderRadius:10,border:"none",textAlign:"left",
                background:section===k?"rgba(201,160,71,.14)":"#f1f5f9",
                color:section===k?"#92400e":"#475569",
                fontSize:12,fontWeight:section===k?700:600,letterSpacing:".02em",
              }}
            >
              <AdminNavIcon name={k} /> {l}
            </button>
          ))}
        </nav>
      )}

      <div className="admin-panel-body">
        <button
          type="button"
          className={`admin-nav-scrim${adminNavOpen ? " is-open" : ""}`}
          aria-label="Cerrar menú"
          tabIndex={adminNavOpen ? 0 : -1}
          onClick={()=>setAdminNavOpen(false)}
        />
        <div className={`admin-panel-sidebar${adminNavOpen ? " is-open" : ""}`}>
          <p className="admin-panel-sidebar-label">Menú</p>
          {navItems.map(({k,l})=>(
            <button key={k} type="button" className="admin-nav-btn" onClick={()=>{ setSection(k); setAdminNavOpen(false); }} style={{
              width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:4,borderRadius:10,border:"none",textAlign:"left",
              background:section===k?"rgba(201,160,71,.14)":"transparent",
              color:section===k?"#92400e":"#475569",
              fontSize:13,fontWeight:section===k?700:500,letterSpacing:".02em",transition:"background .15s,color .15s"
            }}>
              <AdminNavIcon name={k} /> {l}
            </button>
          ))}
        </div>

        {/* Content */}
        {section==="dashboard"&&(
          <AdminScrollPanel>
            <h2 className="playfair" style={{fontSize:24,marginBottom:8,color:"#0b1f3a"}}>Dashboard</h2>
            {isFirebaseConfigured() && getFirebaseAuth()?.currentUser?.uid && (
              <div style={{fontSize:11,color:"#64748b",marginBottom:20,lineHeight:1.5}}>
                Firebase Auth UID (una sola fuente de datos en <code style={{fontSize:10}}>sitePublic/live</code>):{" "}
                <code style={{fontSize:10,color:"#0f172a"}}>{getFirebaseAuth().currentUser.uid}</code>
              </div>
            )}
            {isFirebaseConfigured() && (
              <div className="card" style={{padding:18,borderRadius:12,marginBottom:24,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#0b1f3a",marginBottom:8,letterSpacing:".06em"}}>Firebase · Firestore debug</div>
                <p style={{fontSize:12,color:"#64748b",lineHeight:1.55,margin:"0 0 12px"}}>
                  Datos públicos: colección <code style={{fontSize:11}}>sitePublic</code>, documento <code style={{fontSize:11}}>live</code>.
                  En Netlify las variables <code style={{fontSize:11}}>VITE_FIREBASE_*</code> deben estar en el build (Site settings → Environment variables).
                  ProjectId en este bundle:{" "}
                  <strong style={{color:"#0f172a"}}>{getFirebaseRuntimeSummary().projectId || "— (no configurado)"}</strong>
                </p>
                <button
                  type="button"
                  disabled={firebaseTestBusy}
                  onClick={async ()=>{
                    setFirebaseTestBusy(true);
                    try{
                      const { firebaseWriteDebugPing } = await import("./lib/firebase-debug.js");
                      const r = await firebaseWriteDebugPing();
                      console.log("[MIY] Test Firebase success:", r);
                      setToast(`Test Firebase OK — escrito ${r.path} (readBack: ${r.readBack})`);
                    }catch(e){
                      const msg = e?.message || String(e);
                      console.error("[MIY] Test Firebase failed:", e);
                      setToast(`Test Firebase falló: ${msg}`);
                    }finally{
                      setFirebaseTestBusy(false);
                    }
                  }}
                  style={{
                    background:"#0b1f3a",
                    border:"none",
                    borderRadius:8,
                    color:"#fff",
                    fontSize:12,
                    padding:"10px 16px",
                    fontWeight:700,
                    cursor:firebaseTestBusy?"wait":"pointer",
                    opacity:firebaseTestBusy?0.7:1,
                  }}
                >
                  {firebaseTestBusy ? "Probando…" : "Test Firebase"}
                </button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:32}}>
              {[
                {k:"total",l:"Total Bookings",v:bookings.length,c:"#C9A047"},
                {k:"confirmed",l:"Paid & confirmed",v:confirmed,c:"#22c55e"},
                {k:"pending",l:"Pending",v:pending,c:"#f59e0b"},
                {k:"upcoming",l:"Upcoming",v:upcoming,c:"#4ECDC4"},
                {k:"revenue",l:"Revenue (paid & confirmed)",v:`${revenue.toLocaleString()}€`,c:"#C9A047"},
              ].map((s,i)=>(
                <div key={i} className="card" style={{padding:"20px 20px",borderRadius:12}}>
                  <div style={{marginBottom:8,color:s.c}}><DashboardStatIcon name={s.k} /></div>
                  <div style={{fontSize:11,color:"#4a5568",marginBottom:4,letterSpacing:".08em",textTransform:"uppercase"}}>{s.l}</div>
                  <div className="playfair" style={{fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            
            <h3 style={{fontSize:14,fontWeight:600,color:"#C9A047",marginBottom:16,letterSpacing:".1em",textTransform:"uppercase"}}>Upcoming Bookings</h3>
            <div className="admin-table-scroll-outer" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{background:"#f1f5f9"}}>
                  <tr><AdminTableTh>Ref</AdminTableTh><AdminTableTh>Guest</AdminTableTh><AdminTableTh>Date</AdminTableTh><AdminTableTh>Duration</AdminTableTh><AdminTableTh>Guests</AdminTableTh><AdminTableTh>Total</AdminTableTh><AdminTableTh>Status</AdminTableTh></tr>
                </thead>
                <tbody>
                  {bookings.filter(b=>b.date>=today).map(b=>(
                    <tr key={b.id} style={{transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <AdminTableTd style={{color:"#C9A047",fontWeight:600,fontSize:11}}>{b.id}</AdminTableTd>
                      <AdminTableTd>{b.guest}</AdminTableTd>
                      <AdminTableTd>{formatDate(b.date)}</AdminTableTd>
                      <AdminTableTd style={{textTransform:"capitalize"}}>{b.dur}</AdminTableTd>
                      <AdminTableTd>{b.guests}</AdminTableTd>
                      <AdminTableTd style={{color:"#C9A047",fontWeight:600}}>
                        <div>{b.total}€</div>
                        {b.promoCode && isAllowedDiscountPct(b.discountPct) && b.subtotal != null ? (
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600,marginTop:2}}>VIP {b.promoCode} (−{b.discountPct}%) · era {b.subtotal}€</div>
                        ) : null}
                      </AdminTableTd>
                      <AdminTableTd>
                        {(()=>{
                          const st = b.status;
                          const ok = st==="confirmed"||st==="paid";
                          const hold = st==="pending_payment";
                          const bg = ok ? "rgba(34,197,94,.12)" : hold ? "rgba(59,130,246,.12)" : "rgba(245,158,11,.12)";
                          const col = ok ? "#22c55e" : hold ? "#2563eb" : "#f59e0b";
                          return <span style={{background:bg,color:col,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase",letterSpacing:".1em"}}>{st}</span>;
                        })()}
                      </AdminTableTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminScrollPanel>
        )}
        
        {section==="bookings"&&(
          <AdminScrollPanel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a"}}>Bookings</h2>
              <span style={{fontSize:12,color:"#4a5568"}}>{bookings.length} total</span>
            </div>
            <div className="admin-table-scroll-outer" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{background:"#f1f5f9"}}>
                  <tr><AdminTableTh>Ref</AdminTableTh><AdminTableTh>Guest</AdminTableTh><AdminTableTh>Email</AdminTableTh><AdminTableTh>Date</AdminTableTh><AdminTableTh>Dur.</AdminTableTh><AdminTableTh>Guests</AdminTableTh><AdminTableTh>Total</AdminTableTh><AdminTableTh>Status</AdminTableTh><AdminTableTh>Actions</AdminTableTh></tr>
                </thead>
                <tbody>
                  {bookings.map(b=>(
                    <tr key={b.id} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <AdminTableTd style={{color:"#C9A047",fontSize:11,fontWeight:600}}>{b.id}</AdminTableTd>
                      <AdminTableTd>{b.guest}</AdminTableTd>
                      <AdminTableTd style={{color:"#4a5568",fontSize:12}}>{b.email}</AdminTableTd>
                      <AdminTableTd>{formatDate(b.date)}</AdminTableTd>
                      <AdminTableTd style={{textTransform:"capitalize",fontSize:11}}>{b.dur}</AdminTableTd>
                      <AdminTableTd>{b.guests}</AdminTableTd>
                      <AdminTableTd style={{color:"#C9A047",fontWeight:600}}>
                        <div>{b.total}€</div>
                        {b.promoCode && isAllowedDiscountPct(b.discountPct) && b.subtotal != null ? (
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600,marginTop:2}}>VIP {b.promoCode} (−{b.discountPct}%) · era {b.subtotal}€</div>
                        ) : null}
                      </AdminTableTd>
                      <AdminTableTd>
                        {(()=>{
                          const st = b.status;
                          const refd = st==="refunded";
                          const pref = st==="partially_refunded";
                          const ok = st==="confirmed"||st==="paid";
                          const hold = st==="pending_payment";
                          const can = st==="cancelled";
                          const bg = refd ? "rgba(100,116,139,.18)" : pref ? "rgba(245,158,11,.14)" : ok ? "rgba(34,197,94,.12)" : can ? "rgba(239,68,68,.12)" : hold ? "rgba(59,130,246,.12)" : "rgba(245,158,11,.12)";
                          const col = refd ? "#64748b" : pref ? "#d97706" : ok ? "#22c55e" : can ? "#ef4444" : hold ? "#2563eb" : "#f59e0b";
                          const label = pref ? "partial refund" : st;
                          return <span style={{background:bg,color:col,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase"}}>{label}</span>;
                        })()}
                      </AdminTableTd>
                      <AdminTableTd>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                          {adminUser?.role==="owner" && isFirebaseConfigured() && firebaseAuthUser && (b.payment==="stripe"||b.stripeCheckoutSessionId) && (b.status==="confirmed"||b.status==="paid"||b.status==="partially_refunded") && typeof b.stripeCheckoutSessionId==="string" && b.stripeCheckoutSessionId.startsWith("cs_") && (
                            <button
                              type="button"
                              onClick={()=>{ setStripeRefundPartialEuros(""); setStripeRefundModal(b); }}
                              style={{background:"rgba(100,116,139,.14)",border:"1px solid rgba(100,116,139,.35)",color:"#475569",fontSize:10,padding:"4px 8px",borderRadius:4,fontWeight:700}}
                            >
                              Reembolsar
                            </button>
                          )}
                          {b.status==="pending"&&<button onClick={async ()=>{
                            try{
                              const nextBookings = bookings.map(x=>x.id===b.id?{...x,status:"confirmed"}:x);
                              const slot = typeof b?.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b?.dur);
                              const k = blockKey(b?.date, slot);
                              const arr = Array.isArray(blockedDates)?blockedDates:[];
                              const nextBlocked = k && !arr.includes(k) ? [...arr,k].sort() : arr;
                              if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser){
                                await updateBookingFirestore(b.id, { status: "confirmed" });
                                await ensureBookingSlotBlockedFirestore({ ...b, status: "confirmed" });
                              }
                              setBookings(nextBookings);
                              setBlockedDates(nextBlocked);
                              if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser && typeof onFlushCloud==="function"){
                                void onFlushCloud({ bookings: nextBookings, blockedDates: nextBlocked }, { immediate: true });
                              }
                              setToast("Booking confirmed (slot blocked).");
                            }catch{
                              setToast("Could not update booking in Firebase.");
                            }
                          }} style={{background:"rgba(34,197,94,.15)",border:"none",color:"#22c55e",fontSize:10,padding:"4px 8px",borderRadius:4,fontWeight:600}}>✓ Confirm</button>}
                          {b.status!=="cancelled"&&<button onClick={async ()=>{
                            try{
                              const slot = typeof b?.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b?.dur);
                              const k = blockKey(b?.date, slot);
                              const arr = Array.isArray(blockedDates)?blockedDates:[];
                              const nextBlocked = k ? arr.filter(x=>x!==k) : arr;
                              const nextBookings = bookings.map(x=>x.id===b.id?{...x,status:"cancelled"}:x);
                              if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser){
                                await cancelBookingFirestore(b);
                              }
                              setBookings(nextBookings);
                              setBlockedDates(nextBlocked);
                              if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser && typeof onFlushCloud==="function"){
                                void onFlushCloud({ bookings: nextBookings, blockedDates: nextBlocked }, { immediate: true });
                              }
                              setToast("Booking cancelled.");
                            }catch{
                              setToast("Could not update Firebase.");
                            }
                          }} style={{background:"rgba(239,68,68,.1)",border:"none",color:"#ef4444",fontSize:10,padding:"4px 8px",borderRadius:4}}>✕ Cancel</button>}
                          {b.status==="pending"&&(
                            <button
                              onClick={async ()=>{
                                const ok = window.confirm(`Confirmar pago y enviar email al cliente?\n\n${b.id} — ${b.guest} — ${formatDate(b.date)}`);
                                if(!ok) return;
                                try{
                                  const nextBookings = bookings.map(x=>x.id===b.id?{...x,status:"confirmed"}:x);
                                  const slot = typeof b?.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b?.dur);
                                  const k = blockKey(b?.date, slot);
                                  const arr = Array.isArray(blockedDates)?blockedDates:[];
                                  const nextBlocked = k && !arr.includes(k) ? [...arr,k].sort() : arr;
                                  if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser){
                                    await updateBookingFirestore(b.id, { status: "confirmed" });
                                    await ensureBookingSlotBlockedFirestore({ ...b, status: "confirmed" });
                                  }
                                  setBookings(nextBookings);
                                  setBlockedDates(nextBlocked);
                                  if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser && typeof onFlushCloud==="function"){
                                    void onFlushCloud({ bookings: nextBookings, blockedDates: nextBlocked }, { immediate: true });
                                  }
                                  sendGuestBookingEmail({...b,status:"confirmed"}, settings, "confirmed");
                                  setToast("Booking confirmed (slot blocked) + email prepared.");
                                }catch{
                                  setToast("Could not update booking in Firebase.");
                                }
                              }}
                              style={{background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.25)",color:"#22c55e",fontSize:10,padding:"4px 8px",borderRadius:4,fontWeight:600}}
                            >
                              ✉️ Confirm + Email
                            </button>
                          )}
                          <button
                            onClick={async ()=>{
                              const ok = window.confirm(`¿Seguro que quieres eliminar esta reserva?\n\n${b.id} — ${b.guest} — ${formatDate(b.date)}`);
                              if(!ok) return;
                              try{
                                const slot = typeof b?.slot==="string" && b.slot ? b.slot : slotKeyFromDur(b?.dur);
                                const k = blockKey(b?.date, slot);
                                const arr = Array.isArray(blockedDates)?blockedDates:[];
                                const nextBlocked = k ? arr.filter(x=>x!==k) : arr;
                                const nextBookings = bookings.filter(x=>x.id!==b.id);
                                if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser){
                                  await deleteBookingAndSlotFirestore(b);
                                }
                                setBookings(nextBookings);
                                setBlockedDates(nextBlocked);
                                if(isFirebaseConfigured() && getFirebaseAuth()?.currentUser && typeof onFlushCloud==="function"){
                                  void onFlushCloud({ bookings: nextBookings, blockedDates: nextBlocked }, { immediate: true });
                                }
                                setToast("Booking deleted.");
                              }catch{
                                setToast("Could not delete booking in Firebase.");
                              }
                            }}
                            style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",color:"#ef4444",fontSize:10,padding:"4px 8px",borderRadius:4}}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </AdminTableTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminScrollPanel>
        )}
        
        {section==="fleet"&&(
          <AdminScrollPanel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24}}>
              <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a"}}>Fleet Management</h2>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
                {isFirebaseConfigured() && (
                  <button
                    type="button"
                    disabled={manualFleetPublishBusy || !firebaseAuthUser}
                    title="Escribe sitePublic/live.boats (merge) y lee el servidor; revisa consola PUBLIC_AFTER_MANUAL_PUBLISH"
                    onClick={()=>{
                      if(typeof onManualPublishFleet !== "function") return;
                      setManualFleetPublishBusy(true);
                      void onManualPublishFleet()
                        .then((r)=>{
                          setToast(r?.ok ? "Listo: sitePublic/live.boats + consola PUBLIC_AFTER_MANUAL_PUBLISH." : `Error: ${r?.reason || "desconocido"}`);
                        })
                        .catch((e)=>{ setToast(String(e?.message || e)); })
                        .finally(()=>{ setManualFleetPublishBusy(false); });
                    }}
                    style={{
                      background:manualFleetPublishBusy ? "#94a3b8" : "#0f766e",
                      border:"none",
                      borderRadius:8,
                      color:"#fff",
                      fontSize:11,
                      fontWeight:800,
                      padding:"9px 16px",
                      letterSpacing:".06em",
                      cursor:manualFleetPublishBusy || !firebaseAuthUser ? "not-allowed" : "pointer",
                      opacity:!firebaseAuthUser ? 0.55 : 1,
                    }}
                  >
                    {manualFleetPublishBusy ? "Publicando…" : "Publicar flota ahora"}
                  </button>
                )}
                <button onClick={()=>startBoatEdit(null)} className="btn-gold" style={{fontSize:11,padding:"9px 20px"}}>+ Add Boat</button>
              </div>
            </div>
            {isFirebaseConfigured() && (
              <p style={{fontSize:12,color:"#64748b",marginTop:-12,marginBottom:20,lineHeight:1.55,maxWidth:720}}>
                La web pública solo muestra el array <code style={{fontSize:11}}>sitePublic/live.boats</code> (no localStorage).
                Los barcos con <code style={{fontSize:11}}>draft:true</code>, <code style={{fontSize:11}}>published:false</code>, etc. no se envían al documento público.
              </p>
            )}

            {fleetEditId!==null&&fleetDraft&&(
              <div className="card" style={{padding:24,borderRadius:14,marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
                  <h3 style={{fontSize:14,fontWeight:700,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase"}}>
                    {fleetEditId==="new" ? "New boat" : "Edit boat"}
                  </h3>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setFleetEditId(null);setFleetDraft(null);}} style={{background:"#f8fafc",border:"1px solid #cbd5e1",color:"#475569",fontSize:12,padding:"7px 14px",borderRadius:8,fontWeight:600}}>Cancel</button>
                    <button onClick={saveBoatDraft} className="btn-gold" style={{fontSize:11,padding:"8px 18px"}}>Save</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
                  {[
                    ["Name","name","text"],["Type","type","text"],["Length","length","text"],["Engine","engine","text"],
                    ["Capacity","capacity","number"],["Year","year","number"],
                  ].map(([label,key,type])=>(
                    <div key={key}>
                      <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#4a5568",marginBottom:6,textTransform:"uppercase"}}>{label}</label>
                      <input
                        type={type}
                        value={fleetDraft[key]}
                        onChange={e=>setFleetDraft(d=>({...d,[key]:e.target.value}))}
                        style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                      />
                    </div>
                  ))}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:18}}>
                    <input id="boatAvail" type="checkbox" checked={!!fleetDraft.available} onChange={e=>setFleetDraft(d=>({...d,available:e.target.checked}))}/>
                    <label htmlFor="boatAvail" style={{fontSize:13,color:"#334155",fontWeight:600}}>Available</label>
                  </div>
                </div>

                <div style={{marginTop:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
                    <label style={{fontSize:10,letterSpacing:".1em",color:"#64748b",textTransform:"uppercase",fontWeight:700}}>Images (one URL per line)</label>
                    <SiteMediaPickerButton onPick={(u)=>{
                      setFleetDraft(d=>{
                        const cur = String(d.imgsText||"").trim();
                        const lines = cur ? cur.split("\n").map(s=>s.trim()).filter(Boolean) : [];
                        if(lines.includes(u)) return d;
                        return {...d, imgsText: cur ? `${cur}\n${u}` : u};
                      });
                    }}>Examinar</SiteMediaPickerButton>
                  </div>
                  <textarea value={fleetDraft.imgsText} onChange={e=>setFleetDraft(d=>({...d,imgsText:e.target.value}))} rows={6} spellCheck={false} autoComplete="off"
                    style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:10,padding:"12px 14px",color:"#0f172a",fontSize:15,lineHeight:1.65,resize:"vertical"}}/>
                </div>

                <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
                  {[
                    ["Specs (EN, comma-separated)","specsText_en"],
                    ["Especificaciones (ES, separadas por comas)","specsText_es"],
                    ["Ausstattung (DE, kommagetrennt)","specsText_de"],
                    ["Équipements (FR, virgules)","specsText_fr"],
                    ["Utrustning (SV, kommatecken)","specsText_sv"],
                  ].map(([label,key])=>(
                    <div key={key}>
                      <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>{label}</label>
                      <textarea value={fleetDraft[key]} onChange={e=>setFleetDraft(d=>({...d,[key]:e.target.value}))} rows={4} spellCheck={false} autoComplete="off"
                        style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:10,padding:"12px 14px",color:"#0f172a",fontSize:15,lineHeight:1.65,resize:"vertical"}}/>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
                  {[
                    ["Description (EN)","desc_en"],
                    ["Descripción (ES)","desc_es"],
                    ["Beschreibung (DE)","desc_de"],
                    ["Description (FR)","desc_fr"],
                    ["Beskrivning (SV)","desc_sv"],
                  ].map(([label,key])=>(
                    <div key={key}>
                      <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>{label}</label>
                      <textarea value={fleetDraft[key]} onChange={e=>setFleetDraft(d=>({...d,[key]:e.target.value}))} rows={5} spellCheck={false} autoComplete="off"
                        style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:10,padding:"12px 14px",color:"#0f172a",fontSize:15,lineHeight:1.65,resize:"vertical"}}/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {boats.map(b=>(
              <div key={b.id} className="card" style={{padding:24,borderRadius:14,marginBottom:16,display:"flex",gap:20,alignItems:"flex-start"}}>
                <img src={preferWebpUrl(b.img)} alt={b.name} style={{width:120,height:90,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <h3 style={{fontSize:16,fontWeight:600,color:"#0b1f3a",marginBottom:4}}>{b.name}</h3>
                      <p style={{fontSize:12,color:"#4a5568"}}>{b.type} · {b.length} · {b.capacity} guests · {b.year}</p>
                    </div>
                    <span style={{background:b.available?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)",color:b.available?"#22c55e":"#ef4444",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase"}}>{b.available?"Available":"Unavailable"}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button onClick={()=>startBoatEdit(b)} style={{background:"rgba(201,160,71,.1)",border:"1px solid rgba(201,160,71,.2)",color:"#C9A047",fontSize:11,padding:"6px 14px",borderRadius:6}}>✏️ Edit</button>
                    <button onClick={()=>{
                      const list = Array.isArray(boats)?boats:[];
                      const next = list.map(x=>x.id===b.id?{...x,available:!x.available}:x);
                      setBoats(next);
                      if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
                        void onFlushCloud({ boats: next }, { immediate: true });
                      }
                    }} style={{background:"#f8fafc",border:"1px solid #cbd5e1",color:"#475569",fontSize:12,padding:"6px 14px",borderRadius:6,fontWeight:600}}>
                      {b.available?"Set Unavailable":"Set Available"}
                    </button>
                    <button onClick={()=>{
                      const next = (Array.isArray(boats)?boats:[]).filter(x=>x.id!==b.id);
                      setBoats(next);
                      setToast("Boat deleted.");
                      if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
                        void onFlushCloud({ boats: next }, { immediate: true });
                      }
                    }} style={{background:"none",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:11,padding:"6px 14px",borderRadius:6}}>🗑️ Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </AdminScrollPanel>
        )}

        {section==="agenda"&&(
          <AdminScrollPanel>
            <AdminAgendaTab
              blockedDates={blockedDates}
              setBlockedDates={setBlockedDates}
              bookings={bookings}
              settings={settings}
              setSettings={setSettings}
              agendaPick={agendaPick}
              setAgendaPick={setAgendaPick}
              agendaViewMonth={agendaViewMonth}
              setAgendaViewMonth={setAgendaViewMonth}
              setToast={setToast}
              onFlushCloud={onFlushCloud}
              firebaseAuthUser={firebaseAuthUser}
            />
          </AdminScrollPanel>
        )}

        {section==="content"&&(
          <AdminScrollPanel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a"}}>Text & Translations</h2>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <select value={textLang} onChange={e=>setTextLang(e.target.value)} style={{background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,color:"#0f172a",fontSize:12,padding:"8px 10px"}}>
                  {Object.keys(LANG_NAMES).map(k=><option key={k} value={k}>{k.toUpperCase()} — {LANG_NAMES[k]}</option>)}
                </select>
                <button
                  onClick={()=>{
                    try{
                      const parsed = safeJsonParse(textJson);
                      if(parsed===null && textJson.trim()!=="") throw new Error("invalid");
                      setTranslationOverrides((prev)=>{
                        const merged = stripDeprecatedMooringFromOverrides({ ...(prev || {}), [textLang]: parsed || {} });
                        return merged.overrides;
                      });
                      setTextErr("");
                      setToast("Text overrides saved.");
                      if(isFirebaseConfigured() && firebaseAuthUser && typeof onFlushCloud==="function"){
                        window.setTimeout(()=> void onFlushCloud({}, { immediate: true }), 120);
                      }
                    } catch {
                      setTextErr("Invalid JSON. Fix it and try again.");
                    }
                  }}
                  className="btn-gold"
                  style={{fontSize:11,padding:"9px 18px"}}
                >Save</button>
              </div>
            </div>
            {textErr&&<div style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171",marginBottom:12}}>{textErr}</div>}
            <div className="card" style={{padding:16,borderRadius:14}}>
              <div style={{fontSize:12,color:"#4a5568",marginBottom:10,lineHeight:1.6}}>
                Paste a JSON object with only the keys you want to override for this language (it merges on top of the defaults).
              </div>
              <textarea value={textJson} onChange={e=>setTextJson(e.target.value)} rows={18}
                style={{width:"100%",background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"14px 16px",color:"#0f172a",fontSize:13,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",lineHeight:1.65,resize:"vertical",minHeight:320,spellCheck:false,autoComplete:"off"}}/>
            </div>
          </AdminScrollPanel>
        )}
        
        {section==="users"&&adminUser.role==="owner"&&(
          <AdminScrollPanel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a"}}>User Management</h2>
              <button className="btn-gold" style={{fontSize:11,padding:"9px 20px"}}>+ Invite User</button>
            </div>
            
            <div className="card" style={{padding:20,borderRadius:14,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
                <h3 style={{fontSize:12,fontWeight:700,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase"}}>
                  Admin Passwords
                </h3>
                <button
                  onClick={()=>{
                    const next = (adminCreds||[]).map(c=>({
                      ...c,
                      password: String(pwDraft?.[c.email] ?? c.password),
                      role: normalizeAdminCredentialRole(c.role),
                    }));
                    setAdminCreds(next);
                    setToast("Admin passwords saved.");
                  }}
                  className="btn-gold"
                  style={{fontSize:10,padding:"7px 14px"}}
                >
                  Save passwords
                </button>
              </div>
              <div style={{fontSize:11,color:"#4a5568",marginBottom:12}}>
                Saved in this browser (localStorage). Use strong passwords.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
                {(adminCreds||[]).map(c=>(
                  <div key={c.email} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,marginBottom:8}}>
                      <div style={{fontSize:12,color:"#0f172a",fontWeight:600}}>{c.email}</div>
                      <div style={{fontSize:10,color:"#4a5568",letterSpacing:".08em",textTransform:"uppercase"}}>{c.role}</div>
                    </div>
                    <input
                      type="password"
                      value={String(pwDraft?.[c.email] ?? "")}
                      onChange={e=>setPwDraft(d=>({...d,[c.email]:e.target.value}))}
                      placeholder="New password…"
                      style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                    />
                  </div>
                ))}
              </div>
            </div>

            {users.filter(u=>u.status==="pending").length>0&&(
              <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,padding:20,marginBottom:24}}>
                <h4 style={{fontSize:12,fontWeight:600,color:"#f59e0b",marginBottom:12,letterSpacing:".1em",textTransform:"uppercase"}}>⏳ Pending Registrations</h4>
                {users.filter(u=>u.status==="pending").map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(201,160,71,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#C9A047"}}>{u.avatar}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:"#0f172a"}}>{u.name}</div>
                        <div style={{fontSize:11,color:"#4a5568"}}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <select defaultValue={u.role} onChange={e=>setUsers(us=>us.map(x=>x.id===u.id?{...x,role:e.target.value}:x))} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,padding:"6px 10px",color:"#0f172a",fontSize:12}}>
                        {Object.entries(ROLES_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={()=>setUsers(us=>us.map(x=>x.id===u.id?{...x,status:"active"}:x))} style={{background:"rgba(34,197,94,.15)",border:"none",color:"#22c55e",fontSize:11,padding:"5px 12px",borderRadius:6,fontWeight:600}}>✓ Approve</button>
                      <button onClick={()=>setUsers(us=>us.filter(x=>x.id!==u.id))} style={{background:"rgba(239,68,68,.1)",border:"none",color:"#ef4444",fontSize:11,padding:"5px 12px",borderRadius:6}}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="admin-table-scroll-outer" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{background:"#f1f5f9"}}><tr><AdminTableTh>User</AdminTableTh><AdminTableTh>Email</AdminTableTh><AdminTableTh>Role</AdminTableTh><AdminTableTh>Status</AdminTableTh><AdminTableTh>Actions</AdminTableTh></tr></thead>
                <tbody>
                  {users.filter(u=>u.status==="active").map(u=>(
                    <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <AdminTableTd>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(201,160,71,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#C9A047"}}>{u.avatar}</div>
                          <span style={{fontWeight:500}}>{u.name}</span>
                        </div>
                      </AdminTableTd>
                      <AdminTableTd style={{color:"#4a5568",fontSize:12}}>{u.email}</AdminTableTd>
                      <AdminTableTd>
                        {u.role==="owner"?(
                          <span style={{...ROLES_CFG[u.role],background:ROLES_CFG[u.role].bg,color:ROLES_CFG[u.role].c,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase"}}>{ROLES_CFG[u.role].label}</span>
                        ):(
                          <select value={u.role} onChange={e=>setUsers(us=>us.map(x=>x.id===u.id?{...x,role:e.target.value}:x))} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,padding:"6px 10px",color:"#0f172a",fontSize:12}}>
                            {Object.entries(ROLES_CFG).filter(([k])=>k!=="owner").map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          </select>
                        )}
                      </AdminTableTd>
                      <AdminTableTd><span style={{background:"rgba(34,197,94,.12)",color:"#22c55e",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase"}}>Active</span></AdminTableTd>
                      <AdminTableTd>
                        {u.role!=="owner"&&<button onClick={()=>setUsers(us=>us.filter(x=>x.id!==u.id))} style={{background:"none",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:11,padding:"4px 10px",borderRadius:6}}>Remove</button>}
                      </AdminTableTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminScrollPanel>
        )}
        
        {section==="reviews"&&(
          <AdminScrollPanel>
            <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a",marginBottom:12}}>Reviews</h2>
            <p style={{fontSize:13,color:"#64748b",marginBottom:14,maxWidth:800,lineHeight:1.55}}>
              Lista completa de reseñas: ver texto, editar nombre/estrellas/comentario o respuesta pública, o eliminar. Con Firebase activo debes estar conectado arriba («Conectar Firebase») para guardar cambios o borrar en la nube.
              {!isFirebaseConfigured() && (
                <span style={{display:"block",marginTop:10,color:"#b45309",fontWeight:700}}>
                  Sin variables Firebase, las reseñas solo viven en este navegador (local).
                </span>
              )}
            </p>
            {isFirebaseConfigured() && !firebaseAuthUser ? (
              <div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.35)",borderRadius:10,padding:"12px 16px",marginBottom:18,fontSize:13,color:"#92400e",fontWeight:600}}>
                Pulsa «Conectar Firebase» en la barra superior para poder modificar o eliminar reseñas en Firestore.
              </div>
            ) : null}
            {revEditing&&(
              <div className="card" style={{padding:22,borderRadius:14,marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:800,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase",marginBottom:14}}>Editar reseña</div>
                <div style={{fontSize:11,color:"#94a3b8",marginBottom:12,fontFamily:"ui-monospace,Menlo,monospace"}}>ID: {revEditing.id}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:14}}>
                  <div>
                    <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Nombre</label>
                    <input value={revEditing.name} onChange={e=>setRevEditing(r=>({...r,name:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Valoración (1–5)</label>
                    <input type="number" min={1} max={5} value={revEditing.rating} onChange={e=>setRevEditing(r=>({...r,rating:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14}}/>
                  </div>
                </div>
                <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Comentario</label>
                <textarea value={revEditing.text} onChange={e=>setRevEditing(r=>({...r,text:e.target.value}))} rows={6} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14,marginBottom:14}}/>
                <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Respuesta pública (web)</label>
                <textarea value={revEditing.reply ?? ""} onChange={e=>setRevEditing(r=>({...r,reply:e.target.value}))} rows={3} placeholder="Opcional…" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14,marginBottom:16}}/>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button type="button" disabled={!cloudSyncReady} onClick={saveRevEdit} className="btn-gold" style={{fontSize:12,padding:"10px 20px",opacity:cloudSyncReady?1:0.5,cursor:cloudSyncReady?"pointer":"not-allowed"}}>Guardar</button>
                  <button type="button" onClick={()=>setRevEditing(null)} style={{background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:8,padding:"10px 18px",fontSize:12,fontWeight:600,color:"#334155"}}>Cancelar</button>
                </div>
              </div>
            )}
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
                <thead style={{background:"#f1f5f9"}}>
                  <tr>
                    <AdminTableTh style={{width:110}}>Fecha</AdminTableTh>
                    <AdminTableTh>Cliente</AdminTableTh>
                    <AdminTableTh style={{width:120}}>Estrellas</AdminTableTh>
                    <AdminTableTh>Comentario y respuesta</AdminTableTh>
                    <AdminTableTh style={{width:180}}>Acciones</AdminTableTh>
                  </tr>
                </thead>
                <tbody>
                  {(reviewRows||[]).map((rv)=>{
                    const nStars = Math.min(5, Math.max(0, Math.round(Number(rv.rating) || 0)));
                    const dt = rv.createdAt ? new Date(rv.createdAt).toLocaleString() : "—";
                    return (
                      <tr key={rv.id}>
                        <AdminTableTd style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap",verticalAlign:"top"}}>{dt}</AdminTableTd>
                        <AdminTableTd style={{fontWeight:600,verticalAlign:"top",maxWidth:140}}>{rv.name}</AdminTableTd>
                        <AdminTableTd style={{verticalAlign:"top"}}>
                          <span style={{color:"#c9a047",fontFamily:"Georgia,serif",fontSize:15,letterSpacing:1}} aria-hidden>
                            {Array.from({ length: 5 }, (_, i) => (i < nStars ? "★" : "☆")).join("")}
                          </span>
                          <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{rv.rating}/5</div>
                        </AdminTableTd>
                        <AdminTableTd style={{maxWidth:420,fontSize:13,color:"#475569",verticalAlign:"top"}}>
                          <div style={{maxHeight:220,overflowY:"auto",lineHeight:1.65,whiteSpace:"pre-wrap",paddingRight:6}}>{rv.text}</div>
                          {rv.reply ? (
                            <div style={{marginTop:10,padding:"10px 12px",borderRadius:8,background:"rgba(201,160,71,.1)",border:"1px solid rgba(146,64,14,.2)"}}>
                              <div style={{fontSize:10,fontWeight:800,color:"#92400e",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Respuesta</div>
                              <div style={{fontSize:13,color:"#78350f",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{rv.reply}</div>
                            </div>
                          ) : null}
                          <div style={{fontSize:10,color:"#cbd5e1",marginTop:8,fontFamily:"ui-monospace,Menlo,monospace"}} title={rv.id}>{rv.id.length > 18 ? `${rv.id.slice(0, 10)}…${rv.id.slice(-6)}` : rv.id}</div>
                        </AdminTableTd>
                        <AdminTableTd style={{verticalAlign:"top"}}>
                          <button
                            type="button"
                            disabled={!cloudSyncReady}
                            onClick={()=>setRevEditing({ ...rv, reply: rv.reply || "" })}
                            style={{
                              background:"rgba(201,160,71,.14)",
                              border:"1px solid rgba(201,160,71,.35)",
                              borderRadius:6,
                              padding:"6px 12px",
                              fontSize:11,
                              fontWeight:700,
                              color:"#92400e",
                              marginRight:8,
                              marginBottom:6,
                              opacity:cloudSyncReady?1:0.45,
                              cursor:cloudSyncReady?"pointer":"not-allowed",
                            }}
                          >Editar</button>
                          <button
                            type="button"
                            disabled={!cloudSyncReady}
                            onClick={()=>deleteRev(rv.id)}
                            style={{
                              background:"none",
                              border:"1px solid rgba(239,68,68,.25)",
                              color:"#ef4444",
                              borderRadius:6,
                              padding:"6px 12px",
                              fontSize:11,
                              fontWeight:700,
                              opacity:cloudSyncReady?1:0.45,
                              cursor:cloudSyncReady?"pointer":"not-allowed",
                            }}
                          >Eliminar</button>
                        </AdminTableTd>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!reviewRows||reviewRows.length===0)&&(
                <div style={{padding:28,textAlign:"center",fontSize:14,color:"#94a3b8"}}>No hay reseñas todavía.</div>
              )}
            </div>
          </AdminScrollPanel>
        )}

        {section==="analytics"&&(
          <AdminScrollPanel>
            <Suspense fallback={null}>
              <AdminAnalyticsTab firebaseAuthUser={firebaseAuthUser} isActive={section==="analytics"} />
            </Suspense>
          </AdminScrollPanel>
        )}
        
        {section==="settings"&&(
          <AdminScrollPanel>
            <h2 className="playfair" style={{fontSize:24,color:"#0b1f3a",marginBottom:24}}>Settings</h2>

            {isFirebaseConfigured() && (
              <div className="card" style={{padding:24,borderRadius:14,marginBottom:16,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Firebase Auth · diagnóstico</h4>
                <p style={{fontSize:13,color:"#64748b",marginBottom:14,lineHeight:1.55}}>
                  Comprueba en consola <code style={{fontSize:11}}>Firebase Auth: …</code>, intenta un escritura de prueba en Firestore y muestra el error exacto si falla (reglas, sesión o red).
                </p>
                <button
                  type="button"
                  disabled={firebaseTestBusy}
                  onClick={async ()=>{
                    setFirebaseTestBusy(true);
                    try{
                      const { firebaseAuthDebugProbe } = await import("./lib/firebase-debug.js");
                      const r = await firebaseAuthDebugProbe();
                      console.log("[MIY] Test Firebase Auth OK:", r);
                      setToast(`Test Firebase Auth OK — ${r.path} (readBack: ${r.readBack})`);
                    }catch(e){
                      const code = e?.code ? `${e.code}: ` : "";
                      const msg = `${code}${e?.message || String(e)}`;
                      console.error("[MIY] Test Firebase Auth failed:", e);
                      setToast(`Test Firebase Auth falló: ${msg}`);
                    }finally{
                      setFirebaseTestBusy(false);
                    }
                  }}
                  style={{
                    background:"#0b1f3a",
                    border:"none",
                    borderRadius:8,
                    color:"#fff",
                    fontSize:12,
                    padding:"10px 16px",
                    fontWeight:700,
                    cursor:firebaseTestBusy?"wait":"pointer",
                    opacity:firebaseTestBusy?0.7:1,
                  }}
                >
                  {firebaseTestBusy ? "Probando…" : "Test Firebase Auth"}
                </button>
              </div>
            )}

            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Backup & restore</h4>
              <p style={{fontSize:13,color:"#64748b",marginBottom:14,lineHeight:1.55}}>
                Exporta o restaura embarcaciones, reservas, fechas bloqueadas, ajustes y usuarios. La restauración sustituye por completo los datos en este navegador.
              </p>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:14}}>
                <button type="button" onClick={downloadFullBackup} className="btn-gold" style={{fontSize:11,padding:"9px 18px"}}>
                  Descargar backup
                </button>
                <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,color:"#334155"}}>
                  <input
                    ref={backupFileRef}
                    type="file"
                    accept=".json,application/json"
                    style={{display:"none"}}
                    onChange={onBackupFileSelected}
                  />
                  Restaurar desde backup
                </label>
              </div>
              {pendingRestore && (
                <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.35)",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                  <div style={{fontSize:13,color:"#92400e",fontWeight:700,marginBottom:8}}>
                    Backup listo para aplicar (timestamp: {pendingRestore.timestamp})
                  </div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:12,lineHeight:1.55}}>
                    Esto sobrescribirá todos los datos locales al confirmar.
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <button type="button" onClick={confirmRestorePending} className="btn-gold" style={{fontSize:11,padding:"8px 16px"}}>
                      Confirmar restauración
                    </button>
                    <button type="button" onClick={cancelPendingRestore} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,color:"#475569"}}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,marginTop:4}}>
                <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>
                  Copias en Firestore (últimos 7)
                </div>
                <p style={{fontSize:12,color:"#64748b",marginBottom:10,lineHeight:1.55}}>
                  Con Firebase configurado e inicio de sesión correcto, se guarda una copia automática cada 24 horas (mientras el panel está abierto) y se conservan solo los últimos siete documentos.
                </p>
                {!isFirebaseConfigured() && (
                  <div style={{fontSize:12,color:"#b45309",marginBottom:10}}>Firebase no configurado — solo backup por archivo.</div>
                )}
                {cloudBackupsLoading ? (
                  <div style={{fontSize:13,color:"#64748b"}}>Cargando backups…</div>
                ) : cloudBackups.length === 0 ? (
                  <div style={{fontSize:13,color:"#94a3b8"}}>No hay backups en la nube todavía (o sin permiso / sin Auth).</div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {cloudBackups.map((row)=>(
                      <div key={row.id} style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:12,color:"#0f172a"}}>
                          <span style={{fontWeight:700}}>{row.timestamp || "sin timestamp"}</span>
                          {row.createdAtMs ? (
                            <span style={{color:"#64748b",marginLeft:8}}>{new Date(row.createdAtMs).toLocaleString()}</span>
                          ) : null}
                        </div>
                        <button type="button" onClick={()=>restoreFromCloudId(row.id)} style={{background:"rgba(201,160,71,.14)",border:"1px solid rgba(201,160,71,.35)",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,color:"#92400e"}}>
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={refreshCloudBackups} style={{marginTop:12,background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,padding:"7px 14px",fontSize:11,fontWeight:700,color:"#475569"}}>
                  Actualizar lista
                </button>
              </div>
            </div>

            {(adminUser.role==="owner"||adminUser.role==="design")&&(
              <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
                <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Reviews · QR access</h4>
                <p style={{fontSize:13,color:"#64748b",marginBottom:14,lineHeight:1.55}}>
                  The public site does not offer a “write review” button. Guests only reach the form via your QR code, which encodes a secret token. Store the same token in Firestore (button below) or set <code style={{fontSize:11}}>VITE_REVIEW_GATE_TOKEN</code> at build time.
                </p>
                <label style={{display:"block",fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Secret token</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"stretch",marginBottom:12}}>
                  <input
                    value={settings?.reviewGateToken ?? ""}
                    onChange={e=>setSettings(s=>({...s,reviewGateToken:e.target.value}))}
                    placeholder="Long random string"
                    autoComplete="off"
                    spellCheck={false}
                    style={{flex:1,minWidth:200,padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:13}}
                  />
                  <button
                    type="button"
                    onClick={()=>{
                      const a=new Uint8Array(18);
                      crypto.getRandomValues(a);
                      const tok=Array.from(a,x=>x.toString(16).padStart(2,"0")).join("");
                      setSettings(s=>({...s,reviewGateToken:tok}));
                      setToast("New token generated — save settings & sync Firestore.");
                    }}
                    style={{background:"#f1f5f9",border:"1px solid #cbd5e1",borderRadius:8,padding:"10px 14px",fontSize:12,fontWeight:700,color:"#334155",whiteSpace:"nowrap"}}
                  >
                    Generate
                  </button>
                </div>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:12,wordBreak:"break-all",color:"#0f172a",lineHeight:1.5}}>
                  {typeof window!=="undefined" ? `${window.location.origin}/dejar-resena?t=${encodeURIComponent(settings?.reviewGateToken || "")}` : ""}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"flex-start",marginBottom:14}}>
                  <div style={{flexShrink:0}}>
                    {reviewQrDataUrl ? (
                      <>
                        <img src={reviewQrDataUrl} alt="" width={200} height={200} style={{display:"block",borderRadius:12,border:"1px solid #e2e8f0",background:"#fff"}} />
                        <button
                          type="button"
                          onClick={()=>{
                            const a = document.createElement("a");
                            a.href = reviewQrDataUrl;
                            a.download = "reviews-qr.svg";
                            a.click();
                            setToast("QR descargado (reviews-qr.svg).");
                          }}
                          style={{marginTop:10,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 14px",fontSize:11,fontWeight:700,color:"#334155",width:"100%"}}
                        >
                          Descargar SVG
                        </button>
                      </>
                    ) : (
                      <div style={{fontSize:12,color:reviewQrLoading?"#64748b":"#94a3b8",padding:18,border:"1px dashed #cbd5e1",borderRadius:12,width:200,minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",lineHeight:1.45}}>
                        {reviewQrLoading ? "Generando QR…" : (String(settings?.reviewGateToken ?? "").trim() ? "No se pudo generar el QR." : "Introduce o genera un token arriba para ver el código QR.")}
                      </div>
                    )}
                  </div>
                  <p style={{fontSize:12,color:"#64748b",margin:0,maxWidth:300,lineHeight:1.55,flex:1}}>
                    Vista previa del mismo enlace que la URL de arriba. Los clientes escanean y abren el formulario de reseña en el móvil; puedes imprimir esta imagen o mandarla por WhatsApp.
                  </p>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <button
                    type="button"
                    className="btn-gold"
                    style={{fontSize:11,padding:"8px 16px"}}
                    onClick={()=>{
                      const u = `${window.location.origin}/dejar-resena?t=${encodeURIComponent(settings?.reviewGateToken || "")}`;
                      navigator.clipboard.writeText(u).then(()=>setToast("URL copied.")).catch(()=>setToast("Copy failed."));
                    }}
                  >
                    Copy review URL
                  </button>
                  {isFirebaseConfigured() && (
                    <button
                      type="button"
                      onClick={async ()=>{
                        try{
                          await adminSaveReviewGateToken(settings?.reviewGateToken);
                          setToast("Gate token saved to Firestore (meta/reviewGate).");
                        }catch{
                          setToast("Firestore write failed — sign in as admin & check rules.");
                        }
                      }}
                      style={{background:"#0f172a",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:11,fontWeight:700}}
                    >
                      Sync token to Firestore
                    </button>
                  )}
                </div>
                <p style={{fontSize:11,color:"#94a3b8",margin:0,lineHeight:1.5}}>
                  PNG QR: <code style={{fontSize:11}}>npm run qr:reviews -- https://tu-dominio.com {settings?.reviewGateToken ? "(token en Settings)" : "TU_TOKEN"}</code>
                </p>
              </div>
            )}
            {adminUser.role==="owner"&&(
              <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
                  <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",letterSpacing:".12em",textTransform:"uppercase"}}>Admin Access</h4>
                  <button
                    onClick={()=>{
                      const next = (adminCreds||[]).map(c=>({
                        ...c,
                        password: String(pwDraft?.[c.email] ?? c.password),
                        role: normalizeAdminCredentialRole(c.role),
                      }));
                      setAdminCreds(next);
                      setToast("Admin passwords saved.");
                    }}
                    className="btn-gold"
                    style={{fontSize:10,padding:"7px 14px"}}
                  >
                    Save password
                  </button>
                </div>
                <div style={{fontSize:11,color:"#4a5568",marginBottom:12}}>
                  Change the admin login password here (saved in this browser).
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
                  {(adminCreds||[]).map(c=>(
                    <div key={c.email} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,marginBottom:8}}>
                        <div style={{fontSize:12,color:"#0f172a",fontWeight:600}}>{c.email}</div>
                        <div style={{fontSize:10,color:"#4a5568",letterSpacing:".08em",textTransform:"uppercase"}}>{c.role}</div>
                      </div>
                      <input
                        type="password"
                        value={String(pwDraft?.[c.email] ?? "")}
                        onChange={e=>setPwDraft(d=>({...d,[c.email]:e.target.value}))}
                        placeholder="New password…"
                        style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Site visuals</h4>
              <p style={{fontSize:13,color:"#64748b",marginBottom:16,lineHeight:1.6}}>
                Rutas bajo <code style={{fontSize:12}}>/</code> de todo lo publicado: <code style={{fontSize:12}}>public/</code> y empaquetado en <code style={{fontSize:12}}>dist/</code> (p. ej. <code style={{fontSize:12}}>/assets/…</code>). Usa <b>Examinar</b> para elegir; el índice se genera con el build o con <code style={{fontSize:12}}>npm run media:index</code> (solo <code>public/</code> en desarrollo sin <code>dist/</code>).
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                <div>
                  <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Fondo de la página (URL)</label>
                  <div style={{display:"flex",gap:8,alignItems:"stretch"}}>
                    <input
                      value={settings?.visual?.siteBackgroundUrl ?? ""}
                      onChange={e=>setSettings(s=>({...s,visual:{...(s?.visual||DEFAULT_ADMIN_SETTINGS.visual),siteBackgroundUrl:e.target.value}}))}
                      placeholder="/imagenes/mi-foto.jpg o URL externa"
                      autoComplete="off"
                      spellCheck={false}
                      style={{flex:1,minWidth:0,background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",color:"#0f172a",fontSize:14,lineHeight:1.5}}
                    />
                    <SiteMediaPickerButton onPick={(u)=>{ setSettings(s=>({...s,visual:{...(s?.visual||DEFAULT_ADMIN_SETTINGS.visual),siteBackgroundUrl:u}})); setToast("Fondo actualizado."); }}>Examinar</SiteMediaPickerButton>
                  </div>
                  <p style={{fontSize:12,color:"#94a3b8",marginTop:8,lineHeight:1.5}}>Si lo dejas vacío, se usa la imagen por defecto del sitio.</p>
                </div>
                <div>
                  <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Foto del panel de reserva (URL)</label>
                  <div style={{display:"flex",gap:8,alignItems:"stretch"}}>
                    <input
                      value={settings?.visual?.bookingHeroUrl ?? ""}
                      onChange={e=>setSettings(s=>({...s,visual:{...(s?.visual||DEFAULT_ADMIN_SETTINGS.visual),bookingHeroUrl:e.target.value}}))}
                      placeholder="/imagenes/reserva.jpg"
                      autoComplete="off"
                      spellCheck={false}
                      style={{flex:1,minWidth:0,background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",color:"#0f172a",fontSize:14,lineHeight:1.5}}
                    />
                    <SiteMediaPickerButton onPick={(u)=>{ setSettings(s=>({...s,visual:{...(s?.visual||DEFAULT_ADMIN_SETTINGS.visual),bookingHeroUrl:u}})); setToast("Foto de reserva actualizada."); }}>Examinar</SiteMediaPickerButton>
                  </div>
                </div>
              </div>
            </div>
            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:16,letterSpacing:".12em",textTransform:"uppercase"}}>Contact & Location</h4>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
                {[
                  ["WhatsApp Number","whatsapp"],
                  ["Email","email"],
                  ["Departure Location","departure"],
                  ["Instagram (usuario, ej. mallorcaislandyacht o URL de perfil)","instagram"],
                ].map(([label,key])=>(
                  <div key={key}>
                    <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#4a5568",marginBottom:6,textTransform:"uppercase"}}>{label}</label>
                    <input
                      value={settings?.contact?.[key] ?? ""}
                      onChange={e=>{ setSettings(s=>({...s,contact:{...(s?.contact||{}),[key]:e.target.value}})); }}
                      onBlur={key==="instagram" ? (e)=>{
                        const v = normalizeInstagramHandle(e.target.value);
                        setSettings(s=>{
                          const cur = String(s?.contact?.instagram ?? "");
                          if(v===cur) return s;
                          return {...s,contact:{...(s?.contact||{}),instagram:v}};
                        });
                      } : undefined}
                      autoComplete="off"
                      spellCheck={false}
                      style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                    />
                  </div>
                ))}
              </div>
              <p style={{marginTop:14,fontSize:12,color:"#64748b",lineHeight:1.55,maxWidth:720}}>
                {isFirebaseConfigured()
                  ? "Con Firebase, el contacto (incluido Instagram) solo llega a la web pública si estás conectado con Firebase Auth: pulsa Guardar aquí o abajo, o espera la sincronización automática (~1 s)."
                  : "Los ajustes se guardan en este navegador al cambiarlos. Usa también Guardar abajo si quieres confirmar."}
              </p>
              <button type="button" onClick={persistSettingsToCloud} className="btn-gold" style={{marginTop:12,fontSize:11,padding:"8px 20px"}}>
                Guardar contacto en la nube
              </button>
            </div>

            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:16,letterSpacing:".12em",textTransform:"uppercase"}}>Payment</h4>
              <div style={{fontSize:12,color:"#334155",lineHeight:1.65,marginBottom:16,padding:"12px 14px",background:"#f1f5f9",borderRadius:10,border:"1px solid #e2e8f0"}}>
                <b>Stripe Checkout (card)</b> is handled by the serverless API on Vercel (not by a static payment link). Set{" "}
                <code style={{fontSize:11}}>STRIPE_SECRET_KEY</code>, <code style={{fontSize:11}}>STRIPE_WEBHOOK_SECRET</code>,{" "}
                <code style={{fontSize:11}}>FIREBASE_SERVICE_ACCOUNT_JSON</code>, <code style={{fontSize:11}}>SITE_URL</code>, and optional{" "}
                <code style={{fontSize:11}}>CRON_SECRET</code> in the Vercel project. Webhook path:{" "}
                <code style={{fontSize:11}}>/api/stripe-webhook</code>.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
                {[
                  ["Bizum number","bizum"],
                  ["IBAN (bank transfer)","iban"],
                  ["Beneficiary","beneficiary"],
                ].map(([label,key])=>(
                  <div key={key}>
                    <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#4a5568",marginBottom:6,textTransform:"uppercase"}}>{label}</label>
                    <input
                      value={settings?.payment?.[key] ?? ""}
                      onChange={e=>{ setSettings(s=>({...s,payment:{...(s?.payment||{}),[key]:e.target.value}})); }}
                      style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                    />
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,fontSize:11,color:"#4a5568",lineHeight:1.6}}>
                Bizum and bank bookings stay <b>pending</b> until you confirm them in Admin. Card payments via Stripe are marked <b>paid</b> automatically when the webhook runs.
              </div>
            </div>

            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Charter pricing</h4>
              <p style={{fontSize:12,color:"#64748b",lineHeight:1.65,margin:0,maxWidth:640}}>
                Los precios del charter (medio día, día completo, sunset y patrón) <b>solo se editan en la pestaña Agenda</b>: tarjetas de temporada baja, media y alta. Ahí se guardan en este navegador y son los que usa la web y el flujo de reserva.
              </p>
            </div>

            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:16,letterSpacing:".12em",textTransform:"uppercase"}}>Offer</h4>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
                <div>
                  <label htmlFor="offer-discount-pct" style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#4a5568",marginBottom:6,textTransform:"uppercase"}}>Discount %</label>
                  <input
                    id="offer-discount-pct"
                    type="number"
                    key={`offer-discount-${Number(settings?.offer?.discount ?? 0)}`}
                    defaultValue={settings?.offer?.discount ?? 0}
                    min={0}
                    max={100}
                    step={1}
                    onBlur={(e)=>{
                      const v = parseFloat(e.target.value);
                      const n = Number.isFinite(v) ? v : 0;
                      setSettings(s=>({...s,offer:{...(s?.offer||{}),discount:n}}));
                    }}
                    style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                  />
                </div>
                <div style={{gridColumn:"1 / -1"}}>
                  <label style={{display:"block",fontSize:10,letterSpacing:".1em",color:"#4a5568",marginBottom:6,textTransform:"uppercase"}}>Offer Banner Text (default)</label>
                  <input
                    value={settings?.offer?.banner ?? ""}
                    onChange={e=>{ setSettings(s=>({...s,offer:{...(s?.offer||{}),banner:e.target.value}})); }}
                    style={{width:"100%",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 12px",color:"#0f172a",fontSize:13}}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={persistSettingsToCloud}
                className="btn-gold"
                style={{marginTop:16,fontSize:11,padding:"8px 20px"}}
              >Save</button>
            </div>

            <div className="card" style={{padding:24,borderRadius:14,marginBottom:16}}>
              <h4 style={{fontSize:12,fontWeight:700,color:"#C9A047",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Códigos de descuento en reserva</h4>
              <p style={{fontSize:12,color:"#64748b",lineHeight:1.65,margin:"0 0 16px",maxWidth:720}}>
                Los clientes introducen el código en el paso <b>Tus datos</b>. <b>Un solo uso</b>: −{VIP_CHARTER_DISCOUNT_PCT}% fijo, se consume al reservar. <b>Varios usos</b>: eliges el % ({DISCOUNT_PCT_OPTIONS.join(", ")}) y usos máximos ({DISCOUNT_MAX_USES_OPTIONS.join(", ")}).
              </p>
              <p style={{fontSize:12,color:"#0f172a",fontWeight:700,margin:"0 0 12px",maxWidth:720,background:"rgba(201,160,71,.12)",borderRadius:10,padding:"10px 12px",lineHeight:1.5}}>
                Escribe el código y pulsa el botón dorado <b>Guardar código</b> de cada bloque. Ese botón es el único que crea el descuento en la nube; no sirve el «Guardar» de Contacto ni el de Offer de arriba.
              </p>
              {isFirebaseConfigured() ? (
                !firebaseAuthUser ? (
                  <p style={{fontSize:12,color:"#b45309",fontWeight:700}}>Inicia sesión con Firebase (barra superior) para crear o borrar códigos.</p>
                ) : (
                  <>
                    <p style={{fontSize:11,fontWeight:800,color:"#0f172a",letterSpacing:".08em",textTransform:"uppercase",margin:"0 0 8px"}}>Un solo uso (−{VIP_CHARTER_DISCOUNT_PCT}%)</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20,alignItems:"stretch"}}>
                      <input
                        value={discountCodeDraft}
                        onChange={(e)=>setDiscountCodeDraft(e.target.value.toUpperCase())}
                        onKeyDown={(e)=>{
                          if(e.key!=="Enter" || discountCodeBusy) return;
                          e.preventDefault();
                          vipCodeSaveBtnRef.current?.click();
                        }}
                        placeholder="Ej. AMIGOS26"
                        autoComplete="off"
                        spellCheck={false}
                        style={{flex:"1 1 200px",minWidth:0,background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",fontSize:14,fontWeight:700,letterSpacing:".06em"}}
                      />
                      <button
                        ref={vipCodeSaveBtnRef}
                        type="button"
                        disabled={discountCodeBusy}
                        onClick={async ()=>{
                          const c = normalizeVipDiscountCode(discountCodeDraft);
                          if(c.length < 4){ setToast("Código inválido (mín. 4 caracteres A–Z / 0–9)."); return; }
                          setDiscountCodeBusy(true);
                          try{
                            await createDiscountCodeFirestore(c);
                            setDiscountCodeDraft("");
                            setToast("Código guardado en Firestore.");
                          }catch(e){
                            const fc = typeof e?.code==="string" ? e.code : "";
                            const hint = fc==="permission-denied"
                              ? "Permiso denegado en discountCodes. Consola: await __miyLogDiscountCodesAuth(). Despliega: npm run firebase:deploy-rules (prueba: :open). Luego npm run firebase:set-owner-claim y vuelve a entrar."
                              : (e?.message || String(e));
                            console.error("[MIY] Admin Guardar código (un uso) failed", e?.discountCodesDebug || e);
                            setToast(`Error: ${hint}`);
                          }finally{
                            setDiscountCodeBusy(false);
                          }
                        }}
                        className="btn-gold"
                        style={{fontSize:12,padding:"10px 18px",whiteSpace:"nowrap"}}
                      >Guardar código</button>
                      <button
                        type="button"
                        disabled={discountCodeBusy}
                        onClick={()=>setDiscountCodeDraft(generateRandomVipCode(8))}
                        className="btn-outline"
                        style={{fontSize:12,padding:"10px 18px",whiteSpace:"nowrap"}}
                      >Generar aleatorio</button>
                    </div>
                    <p style={{fontSize:11,fontWeight:800,color:"#0f172a",letterSpacing:".08em",textTransform:"uppercase",margin:"0 0 8px"}}>Varios usos (elige % y límite)</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,alignItems:"stretch"}}>
                      <input
                        value={multiDiscountCodeDraft}
                        onChange={(e)=>setMultiDiscountCodeDraft(e.target.value.toUpperCase())}
                        onKeyDown={(e)=>{
                          if(e.key!=="Enter" || discountCodeBusy) return;
                          e.preventDefault();
                          multiCodeSaveBtnRef.current?.click();
                        }}
                        placeholder="Ej. MAYO30"
                        autoComplete="off"
                        spellCheck={false}
                        style={{flex:"1 1 160px",minWidth:0,background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",fontSize:14,fontWeight:700,letterSpacing:".06em"}}
                      />
                      <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".08em"}}>Descuento<select value={multiDiscountPct} onChange={(e)=>setMultiDiscountPct(Number(e.target.value))} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",fontSize:13,fontWeight:700,minWidth:88}}>{DISCOUNT_PCT_OPTIONS.map((n)=><option key={n} value={n}>{n}%</option>)}</select></label>
                      <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".08em"}}>Usos máx.<select value={multiDiscountMaxUses} onChange={(e)=>setMultiDiscountMaxUses(Number(e.target.value))} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",fontSize:13,fontWeight:700,minWidth:88}}>{DISCOUNT_MAX_USES_OPTIONS.map((n)=><option key={n} value={n}>{n}</option>)}</select></label>
                      <button
                        ref={multiCodeSaveBtnRef}
                        type="button"
                        disabled={discountCodeBusy}
                        onClick={async ()=>{
                          const c = normalizeVipDiscountCode(multiDiscountCodeDraft);
                          if(c.length < 4){ setToast("Código inválido (mín. 4 caracteres A–Z / 0–9)."); return; }
                          setDiscountCodeBusy(true);
                          try{
                            await createMultiUseDiscountCodeFirestore(c, multiDiscountPct, multiDiscountMaxUses);
                            setMultiDiscountCodeDraft("");
                            setToast(`Código ${c} guardado: −${multiDiscountPct}%, máx. ${multiDiscountMaxUses} usos.`);
                          }catch(e){
                            const fc = typeof e?.code==="string" ? e.code : "";
                            const hint = fc==="permission-denied"
                              ? "Permiso denegado en discountCodes. Consola: await __miyLogDiscountCodesAuth(). npm run firebase:deploy-rules:open para probar."
                              : (e?.message === "invalid_pct" ? "Porcentaje no válido."
                              : e?.message === "invalid_max_uses" ? "Usos máximos no válidos."
                              : (e?.message || String(e)));
                            console.error("[MIY] Admin Guardar código (varios usos) failed", e?.discountCodesDebug || e);
                            setToast(`Error: ${hint}`);
                          }finally{
                            setDiscountCodeBusy(false);
                          }
                        }}
                        className="btn-gold"
                        style={{fontSize:12,padding:"10px 18px",whiteSpace:"nowrap",alignSelf:"flex-end"}}
                      >Guardar código</button>
                      <button type="button" disabled={discountCodeBusy} onClick={()=>setMultiDiscountCodeDraft(generateRandomVipCode(8))} className="btn-outline" style={{fontSize:12,padding:"10px 18px",whiteSpace:"nowrap",alignSelf:"flex-end"}}>Generar aleatorio</button>
                    </div>
                    <div className="admin-table-scroll-outer" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead style={{background:"#f1f5f9"}}>
                          <tr>
                            <th style={{textAlign:"left",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Código</th>
                            <th style={{textAlign:"left",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Tipo</th>
                            <th style={{textAlign:"left",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Descuento</th>
                            <th style={{textAlign:"left",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Usos</th>
                            <th style={{textAlign:"left",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Estado</th>
                            <th style={{textAlign:"right",padding:"10px 14px",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#64748b"}}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discountCodeRows.length === 0 ? (
                            <tr><td colSpan={6} style={{padding:"16px 14px",fontSize:13,color:"#64748b"}}>No hay códigos. Crea uno arriba.</td></tr>
                          ) : (
                            discountCodeRows.map((row)=>(
                              <tr key={row.id}>
                                <td style={{padding:"10px 14px",fontSize:14,fontWeight:800,color:"#0f172a",letterSpacing:".08em"}}>{row.id}</td>
                                <td style={{padding:"10px 14px",fontSize:11,color:"#475569",fontWeight:700}}>{row.kind === "multi" ? "Varios usos" : "Un uso"}</td>
                                <td style={{padding:"10px 14px",fontSize:12,color:"#0f172a",fontWeight:700}}>−{row.pct}%</td>
                                <td style={{padding:"10px 14px",fontSize:12,color:"#475569",fontWeight:600}}>{row.kind === "multi" ? `${row.useCount} / ${row.maxUses}` : "1"}</td>
                                <td style={{padding:"10px 14px",fontSize:12,color:row.active ? "#15803d" : "#64748b",fontWeight:700}}>
                                  {row.active ? "Activo" : row.kind === "multi" ? "Agotado" : `Usado${row.usedByBookingId ? ` · ${row.usedByBookingId}` : ""}`}
                                </td>
                                <td style={{padding:"10px 14px",textAlign:"right"}}>
                                  <button
                                    type="button"
                                    disabled={discountCodeBusy}
                                    onClick={async ()=>{
                                      if(!window.confirm(`¿Eliminar el código ${row.id}?`)) return;
                                      setDiscountCodeBusy(true);
                                      try{
                                        await deleteDiscountCodeFirestore(row.id);
                                        setToast("Código eliminado.");
                                      }catch(e){
                                        setToast(`Error: ${e?.message || String(e)}`);
                                      }finally{
                                        setDiscountCodeBusy(false);
                                      }
                                    }}
                                    style={{background:"none",border:"1px solid rgba(239,68,68,.35)",color:"#b91c1c",fontSize:11,padding:"6px 12px",borderRadius:8,fontWeight:700}}
                                  >Eliminar</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : (
                <>
                  <p style={{fontSize:12,color:"#64748b",marginBottom:12}}>Sin Firebase, los códigos se guardan solo en este navegador; cada uno solo puede usarse <b>una vez</b> en este mismo navegador (lista de usados en localStorage).</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                    <input
                      value={offlineVipDraft}
                      onChange={(e)=>setOfflineVipDraft(e.target.value.toUpperCase())}
                      placeholder="Código"
                      style={{flex:"1 1 180px",minWidth:0,background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 12px",fontSize:14,fontWeight:700}}
                    />
                    <button
                      type="button"
                      onClick={()=>{
                        const c = normalizeVipDiscountCode(offlineVipDraft);
                        if(c.length < 4){ setToast("Código inválido (mín. 4 caracteres)."); return; }
                        setSettings((s)=>{
                          const cur = Array.isArray(s?.offer?.vipCodes) ? s.offer.vipCodes : [];
                          const next = [...new Set([...cur.map((x)=>normalizeVipDiscountCode(x)).filter(Boolean), c])];
                          return {...s, offer: {...(s?.offer||DEFAULT_ADMIN_SETTINGS.offer), vipCodes: next}};
                        });
                        setOfflineVipDraft("");
                        setToast("Código guardado en ajustes locales.");
                      }}
                      className="btn-gold"
                      style={{fontSize:12,padding:"10px 18px"}}
                    >Añadir local</button>
                  </div>
                  <ul style={{margin:0,paddingLeft:18,fontSize:13,color:"#334155"}}>
                    {(settings?.offer?.vipCodes || []).map((c)=>(
                      <li key={c} style={{marginBottom:6}}>
                        <span style={{fontWeight:800,letterSpacing:".06em"}}>{c}</span>
                        {" "}
                        <button
                          type="button"
                          onClick={()=>{
                            setSettings((s)=>{
                              const cur = Array.isArray(s?.offer?.vipCodes) ? s.offer.vipCodes : [];
                              const next = cur.map((x)=>normalizeVipDiscountCode(x)).filter((x)=>x && x !== normalizeVipDiscountCode(c));
                              return {...s, offer: {...(s?.offer||DEFAULT_ADMIN_SETTINGS.offer), vipCodes: next}};
                            });
                            setToast("Código quitado.");
                          }}
                          style={{background:"none",border:"none",color:"#b91c1c",fontSize:12,fontWeight:700,cursor:"pointer",textDecoration:"underline"}}
                        >Quitar</button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </AdminScrollPanel>
        )}
      </div>
    </div>
  );
};

/** Aviso Firestore: mensaje corto por defecto (bloques largos activan Vista lector en Safari). */
function FirestorePublicAlert() {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <div
      className="site-firestore-alert"
      aria-live="off"
      style={{
        flexShrink: 0,
        background: "rgba(127,29,29,.94)",
        color: "#fef2f2",
        padding: "12px max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left))",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.5,
        textAlign: "center",
        borderBottom: "1px solid rgba(0,0,0,.2)",
      }}
    >
      <SiteText style={{ marginBottom: 10 }}>Datos en vivo no disponibles (barcos o calendario).</SiteText>
      <button
        type="button"
        onClick={() => setDetailOpen((o) => !o)}
        style={{
          background: "rgba(255,255,255,.14)",
          border: "1px solid rgba(255,255,255,.35)",
          color: "#fff",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        {detailOpen ? "Ocultar detalles" : "Detalles técnicos"}
      </button>
      {detailOpen ? (
        <div style={{ marginTop: 12, textAlign: "left", maxWidth: 640, marginInline: "auto" }}>
          <SiteText style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Firestore: <code>permission-denied</code> — reglas de <code>sitePublic</code> y <code>blockedSlots</code>.
          </SiteText>
          <SiteText style={{ fontSize: 12, fontWeight: 600 }}>
            <code style={{ wordBreak: "break-all" }}>firebase deploy --only firestore:rules</code>
          </SiteText>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BLOG / SEO GUIDES
// ═══════════════════════════════════════════════════════════════════════
function BlogArticleShell({
  articlePath,
  appShellStyle,
  lang,
  setLang,
  t,
  contactLinks,
  settings,
  onBook,
  navbarElevated,
  bookingBoatResolved,
  closeBooking,
  handleBooked,
  bookedInfo,
  bookingHeroResolved,
  publicLiveReadStatus,
  blockedSlotsReadStatus,
  homeTo,
  navigate,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [articlePath]);

  return (
    <div className="app-shell site-public" style={appShellStyle}>
      <SeoManager lang={lang} contact={contactLinks?.contact} />
      {isFirebaseConfigured() && (!publicLiveReadStatus.ok || !blockedSlotsReadStatus.ok) && (
        <FirestorePublicAlert />
      )}
      <Navbar lang={lang} setLang={setLang} t={t} onBook={onBook} elevated={navbarElevated} homeTo={homeTo} navigate={navigate} />
      <BlogArticlePage articlePath={articlePath} lang={lang} onBook={onBook} guidesHomeTo={homeTo} />
      <Footer t={t} settings={settings} contactLinks={contactLinks} lang={lang} />
      <FloatingBookingAccess
        t={t}
        contactLinks={contactLinks}
        onBook={onBook}
        hidden={!!bookingBoatResolved}
      />
      {bookingBoatResolved && (
        <BookingModal
          boat={bookingBoatResolved}
          bk={t.bk}
          lang={lang}
          onClose={closeBooking}
          onBooked={handleBooked}
          settings={settings}
          bookedDays={bookedInfo.days}
          partialDays={bookedInfo.partialDays}
          bookedKeys={Array.from(bookedInfo.keys)}
          bookingHeroSrc={bookingHeroResolved}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const reservePaths = new Set(["/reserve","/book","/reserva"]);

  const [lang, setLangState] = useState(()=>{
    if(typeof window==="undefined") return "es";
    return parseLocalePath(window.location.pathname).lang;
  });
  useEffect(()=>{
    const { lang: pathLang } = parseLocalePath(location.pathname);
    setLangState(pathLang);
  }, [location.pathname]);
  useEffect(()=>{
    try{ window.localStorage.setItem(LS_LANG_KEY, lang); }catch{}
  }, [lang]);
  const setLang = useCallback((nextLang)=>{
    if(!LANG_NAMES[nextLang]) return;
    const { basePath } = parseLocalePath(location.pathname);
    navigate(buildLocalizedPath(basePath, nextLang));
  }, [location.pathname, navigate]);
  const localizedHome = useMemo(()=>localizeHref("/", lang), [lang]);
  const [bookingBoat, setBookingBoat] = useState(null);
  const [navbarElevated, setNavbarElevated] = useState(()=>{
    if(typeof window==="undefined") return false;
    if(window.matchMedia("(hover: none)").matches) return true;
    return window.scrollY > 80;
  });
  const _initialSite = useMemo(()=>getInitialSyncedSiteState(), []);
  const [boats, setBoats] = useState(()=>_initialSite.boats);
  /** Solo el array JSON `boats` en `sitePublic/live` (getDocFromServer / snapshot raw). La web pública usa esto con Firebase — sin localStorage ni barcos “solo admin”. */
  const [publicLiveBoats, setPublicLiveBoats] = useState(()=>{
    const boot = readPublicSiteBootCache();
    return boot?.boats?.length ? boot.boats : [];
  });
  const [publicLiveReadStatus, setPublicLiveReadStatus] = useState({ ok: true });
  /** Listener `blockedSlots` (calendario público). Si falla con permission-denied, las reglas en consola no coinciden con firestore.rules del repo. */
  const [blockedSlotsReadStatus, setBlockedSlotsReadStatus] = useState({ ok: true, message: "", code: "" });
  const [bookings, setBookings] = useState(()=>_initialSite.bookings);
  const [users, setUsers] = useState(()=>_initialSite.users);
  const [settings, setSettings] = useState(()=>_initialSite.settings);
  const [adminCreds, setAdminCreds] = useState(()=>readSavedAdminCreds() || ADMIN_CREDS);
  /** Migra credenciales antiguas con rol `viewer` guardadas en localStorage (común en móvil con caché). */
  useEffect(()=>{
    setAdminCreds((creds)=>{
      if(!Array.isArray(creds) || !creds.length) return creds;
      let changed = false;
      const next = creds.map((c)=>{
        const role = normalizeAdminCredentialRole(c?.role);
        if(role !== c?.role) changed = true;
        return role === c?.role ? c : {...c, role};
      });
      return changed ? next : creds;
    });
  },[]);
  const [blockedDates, setBlockedDates] = useState(()=>_initialSite.blockedDates);
  const [translationOverrides, setTranslationOverrides] = useState(()=>
    stripDeprecatedMooringFromOverrides(_initialSite.translationOverrides || {}).overrides,
  );
  const [firestoreBlockedKeys, setFirestoreBlockedKeys] = useState([]);

  const [firebaseAuthUser, setFirebaseAuthUser] = useState(null);
  const [liveSiteHydrated, setLiveSiteHydrated] = useState(()=>{
    if(!isFirebaseConfigured()) return true;
    const boot = readPublicSiteBootCache();
    return !!(boot?.boats?.length || boot?.settings);
  });
  /** Admin puede guardar tras hidratar Firestore (sin auto-push en bucle). */
  const [cloudPushGateOpen, setCloudPushGateOpen] = useState(()=>!isFirebaseConfigured());
  const [cloudPushStatus, setCloudPushStatus] = useState({ ok: true, message: "" });
  const ignoreIncomingSnapshotsUntil = useRef(0);
  const applyingRemoteSiteRef = useRef(false);
  const flushDebounceTimerRef = useRef(null);
  const flushPendingPartialRef = useRef(null);
  const flushInFlightRef = useRef(false);
  const lastVisibilityResyncAtRef = useRef(0);
  const SITE_FLUSH_DEBOUNCE_MS = 2000;
  const siteSnapshotRef = useRef({
    boats: [],
    bookings: [],
    blockedDates: [],
    settings: DEFAULT_ADMIN_SETTINGS,
    translationOverrides: {},
    users: [],
  });

  siteSnapshotRef.current = {
    boats,
    bookings,
    blockedDates,
    settings,
    translationOverrides,
    users,
  };

  const lastPublicPayloadSig = useRef("");
  const applyPublicPayloadIfNew = useCallback((data)=>{
    if(!data || typeof data !== "object") return;
    const u = data.updatedAt;
    let updatedSig = null;
    if(u && typeof u==="object" && typeof u.seconds==="number"){
      updatedSig = u.seconds * 1e9 + (Number(u.nanoseconds) || 0);
    } else if(typeof u==="string" || typeof u==="number") updatedSig = u;
    let sig;
    const norm = normalizeSitePublicDocForClient(data);
    try{
      sig = JSON.stringify({
        _rev: updatedSig,
        boats: norm?.boats,
        blockedDates: norm?.blockedDates,
        settings: norm?.settings,
        translationOverrides: norm?.translationOverrides,
      });
    }catch{
      sig = null;
    }
    if(sig && sig === lastPublicPayloadSig.current) return;
    if(sig) lastPublicPayloadSig.current = sig;
    applyingRemoteSiteRef.current = true;
    try{
      applySitePublicDocToReactState(norm, {
        setBoats,
        setBlockedDates,
        setSettings,
        setTranslationOverrides,
      });
      const snap = siteSnapshotRef.current;
      noteRemoteLiveSiteFingerprint({
        ...norm,
        bookings: snap.bookings,
        users: snap.users,
      });
      writePublicSiteBootCache(norm);
    } finally {
      applyingRemoteSiteRef.current = false;
    }
  }, []);

  const runFlushLiveSiteToCloud = useCallback(async (partial = {}, opts = {})=>{
    if(!isFirebaseConfigured()){
      return { ok: true, skipped: true };
    }
    if(applyingRemoteSiteRef.current && !opts.force){
      return { ok: true, skipped: true, reason: "applying_remote" };
    }
    const auth = getFirebaseAuth();
    if(!auth?.currentUser){
      return { ok: false, reason: "not_authenticated" };
    }
    if(flushInFlightRef.current){
      flushPendingPartialRef.current = { ...(flushPendingPartialRef.current || {}), ...partial };
      return { ok: true, skipped: true, reason: "flush_in_flight" };
    }
    const base = siteSnapshotRef.current;
    const merged = {
      boats: partial.boats !== undefined ? partial.boats : base.boats,
      bookings: partial.bookings !== undefined ? partial.bookings : base.bookings,
      blockedDates: partial.blockedDates !== undefined ? partial.blockedDates : base.blockedDates,
      settings: partial.settings !== undefined ? partial.settings : base.settings,
      translationOverrides: partial.translationOverrides !== undefined ? partial.translationOverrides : base.translationOverrides,
      users: partial.users !== undefined ? partial.users : base.users,
    };
    const settingsForCloud = normalizeSettingsFromObject(merged.settings) || merged.settings;
    const writePayload = {
      boats: merged.boats,
      bookings: merged.bookings,
      blockedDates: mergeBlockedDatesForPublicSync(merged.blockedDates, merged.bookings),
      settings: settingsForCloud,
      translationOverrides: merged.translationOverrides,
      users: merged.users,
    };
    flushInFlightRef.current = true;
    try{
      ignoreIncomingSnapshotsUntil.current = Date.now() + 2500;
      const pushResult = await pushLiveSiteSnapshot(writePayload, { force: !!opts.force });
      if(pushResult?.skipped){
        return { ok: true, skipped: true, reason: "unchanged_remote" };
      }
      const gateTok = String(settingsForCloud?.reviewGateToken ?? "").trim();
      if (gateTok) {
        try {
          await adminSaveReviewGateToken(gateTok);
        } catch (e) {
          console.warn("[reviews] Sync meta/reviewGate after site save failed:", e?.message || e);
        }
      }
      siteSnapshotRef.current = { ...merged, settings: settingsForCloud };
      setCloudPushStatus({ ok: true, message: "" });
      setCloudPushGateOpen(true);
      setPublicLiveBoats(filterBoatsForPublicLiveDoc(Array.isArray(merged.boats) ? merged.boats : []));
      console.log("[MIY] Admin guardado en Firestore (sitePublic/live + siteAdmin/live)", {
        boats: Array.isArray(merged.boats) ? merged.boats.length : 0,
        blockedDates: Array.isArray(writePayload.blockedDates) ? writePayload.blockedDates.length : 0,
      });
      return { ok: true, skipped: false };
    }catch(e){
      const msg = e?.message || String(e);
      const code = typeof e?.code === "string" ? e.code : "";
      console.error("[MIY] Error al guardar en Firestore:", code ? { code, message: msg } : msg);
      setCloudPushStatus({ ok: false, message: msg });
      return { ok: false, reason: msg, code };
    } finally {
      flushInFlightRef.current = false;
      const pending = flushPendingPartialRef.current;
      if(pending && Object.keys(pending).length > 0){
        flushPendingPartialRef.current = null;
        queueMicrotask(()=>{ void runFlushLiveSiteToCloud(pending, opts); });
      }
    }
  }, []);

  const flushLiveSiteToCloud = useCallback((partial = {}, opts = {})=>{
    if(opts.immediate || opts.force){
      if(flushDebounceTimerRef.current){
        clearTimeout(flushDebounceTimerRef.current);
        flushDebounceTimerRef.current = null;
      }
      const mergedPartial = { ...(flushPendingPartialRef.current || {}), ...partial };
      flushPendingPartialRef.current = null;
      return runFlushLiveSiteToCloud(mergedPartial, opts);
    }
    flushPendingPartialRef.current = { ...(flushPendingPartialRef.current || {}), ...partial };
    if(flushDebounceTimerRef.current) clearTimeout(flushDebounceTimerRef.current);
    return new Promise((resolve)=>{
      flushDebounceTimerRef.current = setTimeout(()=>{
        flushDebounceTimerRef.current = null;
        const p = flushPendingPartialRef.current || {};
        flushPendingPartialRef.current = null;
        void runFlushLiveSiteToCloud(p, opts).then(resolve);
      }, SITE_FLUSH_DEBOUNCE_MS);
    });
  }, [runFlushLiveSiteToCloud]);

  /** TEMP: publica solo `sitePublic/live.boats` (merge) y verifica con getDocFromServer. */
  const handleManualPublishFleet = useCallback(async ()=>{
    if(!isFirebaseConfigured()){
      return { ok: false, reason: "no_firebase" };
    }
    const auth = getFirebaseAuth();
    if(!auth?.currentUser){
      return { ok: false, reason: "not_authenticated" };
    }
    const list = Array.isArray(boats) ? boats : [];
    const { boats: readBoats } = await mergePublishBoatsToSitePublicLive(list);
    console.log("PUBLIC_AFTER_MANUAL_PUBLISH");
    console.log(readBoats?.length ?? 0);
    console.log(readBoats);
    setPublicLiveBoats(Array.isArray(readBoats) ? readBoats : []);
    const raw = await getLiveSitePublicRawOnce(true);
    if(raw) applyPublicPayloadIfNew(raw);
    return { ok: true };
  }, [boats, applyPublicPayloadIfNew]);

  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    const failSafe = window.setTimeout(()=> setCloudPushGateOpen(true), 15000);
    return ()=> window.clearTimeout(failSafe);
  }, []);

  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    const path = (location.pathname.replace(/\/+$/,"") || "/");
    if(path !== "/admin") return;
    let cancelled = false;
    let unsub = () => {};
    void import("firebase/auth").then(({ onAuthStateChanged })=>{
      if(cancelled) return;
      const auth = getFirebaseAuth();
      if(!auth){
        console.warn("[MIY] onAuthStateChanged: getFirebaseAuth() null (sin config o init fallida).");
        return;
      }
      console.log("[MIY] onAuthStateChanged: registering listener.");
      unsub = onAuthStateChanged(auth, (u)=>{
        console.log("[MIY] onAuthStateChanged:", u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null);
        setFirebaseAuthUser(u);
        if(u) setCloudPushStatus({ ok: true, message: "" });
      });
    });
    return ()=>{
      cancelled = true;
      unsub();
    };
  }, [location.pathname]);

  useEffect(()=>{
    const fb = getFirebaseRuntimeSummary();
    if(fb.configured){
      console.log("[MIY] Site data source: Firestore only (localStorage boats/settings ignored). Project:", fb.projectId);
    } else {
      console.warn("[MIY] Site data source: localStorage — VITE_FIREBASE_* not set in this JS bundle (rebuild Netlify with env).");
    }
  },[]);

  /** Firestore cache read (no extra network) so fleet/settings paint before the live listener connects. */
  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    let cancelled = false;
    void getLiveSitePublicOnce(false).then((data)=>{
      if(cancelled || !data) return;
      const docBoats = extractSitePublicLiveDocBoatsArray(data);
      if(docBoats.length) setPublicLiveBoats(docBoats);
      applyPublicPayloadIfNew(data);
    });
    return ()=>{ cancelled = true; };
  }, [applyPublicPayloadIfNew]);

  /** Definitive public diagnostics (dev only — avoids duplicate getDoc on every visit). */
  useEffect(()=>{
    if(!import.meta.env.DEV || !isFirebaseConfigured()) return;
    try{
      const firebaseConfig = getFirebaseConfigForPublicDebug();
      if(firebaseConfig){
        console.log("PUBLIC_FIREBASE_CONFIG", {
          apiKey: firebaseConfig.apiKey,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
        });
      } else {
        console.log("PUBLIC_FIREBASE_CONFIG", null);
      }
    }catch(e){
      console.warn("PUBLIC_FIREBASE_CONFIG error", e?.message || e);
    }
    try{
      console.log("WINDOW_HOST", window.location.hostname);
    }catch{}
    void (async ()=>{
      try{
        const db = getFirestoreDb();
        if(!db){
          console.log("RAW_SITEPUBLIC_LIVE", false, null);
          return;
        }
        const snap = await getDoc(doc(db, "sitePublic", "live"));
        console.log("RAW_SITEPUBLIC_LIVE", snap.exists(), snap.exists() ? snap.data() : null);
      }catch(e){
        console.warn("RAW_SITEPUBLIC_LIVE error", e?.message || e);
      }
    })();
  },[]);

  /** Tras cerrar sesión Firebase, releer `sitePublic/live` como anónimo (evita quedar con flota vacía por lecturas fallidas durante la transición). */
  const prevFirebaseAuthUidRef = useRef(null);
  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    const uid = firebaseAuthUser?.uid ?? null;
    const prevUid = prevFirebaseAuthUidRef.current;
    prevFirebaseAuthUidRef.current = uid;
    if(prevUid === null || uid !== null) return;
    let cancelled = false;
    lastPublicPayloadSig.current = "";
    void getLiveSitePublicRawOnce(true).then((raw)=>{
      if(cancelled || raw == null) return;
      setPublicLiveBoats(extractSitePublicLiveDocBoatsArray(raw));
      applyPublicPayloadIfNew(raw);
    });
    return ()=>{ cancelled = true; };
  }, [firebaseAuthUser, applyPublicPayloadIfNew]);

  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    const unsub = subscribeLiveSitePublic((data, meta)=>{
      const ignoreEcho = Date.now() < ignoreIncomingSnapshotsUntil.current;
      const docBoatsOnly = extractSitePublicLiveDocBoatsArray(meta?.rawData);
      if(!ignoreEcho){
        setPublicLiveBoats(docBoatsOnly);
      }
      setPublicLiveReadStatus({
        ok: true,
        message: "",
        code: "",
        at: Date.now(),
        boats: docBoatsOnly.length,
      });
      if(!ignoreEcho && data){
        applyPublicPayloadIfNew(data);
      } else if(!ignoreEcho && !data){
        console.log("[MIY] sitePublic/live vacío — publica desde admin para poblar la web.");
      }
      setCloudPushGateOpen(true);
      setLiveSiteHydrated(true);
    }, (err)=>{
      const msg = err?.message || String(err);
      const code = typeof err?.code === "string" ? err.code : "";
      console.warn("[site-sync] public snapshot error (not loading from Firestore):", code ? { code, msg } : msg);
      if(code === "permission-denied"){
        console.error(
          "[site-sync] permission-denied en sitePublic/live: las reglas en Firebase Console deben permitir lectura anónima. " +
            "Desde la carpeta del proyecto ejecuta: firebase deploy --only firestore:rules (ver firestore.rules).",
        );
      }
      setPublicLiveReadStatus({
        ok: false,
        message: msg,
        code,
        at: Date.now(),
        boats: 0,
      });
      setLiveSiteHydrated(true);
      window.setTimeout(()=> setCloudPushGateOpen(true), 2800);
    });
    return unsub;
    /** Nueva suscripción al cambiar sesión Firebase: el listener anterior puede tener huella === doc actual y no volver a llamar onData tras vaciar estado (p. ej. logout). */
  }, [firebaseAuthUser]);

  useEffect(()=>{
    if(!isFirebaseConfigured()) return;
    const unsub = subscribeFirestoreBlockedSlots((keys)=>{
      setFirestoreBlockedKeys(Array.isArray(keys) ? keys : []);
      setBlockedSlotsReadStatus({ ok: true, message: "", code: "" });
    }, (err)=>{
      const msg = err?.message || String(err);
      const code = typeof err?.code === "string" ? err.code : "";
      console.warn("[bookings-fs] blockedSlots", code || "", msg);
      if(code === "permission-denied"){
        console.error(
          "[bookings-fs] permission-denied en blockedSlots: el calendario público necesita allow read para anónimos. " +
            "firebase deploy --only firestore:rules (firestore.rules → match /blockedSlots/... allow read: if true).",
        );
      }
      setBlockedSlotsReadStatus({ ok: false, message: msg, code });
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!isFirebaseConfigured() || !firebaseAuthUser) return;
    const unsub = subscribeFirestoreBookings((rows)=>{
      setBookings(Array.isArray(rows) ? rows : []);
    }, (err)=>{
      console.warn("[bookings-fs] bookings", err?.message || err);
    });
    return unsub;
  }, [firebaseAuthUser]);

  useEffect(()=>{
    if(!isFirebaseConfigured() || !firebaseAuthUser) return;
    const unsub = subscribeLiveSiteAdmin((data)=>{
      if(Date.now() < ignoreIncomingSnapshotsUntil.current) return;
      if(!data) return;
      if(Array.isArray(data.users)) setUsers(data.users.map(mapUserRowStripViewer));
      const snap = siteSnapshotRef.current;
      noteRemoteLiveSiteFingerprint({
        boats: snap.boats,
        blockedDates: snap.blockedDates,
        settings: snap.settings,
        translationOverrides: snap.translationOverrides,
        bookings: Array.isArray(data.bookings) ? data.bookings : snap.bookings,
        users: Array.isArray(data.users) ? data.users : snap.users,
      });
    }, (err)=>{
      console.warn("[site-sync] admin snapshot", err?.message || err);
    });
    return unsub;
  }, [firebaseAuthUser]);

  useEffect(()=>()=>{
    if(flushDebounceTimerRef.current){
      clearTimeout(flushDebounceTimerRef.current);
      flushDebounceTimerRef.current = null;
    }
  }, []);

  const baseT = T[lang] || T.en;
  const rawT = deepMerge(baseT, translationOverrides?.[lang] || {});
  const t = {
    ...rawT,
    contact: safeMergedContactSlice(baseT.contact, rawT.contact),
    bk: safeMergedBkSlice(baseT.bk, rawT.bk),
    policy: safeMergedPolicySlice(baseT.policy, rawT.policy),
  };
  const contactLinks = useMemo(() => publicContactDerived(settings), [settings]);

  const closeBooking = useCallback(()=>{
    setBookingBoat(null);
    const { basePath } = parseLocalePath(location.pathname);
    if(reservePaths.has(basePath)) navigate(localizedHome, {replace:true});
  },[location.pathname, navigate, localizedHome]);

  useEffect(()=>{
    const mq = window.matchMedia("(hover: none)");
    if(mq.matches){
      setNavbarElevated(true);
      const onMq = ()=>{
        if(mq.matches) setNavbarElevated(true);
        else setNavbarElevated(window.scrollY > 80);
      };
      mq.addEventListener("change", onMq);
      return ()=>mq.removeEventListener("change", onMq);
    }
    let raf = 0;
    const sync = ()=>{
      const next = window.scrollY > 80;
      setNavbarElevated((p)=>(p===next?p:next));
    };
    sync();
    const onScroll = ()=>{
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = 0;
        sync();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return ()=>{
      window.removeEventListener("scroll", onScroll);
      if(raf) cancelAnimationFrame(raf);
    };
  },[]);

  const fleetForPublicWebsite = useMemo(()=>{
    let list;
    if(!isFirebaseConfigured()) list = Array.isArray(boats) ? boats : [];
    else {
      const pub = Array.isArray(publicLiveBoats) ? publicLiveBoats : [];
      list = pub.length > 0 ? pub : filterBoatsForPublicLiveDoc(Array.isArray(boats) ? boats : []);
    }
    return normalizeBoatsForClient(list);
  }, [boats, publicLiveBoats]);

  /** Misma embarcación que la flota en vivo (capacidad / datos admin). En móvil el snapshot al abrir el modal a veces quedaba obsoleto hasta que llegaba Firestore. */
  const bookingBoatResolved = useMemo(()=>{
    if(!bookingBoat) return null;
    const list = fleetForPublicWebsite;
    if(!Array.isArray(list) || list.length === 0) return bookingBoat;
    const bid = bookingBoat.id;
    if(bid != null && bid !== ""){
      const hit = list.find((b)=>b && (b.id === bid || String(b.id) === String(bid)));
      if(hit) return { ...bookingBoat, ...hit };
    }
    const nm = String(bookingBoat.name || "").trim().toLowerCase();
    if(nm){
      const hit = list.find((b)=>b && String(b.name || "").trim().toLowerCase() === nm);
      if(hit) return { ...bookingBoat, ...hit };
    }
    return bookingBoat;
  }, [bookingBoat, fleetForPublicWebsite]);

  const openBook = useCallback((boat)=>{
    const b = boat ?? fleetForPublicWebsite[0];
    if(!b) return;
    setBookingBoat(b);
  },[fleetForPublicWebsite]);

  /** Enlaces /reserve, /book, /reserva (y /en/…) abren el modal de reserva al cargar. */
  useEffect(()=>{
    const { basePath } = parseLocalePath(location.pathname);
    if(!reservePaths.has(basePath)) return;
    if(!fleetForPublicWebsite.length) return;
    openBook();
  },[location.pathname, fleetForPublicWebsite, openBook]);

  const scrollToFleet = useCallback(()=>{
    document.getElementById("fleet")?.scrollIntoView({behavior:"smooth"});
  },[]);

  /** Desde /#guias, /#fleet, etc. al volver del artículo de guía. */
  useEffect(()=>{
    const hash = (location.hash || "").replace(/^#/, "");
    if(!hash) return;
    const scroll = ()=>{
      const el = document.getElementById(hash);
      if(el) el.scrollIntoView({ behavior: "smooth" });
    };
    const id = window.requestAnimationFrame(()=>{
      window.requestAnimationFrame(scroll);
    });
    return ()=>window.cancelAnimationFrame(id);
  },[location.pathname, location.hash]);

  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_BOATS_KEY, JSON.stringify(boats)); } catch {}
  },[boats]);
  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_BOOKINGS_KEY, JSON.stringify(bookings)); } catch {}
  },[bookings]);
  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(users)); } catch {}
  },[users]);
  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  },[settings]);
  useEffect(()=>{ try{ window.localStorage.setItem(LS_ADMIN_CREDS_KEY, JSON.stringify(adminCreds)); } catch {} },[adminCreds]);
  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_BLOCKED_DATES_KEY, JSON.stringify(blockedDates)); } catch {}
  },[blockedDates]);
  useEffect(()=>{
    if(isFirebaseConfigured()) return;
    try{ window.localStorage.setItem(LS_TRANSL_OVERRIDES_KEY, JSON.stringify(translationOverrides)); } catch {}
  },[translationOverrides]);

  useEffect(()=>{
    const onStorage = (e)=>{
      if(isFirebaseConfigured()) return;
      if(!e.key || e.storageArea!==window.localStorage) return;
      try{
        if(e.key===LS_SETTINGS_KEY){
          const next = readSavedSettings();
          setSettings(next || DEFAULT_ADMIN_SETTINGS);
        }
        if(e.key===LS_BOATS_KEY){
          const next = readSavedBoats();
          setBoats(next !== null ? next : []);
        }
        if(e.key===LS_BOOKINGS_KEY){
          const next = readSavedBookings();
          setBookings(next !== null ? next : []);
        }
        if(e.key===LS_USERS_KEY){
          const next = readSavedUsers();
          setUsers(next !== null ? next : []);
        }
        if(e.key===LS_BLOCKED_DATES_KEY){
          const next = readSavedBlockedDates();
          setBlockedDates(next !== null ? next : []);
        }
        if(e.key===LS_TRANSL_OVERRIDES_KEY){
          const next = readSavedTranslationOverrides();
          setTranslationOverrides(next && typeof next==="object" ? next : {});
        }
        if(e.key===LS_ADMIN_CREDS_KEY){
          const next = readSavedAdminCreds();
          setAdminCreds(next !== null ? next : ADMIN_CREDS);
        }
      }catch{}
    };
    window.addEventListener("storage", onStorage);
    return ()=>window.removeEventListener("storage", onStorage);
  },[]);
  
  const mergedBlockedForCalendar = useMemo(()=>{
    const s = new Set();
    (Array.isArray(blockedDates)?blockedDates:[]).forEach(x=>typeof x==="string"&&x&&s.add(x));
    (Array.isArray(firestoreBlockedKeys)?firestoreBlockedKeys:[]).forEach(x=>typeof x==="string"&&x&&s.add(x));
    return Array.from(s).sort();
  }, [blockedDates, firestoreBlockedKeys]);

  const bookedInfo = useMemo(
    ()=>computeBookedCalendarInfo(mergedBlockedForCalendar, bookings),
    [mergedBlockedForCalendar, bookings],
  );

  const siteBgUrl = useMemo(()=>{
    const u = String(settings?.visual?.siteBackgroundUrl ?? "").trim();
    return preferWebpUrl(u) || DEFAULT_SITE_BG_URL;
  }, [settings?.visual?.siteBackgroundUrl]);

  const bookingHeroResolved = useMemo(()=>{
    const u = String(settings?.visual?.bookingHeroUrl ?? "").trim();
    return preferWebpUrl(u) || DEFAULT_BOOKING_HERO_URL;
  }, [settings?.visual?.bookingHeroUrl]);

  const heroOfferBannerRaw = String(settings?.offer?.banner ?? "").trim();
  const heroOfferText = heroOfferBannerRaw ? `✦  ${heroOfferBannerRaw}  ✦` : "";
  const reserveHeroOfferSlot = useMemo(()=>{
    if(heroOfferText) return false;
    if(!isFirebaseConfigured() || liveSiteHydrated) return false;
    if(typeof window==="undefined") return true;
    return window.matchMedia("(max-width: 768px)").matches;
  }, [heroOfferText, liveSiteHydrated]);

  const appShellStyle = useMemo(()=>({
    backgroundImage:[
      "linear-gradient(180deg, rgba(234,244,255,.84) 0%, rgba(234,244,255,.70) 35%, rgba(234,244,255,.86) 100%)",
      "radial-gradient(1200px 600px at 30% 0%, rgba(201,160,71,.16) 0%, rgba(201,160,71,0) 62%)",
      `url(${siteBgUrl})`,
    ].join(", "),
    backgroundSize:"cover, cover, cover",
    backgroundPosition:"center, center, center",
  }), [siteBgUrl]);

  const handleBooked = useCallback(async (booking)=>{
    const slot = typeof booking?.slot==="string" && booking.slot ? booking.slot : slotKeyFromDur(booking?.dur);
    const k = booking?.date && slot ? blockKey(booking.date, slot) : "";

    if(isFirebaseConfigured()){
      if(!k || !booking?.id) throw new Error("invalid_booking");
      await commitPublicBooking(booking, k);
    } else {
      if(k){
        setBlockedDates(ds=>{
          const arr = Array.isArray(ds) ? ds : [];
          return arr.includes(k) ? arr : [...arr, k].sort();
        });
      }
      setBookings(prev=>[...prev, booking]);
      if(booking?.promoCode && isAllowedDiscountPct(booking?.discountPct)){
        markLocalVipCodeUsedOnce(booking.promoCode);
      }
    }

    sendBookingEmailNotification(booking, settings);
    sendGuestBookingEmail(booking, settings, "received");
  },[settings]);
  
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminPanel
            onExit={() => navigate("/")}
            boats={boats}
            setBoats={setBoats}
            bookings={bookings}
            setBookings={setBookings}
            users={users}
            setUsers={setUsers}
            adminCreds={adminCreds}
            setAdminCreds={setAdminCreds}
            settings={settings}
            setSettings={setSettings}
            blockedDates={blockedDates}
            setBlockedDates={setBlockedDates}
            translationOverrides={translationOverrides}
            setTranslationOverrides={setTranslationOverrides}
            firebaseAuthUser={firebaseAuthUser}
            cloudPushStatus={cloudPushStatus}
            publicLiveReadStatus={publicLiveReadStatus}
            blockedSlotsPublicReadStatus={blockedSlotsReadStatus}
            onFlushCloud={flushLiveSiteToCloud}
            onManualPublishFleet={handleManualPublishFleet}
          />
        }
      />
      <Route
        path="/dejar-resena"
        element={(
          <Suspense fallback={<RouteChunkFallback />}>
            <ReviewSubmitRoute copy={t.reviews?.submitCopy || {}} />
          </Suspense>
        )}
      />
      <Route
        path="/success"
        element={(
          <Suspense fallback={<RouteChunkFallback />}>
            <CheckoutPaymentPage />
          </Suspense>
        )}
      />
      <Route
        path="/booking/payment/success"
        element={(
          <Suspense fallback={<RouteChunkFallback />}>
            <CheckoutPaymentPage />
          </Suspense>
        )}
      />
      <Route
        path="/booking/payment/cancel"
        element={(
          <Suspense fallback={<RouteChunkFallback />}>
            <CheckoutPaymentCancelPage />
          </Suspense>
        )}
      />
      {SEO_BLOG_PATHS.flatMap((blogPath) =>
        SEO_LOCALES.map((locale) => {
          const routePath = buildLocalizedPath(blogPath, locale);
          return (
            <Route
              key={`${locale}${blogPath}`}
              path={routePath}
              element={(
                <BlogArticleShell
                  articlePath={blogPath}
                  appShellStyle={appShellStyle}
                  lang={lang}
                  setLang={setLang}
                  t={t}
                  contactLinks={contactLinks}
                  settings={settings}
                  onBook={() => openBook()}
                  navbarElevated={navbarElevated}
                  bookingBoatResolved={bookingBoatResolved}
                  closeBooking={closeBooking}
                  handleBooked={handleBooked}
                  bookedInfo={bookedInfo}
                  bookingHeroResolved={bookingHeroResolved}
                  publicLiveReadStatus={publicLiveReadStatus}
                  blockedSlotsReadStatus={blockedSlotsReadStatus}
                  homeTo={localizedHome}
                  navigate={navigate}
                />
              )}
            />
          );
        }),
      )}
      <Route
        path="*"
        element={(
    <div className="app-shell site-public" style={appShellStyle}>
      <SeoManager lang={lang} contact={contactLinks?.contact} />
      {isFirebaseConfigured() && (
        <Suspense fallback={null}>
          <SiteAnalyticsTracker lang={lang} bookingOpen={!!bookingBoatResolved} />
        </Suspense>
      )}
      {isFirebaseConfigured() && (!publicLiveReadStatus.ok || !blockedSlotsReadStatus.ok) && <FirestorePublicAlert />}
      <Navbar lang={lang} setLang={setLang} t={t} onBook={()=>openBook()} elevated={navbarElevated} homeTo={localizedHome} navigate={navigate}/>
      <Hero t={t.hero} onBook={()=>openBook()} offerText={heroOfferText} reserveOfferSlot={reserveHeroOfferSlot} heroBgSrc={bookingHeroResolved} onExploreFleet={scrollToFleet}/>
      <FleetSection t={t} lang={lang} onBook={openBook} boats={fleetForPublicWebsite} settings={settings}/>
      <EquipmentSection t={t} contactLinks={contactLinks} />
      <GuidesSection t={t} lang={lang} />
      <PolicySection t={t}/>
      <RoutesFuelSection t={t} />
      <FaqSection t={t} lang={lang} />
      <Suspense fallback={null}>
        <ReviewsSection t={t}/>
      </Suspense>
      <ContactSection t={t} contactLinks={contactLinks} onBook={()=>openBook()} />
      <Footer t={t} settings={settings} contactLinks={contactLinks} lang={lang}/>
      <FloatingBookingAccess
        t={t}
        contactLinks={contactLinks}
        onBook={() => openBook()}
        hidden={!!bookingBoatResolved}
      />
      
      {bookingBoatResolved && (
        <BookingModal
          boat={bookingBoatResolved}
          bk={t.bk}
          lang={lang}
          onClose={closeBooking}
          onBooked={handleBooked}
          settings={settings}
          bookedDays={bookedInfo.days}
          partialDays={bookedInfo.partialDays}
          bookedKeys={Array.from(bookedInfo.keys)}
          bookingHeroSrc={bookingHeroResolved}
        />
      )}
    </div>
        )}
      />
    </Routes>
  );
}