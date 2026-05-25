import { useEffect, useMemo, useState } from "react";
import { DashboardStatIcon } from "./site-icons.jsx";
import {
  subscribeAnalyticsEvents,
  computeAnalyticsSummary,
  formatAnalyticsTime,
} from "./lib/site-analytics.js";
import { isFirebaseConfigured } from "./lib/reviews-api.js";

function RankList({ title, items, empty }) {
  return (
    <div className="card" style={{ padding: 16, borderRadius: 12 }}>
      <h3 style={{ fontSize: 11, fontWeight: 800, color: "#0b1f3a", marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>
        {title}
      </h3>
      {!items?.length ? (
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{empty}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((row, i) => (
            <li
              key={`${row.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "6px 0",
                borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={row.name}>
                {row.name}
              </span>
              <strong style={{ color: "#C9A047", flexShrink: 0 }}>{row.count}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyChart({ series }) {
  const max = Math.max(1, ...series.map((d) => Math.max(d.views, d.visitors)));
  if (!series.length) {
    return <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Sin datos en este periodo.</p>;
  }
  const lastDays = series.slice(-14);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
      {lastDays.map((d) => (
        <div key={d.date} style={{ flex: 1, minWidth: 0, textAlign: "center" }} title={`${d.date}: ${d.views} vistas, ${d.visitors} visitantes`}>
          <div
            style={{
              width: "100%",
              maxWidth: 22,
              margin: "0 auto",
              height: `${Math.round((d.views / max) * 72)}px`,
              minHeight: d.views ? 3 : 0,
              background: "linear-gradient(180deg,#C9A047,#e8c96a)",
              borderRadius: "3px 3px 0 0",
            }}
          />
          <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>{d.date.slice(8)}</div>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsTab({ firebaseAuthUser, isActive = false }) {
  const [events, setEvents] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [rangeDays, setRangeDays] = useState(7);
  const [showSessions, setShowSessions] = useState(false);

  useEffect(() => {
    if (!isActive || !firebaseAuthUser || !isFirebaseConfigured()) {
      return undefined;
    }
    setLoadErr("");
    return subscribeAnalyticsEvents(
      setEvents,
      (err) => setLoadErr(err?.message || String(err)),
      undefined,
      firebaseAuthUser,
    );
  }, [firebaseAuthUser, isActive]);

  const summary = useMemo(() => computeAnalyticsSummary(events, rangeDays), [events, rangeDays]);

  const statCards = [
    { k: "total", l: "Visitantes", v: summary.uniqueVisitors, c: "#C9A047" },
    { k: "upcoming", l: "Sesiones", v: summary.uniqueSessions, c: "#4ECDC4" },
    { k: "confirmed", l: "Vistas", v: summary.pageViews, c: "#22c55e" },
    { k: "pending", l: "Clics clave", v: summary.clicks, c: "#f59e0b" },
  ];

  if (!isFirebaseConfigured()) {
    return (
      <div>
        <h2 className="playfair" style={{ fontSize: 24, marginBottom: 12, color: "#0b1f3a" }}>
          Estadísticas
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Configura Firebase y conéctate para ver visitas resumidas (registro ligero, sin saturar la web).
        </p>
      </div>
    );
  }

  if (!firebaseAuthUser) {
    return (
      <div>
        <h2 className="playfair" style={{ fontSize: 24, marginBottom: 12, color: "#0b1f3a" }}>
          Estadísticas
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Pulsa <strong>Conectar Firebase</strong> para cargar el resumen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h2 className="playfair" style={{ fontSize: 24, margin: 0, color: "#0b1f3a" }}>
          Estadísticas
        </h2>
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13 }}
        >
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
        </select>
      </div>

      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
        Resumen compacto. En la web solo se registran visitas, CTAs importantes y reservas (~22 eventos máx. por sesión).
      </p>

      {loadErr ? (
        <div style={{ background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#991b1b" }}>
          {loadErr}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div key={s.l} className="card" style={{ padding: 14, borderRadius: 12 }}>
            <div style={{ marginBottom: 6, color: s.c }}>
              <DashboardStatIcon name={s.k} size={18} />
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.l}</div>
            <div className="playfair" style={{ fontSize: 22, fontWeight: 700, color: s.c }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Actividad (últimos 14 días del periodo)
        </div>
        <DailyChart series={summary.dailySeries} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 16 }}>
        <RankList title="Top países" items={summary.topCountries} empty="Sin datos aún." />
        <RankList title="Top páginas" items={summary.topPages} empty="Sin vistas." />
        <RankList title="Top clics" items={summary.topClicks} empty="Sin clics clave." />
      </div>

      <button
        type="button"
        onClick={() => setShowSessions((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color: "#92400e",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          padding: "4px 0",
          marginBottom: showSessions ? 12 : 0,
        }}
      >
        {showSessions ? "▾ Ocultar sesiones recientes" : "▸ Ver sesiones recientes (12)"}
      </button>

      {showSessions ? (
        <div className="admin-table-scroll-outer" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <th style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", textAlign: "left" }}>Hora</th>
                <th style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", textAlign: "left" }}>País</th>
                <th style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", textAlign: "left" }}>Vistas</th>
                <th style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", textAlign: "left" }}>Clics</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentSessions.map((s) => (
                <tr key={s.sessionId}>
                  <td style={{ padding: "10px 12px", fontSize: 12, borderTop: "1px solid #e2e8f0" }}>{formatAnalyticsTime(s.lastAt)}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, borderTop: "1px solid #e2e8f0" }}>{s.country || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, borderTop: "1px solid #e2e8f0" }}>{s.pageViews}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, borderTop: "1px solid #e2e8f0" }}>{s.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
