import { preferWebpUrl } from "./prefer-webp-url.js";

/** Equipment section card images (local + Unsplash). */
export const EQUIPMENT_IMAGES = {
  seaScooter: {
    src: preferWebpUrl("/IMG_1399.PNG"),
    alt: "Sea Scooter WattSup en aguas cristalinas de Mallorca",
  },
  snorkel: {
    src: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=900&h=520&q=80",
    alt: "Snorkel en mar cristalino con peces tropicales",
  },
  paddle: {
    src: "https://images.unsplash.com/photo-1531267248152-4d63ad6efc9d?auto=format&fit=crop&w=900&h=520&q=80",
    alt: "Paddle surf en una cala tranquila de Mallorca",
  },
  drone: {
    src: "https://images.unsplash.com/photo-1571115177098-24ec42ed683d?auto=format&fit=crop&w=1200&h=560&q=80",
    alt: "Vista aérea de la costa de Mallorca capturada con dron",
  },
};
