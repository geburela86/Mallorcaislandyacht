import { ROUTES_FUEL_ROWS } from "../lib/routes-fuel-data.js";
import { SiteText } from "./SiteText.jsx";

export function RoutesFuelSection({ t }) {
  const copy = t?.routes;
  if (!copy) return null;

  return (
    <section id="rutas" className="public-site-section routes-fuel-section" aria-labelledby="routes-fuel-heading">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
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
              </tr>
            </thead>
            <tbody>
              {ROUTES_FUEL_ROWS.map((row) => (
                <tr key={row.route}>
                  <td data-label={copy.colRoute}>
                    <span className="routes-fuel-route">{row.route}</span>
                  </td>
                  <td data-label={copy.colTime}>
                    <span className="routes-fuel-value">{row.time}</span>
                  </td>
                  <td data-label={copy.colCost}>
                    <span className="routes-fuel-value routes-fuel-cost">{row.cost}</span>
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
