import { getFaqForLang } from "../lib/seo.js";

export function FaqSection({ t, lang }) {
  const copy = t?.faq || {};
  const items = getFaqForLang(lang);

  return (
    <section id="faq" className="public-site-section" aria-labelledby="faq-heading">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
            · {copy.kicker || "FAQ"} ·
          </div>
          <h2
            id="faq-heading"
            className="playfair"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, marginBottom: 10 }}
          >
            {copy.title || "FAQ"}
          </h2>
          <p
            className="cormorant"
            style={{ fontSize: "clamp(.95rem,1.8vw,1.2rem)", color: "rgba(11,31,58,.70)", margin: 0 }}
          >
            {copy.sub || ""}
          </p>
          <div className="gold-line" style={{ maxWidth: 300, margin: "18px auto 0" }} />
        </div>
        <div className="faq-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, i) => (
            <details
              key={i}
              className="surface faq-item"
              style={{ borderRadius: 14, padding: "4px 20px", overflow: "hidden" }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "rgba(11,31,58,.92)",
                  padding: "16px 0",
                  listStyle: "none",
                }}
              >
                {item.q}
              </summary>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "rgba(11,31,58,.72)",
                  margin: "0 0 18px",
                  paddingTop: 0,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
