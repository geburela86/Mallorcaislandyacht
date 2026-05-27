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

  return (
    <section id="rutas" className="public-site-section routes-fuel-section" aria-labelledby="routes-fuel-heading">
      <div className="routes-fuel-inner">
        <header className="routes-fuel-header">
          <div className="routes-fuel-kicker">· {copy.kicker} ·</div>
          <h2 id="routes-fuel-heading" className="playfair routes-fuel-title">
            {copy.title}
          </h2>
          <SiteText className="cormorant routes-fuel-sub">{copy.sub}</SiteText>
          <div className="gold-line routes-fuel-goldline" />
        </header>

        <div className="routes-fuel-table-wrap surface" role="region" aria-label={copy.tableAria}>
          <table className="routes-fuel-table">
            <thead>
              <tr>
                <th scope="col">{copy.colRoute}</th>
                <th scope="col">{copy.colTime}</th>
                <th scope="col">{copy.colCost}</th>
                <th scope="col" className="routes-fuel-table__th-action" />
              </tr>
            </thead>
            <tbody>
              {ROUTES_FUEL_ITEMS.map((item) => (
                <tr key={item.id} className="routes-fuel-row">
                  <td className="routes-fuel-table__dest">
                    <div className="routes-fuel-dest-cell">
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
                          width={120}
                          height={90}
                          loading="lazy"
                          decoding="async"
                          onError={onRouteImgError}
                        />
                      </a>
                      <div className="routes-fuel-dest-text">
                        <div className="routes-table-dest playfair">{item.destination}</div>
                        <div className="routes-table-route">{item.routeLabel}</div>
                      </div>
                    </div>
                  </td>
                  <td className="routes-fuel-table__time" data-label={copy.colTime}>
                    <span className="routes-pill">{item.time}</span>
                  </td>
                  <td className="routes-fuel-table__cost" data-label={copy.colCost}>
                    <span className="routes-pill routes-pill--gold">{item.cost}</span>
                  </td>
                  <td className="routes-fuel-table__action">
                    <a
                      className="routes-map-btn"
                      href={item.mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.open || "Ver mapa y fotos"}
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
      </div>
    </section>
  );
}
