import { Resend } from "resend";

/**
 * Helper que envía correos transaccionales con Resend.
 *
 * Requiere:
 *   - RESEND_API_KEY  (clave secreta de Resend)
 *   - FROM_EMAIL      (remitente verificado en Resend, p.ej. "Mallorca Island Yacht <bookings@mallorcaislandyacht.com>")
 *
 * Opcional:
 *   - CONTACT_PHONE   (teléfono de contacto en el email al cliente; si falta, se usa el del huésped o info@)
 *   - ADMIN_NOTIFY_EMAIL (destino del aviso interno de reserva pagada; por defecto info@mallorcaislandyacht.com)
 *
 * Si falta alguna de las variables obligatorias, la función registra el motivo y devuelve
 * `{ ok: false, skipped: true }` sin lanzar — así un fallo de email nunca
 * provoca que el webhook devuelva 500 a Stripe.
 */

let cachedClient = null;

function getResendClient() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Resend(key);
  return cachedClient;
}

function fromAddress() {
  const v = (process.env.FROM_EMAIL || "").trim();
  return v || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateLong(ymd) {
  if (typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "";
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (!Number.isFinite(m) || m < 1 || m > 12) return ymd;
  return `${d} ${months[m - 1]} ${y}`;
}

function formatDurationLabel(dur) {
  switch (String(dur || "").trim()) {
    case "full":
      return "Full day";
    case "half_am":
      return "Half day (morning)";
    case "half_pm":
      return "Half day (afternoon)";
    case "sunset":
      return "Sunset cruise";
    default:
      return String(dur || "").replace(/_/g, " ");
  }
}

function formatAmountEUR(amountCents) {
  if (typeof amountCents === "number" && Number.isFinite(amountCents) && amountCents > 0) {
    return `${(amountCents / 100).toFixed(2)} €`;
  }
  return "";
}

/**
 * Envía un correo arbitrario por Resend.
 *
 * @param {{to: string, subject: string, html: string, text?: string, replyTo?: string}} args
 * @returns {Promise<{ok: boolean, id?: string, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const client = getResendClient();
  if (!client) {
    console.error("[email] error", "missing_RESEND_API_KEY");
    return { ok: false, skipped: true, reason: "missing_RESEND_API_KEY" };
  }
  const from = fromAddress();
  if (!from) {
    console.error("[email] error", "missing_FROM_EMAIL");
    return { ok: false, skipped: true, reason: "missing_FROM_EMAIL" };
  }
  if (!to || typeof to !== "string") {
    console.error("[email] error", "missing_to");
    return { ok: false, skipped: true, reason: "missing_to" };
  }

  try {
    const payload = {
      from,
      to,
      subject: subject || "Mallorca Island Yacht",
      html: html || "",
    };
    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo;
    const { data, error } = await client.emails.send(payload);
    if (error) {
      let errSerialized = "";
      try {
        errSerialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch {
        errSerialized = String(error);
      }
      console.error("[email] error", "resend.send returned error", errSerialized || error?.message || error);
      return { ok: false, error: String(error?.message || errSerialized || error) };
    }
    return { ok: true, id: data?.id || "" };
  } catch (e) {
    const msg = e?.message || String(e);
    const stack = e?.stack || "";
    let extra = "";
    try {
      extra = JSON.stringify(e, Object.getOwnPropertyNames(e));
    } catch {
      extra = "";
    }
    console.error("[email] error", "sendEmail threw", { message: msg, stack, extra: extra || undefined });
    return { ok: false, error: msg };
  }
}

/**
 * Construye y envía el correo de confirmación de reserva con resumen + pago.
 *
 * @param {{
 *   to: string,
 *   bookingId: string,
 *   guest: string,
 *   phone?: string,
 *   boatName: string,
 *   date: string,
 *   dur: string,
 *   guests: number | string,
 *   amountCents?: number,
 *   amountEuros?: number,
 *   currency?: string,
 * }} booking
 */
function adminNotifyTo() {
  const v = (process.env.ADMIN_NOTIFY_EMAIL || "info@mallorcaislandyacht.com").trim();
  return v || "info@mallorcaislandyacht.com";
}

function resolveContactPhoneLine(booking) {
  const fromEnv = (process.env.CONTACT_PHONE || "").trim();
  const guestPhone = typeof booking?.phone === "string" ? booking.phone.trim() : "";
  if (fromEnv) return { label: "Contact phone", value: fromEnv };
  if (guestPhone) return { label: "Contact phone", value: guestPhone };
  return { label: "Contact", value: "info@mallorcaislandyacht.com" };
}

/**
 * Notificación interna: nueva reserva pagada.
 *
 * @param {{
 *   guest: string,
 *   customerEmail: string,
 *   phone?: string,
 *   boatName: string,
 *   date: string,
 *   dur: string,
 *   guests: number | string,
 *   amountCents?: number,
 *   amountEuros?: number,
 *   bookingId: string,
 *   stripeSessionId: string,
 *   adminTo?: string,
 * }} row
 */
export async function sendAdminPaidBookingEmail(row) {
  const guest = escapeHtml(row.guest || "");
  const customerEmail = escapeHtml(row.customerEmail || "");
  const phone = escapeHtml(row.phone || "");
  const boat = escapeHtml(row.boatName || "");
  const dateLong = escapeHtml(formatDateLong(row.date));
  const durLabel = escapeHtml(formatDurationLabel(row.dur));
  const guestsNum = escapeHtml(String(row.guests ?? ""));
  const bookingId = escapeHtml(row.bookingId || "");
  const sessionId = escapeHtml(row.stripeSessionId || "");
  const amountStr = (() => {
    if (typeof row.amountCents === "number" && row.amountCents > 0) {
      return formatAmountEUR(row.amountCents);
    }
    if (typeof row.amountEuros === "number" && row.amountEuros > 0) {
      return `${row.amountEuros.toFixed(2)} €`;
    }
    return "";
  })();

  const subject = "New paid booking - Mallorca Island Yacht";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1f3a;font-size:14px;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid rgba(11,31,58,.12);padding:24px;">
    <h1 style="font-size:18px;margin:0 0 16px;">New paid booking</h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;">
      <tr><td style="padding:4px 0;color:#64748b;width:160px;">Client name</td><td style="padding:4px 0;font-weight:600;">${guest}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Client email</td><td style="padding:4px 0;font-weight:600;">${customerEmail}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Phone</td><td style="padding:4px 0;font-weight:600;">${phone || "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Boat</td><td style="padding:4px 0;font-weight:600;">${boat}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Date</td><td style="padding:4px 0;font-weight:600;">${dateLong}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Duration</td><td style="padding:4px 0;font-weight:600;">${durLabel}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">People</td><td style="padding:4px 0;font-weight:600;">${guestsNum}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Amount paid</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(amountStr || "—")}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Booking ref</td><td style="padding:4px 0;font-weight:600;">${bookingId}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Stripe session</td><td style="padding:4px 0;font-weight:600;word-break:break-all;">${sessionId}</td></tr>
    </table>
  </div>
</body>
</html>`;

  const text = [
    "New paid booking - Mallorca Island Yacht",
    "",
    `Client name: ${row.guest || ""}`,
    `Client email: ${row.customerEmail || ""}`,
    `Phone: ${row.phone || ""}`,
    `Boat: ${row.boatName || ""}`,
    `Date: ${formatDateLong(row.date)}`,
    `Duration: ${formatDurationLabel(row.dur)}`,
    `People: ${row.guests ?? ""}`,
    `Amount paid: ${amountStr || "—"}`,
    `Booking ref: ${row.bookingId || ""}`,
    `Stripe session id: ${row.stripeSessionId || ""}`,
  ].join("\n");

  const adminTo =
    typeof row.adminTo === "string" && row.adminTo.includes("@")
      ? row.adminTo.trim()
      : adminNotifyTo();

  return sendEmail({
    to: adminTo,
    subject,
    html,
    text,
    replyTo: row.customerEmail && String(row.customerEmail).includes("@") ? String(row.customerEmail).trim() : undefined,
  });
}

export async function sendBookingConfirmationEmail(booking) {
  const guest = escapeHtml(booking.guest || "Guest");
  const boat = escapeHtml(booking.boatName || "");
  const dateLong = escapeHtml(formatDateLong(booking.date));
  const durLabel = escapeHtml(formatDurationLabel(booking.dur));
  const guestsNum = escapeHtml(String(booking.guests || ""));
  const bookingId = escapeHtml(booking.bookingId || "");
  const contactLine = resolveContactPhoneLine(booking);
  const contactLabel = escapeHtml(contactLine.label);
  const contactValue = escapeHtml(contactLine.value);
  const amountStr = (() => {
    if (typeof booking.amountCents === "number" && booking.amountCents > 0) {
      return formatAmountEUR(booking.amountCents);
    }
    if (typeof booking.amountEuros === "number" && booking.amountEuros > 0) {
      return `${booking.amountEuros.toFixed(2)} €`;
    }
    return "";
  })();

  const subject = "Booking confirmed - Mallorca Island Yacht";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef4ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1f3a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef4ff;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid rgba(11,31,58,.10);box-shadow:0 18px 50px rgba(15,23,42,.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px 28px;text-align:center;">
              <div style="font-size:14px;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:#c9a047;margin-bottom:6px;">Mallorca Island Yacht</div>
              <div style="font-size:42px;line-height:1;color:#22c55e;font-weight:900;">&#10003;</div>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:8px 0 4px 0;color:#0b1f3a;">Booking confirmed</h1>
              <p style="margin:0;font-size:14px;color:rgba(11,31,58,.7);line-height:1.55;">
                Hi ${guest}, your charter is paid and reserved. Below is your reservation summary.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <div style="border:1px solid rgba(11,31,58,.10);border-radius:12px;padding:16px 18px;background:rgba(234,244,255,.55);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#0b1f3a;">
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);width:150px;">Name</td><td style="padding:4px 0;font-weight:700;">${guest}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Boat</td><td style="padding:4px 0;font-weight:700;">${boat}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Date</td><td style="padding:4px 0;font-weight:700;">${dateLong}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Duration</td><td style="padding:4px 0;font-weight:700;">${durLabel}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">People</td><td style="padding:4px 0;font-weight:700;">${guestsNum}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Amount paid</td><td style="padding:4px 0;font-weight:700;">${escapeHtml(amountStr || "—")}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Booking reference</td><td style="padding:4px 0;font-weight:700;">${bookingId}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">${contactLabel}</td><td style="padding:4px 0;font-weight:700;">${contactValue}</td></tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;font-size:13px;color:rgba(11,31,58,.72);line-height:1.6;">
              <p style="margin:0 0 10px 0;">We will be in touch shortly with the meeting point and final details. If you need to make any changes please reply to this email.</p>
              <p style="margin:0;">Thank you for choosing Mallorca Island Yacht.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px 28px;text-align:center;font-size:11px;color:rgba(11,31,58,.5);border-top:1px solid rgba(11,31,58,.08);">
              Mallorca Island Yacht · mallorcaislandyacht.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    `Booking confirmed - Mallorca Island Yacht`,
    ``,
    `Name: ${booking.guest || "Guest"}`,
    `Boat: ${booking.boatName || ""}`,
    `Date: ${formatDateLong(booking.date)}`,
    `Duration: ${formatDurationLabel(booking.dur)}`,
    `People: ${booking.guests || ""}`,
  ];
  textParts.push(`Amount paid: ${amountStr || "—"}`);
  textParts.push(`Booking reference: ${booking.bookingId || ""}`);
  textParts.push(`${contactLine.label}: ${contactLine.value}`);
  textParts.push(``, `Thank you for choosing Mallorca Island Yacht.`);

  return sendEmail({
    to: booking.to,
    subject,
    html,
    text: textParts.join("\n"),
  });
}

/**
 * Avío al cliente tras un reembolso en Stripe (full o parcial).
 *
 * @param {{
 *   to: string,
 *   guest?: string,
 *   bookingId: string,
 *   boatName?: string,
 *   date?: string,
 *   dur?: string,
 *   guests?: number | string,
 *   refundAmountCents?: number,
 *   refundId: string,
 *   stripeSessionId?: string,
 *   fullyRefunded?: boolean,
 * }} row
 */
export async function sendStripeRefundCustomerEmail(row) {
  const dest = typeof row.to === "string" ? row.to.trim() : "";
  if (!dest.includes("@")) {
    console.error("[email] refund notice skipped", "missing customer email");
    return { ok: false, skipped: true, reason: "missing_to" };
  }

  const guest = escapeHtml(row.guest || "Guest");
  const boat = escapeHtml(row.boatName || "");
  const dateLong = escapeHtml(formatDateLong(row.date || ""));
  const durLabel = escapeHtml(formatDurationLabel(row.dur || ""));
  const guestsNum = escapeHtml(String(row.guests ?? ""));
  const bookingId = escapeHtml(row.bookingId || "");
  const refundId = escapeHtml(row.refundId || "");
  const sessionId = escapeHtml(row.stripeSessionId || "");
  const refundAmountStr =
    typeof row.refundAmountCents === "number" && row.refundAmountCents > 0
      ? formatAmountEUR(row.refundAmountCents)
      : "—";
  const scopeNote = row.fullyRefunded
    ? "Your charter booking has been fully refunded."
    : "A partial refund has been processed for your charter booking.";

  const subject = row.fullyRefunded
    ? "Refund processed — Mallorca Island Yacht"
    : "Partial refund — Mallorca Island Yacht";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#eef4ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1f3a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef4ff;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid rgba(11,31,58,.10);box-shadow:0 18px 50px rgba(15,23,42,.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px 28px;text-align:center;">
              <div style="font-size:14px;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:#c9a047;margin-bottom:6px;">Mallorca Island Yacht</div>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;margin:8px 0 8px 0;color:#0b1f3a;">Refund update</h1>
              <p style="margin:0;font-size:14px;color:rgba(11,31,58,.72);line-height:1.55;">Hi ${guest}, ${escapeHtml(scopeNote)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <div style="border:1px solid rgba(11,31,58,.10);border-radius:12px;padding:16px 18px;background:rgba(234,244,255,.55);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#0b1f3a;">
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);width:150px;">Booking reference</td><td style="padding:4px 0;font-weight:700;">${bookingId}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Boat</td><td style="padding:4px 0;font-weight:700;">${boat || "—"}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Date</td><td style="padding:4px 0;font-weight:700;">${dateLong || "—"}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Duration</td><td style="padding:4px 0;font-weight:700;">${durLabel || "—"}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">People</td><td style="padding:4px 0;font-weight:700;">${guestsNum || "—"}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);">Refund amount</td><td style="padding:4px 0;font-weight:700;">${escapeHtml(refundAmountStr)}</td></tr>
                  <tr><td style="padding:4px 0;color:rgba(11,31,58,.6);vertical-align:top;">Stripe refund id</td><td style="padding:4px 0;font-weight:700;word-break:break-all;">${refundId}</td></tr>
                  ${sessionId ? `<tr><td style="padding:4px 0;color:rgba(11,31,58,.6);vertical-align:top;">Checkout session</td><td style="padding:4px 0;font-weight:700;word-break:break-all;">${sessionId}</td></tr>` : ""}
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;font-size:13px;color:rgba(11,31,58,.72);line-height:1.6;">
              <p style="margin:0 0 10px 0;">If you have questions about this refund, reply to this email and we’ll help.</p>
              <p style="margin:0;">Thank you for your interest in Mallorca Island Yacht.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px 28px;text-align:center;font-size:11px;color:rgba(11,31,58,.5);border-top:1px solid rgba(11,31,58,.08);">
              Mallorca Island Yacht · mallorcaislandyacht.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    subject,
    "",
    `Hi ${row.guest || "Guest"}, ${scopeNote}`,
    "",
    `Booking reference: ${row.bookingId || ""}`,
    `Boat: ${row.boatName || ""}`,
    `Date: ${formatDateLong(row.date || "")}`,
    `Duration: ${formatDurationLabel(row.dur || "")}`,
    `People: ${row.guests ?? ""}`,
    `Refund amount: ${refundAmountStr}`,
    `Stripe refund id: ${row.refundId || ""}`,
  ];
  if (row.stripeSessionId) textParts.push(`Checkout session: ${row.stripeSessionId}`);

  return sendEmail({
    to: dest,
    subject,
    html,
    text: textParts.join("\n"),
  });
}
