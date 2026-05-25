import { useEffect, useMemo, useState } from "react";
import { subscribeReviews } from "./lib/reviews-api.js";

function StarsDisplay({ value, size = 18 }) {
  const v = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            lineHeight: 1,
            color: i <= v ? "#c9a047" : "rgba(11,31,58,.22)",
            fontFamily: "Georgia, serif",
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewsSection({ t }) {
  const r = t?.reviews || {};
  const [rows, setRows] = useState([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [openStars, setOpenStars] = useState({});

  useEffect(() => {
    return subscribeReviews(setRows);
  }, []);

  const avg = useMemo(() => {
    if (!rows.length) return 0;
    const s = rows.reduce((a, x) => a + (Number(x.rating) || 0), 0);
    return Math.round((s / rows.length) * 10) / 10;
  }, [rows]);

  const groupedByRating = useMemo(() => {
    const g = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const rev of rows) {
      const s = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 0)));
      g[s].push(rev);
    }
    for (let k = 1; k <= 5; k += 1) {
      g[k].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    }
    return g;
  }, [rows]);

  const toggleStars = (stars) => {
    setOpenStars((prev) => ({ ...prev, [stars]: !prev[stars] }));
  };

  return (
    <section id="reviews" className="public-site-section">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
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
            · {r.kicker || "Reviews"} ·
          </div>
          <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, marginBottom: 10 }}>
            {r.title || "Guest reviews"}
          </h2>
          <div className="cormorant" style={{ fontSize: "clamp(.9rem,1.8vw,1.2rem)", color: "rgba(11,31,58,.70)" }}>
            {r.sub || ""}
          </div>
          <div className="gold-line" style={{ maxWidth: 300, margin: "18px auto 0" }} />
        </div>

        <div
          className="surface reviews-summary-strip"
          style={{
            borderRadius: 22,
            padding: "28px 26px",
            marginBottom: rows.length ? 20 : 0,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: ".2em", color: "rgba(11,31,58,.55)", fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
              {r.avgLabel || "Average"}
            </div>
            <div className="playfair" style={{ fontSize: 42, fontWeight: 700, color: "rgba(11,31,58,.94)", lineHeight: 1 }}>
              {rows.length ? avg.toFixed(1) : "—"}
              <span style={{ fontSize: 22, color: "#c9a047", marginLeft: 6 }}>/5</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <StarsDisplay value={rows.length ? avg : 0} size={22} />
            </div>
          </div>
          <div className="reviews-summary-divider" style={{ width: 1, height: 56, background: "rgba(11,31,58,.12)", flexShrink: 0 }} aria-hidden />
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <div style={{ fontSize: 13, color: "rgba(11,31,58,.72)", lineHeight: 1.65, fontWeight: 600 }}>
              {rows.length ? (
                <>
                  <strong style={{ color: "rgba(11,31,58,.88)" }}>{rows.length}</strong> {r.countWord || "reviews"}
                </>
              ) : (
                r.empty || ""
              )}
            </div>
            <div className="site-text" style={{ fontSize: 12, color: "rgba(11,31,58,.58)", marginTop: 10, lineHeight: 1.55 }}>{r.qrHint || ""}</div>
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="surface reviews-comments-toggle">
            <button
              type="button"
              className="reviews-comments-toggle-head"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((o) => !o)}
            >
              <span>
                {r.expandComments || "Read guest comments"} ({rows.length})
              </span>
              <span className="reviews-caret" aria-hidden>
                ›
              </span>
            </button>
            {commentsOpen ? (
              <div className="reviews-comments-body">
                <div style={{ fontSize: 12, color: "rgba(11,31,58,.58)", lineHeight: 1.6, margin: "0 0 14px" }}>{r.commentsGroupedHint || ""}</div>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const list = groupedByRating[stars] || [];
                  if (!list.length) return null;
                  const open = !!openStars[stars];
                  return (
                    <div key={stars} className="reviews-rating-group">
                      <button
                        type="button"
                        className="reviews-rating-group-head"
                        aria-expanded={open}
                        onClick={() => toggleStars(stars)}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <StarsDisplay value={stars} size={15} />
                          <span style={{ fontSize: 12, color: "rgba(11,31,58,.52)", fontWeight: 800 }}> ({list.length})</span>
                        </span>
                        <span className="reviews-caret" aria-hidden>
                          ›
                        </span>
                      </button>
                      {open ? (
                        <div className="reviews-rating-body">
                          {list.map((rev) => (
                            <div key={rev.id} className="reviews-comment-item">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                                <span style={{ fontWeight: 800, color: "rgba(11,31,58,.88)", fontSize: 14 }}>{rev.name}</span>
                                <span style={{ fontSize: 11, color: "rgba(11,31,58,.48)", fontWeight: 700 }}>
                                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <div style={{ fontSize: 14, color: "rgba(11,31,58,.78)", lineHeight: 1.7, margin: 0 }}>{rev.text}</div>
                              {rev.reply ? (
                                <div
                                  style={{
                                    marginTop: 12,
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    background: "rgba(201,160,71,.12)",
                                    border: "1px solid rgba(11,31,58,.10)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10,
                                      letterSpacing: ".15em",
                                      fontWeight: 900,
                                      color: "rgba(11,31,58,.55)",
                                      marginBottom: 6,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {r.replyLabel || "Response"}
                                  </div>
                                  <div style={{ fontSize: 13, color: "rgba(11,31,58,.82)", lineHeight: 1.65, margin: 0 }}>{rev.reply}</div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
