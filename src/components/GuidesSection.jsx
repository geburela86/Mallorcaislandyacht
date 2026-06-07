import { Link } from "react-router-dom";
import { getHomeGuides } from "../lib/seo-blog.js";
import { localizeHref } from "../lib/seo.js";
import { SiteText } from "./SiteText.jsx";

export function GuidesSection({ t, lang }) {
  const copy = t?.guides || {};
  const cards = getHomeGuides(lang);
  if (!cards.length) return null;

  return (
    <section id="guias" className="public-site-section guides-section" aria-labelledby="guides-heading">
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
            · {copy.kicker || "Guías"} ·
          </div>
          <h2
            id="guides-heading"
            className="playfair"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, marginBottom: 10 }}
          >
            {copy.title || "Guías"}
          </h2>
          <SiteText
            className="cormorant"
            style={{ fontSize: "clamp(.95rem,1.8vw,1.2rem)", color: "rgba(11,31,58,.70)" }}
          >
            {copy.sub || ""}
          </SiteText>
          <div className="gold-line" style={{ maxWidth: 300, margin: "18px auto 0" }} />
        </div>

        <div className="guides-grid">
          {cards.map((card) => (
            <Link
              key={card.href}
              to={localizeHref(card.href, lang)}
              className={`surface guides-card${card.featured ? " guides-card--featured" : ""}`}
            >
              {card.featured ? (
                <span className="guides-card__badge">{copy.featured || "Destacado"}</span>
              ) : null}
              <h3 className="guides-card__title playfair">{card.title}</h3>
              <div className="guides-card__excerpt">{card.excerpt}</div>
              <span className="guides-card__meta">
                {card.readMin} {copy.minRead || "min"} · {copy.readMore || "Ver guía"} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
