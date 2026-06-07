import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirestoreDb, getFirebaseAuth } from "./firebase-app.js";
import { buildPromoRedeemUpdateClient, isAllowedDiscountPct } from "./discount-codes-firestore.js";

function slotKeyFromDur(dur) {
  if (dur === "full") return "full";
  if (dur === "half_am") return "am";
  if (dur === "half_pm") return "pm";
  if (dur === "sunset") return "sunset";
  if (dur === "half") return "am";
  return "";
}

export function blockKey(dateStr, slot) {
  if (!dateStr) return "";
  if (slot === "full" || !slot) return dateStr;
  return `${dateStr}|${slot}`;
}

function bookingToFirestorePayload(booking) {
  const base = {
    guest: String(booking.guest ?? "").slice(0, 120),
    email: String(booking.email ?? "").slice(0, 120),
    phone: String(booking.phone ?? "").slice(0, 40),
    date: String(booking.date ?? ""),
    dur: String(booking.dur ?? "").slice(0, 32),
    boat: String(booking.boat ?? "").slice(0, 120),
    guests: Math.min(99, Math.max(1, parseInt(booking.guests, 10) || 1)),
    total: typeof booking.total === "number" && Number.isFinite(booking.total) ? booking.total : Number(booking.total) || 0,
    status: String(booking.status ?? "pending").slice(0, 24),
    notes: typeof booking.notes === "string" ? booking.notes.slice(0, 2000) : "",
    payment: String(booking.payment ?? "").slice(0, 24),
    slot: String(booking.slot ?? "").slice(0, 16),
    createdAt: serverTimestamp(),
  };
  const code = typeof booking.promoCode === "string" ? booking.promoCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24) : "";
  const sub = typeof booking.subtotal === "number" && Number.isFinite(booking.subtotal) ? booking.subtotal : null;
  const dpct = Number(booking.discountPct);
  if (code.length >= 4 && sub != null && sub >= 1 && isAllowedDiscountPct(dpct)) {
    return {
      ...base,
      promoCode: code,
      subtotal: sub,
      discountPct: dpct,
    };
  }
  return base;
}

function docToBooking(d) {
  const x = d.data();
  const row = {
    id: d.id,
    guest: String(x.guest || ""),
    email: String(x.email || ""),
    phone: String(x.phone || ""),
    date: String(x.date || ""),
    dur: String(x.dur || ""),
    boat: String(x.boat || ""),
    guests: Number(x.guests) || 0,
    total: typeof x.total === "number" ? x.total : Number(x.total) || 0,
    status: String(x.status || "pending"),
    notes: String(x.notes || ""),
    payment: String(x.payment || ""),
    slot: String(x.slot || ""),
  };
  if (typeof x.promoCode === "string" && x.promoCode) row.promoCode = String(x.promoCode);
  if (typeof x.subtotal === "number" && Number.isFinite(x.subtotal)) row.subtotal = x.subtotal;
  const dpct = Number(x.discountPct);
  if (isAllowedDiscountPct(dpct)) row.discountPct = dpct;
  if (typeof x.boatId === "string" && x.boatId) row.boatId = String(x.boatId);
  if (x.paymentHoldExpiresAt && typeof x.paymentHoldExpiresAt.toMillis === "function") {
    row.paymentHoldExpiresAt = x.paymentHoldExpiresAt.toMillis();
  }
  if (typeof x.stripeCheckoutSessionId === "string") row.stripeCheckoutSessionId = x.stripeCheckoutSessionId;
  if (typeof x.stripePaymentIntentId === "string") row.stripePaymentIntentId = x.stripePaymentIntentId;
  if (typeof x.stripeAmountTotal === "number") row.stripeAmountTotal = x.stripeAmountTotal;
  if (typeof x.stripeCustomerEmail === "string") row.stripeCustomerEmail = x.stripeCustomerEmail;
  if (typeof x.stripeRefundId === "string") row.stripeRefundId = x.stripeRefundId;
  if (typeof x.paymentStatus === "string") row.paymentStatus = x.paymentStatus;
  return row;
}

/**
 * Atomically reserves a slot and creates the booking doc. Fails if slot doc already exists.
 */
