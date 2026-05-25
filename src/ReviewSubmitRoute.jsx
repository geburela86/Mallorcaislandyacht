import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createReview, validateReviewGateParam } from "./lib/reviews-api.js";
import brandLogo from "./assets/mallorca-island-yacht-logo-clean.png";

function StarPick({ value, onChange }) {
  const v = Math.min(5, Math.max(1, Number(value) || 5));
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`${i} stars`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 32,
            lineHeight: 1,
            padding: 4,
            color: i <= v ? "#c9a047" : "rgba(11,31,58,.22)",
            fontFamily: "Georgia, serif",
            transition: "transform .15s",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewSubmitRoute({ copy }) {
  const c = copy || {};
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [gateOk, setGateOk] = useState(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await validateReviewGateParam(token);
      if (!alive) return;
      setGateOk(ok);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSending(true);
    try {
      await createReview({ name, rating, text });
      setDone(true);
    } catch {
      setErr(c.errSave || "Could not save. Try again.");
    } finally {
      setSending(false);
    }
  };

  if (gateOk === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#eaf4ff,#f8fafc)", padding: 24 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>{c.loading || "…"}</div>
      </div>
    );
  }

  if (!gateOk) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#eaf4ff,#f8fafc)", padding: 24 }}>
        <div className="surface" style={{ maxWidth: 440, width: "100%", padding: "36px 28px", borderRadius: 18, textAlign: "center" }}>
          <img src={brandLogo} alt="" style={{ height: 44, objectFit: "contain", marginBottom: 20 }} />
          <h1 className="playfair" style={{ fontSize: 22, color: "#0b1f3a", marginBottom: 12 }}>
            {c.deniedTitle || "Link not valid"}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(11,31,58,.72)", lineHeight: 1.65, marginBottom: 24 }}>
            {c.deniedBody || "Reviews can only be submitted using the QR code provided after your charter."}
          </p>
          <Link to="/" className="btn-gold" style={{ display: "inline-block", padding: "12px 28px", fontSize: 12 }}>
            {c.home || "Home"}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#eaf4ff,#f8fafc)", padding: 24 }}>
        <div className="surface" style={{ maxWidth: 440, width: "100%", padding: "36px 28px", borderRadius: 18, textAlign: "center" }}>
          <img src={brandLogo} alt="" style={{ height: 44, objectFit: "contain", marginBottom: 20 }} />
          <h1 className="playfair" style={{ fontSize: 24, color: "#0b1f3a", marginBottom: 12 }}>
            {c.thanksTitle || "Thank you!"}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(11,31,58,.72)", lineHeight: 1.65, marginBottom: 24 }}>{c.thanksBody || "Your review has been received."}</p>
          <Link to="/" className="btn-outline" style={{ display: "inline-block", padding: "12px 28px", fontSize: 12 }}>
            {c.home || "Home"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#eaf4ff,#f8fafc)", padding: 24 }}>
      <div className="surface" style={{ maxWidth: 480, width: "100%", padding: "36px 28px", borderRadius: 18 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={brandLogo} alt="" style={{ height: 48, objectFit: "contain", marginBottom: 16 }} />
          <h1 className="playfair" style={{ fontSize: 26, color: "#0b1f3a", marginBottom: 8 }}>
            {c.formTitle || "Your review"}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(11,31,58,.65)", lineHeight: 1.55 }}>{c.formSub || ""}</p>
        </div>

        <form onSubmit={submit}>
          {err ? (
            <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.28)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#b91c1c", marginBottom: 16, fontWeight: 600 }}>
              {err}
            </div>
          ) : null}

          <label style={{ display: "block", fontSize: 10, letterSpacing: ".15em", color: "#0b1f3a", marginBottom: 8, textTransform: "uppercase", fontWeight: 800 }}>
            {c.labelName || "Name"}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            style={{
              width: "100%",
              marginBottom: 20,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(11,31,58,.18)",
              fontSize: 15,
              background: "rgba(255,255,255,.9)",
            }}
          />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, letterSpacing: ".15em", color: "#0b1f3a", marginBottom: 10, textTransform: "uppercase", fontWeight: 800 }}>
              {c.labelStars || "Rating"}
            </label>
            <StarPick value={rating} onChange={setRating} />
          </div>

          <label style={{ display: "block", fontSize: 10, letterSpacing: ".15em", color: "#0b1f3a", marginBottom: 8, textTransform: "uppercase", fontWeight: 800 }}>
            {c.labelText || "Comment"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={2000}
            rows={5}
            style={{
              width: "100%",
              marginBottom: 22,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(11,31,58,.18)",
              fontSize: 14,
              resize: "vertical",
              background: "rgba(255,255,255,.9)",
            }}
          />

          <button type="submit" disabled={sending} className="btn-gold" style={{ width: "100%", opacity: sending ? 0.7 : 1 }}>
            {sending ? c.sending || "Sending…" : c.submit || "Send review"}
          </button>
        </form>
      </div>
    </div>
  );
}
