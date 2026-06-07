import Stripe from "stripe";
import { parse } from "node:url";
import { ensureFirebaseApp, getFirestore } from "./lib/firebase-admin.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const q = parse(req.url || "", true).query || {};
  const sessionId = typeof q.session_id === "string" ? q.session_id : "";

  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: "invalid_session_id" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: "stripe_not_configured" });
  }

  const stripe = new Stripe(stripeKey);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch (e) {
    console.error("[checkout-session-summary]", e?.message || e);
    return res.status(404).json({ error: "session_not_found" });
  }

  const successUrl = typeof session.success_url === "string" ? session.success_url : "";
  const successUrlAllowed =
    successUrl.includes("/booking/payment/success") || successUrl.includes("/success");
  if (!successUrlAllowed) {
    return res.status(403).json({ error: "session_forbidden" });
  }

  const bookingId = session.metadata?.bookingId || session.metadata?.booking_id;
  const out = {
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    customerEmail: session.customer_details?.email || session.customer_email || "",
    bookingId: bookingId || null,
    booking: null,
  };

  if (bookingId && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      ensureFirebaseApp();
      const db = getFirestore();
      const snap = await db.collection("bookings").doc(bookingId).get();
      if (snap.exists) {
        const b = snap.data() || {};
        out.booking = {
          id: bookingId,
          status: b.status || "",
          paymentStatus: b.paymentStatus || "",
          guest: b.guest || "",
          date: b.date || "",
          dur: b.dur || "",
          boat: b.boat || "",
          guests: typeof b.guests === "number" ? b.guests : Number(b.guests) || 0,
          total: typeof b.total === "number" ? b.total : Number(b.total) || 0,
          slot: b.slot || "",
        };
      }
    } catch (e) {
      console.error("[checkout-session-summary] firestore", e?.message || e);
    }
  }

  return res.status(200).json(out);
}
