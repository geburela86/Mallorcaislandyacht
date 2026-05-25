import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCheckoutSessionSummary } from "./lib/checkout-api.js";

function formatDateYmd(ymd) {
  if (!ymd || typeof ymd !== "string") return "";
  const [y, m, day] = ymd.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(m, 10) - 1;
  if (!Number.isFinite(mi) || mi < 0 || mi > 11) return ymd;
  return `${day} ${months[mi]} ${y}`;
}

export function CheckoutPaymentSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState(() =>
    sessionId ? { loading: true, err: "", data: null } : { loading: false, err: "missing_session", data: null },
  );

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      try {
        const data = await fetchCheckoutSessionSummary(sessionId);
        if (cancelled) return;
        const paid = data.paymentStatus === "paid";
        const bookingStatus = data.booking?.status || "";
        const bookingPaid = bookingStatus === "paid" || bookingStatus === "confirmed";
        if (paid && bookingPaid) {
          setState({ loading: false, err: "", data });
          return;
        }
        if (paid && !bookingPaid && tries < 12) {
          tries += 1;
          window.setTimeout(poll, 1500);
          return;
        }
        setState({ loading: false, err: "", data });
      } catch (e) {
        if (cancelled) return;
        setState({ loading: false, err: String(e?.message || e || "error"), data: null });
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const d = state.data;
  const booking = d?.booking;

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(234,244,255,.94) 0%, rgba(234,244,255,.88) 100%), radial-gradient(900px 500px at 20% 0%, rgba(201,160,71,.14) 0%, transparent 60%)",
      }}
    >
      <div
        className="surface"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "28px 24px",
          borderRadius: 18,
          border: "1px solid rgba(11,31,58,.12)",
          boxShadow: "0 18px 50px rgba(15,23,42,.08)",
        }}
      >
        {state.loading ? (
          <div style={{ textAlign: "center", fontWeight: 800, color: "rgba(11,31,58,.82)" }}>
            Confirming payment…
          </div>
        ) : state.err ? (
          <>
            <h1 className="playfair" style={{ fontSize: 22, margin: "0 0 12px", color: "rgba(11,31,58,.94)" }}>
              Could not load session
            </h1>
            <p style={{ fontSize: 14, color: "rgba(11,31,58,.68)", lineHeight: 1.6, marginBottom: 20 }}>{state.err}</p>
            <Link to="/" className="btn-gold" style={{ display: "inline-block", textAlign: "center", width: "100%" }}>
              Back to home
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44, textAlign: "center", marginBottom: 10 }}>✓</div>
            <h1 className="playfair" style={{ fontSize: 24, margin: "0 0 8px", textAlign: "center", color: "rgba(11,31,58,.94)" }}>
              Payment confirmed
            </h1>
            <p style={{ fontSize: 14, color: "rgba(11,31,58,.72)", lineHeight: 1.65, textAlign: "center", marginBottom: 22 }}>
              Your charter is reserved. You will receive details by email.
            </p>
            {booking ? (
              <div
                style={{
                  background: "rgba(255,255,255,.72)",
                  border: "1px solid rgba(11,31,58,.12)",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20,
                  fontSize: 13,
                  color: "rgba(11,31,58,.86)",
                  lineHeight: 1.55,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: ".14em", fontWeight: 900, color: "rgba(11,31,58,.55)", marginBottom: 8 }}>
                  BOOKING REFERENCE
                </div>
                <div className="playfair" style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
                  {booking.id}
                </div>
                <div>
                  <b>{booking.boat}</b>
                </div>
                <div>{formatDateYmd(booking.date)}</div>
                <div style={{ textTransform: "capitalize" }}>{booking.dur?.replace(/_/g, " ")}</div>
                <div style={{ marginTop: 10, fontWeight: 900 }}>Paid: {booking.total}€</div>
                {d?.customerEmail ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(11,31,58,.62)" }}>{d.customerEmail}</div>
                ) : null}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "rgba(11,31,58,.62)", marginBottom: 18 }}>
                Payment status: <b>{d?.paymentStatus || "unknown"}</b>
              </p>
            )}
            <Link to="/" className="btn-gold" style={{ display: "inline-block", textAlign: "center", width: "100%" }}>
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function CheckoutPaymentCancelPage() {
  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(234,244,255,.94) 0%, rgba(234,244,255,.88) 100%), radial-gradient(900px 500px at 20% 0%, rgba(201,160,71,.14) 0%, transparent 60%)",
      }}
    >
      <div
        className="surface"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "28px 24px",
          borderRadius: 18,
          border: "1px solid rgba(11,31,58,.12)",
          boxShadow: "0 18px 50px rgba(15,23,42,.08)",
          textAlign: "center",
        }}
      >
        <h1 className="playfair" style={{ fontSize: 24, margin: "0 0 10px", color: "rgba(11,31,58,.94)" }}>
          Payment cancelled
        </h1>
        <p style={{ fontSize: 14, color: "rgba(11,31,58,.72)", lineHeight: 1.65, marginBottom: 22 }}>
          No charge was completed. The time slot may be released — you can choose another date or option from the fleet section.
        </p>
        <Link to="/#fleet" className="btn-gold" style={{ display: "inline-block", width: "100%" }}>
          Return to calendar
        </Link>
        <div style={{ marginTop: 12 }}>
          <Link to="/" style={{ fontSize: 13, fontWeight: 700, color: "rgba(11,31,58,.55)" }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
