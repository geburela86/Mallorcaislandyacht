import { useEffect, useMemo, useRef, useState } from "react";
import { ROUTE_IMAGE_FALLBACK, ROUTES_FUEL_ITEMS } from "../lib/routes-fuel-data.js";
import { SiteText } from "./SiteText.jsx";

function onRouteImgError(e) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied) return;
  el.dataset.fallbackApplied = "1";
  el.src = ROUTE_IMAGE_FALLBACK;
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

        <div className="surface routes-fuel-table-wrap" role="region" aria-label={copy.tableAria}>
          <table className="routes-fuel-table">
            <thead>
              <tr>
                <th scope="col">{copy.colRoute}</th>
                <th scope="col">{copy.colTime}</th>
                <th scope="col">{copy.colCost}</th>
                <th scope="col" className="routes-fuel-table__action-col" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label={copy.colRoute} className="routes-fuel-table__dest">
                    <a
                      href={item.mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="routes-table-photo-link"
                      aria-label={`${copy.openMap || "Google Maps"}: ${item.destination}`}
                    >
                      <img
                        className="routes-table-photo"
                        src={item.photoSrc}
                        alt={item.photoAlt || item.destination}
                        width={200}
                        height={150}
                        loading="lazy"
                        decoding="async"
                        onError={onRouteImgError}
                      />
                    </a>
                    <div className="routes-table-dest playfair">{item.destination}</div>
                    <div className="routes-table-route">{item.routeLabel}</div>
                  </td>
                  <td data-label={copy.colTime} className="routes-fuel-table__time">
                    {item.time}
                  </td>
                  <td data-label={copy.colCost} className="routes-fuel-table__cost">
                    {item.cost}
                  </td>
                  <td className="routes-fuel-table__action">
                    <button type="button" className="routes-table-cta" onClick={() => setActiveId(item.id)}>
                      {copy.open || "Ver mapa y fotos"} →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="routes-fuel-disclaimer cormorant">
          <SiteText>{copy.disclaimer}</SiteText>
        </p>
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
                <a href={active.mapsHref} target="_blank" rel="noopener noreferrer" className="routes-table-photo-link">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={active.photoSrc}
                    alt={active.photoAlt || active.destination}
                    onError={onRouteImgError}
                  />
                </a>
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
