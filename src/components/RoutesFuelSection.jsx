import { useEffect, useMemo, useRef, useState } from "react";
import { ROUTE_IMAGE_FALLBACK, ROUTES_FUEL_ITEMS, routePhotoSrc } from "../lib/routes-fuel-data.js";
import { SiteText } from "./SiteText.jsx";

function onRouteImgError(e, itemId) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied) return;
  el.dataset.fallbackApplied = "1";
  const apiSrc = `/api/route-place-photo?id=${encodeURIComponent(itemId)}`;
  if (el.src.includes("/api/route-place-photo")) {
    el.src = ROUTE_IMAGE_FALLBACK;
    return;
  }
  el.src = apiSrc;
}

export function RoutesFuelSection({ t }) {
  const copy = t?.routes;
  if (!copy) return null;

  const items = useMemo(() => ROUTES_FUEL_ITEMS, []);
  const [activeId, setActiveId] = useState(null);
  const dialogRef = useRef(null);

  const active = useMemo(() => items.find((x) => x.id === activeId) || null, [items, activeId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [active]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="rutas" className="public-site-section routes-fuel-section" aria-labelledby="routes-fuel-heading">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".35em",
              color: "rgba(11,31,58,.62)",
              marginBottom: 12,
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            · {copy.kicker} ·
          </div>
          <h2
            id="routes-fuel-heading"
            className="playfair"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, marginBottom: 10 }}
          >
            {copy.title}
          </h2>
          <SiteText
            className="cormorant"
            style={{ fontSize: "clamp(.95rem,1.8vw,1.2rem)", color: "rgba(11,31,58,.70)" }}
          >
            {copy.sub}
          </SiteText>
          <div className="gold-line" style={{ maxWidth: 300, margin: "18px auto 0" }} />
        </div>

        <div className="routes-dest-grid" role="list" aria-label={copy.tableAria}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="surface routes-dest-card"
              onClick={() => setActiveId(item.id)}
              role="listitem"
            >
              <div className="routes-dest-card__img">
                <img
                  loading="lazy"
                  decoding="async"
                  src={routePhotoSrc(item.id)}
                  alt={item.photoAlt || item.destination}
                  onError={(e) => onRouteImgError(e, item.id)}
                />
                <div className="routes-dest-card__overlay" />
                <div className="routes-dest-card__chips">
                  <span className="routes-chip">{item.time}</span>
                  <span className="routes-chip routes-chip--cost">{item.cost}</span>
                </div>
              </div>
              <div className="routes-dest-card__body">
                <div className="routes-dest-card__title playfair">{item.destination}</div>
                <div className="routes-dest-card__meta">{item.routeLabel}</div>
                <div className="routes-dest-card__cta">{copy.open || "Ver mapa y fotos"} →</div>
              </div>
            </button>
          ))}
        </div>

        <p className="routes-fuel-disclaimer cormorant">
          <SiteText>{copy.disclaimer}</SiteText>
        </p>
        {copy.photoCredit ? (
          <p className="routes-fuel-credit">{copy.photoCredit}</p>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="routes-modal"
        aria-label={active ? `${copy.modalTitle || "Ruta"}: ${active.destination}` : copy.modalTitle || "Ruta"}
        onClose={() => setActiveId(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveId(null);
        }}
      >
        {active ? (
          <div className="routes-modal__panel">
            <div className="routes-modal__head">
              <div>
                <div className="routes-modal__kicker">{copy.modalKicker || "Destino"}</div>
                <div className="routes-modal__title playfair">{active.destination}</div>
                <div className="routes-modal__sub">{active.routeLabel}</div>
              </div>
              <button type="button" className="routes-modal__close" onClick={() => setActiveId(null)} aria-label={copy.close || "Cerrar"}>
                ×
              </button>
            </div>

            <div className="routes-modal__layout">
              <div className="routes-modal__hero">
                <img
                  loading="lazy"
                  decoding="async"
                  src={routePhotoSrc(active.id)}
                  alt={active.photoAlt || active.destination}
                  onError={(e) => onRouteImgError(e, active.id)}
                />
              </div>

              <div className="routes-modal__side">
                <div className="routes-modal__facts">
                  <div className="routes-fact">
                    <div className="routes-fact__label">{copy.timeLabel || "Tiempo (ida y vuelta)"}</div>
                    <div className="routes-fact__value">{active.time}</div>
                  </div>
                  <div className="routes-fact">
                    <div className="routes-fact__label">{copy.costLabel || "Carburante (ida y vuelta)"}</div>
                    <div className="routes-fact__value">{active.cost}</div>
                  </div>
                </div>

                <div className="routes-modal__map">
                  <iframe
                    title={copy.mapTitle || "Mapa"}
                    src={active.mapsEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="routes-modal__actions">
                  <a className="routes-btn routes-btn--primary" href={active.mapsHref} target="_blank" rel="noopener noreferrer">
                    {copy.openMap || "Abrir en Google Maps"}
                  </a>
                  <button type="button" className="routes-btn" onClick={() => setActiveId(null)}>
                    {copy.close || "Cerrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
