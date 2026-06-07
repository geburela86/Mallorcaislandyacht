import { CalendarDays } from "lucide-react";
import { BrandWhatsAppIcon } from "../site-icons.jsx";

/** Barra fija inferior: reserva online (modal) y WhatsApp para consultas/reservas. */
export function FloatingBookingAccess({ t, contactLinks, onBook, hidden }) {
  const copy = t?.floatingAccess;
  if (hidden || !copy) return null;

  const waHref = contactLinks?.waHref || "";
  const waMessage = String(copy.waMessage || "").trim();
  const waBookHref = waHref && waMessage ? `${waHref}?text=${encodeURIComponent(waMessage)}` : waHref;

  return (
    <div className="floating-access-bar" role="region" aria-label={copy.regionAria}>
      <div className="floating-access-bar__inner">
        <button
          type="button"
          className="floating-access-bar__btn floating-access-bar__btn--book"
          onClick={onBook}
          aria-label={copy.bookAria}
        >
          <CalendarDays size={20} strokeWidth={2} aria-hidden />
          <span className="floating-access-bar__text">
            <span className="floating-access-bar__label">{copy.bookLabel}</span>
            <span className="floating-access-bar__sub">{copy.bookSub}</span>
          </span>
        </button>
        {waBookHref ? (
          <a
            href={waBookHref}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-access-bar__btn floating-access-bar__btn--wa"
            aria-label={copy.waAria}
          >
            <BrandWhatsAppIcon size={22} tone="light" />
            <span className="floating-access-bar__text">
              <span className="floating-access-bar__label">{copy.waLabel}</span>
              <span className="floating-access-bar__sub">{copy.waSub}</span>
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
