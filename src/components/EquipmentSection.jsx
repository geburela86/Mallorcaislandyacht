import { Waves, Glasses, Sailboat, Camera } from "lucide-react";
import { SiteText } from "./SiteText.jsx";

const INCLUDED_ICONS = {
  seaScooter: Waves,
  snorkel: Glasses,
  paddle: Sailboat,
};

export function EquipmentSection({ t, contactLinks }) {
  const copy = t?.equipment;
  if (!copy) return null;

  const waHref = contactLinks?.waHref || "";
  const waMessage = String(copy.waMessage || "").trim();
  const waPriceHref = waHref && waMessage ? `${waHref}?text=${encodeURIComponent(waMessage)}` : waHref;

  const included = [
    { id: "seaScooter", icon: INCLUDED_ICONS.seaScooter, ...copy.items?.seaScooter },
    { id: "snorkel", icon: INCLUDED_ICONS.snorkel, ...copy.items?.snorkel },
    { id: "paddle", icon: INCLUDED_ICONS.paddle, ...copy.items?.paddle },
  ].filter((item) => item.title);

  const drone = copy.items?.drone;

  return (
    <section id="equipamiento" className="equipment-section" aria-labelledby="equipment-heading">
      <div className="equipment-inner">
        <header className="equipment-header">
          <div className="equipment-kicker">· {copy.kicker} ·</div>
          <h2 id="equipment-heading" className="playfair equipment-title">
            {copy.title}
          </h2>
          <SiteText className="equipment-sub">{copy.sub}</SiteText>
          <div className="equipment-goldline" />
        </header>

        <div className="equipment-block">
          <h3 className="equipment-block__title playfair">{copy.includedTitle}</h3>
          <div className="equipment-grid equipment-grid--included">
            {included.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.id} className="equipment-card">
                  <span className="equipment-badge equipment-badge--included">{copy.badgeIncluded}</span>
                  <div className="equipment-card__icon" aria-hidden>
                    <Icon size={26} strokeWidth={1.6} />
                  </div>
                  <h4 className="equipment-card__title playfair">{item.title}</h4>
                  {item.desc ? <p className="equipment-card__desc">{item.desc}</p> : null}
                </article>
              );
            })}
          </div>
        </div>

        {drone?.title ? (
          <div className="equipment-block equipment-block--extra">
            <h3 className="equipment-block__title playfair">{copy.extraTitle}</h3>
            <article className="equipment-card equipment-card--featured">
              <span className="equipment-badge equipment-badge--extra">{copy.badgeExtra}</span>
              <div className="equipment-card__icon equipment-card__icon--gold" aria-hidden>
                <Camera size={28} strokeWidth={1.6} />
              </div>
              <h4 className="equipment-card__title playfair">{drone.title}</h4>
              {drone.desc ? <p className="equipment-card__desc">{drone.desc}</p> : null}
              {waPriceHref ? (
                <a
                  href={waPriceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="equipment-cta"
                  aria-label={`${copy.consultPrice} — ${drone.title}`}
                >
                  {copy.consultPrice}
                </a>
              ) : (
                <span className="equipment-cta equipment-cta--static">{copy.consultPrice}</span>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