export async function commitPublicBooking(booking, slotKey) {
  const db = getFirestoreDb();
  if (!db) throw new Error("no_firebase");
  if (!booking?.id || typeof booking.id !== "string") throw new Error("invalid_booking");

  const bookingRef = doc(db, "bookings", booking.id);
  const slotRef = doc(db, "blockedSlots", slotKey);
  const payload = bookingToFirestorePayload(booking);

  const promoId =
    typeof payload.promoCode === "string" && payload.promoCode.length >= 4 && isAllowedDiscountPct(payload.discountPct)
      ? payload.promoCode
      : "";
  const codeRef = promoId ? doc(db, "discountCodes", promoId) : null;

  try {
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotRef);
      if (slotSnap.exists()) {
        throw new Error("slot_taken");
      }

      if (codeRef) {
        const codeSnap = await transaction.get(codeRef);
        if (!codeSnap.exists()) {
          throw new Error("invalid_promo");
        }
        const redeem = buildPromoRedeemUpdateClient(codeSnap.data(), booking.id);
        if (redeem.pct !== payload.discountPct) {
          throw new Error("invalid_promo");
        }
        transaction.update(codeRef, redeem.update);
      }

      transaction.set(slotRef, {
        bookingId: booking.id,
        date: payload.date,
        slot: payload.slot,
        createdAt: serverTimestamp(),
      });
      transaction.set(bookingRef, payload);
    });
  } catch (e) {
    if (String(e?.message || e).includes("slot_taken")) throw new Error("slot_taken");
    if (String(e?.message || e).includes("invalid_promo")) throw new Error("invalid_promo");
    throw e;
  }
}

/** All blocked slot keys (doc ids) for merging into the public calendar. */
export function subscribeFirestoreBlockedSlots(onKeys, onErr) {
  const db = getFirestoreDb();
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "blockedSlots"),
    (snap) => {
      const keys = [];
      snap.forEach((d) => keys.push(d.id));
      onKeys(keys);
    },
    onErr,
  );
}

/** Full booking list for admin / synced clients (PII — rules require auth to read). */
export function subscribeFirestoreBookings(onRows, onErr) {
  const db = getFirestoreDb();
  if (!db) return () => {};
  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push(docToBooking(d)));
      onRows(rows);
    },
    onErr,
  );
}

export async function updateBookingFirestore(bookingId, partial) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) throw new Error("auth");
  const ref = doc(db, "bookings", bookingId);
  const clean = {};
  if (partial.status != null) clean.status = String(partial.status).slice(0, 24);
  if (Object.keys(clean).length === 0) return;
  await updateDoc(ref, clean);
}

/**
 * Ensures `blockedSlots/{key}` exists for a confirmed/pending hold (admin path, imports, legacy rows).
 * Public clients listen to `blockedSlots` in real time — without this doc they only see blocks after `sitePublic/live` sync.
 */
export async function ensureBookingSlotBlockedFirestore(booking) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser || !booking || typeof booking.date !== "string") return;
  const slot = typeof booking.slot === "string" && booking.slot ? booking.slot : slotKeyFromDur(booking.dur);
  const k = blockKey(booking.date, slot);
  if (!k) return;
  const slotRef = doc(db, "blockedSlots", k);
  await setDoc(
    slotRef,
    {
      bookingId: String(booking.id || ""),
      date: String(booking.date || ""),
      slot: String(slot || ""),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteBlockedSlotFirestore(slotKey) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser || !slotKey) return;
  await deleteDoc(doc(db, "blockedSlots", slotKey));
}

export async function deleteBookingFirestore(bookingId) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) throw new Error("auth");
  await deleteDoc(doc(db, "bookings", bookingId));
}

/** Cancel: mark cancelled and release slot. */
export async function cancelBookingFirestore(booking) {
  await updateBookingFirestore(booking.id, { status: "cancelled" });
  const slot = typeof booking.slot === "string" && booking.slot ? booking.slot : slotKeyFromDur(booking.dur);
  const k = blockKey(booking.date, slot);
  if (k) await deleteBlockedSlotFirestore(k);
}

/** Delete booking row and free slot. */
export async function deleteBookingAndSlotFirestore(booking) {
  const slot = typeof booking.slot === "string" && booking.slot ? booking.slot : slotKeyFromDur(booking.dur);
  const k = blockKey(booking.date, slot);
  await deleteBookingFirestore(booking.id);
  if (k) await deleteBlockedSlotFirestore(k);
}

export { slotKeyFromDur };
