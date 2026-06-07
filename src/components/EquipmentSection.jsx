import { EQUIPMENT_IMAGES } from "../lib/equipment-images.js";
import { SiteText } from "./SiteText.jsx";

export function EquipmentSection({ t, contactLinks }) {
  const copy = t?.equipment;
  if (!copy) return null;

  const waHref = contactLinks?.waHref || "";
  const waMessage = String(copy.waMessage || "").trim();
  const waPriceHref = waHref && waMessage ? `${waHref}?text=${encodeURIComponent(waMessage)}` : waHref;

  const included = [
    { id: "seaScooter", image: EQUIPMENT_IMAGES.seaScooter, ...copy.items?.seaScooter },
    { id: "snorkel", image: EQUIPMENT_IMAGES.snorkel, ...copy.items?.snorkel },
    { id: "paddle", image: EQUIPMENT_IMAGES.paddle, ...copy.items?.paddle },
  ].filter((item) => item.title);

  const drone = copy.items?.drone;

  return (
    <section id="equipamiento" className="public-site-section equipment-section" aria-labelledby="equipment-heading">
      <div className="equipment-inner">
        <header className="equipment-header">
          <div className="equipment-kicker">· {copy.kicker} ·</div>
          <h2 id="equipment-heading" className="playfair equipment-title">
            {copy.title}
          </h2>
          <SiteText className="cormorant equipment-sub">{copy.sub}</SiteText>
          <div className="gold-line equipment-goldline" />
        </header>

        <div className="equipment-block">
          <h3 className="equipment-block__title playfair">{copy.includedTitle}</h3>
          <div className="equipment-grid equipment-grid--included">
            {included.map((item) => (
              <article key={item.id} className="equipment-card card">
                <div className="equipment-card__media">
                  <img
                    src={item.image.src}
                    alt={item.image.alt}
                    width={900}
                    height={520}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="equipment-card__body">
                  <span className="equipment-badge equipment-badge--included">{copy.badgeIncluded}</span>
                  <h4 className="equipment-card__title playfair">{item.title}</h4>
                  {item.desc ? <p className="equipment-card__desc">{item.desc}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        {drone?.title ? (
          <div className="equipment-block equipment-block--extra">
            <h3 className="equipment-block__title playfair">{copy.extraTitle}</h3>
            <article className="equipment-card equipment-card--featured card">
              <div className="equipment-card__media equipment-card__media--featured">
                <img
                  src={EQUIPMENT_IMAGES.drone.src}
                  alt={EQUIPMENT_IMAGES.drone.alt}
                  width={1200}
                  height={560}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="equipment-card__body equipment-card__body--featured">
                <span className="equipment-badge equipment-badge--extra">{copy.badgeExtra}</span>
                <h4 className="equipment-card__title playfair">{drone.title}</h4>
                {drone.desc ? <p className="equipment-card__desc">{drone.desc}</p> : null}
                {waPriceHref ? (
                  <a
                    href={waPriceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold equipment-cta"
                    aria-label={`${copy.consultPrice} — ${drone.title}`}
                  >
                    {copy.consultPrice}
                  </a>
                ) : (
                  <span className="btn-gold equipment-cta equipment-cta--static">{copy.consultPrice}</span>
                )}
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
