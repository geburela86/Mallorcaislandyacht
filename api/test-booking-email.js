import { sendBookingConfirmationEmail, sendAdminPaidBookingEmail } from "./lib/send-email.js";

/**
 * Endpoint temporal de prueba: dispara los mismos correos que el webhook de Stripe
 * (sendBookingConfirmationEmail + sendAdminPaidBookingEmail) con datos ficticios.
 * Eliminar o proteger antes de producción pública.
 */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false });
  }

  const customerEmail = "geburela@hotmail.com";

  const bookingPayload = {
    to: customerEmail,
    bookingId: "TEST-EMAIL-001",
    guest: "Gon",
    boatName: "RIO 750 DAY CRUISER",
    date: "2026-11-05",
    dur: "Half day",
    guests: 2,
    amountEuros: 280,
  };

  const adminPayload = {
    guest: "Gon",
    customerEmail,
    phone: "",
    boatName: "RIO 750 DAY CRUISER",
    date: "2026-11-05",
    dur: "Half day",
    guests: 2,
    amountEuros: 280,
    bookingId: "TEST-EMAIL-001",
    stripeSessionId: "cs_test_TEST-EMAIL-001",
    adminTo: "info@mallorcaislandyacht.com",
  };

  try {
    const customerRes = await sendBookingConfirmationEmail(bookingPayload);
    if (customerRes.ok) {
      console.log("[test-email] customer sent");
    } else {
      console.error("[test-email] customer not sent", {
        skipped: customerRes.skipped,
        reason: customerRes.reason,
        error: customerRes.error,
      });
    }

    const adminRes = await sendAdminPaidBookingEmail(adminPayload);
    if (adminRes.ok) {
      console.log("[test-email] admin sent");
    } else {
      console.error("[test-email] admin not sent", {
        skipped: adminRes.skipped,
        reason: adminRes.reason,
        error: adminRes.error,
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("[test-email] handler error", e?.message || e);
    return res.status(500).json({ success: false });
  }
}
