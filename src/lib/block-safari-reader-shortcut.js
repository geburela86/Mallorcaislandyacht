/**
 * Safari: ⌘⇧R abre Vista lector (no recarga). Chrome/Firefox: ⌘⇧R = recarga forzada.
 * Bloqueamos el atajo en Safari para que no sustituya a recargar; usar ⌘R para refrescar.
 */
function isEditableTarget(el) {
  if (!el || typeof el !== "object" || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!el.isContentEditable;
}

function isReaderShortcut(e) {
  const key = String(e.key || "").toLowerCase();
  if (key !== "r" && e.code !== "KeyR") return false;
  if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return false;
  return true;
}

function blockReaderShortcut(e) {
  if (!isReaderShortcut(e)) return;
  if (isEditableTarget(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
}

export function installSafariReaderShortcutBlock() {
  if (typeof window === "undefined") return () => {};
  const opts = { capture: true, passive: false };
  const events = ["keydown", "keyup", "keypress"];
  for (const type of events) {
    window.addEventListener(type, blockReaderShortcut, opts);
    document.addEventListener(type, blockReaderShortcut, opts);
  }
  return () => {
    for (const type of events) {
      window.removeEventListener(type, blockReaderShortcut, opts);
      document.removeEventListener(type, blockReaderShortcut, opts);
    }
  };
}
