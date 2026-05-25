import { ensureFirebaseApp, getFirestore } from "./lib/firebase-admin.js";
import { blockKey } from "./lib/slots.js";
import { buildPromoReleaseUpdate } from "./lib/discount-code.js";

async function releaseOne(db, bookingId, b) {
  const bookingRef = db.collection("bookings").doc(bookingId);
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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    ensureFirebaseApp();
  } catch (e) {
    return res.status(503).json({ error: "firebase_misconfigured" });
  }

  const db = getFirestore();
  const snap = await db.collection("bookings").where("status", "==", "pending_payment").limit(80).get();

  let released = 0;
  for (const doc of snap.docs) {
    const b = doc.data() || {};
    const exp = b.paymentHoldExpiresAt;
    const ms = exp?.toMillis ? exp.toMillis() : exp ? new Date(exp).getTime() : 0;
    if (ms && ms < Date.now()) {
      try {
        await releaseOne(db, doc.id, b);
        released += 1;
      } catch (e) {
        console.error("[cleanup-expired-bookings]", doc.id, e?.message || e);
      }
    }
  }

  return res.status(200).json({ ok: true, scanned: snap.size, released });
}
