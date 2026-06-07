/**
 * Fragmenta párrafos para reducir la heurística “artículo” de Safari Vista lector.
 * Los crawlers siguen viendo el texto completo en el DOM.
 */
export function splitReaderSafeChunks(text) {
  const s = String(text ?? "").trim();
  if (!s) return [];
  return s.split(/(?<=[.!?…])\s+/).filter(Boolean);
}
