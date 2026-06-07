import Stripe from "stripe";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ensureFirebaseApp, getFirestore } from "./lib/firebase-admin.js";
import { blockKey, slotKeyFromDur } from "./lib/slots.js";
import { computeCharterTotalEuros, isPromoExcludedDate } from "./lib/pricing.js";
import { normalizeVipDiscountCode } from "./lib/vip-code.js";
import { buildPromoRedeemUpdate, resolveUsableDiscountFromData } from "./lib/discount-code.js";
import { isValidE164Phone, normalizePhoneToE164 } from "../lib/phone.js";

const ALLOWED_DURS = new Set(["half_am", "half_pm", "full", "sunset"]);
const MAX_BOOKING_ADVANCE_DAYS = 180;
const HOLD_MINUTES = 30;

function errMessage(e) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") return e.message;
  return String(e ?? "unknown_error");
}

function errStack(e) {
  return e instanceof Error ? e.stack : undefined;
}

/** Stripe Node SDK attaches API payload on `raw`. */
function stripeRawPayload(e) {
  if (e && typeof e === "object" && e.raw != null && typeof e.raw === "object") return e.raw;
  return undefined;
}

function logCheckoutErr(tag, e) {
  console.error(`[create-checkout-session] ${tag} message:`, errMessage(e));
  const stack = errStack(e);
  if (stack) console.error(`[create-checkout-session] ${tag} stack:`, stack);
  const raw = stripeRawPayload(e);
  if (raw != null) {
    try {
      console.error(`[create-checkout-session] ${tag} stripe.raw:`, JSON.stringify(raw));
    } catch {
      console.error(`[create-checkout-session] ${tag} stripe.raw:`, raw);
    }
  }
}

function formatLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maxBookingDateStrAfterToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + MAX_BOOKING_ADVANCE_DAYS);
  return formatLocalYMD(t);
}

function todayYMD() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return formatLocalYMD(t);
}

function maxGuestsFromBoatCapacity(capacity) {
  if (typeof capacity === "number" && Number.isFinite(capacity)) {
    return Math.max(1, Math.min(99, Math.floor(capacity)));
  }
  const n = Number.parseInt(String(capacity ?? "").trim(), 10);
  if (Number.isFinite(n) && n >= 1) return Math.max(1, Math.min(99, n));
  return 6;
}

function resolveBoat(boats, boatId, boatName) {
  const list = Array.isArray(boats) ? boats : [];
  const id = typeof boatId === "string" ? boatId.trim() : "";
  const name = typeof boatName === "string" ? boatName.trim() : "";
  if (id) {
    const byId = list.find((b) => b && String(b.id) === id);
    if (byId) return byId;
  }
  if (name) {
    const byName = list.find((b) => b && String(b.name) === name);
    if (byName) return byName;
  }
  return null;
}

function siteUrl() {
  const u = process.env.SITE_URL || process.env.VERCEL_URL;
  if (!u) return "http://localhost:5173";
  if (u.startsWith("http")) return u.replace(/\/+$/, "");
  return `https://${u}`.replace(/\/+$/, "");
}

function newBookingId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `MIY-${Date.now().toString(36)}-${rand}`.toUpperCase();
}

function sanitizePayload(body) {
  const guest = String(body?.guest ?? "").trim().slice(0, 120);
  const email = String(body?.email ?? "").trim().slice(0, 120);
  const phone = String(body?.phone ?? "").trim().slice(0, 40);
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "";
  const date = String(body?.date ?? "").trim();
  const dur = String(body?.dur ?? "").trim();
  const boatId = String(body?.boatId ?? "").trim().slice(0, 120);
  const boatName = String(body?.boatName ?? "").trim().slice(0, 120);
  const guests = Math.min(99, Math.max(1, parseInt(body?.guests, 10) || 1));
  const promoRaw = body?.promoCode != null ? String(body.promoCode) : "";
  const promoCode = normalizeVipDiscountCode(promoRaw);
  return { guest, email, phone, notes, date, dur, boatId, boatName, guests, promoCode };
}

function isSlotBlocked(dateStr, slot, keys) {
  if (!dateStr) return false;
  if (keys.has(dateStr)) return true;
  if (slot === "full") {
    return (
      keys.has(dateStr) ||
      keys.has(`${dateStr}|am`) ||
      keys.has(`${dateStr}|pm`) ||
      keys.has(`${dateStr}|sunset`)
    );
  }
  return keys.has(`${dateStr}|${slot}`);
}

