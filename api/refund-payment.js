import Stripe from "stripe";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ensureFirebaseApp, getFirestore } from "./lib/firebase-admin.js";
import { blockKey, slotKeyFromDur } from "./lib/slots.js";
import { sendStripeRefundCustomerEmail } from "./lib/send-email.js";

/**
 * POST /api/refund-payment
 * Body: { sessionId: string, amount?: number }  — amount opcional, en euros (reembolso parcial).
 *
 * Seguridad:
 * - Authorization: Bearer <Firebase ID token>
 * - Permiso si el token lleva claim `admin: true` O el email está en ADMIN_REFUND_ALLOWED_EMAILS (lista CSV).
 *
 * Variables: STRIPE_SECRET_KEY, credenciales Firebase Admin (como el resto de /api).
 */

function pickString(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractBearer(req) {
  const raw = req.headers.authorization || req.headers.Authorization || "";
  if (typeof raw !== "string") return "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function actorMayRefund(decoded) {
  if (decoded?.admin === true) return true;
  const csv = (process.env.ADMIN_REFUND_ALLOWED_EMAILS || "").trim();
  if (!csv) return false;
  const allow = new Set(
    csv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const em = String(decoded?.email || "")
    .trim()
    .toLowerCase();
  return allow.has(em);
}

async function releaseBlockedSlotIfOwned(db, bookingId, booking) {
  const date = typeof booking.date === "string" ? booking.date : "";
  const slot =
    typeof booking.slot === "string" && booking.slot
      ? booking.slot
      : slotKeyFromDur(typeof booking.dur === "string" ? booking.dur : "");
  const key = blockKey(date, slot);
  if (!key) return;
  const slotRef = db.collection("blockedSlots").doc(key);
  const snap = await slotRef.get();
  if (!snap.exists) return;
  const owner = snap.data()?.bookingId;
  if (owner === bookingId) {
    await slotRef.delete();
  }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: "stripe_not_configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "invalid_json" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "invalid_body" });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: "invalid_session_id" });
  }

  let requestedRefundCents = null;
  if (body.amount != null && body.amount !== "") {
    const n = Number(body.amount);
    if (!Number.isFinite(n) || n <= 0) {
      return res.status(400).json({ error: "invalid_amount" });
    }
    requestedRefundCents = Math.round(n * 100);
    if (requestedRefundCents < 1) {
      return res.status(400).json({ error: "invalid_amount" });
    }
  }

  const bearer = extractBearer(req);
  if (!bearer) {
    return res.status(401).json({ error: "missing_authorization" });
  }

  let decoded;
  try {
    ensureFirebaseApp();
    decoded = await getAuth().verifyIdToken(bearer);
  } catch (e) {
    console.warn("[refund-payment] verifyIdToken failed", e?.message || e);
    return res.status(401).json({ error: "invalid_token" });
  }

  if (!actorMayRefund(decoded)) {
    console.warn("[refund-payment] forbidden actor", { uid: decoded.uid, email: decoded.email });
    return res.status(403).json({
      error: "forbidden_admin_only",
      message:
        "Configure ADMIN_REFUND_ALLOWED_EMAILS (CSV) or Firebase custom claim admin:true on this user.",
    });
  }

  const stripe = new Stripe(stripeKey);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch (e) {
    console.error("[refund-payment] retrieve session", e?.message || e);
    return res.status(404).json({ error: "session_not_found" });
  }

  const bookingId =
    pickString(session.metadata || {}, ["bookingId", "booking_id"]) ||
    "";

  const piRaw = session.payment_intent;
  const paymentIntentId =
    typeof piRaw === "string" ? piRaw : piRaw?.id ? piRaw.id : "";

  if (!paymentIntentId) {
    return res.status(400).json({ error: "missing_payment_intent" });
  }

  const amountTotal =
    typeof session.amount_total === "number" && session.amount_total > 0 ? session.amount_total : 0;

  if (requestedRefundCents != null && amountTotal > 0 && requestedRefundCents > amountTotal) {
    return res.status(400).json({ error: "amount_exceeds_charge" });
  }

  let db;
  let bookingRef;
  let bookingSnap;
  try {
    ensureFirebaseApp();
    db = getFirestore();
    if (!bookingId) {
      return res.status(400).json({ error: "missing_booking_metadata" });
    }
    bookingRef = db.collection("bookings").doc(bookingId);
    bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return res.status(404).json({ error: "booking_not_found" });
    }
  } catch (e) {
    console.error("[refund-payment] firestore init/read", e?.message || e);
    return res.status(503).json({ error: "firebase_misconfigured" });
  }

  const booking = bookingSnap.data() || {};
  const storedSid =
    typeof booking.stripeCheckoutSessionId === "string"
      ? booking.stripeCheckoutSessionId
      : typeof booking.stripeSessionId === "string"
        ? booking.stripeSessionId
        : "";

  if (!storedSid || storedSid !== sessionId) {
    return res.status(403).json({ error: "session_booking_mismatch" });
  }

  const st = typeof booking.status === "string" ? booking.status : "";
  const ps = typeof booking.paymentStatus === "string" ? booking.paymentStatus : "";
  const paidLike =
    st === "confirmed" ||
    st === "paid" ||
    st === "partially_refunded" ||
    ps === "paid" ||
    ps === "partial_refund";

  if (!paidLike) {
    return res.status(409).json({ error: "booking_not_paid", status: booking.status || "" });
  }

  if (booking.status === "refunded") {
    return res.status(409).json({
      error: "already_refunded",
      stripeRefundId: booking.stripeRefundId || null,
    });
  }

  let refund;
  try {
    const params = { payment_intent: paymentIntentId };
    if (requestedRefundCents != null) {
      params.amount = requestedRefundCents;
    }
    refund = await stripe.refunds.create(params);
  } catch (e) {
    const code = e?.code || "";
    console.error("[refund-payment] stripe.refunds.create", code, e?.message || e);
    if (code === "charge_already_refunded") {
      return res.status(409).json({ error: "stripe_already_refunded" });
    }
    return res.status(502).json({
      error: "stripe_refund_failed",
      message: typeof e?.message === "string" ? e.message : String(e ?? ""),
    });
  }

  const chargeId =
    typeof refund.charge === "string" ? refund.charge : refund.charge?.id ? refund.charge.id : "";

  let fullyRefunded = false;
  if (chargeId) {
    try {
      const ch = await stripe.charges.retrieve(chargeId);
      fullyRefunded = ch.refunded === true;
    } catch (e) {
      console.warn("[refund-payment] could not retrieve charge for refund completeness", e?.message || e);
      fullyRefunded =
        typeof refund.amount === "number" &&
        amountTotal > 0 &&
        refund.amount >= amountTotal &&
        requestedRefundCents == null;
    }
  } else {
    fullyRefunded = requestedRefundCents == null;
  }

  const auditEntry = {
    refundId: refund.id,
    byUid: decoded.uid || "",
    byEmail: String(decoded.email || ""),
    amountCents: typeof refund.amount === "number" ? refund.amount : 0,
    currency: refund.currency || session.currency || "eur",
    at: Timestamp.now(),
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: sessionId,
  };

  const nextStatus = fullyRefunded ? "refunded" : "partially_refunded";

  try {
    await bookingRef.set(
      {
        status: nextStatus,
        paymentStatus: fullyRefunded ? "refunded" : "partial_refund",
        stripeRefundId: refund.id,
        stripeRefundAmountCents: typeof refund.amount === "number" ? refund.amount : 0,
        refundedAt: FieldValue.serverTimestamp(),
        refundedByUid: decoded.uid || "",
        refundedByEmail: String(decoded.email || ""),
        refundAudit: FieldValue.arrayUnion(auditEntry),
      },
      { merge: true },
    );
    if (fullyRefunded) {
      await releaseBlockedSlotIfOwned(db, bookingId, booking);
    }
  } catch (e) {
    console.error("[refund-payment] firestore update after Stripe refund — reconcile manually", {
      bookingId,
      refundId: refund.id,
      err: e?.message || e,
    });
    return res.status(500).json({
      error: "firestore_update_failed_after_refund",
      refundId: refund.id,
      message:
        "Stripe refund succeeded but Firestore update failed; fix booking manually from Stripe Dashboard.",
    });
  }

  const customerEmail =
    (typeof booking.email === "string" && booking.email.trim()) ||
    (typeof booking.stripeCustomerEmail === "string" && booking.stripeCustomerEmail.trim()) ||
    (typeof session.customer_details?.email === "string" && session.customer_details.email.trim()) ||
    (typeof session.customer_email === "string" && session.customer_email.trim()) ||
    "";

  const emailRes = await sendStripeRefundCustomerEmail({
    to: customerEmail,
    guest: typeof booking.guest === "string" ? booking.guest : "",
    bookingId,
    boatName: typeof booking.boat === "string" ? booking.boat : "",
    date: typeof booking.date === "string" ? booking.date : "",
    dur: typeof booking.dur === "string" ? booking.dur : "",
    guests: typeof booking.guests === "number" ? booking.guests : Number(booking.guests) || 0,
    refundAmountCents: typeof refund.amount === "number" ? refund.amount : 0,
    refundId: refund.id,
    stripeSessionId: sessionId,
    fullyRefunded,
  });

  if (!emailRes.ok) {
    console.warn("[refund-payment] customer refund email not sent", {
      bookingId,
      skipped: emailRes.skipped,
      reason: emailRes.reason,
      error: emailRes.error,
    });
  }

  console.log("[refund-payment] ok", {
    bookingId,
    sessionId,
    refundId: refund.id,
    amountCents: refund.amount,
    by: decoded.email,
    fullyRefunded,
  });

  return res.status(200).json({
    ok: true,
    refundId: refund.id,
    bookingId,
    amountCents: refund.amount,
    currency: refund.currency || session.currency || "eur",
    fullyRefunded,
    status: nextStatus,
    emailSent: emailRes.ok === true,
  });
}
