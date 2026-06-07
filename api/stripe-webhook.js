import Stripe from "stripe";
import getRawBody from "raw-body";
import { FieldValue } from "firebase-admin/firestore";
import { ensureFirebaseApp, getFirestore } from "./lib/firebase-admin.js";
import { blockKey, slotKeyFromDur } from "./lib/slots.js";
import { sendBookingConfirmationEmail, sendAdminPaidBookingEmail } from "./lib/send-email.js";
import { buildPromoReleaseUpdate } from "./lib/discount-code.js";

/**
 * Endpoint que recibe los webhooks firmados de Stripe.
 *
 * En Vercel necesitamos leer el body crudo (Buffer) para que
 * `stripe.webhooks.constructEvent` pueda verificar la firma con
 * STRIPE_WEBHOOK_SECRET. Si Vercel preprocesa el body como JSON, la firma
 * falla. Por eso desactivamos el bodyParser y leemos con `raw-body`.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readStripeBody(req) {
  const length = req.headers["content-length"];
  return getRawBody(req, {
    length: length ? Number(length) : undefined,
    limit: "2mb",
  });
}

/** Evita crear un doc `bookings/{id}` huérfano si el pago llegó sin documento. */
async function mergeBookingFieldsIfExists(bookingRef, patch) {
  const snap = await bookingRef.get();
  if (!snap.exists) return;
  await bookingRef.set(patch, { merge: true });
}

/** Devuelve el primer valor no vacío entre las claves indicadas en el objeto. */
function pickString(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Asegura que `blockedSlots/{key}` existe. Si ya existe para esta misma
 * reserva, no duplica; si existe con otra `bookingId`, no la sobrescribe
 * (caso anómalo: lo registramos y dejamos auditoría).
 */
async function ensureSlotBlocked(db, { bookingId, dateStr, slot }) {
  const key = blockKey(dateStr, slot);
  if (!key) {
    console.warn("[webhook] cannot block slot: invalid key", { bookingId, dateStr, slot });
    return { ok: false, reason: "invalid_key" };
  }
  const slotRef = db.collection("blockedSlots").doc(key);
  let blockedNow = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(slotRef);
    if (snap.exists) {
      const cur = snap.data() || {};
      if (cur.bookingId && cur.bookingId !== bookingId) {
        console.warn(
          "[webhook] slot already blocked by another booking",
          { key, owner: cur.bookingId, newBooking: bookingId },
        );
      }
      return;
    }
    tx.set(slotRef, {
      bookingId,
      date: dateStr,
      slot,
      createdAt: FieldValue.serverTimestamp(),
    });
    blockedNow = true;
  });
  return { ok: true, blockedNow, key };
}

async function releaseHold(db, bookingId) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists) return;
  const b = snap.data() || {};
  if (b.status !== "pending_payment") return;
  const slot = typeof b.slot === "string" && b.slot ? b.slot : "";
  const date = typeof b.date === "string" ? b.date : "";
  const key = date && slot ? blockKey(date, slot) : "";
  const slotRef = key ? db.collection("blockedSlots").doc(key) : null;
  const promoId = typeof b.promoCode === "string" && b.promoCode.length >= 4 ? b.promoCode : "";
  const codeRef = promoId ? db.collection("discountCodes").doc(promoId) : null;

  await db.runTransaction(async (tx) => {
    const bSnap = await tx.get(bookingRef);
    if (!bSnap.exists) return;
    const cur = bSnap.data() || {};
    if (cur.status !== "pending_payment") return;
    if (slotRef) {
      const sSnap = await tx.get(slotRef);
      if (sSnap.exists && sSnap.data()?.bookingId === bookingId) {
        tx.delete(slotRef);
      }
    }
    tx.delete(bookingRef);
    if (codeRef) {
      const cSnap = await tx.get(codeRef);
      if (cSnap.exists) {
        const release = buildPromoReleaseUpdate(cSnap.data(), bookingId);
        if (release) tx.update(codeRef, release);
      }
    }
  });
}

/**
 * Confirma la reserva en Firestore tras un pago correcto.
 * - status      → "confirmed"
 * - paymentStatus → "paid"
 * - stripeSessionId, stripePaymentIntentId, stripeAmountTotal, stripeCustomerEmail
 * - paidAt      → serverTimestamp
 *
 * Es idempotente: si el booking ya está `confirmed`/`paid`, devuelve sin
 * tocar nada (los reintentos de Stripe no duplican efectos).
 */
