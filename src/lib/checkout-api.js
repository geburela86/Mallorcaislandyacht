/**
 * Stripe Checkout Session API (Vercel `/api/*`). Optional `VITE_CHECKOUT_API_BASE` when the UI
 * is served from a different origin than the API during development.
 */
export function checkoutApiOrigin() {
  const raw = import.meta.env.VITE_CHECKOUT_API_BASE;
  if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/\/+$/, "");
  return "";
}

export async function createStripeCheckoutSession(payload) {
  const origin = checkoutApiOrigin();
  const url = `${origin}/api/create-checkout-session`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error;
    const detail = typeof data?.message === "string" ? data.message : "";
    const msg =
      code && detail ? `${code}: ${detail}` : code || detail || `checkout_${res.status}`;
    const err = new Error(msg);
    err.code = code;
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  if (!data?.url || typeof data.url !== "string") {
    const err = new Error("checkout_no_url");
    err.code = "checkout_no_url";
    throw err;
  }
  return data;
}

export async function fetchCheckoutSessionSummary(sessionId) {
  const origin = checkoutApiOrigin();
  const q = encodeURIComponent(sessionId);
  const url = `${origin}/api/checkout-session-summary?session_id=${q}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `summary_${res.status}`);
    err.code = data?.error;
    throw err;
  }
  return data;
}

/**
 * Reembolso Stripe vía `/api/refund-payment` (requiere Firebase ID token y permiso en servidor).
 * @param {{ sessionId: string, amountEuros?: number | null, idToken: string }} args
 */
export async function refundStripePayment({ sessionId, amountEuros = null, idToken }) {
  const origin = checkoutApiOrigin();
  const url = `${origin}/api/refund-payment`;
  const body = {
    sessionId,
    ...(amountEuros != null &&
    amountEuros !== "" &&
    Number.isFinite(Number(amountEuros)) &&
    Number(amountEuros) > 0
      ? { amount: Number(amountEuros) }
      : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error;
    const detail = typeof data?.message === "string" ? data.message : "";
    const msg =
      code && detail ? `${code}: ${detail}` : code || detail || `refund_${res.status}`;
    const err = new Error(msg);
    err.code = code;
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}
