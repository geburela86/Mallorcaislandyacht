import { ROUTE_IMAGE_FALLBACK, ROUTES_FUEL_ITEMS, routePhotoSrc } from "../lib/routes-fuel-data.js";
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

  const items = ROUTES_FUEL_ITEMS;

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
                        src={routePhotoSrc(item.id)}
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
                    <a
                      className="routes-table-cta"
                      href={item.mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.open || "Ver mapa y fotos"} →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="routes-fuel-disclaimer cormorant">
          <SiteText>{copy.disclaimer}</SiteText>
        </p>
        <p className="routes-fuel-credit">
          {copy.photoCredit || "Fotos del chárter: mar y embarcaciones en la costa de Mallorca."}
        </p>
      </div>
    </section>
  );
}