async function loadBlockedKeysForDate(db, dateStr) {
  const keys = new Set();
  const base = db.collection("blockedSlots");
  const snaps = await Promise.all([
    base.doc(dateStr).get(),
    base.doc(`${dateStr}|am`).get(),
    base.doc(`${dateStr}|pm`).get(),
    base.doc(`${dateStr}|sunset`).get(),
    base.doc(`${dateStr}|full`).get(),
  ]);
  for (const s of snaps) {
    if (s.exists) keys.add(s.id);
  }
  return keys;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error("[create-checkout-session] STRIPE_SECRET_KEY missing");
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

  const p = sanitizePayload(body);
  if (!p.guest || !p.email || !p.phone) {
    return res.status(400).json({ error: "missing_guest_fields" });
  }
  const phoneNorm = normalizePhoneToE164(p.phone);
  if (!phoneNorm.ok || !isValidE164Phone(phoneNorm.e164)) {
    return res.status(400).json({ error: "invalid_phone" });
  }
  p.phone = phoneNorm.e164;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    return res.status(400).json({ error: "invalid_email" });
  }
  if (!ALLOWED_DURS.has(p.dur)) {
    return res.status(400).json({ error: "invalid_duration" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    return res.status(400).json({ error: "invalid_date" });
  }
  const today = todayYMD();
  if (p.date < today) {
    return res.status(400).json({ error: "date_in_past" });
  }
  if (p.date > maxBookingDateStrAfterToday()) {
    return res.status(400).json({ error: "date_too_far" });
  }

  const slot = slotKeyFromDur(p.dur);
  const slotDocKey = blockKey(p.date, slot);
  if (!slotDocKey) {
    return res.status(400).json({ error: "invalid_slot" });
  }

  try {
    ensureFirebaseApp();
  } catch (e) {
    logCheckoutErr("firebase init", e);
    return res.status(503).json({
      error: "server_misconfigured",
      message: errMessage(e),
    });
  }

  const db = getFirestore();
  const liveSnap = await db.doc("sitePublic/live").get();
  const live = liveSnap.data() || {};
  const settings = live.settings && typeof live.settings === "object" ? live.settings : {};
  const boats = Array.isArray(live.boats) ? live.boats : [];
  const boat = resolveBoat(boats, p.boatId, p.boatName);
  if (!boat || typeof boat.name !== "string" || !boat.name.trim()) {
    return res.status(400).json({ error: "unknown_boat" });
  }
  const boatDisplayName = boat.name.trim();
  const boatStableId = boat.id != null ? String(boat.id) : boatDisplayName;
  const maxGuests = maxGuestsFromBoatCapacity(boat.capacity);
  if (p.guests > maxGuests) {
    return res.status(400).json({ error: "guests_over_capacity", maxGuests });
  }

  const blockedKeys = await loadBlockedKeysForDate(db, p.date);
  if (isSlotBlocked(p.date, slot, blockedKeys)) {
    return res.status(409).json({ error: "slot_unavailable" });
  }

  const baseNoDiscount = computeCharterTotalEuros(settings, p.date, p.dur, 0);
  const promoId = p.promoCode.length >= 4 ? p.promoCode : "";
  if (promoId && isPromoExcludedDate(settings, p.date)) {
    return res.status(400).json({ error: "promo_excluded_date" });
  }
  let promoPct = null;
  if (promoId) {
    const codeSnap = await db.collection("discountCodes").doc(promoId).get();
    const resolved = codeSnap.exists ? resolveUsableDiscountFromData(codeSnap.data()) : null;
    if (!resolved) {
      return res.status(400).json({ error: "invalid_promo" });
    }
    promoPct = resolved.pct;
  }
  const total = promoPct != null ? computeCharterTotalEuros(settings, p.date, p.dur, promoPct) : baseNoDiscount;
  const subtotal = promoPct != null ? baseNoDiscount : null;
  if (!Number.isFinite(total) || total < 1) {
    const message = `computed total=${String(total)} (need finite number ≥ 1 EUR); dur=${p.dur} date=${p.date}`;
    console.error("[create-checkout-session] invalid_price", message);
    return res.status(400).json({ error: "invalid_price", message });
  }

  const amountCents = Math.round(total * 100);
  if (amountCents < 100) {
    return res.status(400).json({ error: "amount_too_low" });
  }

  const bookingId = newBookingId();
  const holdUntil = Timestamp.fromMillis(Date.now() + HOLD_MINUTES * 60 * 1000);
  const bookingRef = db.collection("bookings").doc(bookingId);
  const slotRef = db.collection("blockedSlots").doc(slotDocKey);
  const codeRef = promoId ? db.collection("discountCodes").doc(promoId) : null;

  try {
    await db.runTransaction(async (tx) => {
      const slotSnap = await tx.get(slotRef);
      if (slotSnap.exists) {
        throw Object.assign(new Error("slot_taken"), { code: "slot_taken" });
      }

      if (codeRef) {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
          throw Object.assign(new Error("invalid_promo"), { code: "invalid_promo" });
        }
        const redeem = buildPromoRedeemUpdate(codeSnap.data(), bookingId);
        tx.update(codeRef, redeem.update);
        if (redeem.pct !== promoPct) {
          throw Object.assign(new Error("invalid_promo"), { code: "invalid_promo" });
        }
      }

      tx.set(slotRef, {
        bookingId,
        date: p.date,
        slot,
        createdAt: FieldValue.serverTimestamp(),
      });

      const bookingRow = {
        guest: p.guest,
        email: p.email,
        phone: p.phone,
        date: p.date,
        dur: p.dur,
        boat: boatDisplayName,
        boatId: boatStableId,
        guests: p.guests,
        total,
        status: "pending_payment",
        notes: p.notes,
        payment: "stripe",
        slot,
        paymentHoldExpiresAt: holdUntil,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        stripeAmountTotal: null,
        stripeCustomerEmail: null,
        paidAt: null,
        createdAt: FieldValue.serverTimestamp(),
        ...(promoId && promoPct != null
          ? {
              promoCode: promoId,
              subtotal,
              discountPct: promoPct,
            }
          : {}),
      };
      tx.set(bookingRef, bookingRow);
    });
  } catch (e) {
    const code = e?.code || String(e?.message || e);
    if (code === "slot_taken") {
      return res.status(409).json({ error: "slot_unavailable" });
    }
    if (code === "invalid_promo") {
      return res.status(400).json({ error: "invalid_promo" });
    }
    logCheckoutErr("transaction", e);
    return res.status(500).json({
      error: "booking_failed",
      message: errMessage(e),
    });
  }

  const stripe = new Stripe(stripeSecret);
  const origin = siteUrl();
  const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/booking/payment/cancel`;

  const durLabel = p.dur === "full" ? "Full day" : p.dur === "sunset" ? "Sunset" : "Half day";
  const productName = `Charter · ${boatDisplayName} · ${p.date} · ${durLabel}`;

  /**
   * Metadata pasado a Stripe (límite de Stripe: 500 caracteres por valor).
   * Mantengo `booking_id` (snake_case, ya usado por flujos antiguos) y añado
   * `bookingId` (camelCase, requerido por el nuevo webhook) y los datos
   * humanos necesarios para el email de confirmación.
   */
  const metadata = {
    bookingId,
    booking_id: bookingId,
    boatId: boatStableId.slice(0, 100),
    boat_id: boatStableId.slice(0, 100),
    boatName: boatDisplayName.slice(0, 120),
    date: p.date,
    selected_date: p.date,
    dur: p.dur.slice(0, 32),
    duration: p.dur.slice(0, 32),
    slot: slot.slice(0, 24),
    slot_id: slot.slice(0, 24),
    guests: String(p.guests).slice(0, 8),
    guest: p.guest.slice(0, 120),
    phone: p.phone.slice(0, 40),
    calculated_price: String(total),
  };

  const expiresAt = Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60;

  let stripeCustomerId;
  try {
    const customer = await stripe.customers.create({
      email: p.email,
      name: p.guest.slice(0, 256),
      phone: p.phone,
      metadata: { bookingId },
    });
    stripeCustomerId = customer.id;
  } catch (e) {
    logCheckoutErr("stripe customer", e);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: p.email }),
      phone_number_collection: { enabled: true },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: expiresAt,
      metadata,
      payment_intent_data: {
        metadata,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: productName.slice(0, 120),
              description: `${boatDisplayName} · ${p.date} · ${durLabel}`.slice(0, 500),
            },
          },
        },
      ],
    });
  } catch (e) {
    console.error("[create-checkout-session] stripe", e?.message || e);
    try {
      await db.runTransaction(async (tx) => {
        tx.delete(slotRef);
        tx.delete(bookingRef);
        if (codeRef) {
          const snap = await tx.get(codeRef);
          if (snap.exists && snap.data()?.usedByBookingId === bookingId) {
            tx.update(codeRef, {
              active: true,
              usedAt: FieldValue.delete(),
              usedByBookingId: FieldValue.delete(),
            });
          }
        }
      });
    } catch (rollbackErr) {
      console.error("[create-checkout-session] rollback failed", rollbackErr);
    }
    return res.status(502).json({ error: "stripe_session_failed" });
  }

  try {
    await bookingRef.update({
      stripeCheckoutSessionId: session.id,
    });
  } catch (e) {
    logCheckoutErr("persist session id", e);
  }

  return res.status(200).json({
    url: session.url,
    bookingId,
    sessionId: session.id,
  });
}
