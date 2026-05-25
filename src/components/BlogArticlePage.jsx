import { Link } from "react-router-dom";
import { getBlogArticle } from "../lib/seo-blog.js";
import { localizeHref } from "../lib/seo.js";
import { SiteText } from "./SiteText.jsx";

const titleStyle = {
  fontSize: "clamp(1.85rem,4vw,2.75rem)",
  fontWeight: 600,
  lineHeight: 1.15,
  marginBottom: 14,
  color: "rgba(11,31,58,.95)",
};

const sectionTitleStyle = {
  fontSize: "clamp(1.25rem,2.5vw,1.55rem)",
  fontWeight: 600,
  marginBottom: 14,
  color: "rgba(11,31,58,.92)",
};

export function BlogArticlePage({ articlePath, lang, onBook, guidesHomeTo = "/" }) {
  const article = getBlogArticle(articlePath, lang);
  if (!article) {
    return (
      <div className="public-site-section" style={{ textAlign: "center", padding: "80px 24px" }}>
        <SiteText>Article not found.</SiteText>
        <Link to={localizeHref("/", lang)} style={{ color: "#b3882f", fontWeight: 700 }}>
          {lang === "es" ? "Volver al inicio" : "Back to home"}
        </Link>
      </div>
    );
  }

  const { ui } = article;

  return (
    <div className="public-site-section blog-article">
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <nav
          aria-label="Breadcrumb"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            marginBottom: 28,
            color: "rgba(11,31,58,.55)",
          }}
        >
          <Link to={localizeHref("/", lang)} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
            {ui.home}
          </Link>
          <span aria-hidden style={{ margin: "0 8px" }}>
            /
          </span>
          <Link
            to={`${String(guidesHomeTo).replace(/\/+$/, "") || "/"}#guias`}
            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {ui.guides}
          </Link>
        </nav>

        <header style={{ marginBottom: 40, textAlign: "center" }}>
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
            · {article.kicker} ·
          </div>
          <div className="playfair blog-article__title" style={titleStyle} role="heading" aria-level={1}>
            {article.h1}
          </div>
          <SiteText
            style={{
              fontSize: 12,
              color: "rgba(11,31,58,.52)",
              fontWeight: 700,
              letterSpacing: ".06em",
            }}
          >
            {ui.updated} {article.published} · {article.readMin} {ui.readMin}
          </SiteText>
          <div className="gold-line" style={{ maxWidth: 280, margin: "20px auto 0" }} />
        </header>

        <div className="blog-article-body" style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(11,31,58,.82)" }}>
          {article.sections.map((sec, i) => (
            <section key={i} style={{ marginBottom: 32 }}>
              <div className="playfair blog-article__section-title" style={sectionTitleStyle} role="heading" aria-level={2}>
                {sec.h2}
              </div>
              {sec.paragraphs?.map((p, j) => (
                <SiteText key={j} style={{ margin: "0 0 14px" }}>
                  {p}
                </SiteText>
              ))}
              {sec.list?.length ? (
                <ul style={{ margin: "0 0 14px", paddingLeft: 22 }}>
                  {sec.list.map((item, k) => (
                    <li key={k} style={{ marginBottom: 8 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div
          className="surface"
          style={{
            marginTop: 48,
            marginBottom: 40,
            padding: "32px 28px",
            borderRadius: 18,
            textAlign: "center",
          }}
        >
          <div className="playfair" style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 10 }} role="heading" aria-level={2}>
            {ui.ctaTitle}
          </div>
          <SiteText className="cormorant" style={{ fontSize: "1.1rem", color: "rgba(11,31,58,.72)", marginBottom: 22 }}>
            {ui.ctaSub}
          </SiteText>
          <button type="button" onClick={onBook} className="btn-gold" style={{ fontSize: 13, padding: "14px 36px" }}>
            {ui.ctaBtn}
          </button>
        </div>

        {article.related?.length > 0 ? (
          <nav aria-label={ui.related} style={{ marginBottom: 24 }}>
            <SiteText
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "rgba(11,31,58,.48)",
                marginBottom: 14,
              }}
            >
              {ui.related}
            </SiteText>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px" }}>
              {article.related.map((link) => (
                <Link
                  key={link.href}
                  to={localizeHref(link.href, lang)}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#b3882f",
                    textDecoration: "underline",
                    textUnderlineOffset: 4,
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