async function confirmBookingFromSession(db, session) {
  const meta = session.metadata || {};
  const bookingId = pickString(meta, ["bookingId", "booking_id"]);
  if (!bookingId) {
    console.warn("[webhook] checkout.session.completed missing bookingId metadata", { sessionId: session.id });
    return { ok: false, reason: "missing_booking_id" };
  }

  const bookingRef = db.collection("bookings").doc(bookingId);
  const customerEmail =
    (typeof session.customer_details?.email === "string" && session.customer_details.email.trim()) ||
    (typeof session.customer_email === "string" && session.customer_email.trim()) ||
    "";
  const amountTotal =
    typeof session.amount_total === "number" && session.amount_total > 0 ? session.amount_total : 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || "";

  /** Datos para email y para reconstruir contexto si el doc no existiera. */
  const ctx = {
    bookingId,
    boatName: pickString(meta, ["boatName"]),
    date: pickString(meta, ["date", "selected_date"]),
    dur: pickString(meta, ["dur", "duration"]),
    guests: pickString(meta, ["guests"]),
    guest: pickString(meta, ["guest"]),
    phone: pickString(meta, ["phone"]),
    email: customerEmail,
    amountCents: amountTotal,
  };

  let confirmation;
  try {
    confirmation = await db.runTransaction(async (tx) => {
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists) {
        return {
          status: "missing",
          slot: slotKeyFromDur(ctx.dur),
          date: ctx.date,
          boat: ctx.boatName,
          guest: ctx.guest,
          email: ctx.email,
          phone: ctx.phone,
          guests: ctx.guests,
          dur: ctx.dur,
          total: amountTotal > 0 ? amountTotal / 100 : null,
          confirmationEmailSent: false,
          adminPaidBookingEmailSent: false,
        };
      }
      const b = bSnap.data() || {};
      const slot =
        (typeof b.slot === "string" && b.slot) ||
        slotKeyFromDur(ctx.dur || b.dur || "") ||
        "";
      const date = (typeof b.date === "string" && b.date) || ctx.date || "";
      const boat = (typeof b.boat === "string" && b.boat) || ctx.boatName || "";
      const guest = (typeof b.guest === "string" && b.guest) || ctx.guest || "";
      const email = (typeof b.email === "string" && b.email) || ctx.email || "";
      const phone = (typeof b.phone === "string" && b.phone) || ctx.phone || "";
      const guests = (typeof b.guests === "number" && b.guests) || Number(ctx.guests) || 0;
      const dur = (typeof b.dur === "string" && b.dur) || ctx.dur || "";
      const total =
        typeof b.total === "number" ? b.total : amountTotal > 0 ? amountTotal / 100 : null;

      const sid = typeof b.stripeCheckoutSessionId === "string" ? b.stripeCheckoutSessionId : "";
      if (sid && sid !== session.id) {
        throw Object.assign(new Error("session_mismatch"), { code: "session_mismatch" });
      }

      const alreadyConfirmed = b.status === "confirmed" || b.status === "paid";

      if (!alreadyConfirmed && b.status && b.status !== "pending_payment") {
        throw Object.assign(new Error("invalid_booking_status"), {
          code: "invalid_booking_status",
          status: b.status,
        });
      }

      if (!alreadyConfirmed && typeof b.total === "number" && amountTotal > 0) {
        const expectedCents = Math.round(b.total * 100);
        if (expectedCents !== amountTotal) {
          throw Object.assign(new Error("amount_mismatch"), {
            code: "amount_mismatch",
            expected: expectedCents,
            received: amountTotal,
          });
        }
      }

      if (!alreadyConfirmed) {
        tx.update(bookingRef, {
          status: "confirmed",
          paymentStatus: "paid",
          stripeSessionId: session.id,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeAmountTotal: amountTotal,
          stripeCustomerEmail: email,
          paidAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        status: alreadyConfirmed ? "already_confirmed" : "confirmed",
        slot,
        date,
        boat,
        guest,
        email,
        phone,
        guests,
        dur,
        total,
        confirmationEmailSent: b.confirmationEmailSent === true,
        adminPaidBookingEmailSent: b.adminPaidBookingEmailSent === true,
      };
    });
  } catch (e) {
    const code = e?.code || String(e?.message || e);
    if (code === "session_mismatch" || code === "amount_mismatch" || code === "invalid_booking_status") {
      console.error("[webhook] confirm rejected", code, {
        bookingId,
        sessionId: session.id,
        info: { expected: e?.expected, received: e?.received, status: e?.status },
      });
      return { ok: false, reason: code };
    }
    throw e;
  }

  if (confirmation.status === "missing") {
    console.warn("[webhook] booking doc not found, will still try to block slot + email", {
      bookingId,
      sessionId: session.id,
    });
  } else {
    console.log("[webhook] booking confirmed", {
      bookingId,
      sessionId: session.id,
      reused: confirmation.status === "already_confirmed",
    });
  }

  if (confirmation.date && confirmation.slot) {
    try {
      const blockRes = await ensureSlotBlocked(db, {
        bookingId,
        dateStr: confirmation.date,
        slot: confirmation.slot,
      });
      if (blockRes.ok) {
        console.log("[webhook] slot blocked", {
          bookingId,
          key: blockRes.key,
          createdNow: blockRes.blockedNow,
        });
      }
    } catch (e) {
      console.error("[webhook] slot block failed", { bookingId, message: e?.message || e });
    }
  }

  const recipient =
    [confirmation.email, ctx.email, customerEmail]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .find((x) => x.includes("@")) || "";
  const alreadyCustomerEmailed = confirmation.confirmationEmailSent === true;
  const alreadyAdminEmailed = confirmation.adminPaidBookingEmailSent === true;

  const emailPayload = {
    bookingId,
    guest: confirmation.guest || ctx.guest || "",
    phone: confirmation.phone || ctx.phone || "",
    boatName: confirmation.boat || ctx.boatName || "",
    date: confirmation.date || ctx.date || "",
    dur: confirmation.dur || ctx.dur || "",
    guests: confirmation.guests || ctx.guests || "",
    amountCents: amountTotal,
    amountEuros: typeof confirmation.total === "number" ? confirmation.total : undefined,
  };

  if (recipient && !alreadyCustomerEmailed) {
    try {
      console.log("[email] sending customer confirmation", { bookingId, to: recipient });
      const emailRes = await sendBookingConfirmationEmail({
        ...emailPayload,
        to: recipient,
      });
      if (emailRes.ok) {
        console.log("[email] customer sent", { bookingId, to: recipient, id: emailRes.id });
        try {
          await mergeBookingFieldsIfExists(bookingRef, {
            confirmationEmailSent: true,
            confirmationEmailAt: FieldValue.serverTimestamp(),
          });
        } catch (markErr) {
          console.error("[email] error", "could not mark confirmationEmailSent", markErr?.stack || markErr?.message || markErr);
        }
      } else if (emailRes.skipped) {
        console.error("[email] error", "customer confirmation skipped", {
          bookingId,
          reason: emailRes.reason,
        });
      } else {
        console.error("[email] error", "customer confirmation failed", {
          bookingId,
          error: emailRes.error,
        });
      }
    } catch (e) {
      console.error("[email] error", "customer confirmation threw", e?.stack || e?.message || e);
    }
  } else if (alreadyCustomerEmailed) {
    console.log("[email] customer sent (already recorded)", { bookingId });
  } else {
    console.error("[email] error", "no recipient for customer confirmation", { bookingId });
  }

  if (!alreadyAdminEmailed) {
    try {
      console.log("[email] sending admin notification", { bookingId });
      const adminRes = await sendAdminPaidBookingEmail({
        guest: emailPayload.guest,
        customerEmail: recipient || customerEmail || confirmation.email || ctx.email || "",
        phone: emailPayload.phone,
        boatName: emailPayload.boatName,
        date: emailPayload.date,
        dur: emailPayload.dur,
        guests: emailPayload.guests,
        amountCents: emailPayload.amountCents,
        amountEuros: emailPayload.amountEuros,
        bookingId,
        stripeSessionId: session.id,
      });
      if (adminRes.ok) {
        console.log("[email] admin sent", { bookingId, id: adminRes.id });
        try {
          await mergeBookingFieldsIfExists(bookingRef, {
            adminPaidBookingEmailSent: true,
            adminPaidBookingEmailAt: FieldValue.serverTimestamp(),
          });
        } catch (markErr) {
          console.error("[email] error", "could not mark adminPaidBookingEmailSent", markErr?.stack || markErr?.message || markErr);
        }
      } else if (adminRes.skipped) {
        console.error("[email] error", "admin notification skipped", { bookingId, reason: adminRes.reason });
      } else {
        console.error("[email] error", "admin notification failed", { bookingId, error: adminRes.error });
      }
    } catch (e) {
      console.error("[email] error", "admin notification threw", e?.stack || e?.message || e);
    }
  } else {
    console.log("[email] admin sent (already recorded)", { bookingId });
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  console.log("[webhook] received");

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    console.error("[webhook] missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return res.status(503).send("misconfigured");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("missing signature");
  }

  let raw;
  try {
    raw = await readStripeBody(req);
  } catch (e) {
    console.error("[webhook] body read failed", e?.message || e);
    return res.status(400).send("bad body");
  }

  let event;
  try {
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err?.message || err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    ensureFirebaseApp();
  } catch (e) {
    console.error("[webhook] firebase init failed", e?.message || e);
    return res.status(503).send("firebase misconfigured");
  }

  const db = getFirestore();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("[webhook] checkout.session.completed", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        bookingId: session.metadata?.bookingId || session.metadata?.booking_id || "",
      });
      if (session.payment_status === "paid") {
        const result = await confirmBookingFromSession(db, session);
        if (!result?.ok) {
          return res.status(500).json({ error: result?.reason || "confirm_failed" });
        }
      } else {
        console.warn("[webhook] checkout.session.completed but payment_status not paid", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });
      }
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      console.log("[webhook] checkout.session.async_payment_succeeded", { sessionId: session.id });
      const result = await confirmBookingFromSession(db, session);
      if (!result?.ok) {
        return res.status(500).json({ error: result?.reason || "confirm_failed" });
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const bookingId =
        session.metadata?.bookingId || session.metadata?.booking_id || "";
      if (bookingId) await releaseHold(db, bookingId);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const bookingId =
        session.metadata?.bookingId || session.metadata?.booking_id || "";
      if (bookingId) await releaseHold(db, bookingId);
    }
  } catch (e) {
    console.error("[webhook] handler error", event?.type, e?.message || e);
    return res.status(500).json({ error: "handler_failed" });
  }

  return res.status(200).json({ received: true });
}
