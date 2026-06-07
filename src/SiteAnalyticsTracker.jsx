import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackSiteEvent } from "./lib/site-analytics.js";

/** Solo clics relevantes (reservas, contacto, CTAs) — no cada botón de la página. */
function isImportantClick(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest?.("[data-analytics-ignore]")) return false;
  if (el.closest?.("[data-analytics]")) return true;
  if (el.closest?.(".btn-gold")) return true;
  const a = el.closest?.("a[href]");
  if (a) {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href.startsWith("https://wa.me") || href.startsWith("tel:") || href.startsWith("mailto:")) return true;
    if (href.includes("instagram.com")) return true;
  }
  const btn = el.closest?.("button");
  if (btn && /book|reserv|buchen|réserver|boka|charter/i.test(btn.textContent || "")) return true;
  return false;
}

function clickLabelFromTarget(el) {
  const tagged = el.closest?.("[data-analytics]");
  if (tagged) return String(tagged.getAttribute("data-analytics") || "").trim().slice(0, 200);
  const anchor = el.closest?.("a[href]");
  if (anchor) {
    const text = (anchor.getAttribute("aria-label") || anchor.textContent || "").replace(/\s+/g, " ").trim();
    const href = anchor.getAttribute("href") || "";
    return (text || href).slice(0, 200);
  }
  const btn = el.closest?.("button");
  if (btn) {
    return (btn.getAttribute("aria-label") || btn.textContent || "CTA").replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return "";
}

/**
 * Seguimiento ligero en la web pública (máx. ~22 eventos/sesión).
 */
export function SiteAnalyticsTracker({ lang, bookingOpen }) {
  const location = useLocation();
  const prevLang = useRef(lang);
  const prevBooking = useRef(false);
  const langChangedOnce = useRef(false);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    void trackSiteEvent("page_view", { path, lang });
  }, [location.pathname, location.search, lang]);

  useEffect(() => {
    if (prevLang.current && prevLang.current !== lang && !langChangedOnce.current) {
      langChangedOnce.current = true;
      void trackSiteEvent("language", { lang, label: `${prevLang.current} → ${lang}` });
    }
    prevLang.current = lang;
  }, [lang]);

  useEffect(() => {
    if (bookingOpen && !prevBooking.current) {
      void trackSiteEvent("booking_open", { lang, label: "booking_modal" });
    }
    prevBooking.current = !!bookingOpen;
  }, [bookingOpen, lang]);

  useEffect(() => {
    const onClick = (ev) => {
      const t = ev.target;
      if (!isImportantClick(t)) return;
      const label = clickLabelFromTarget(t);
      if (!label) return;
      void trackSiteEvent("click", {
        label,
        target: t.closest?.("a[href]")?.getAttribute("href") || "",
        lang,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lang]);

  return null;
}
