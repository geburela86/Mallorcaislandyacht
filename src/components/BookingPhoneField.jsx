import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY_ISO,
  getCountryByIso,
  getCountryLabel,
  sortedCountriesForLang,
} from "../../lib/phone-countries.js";

function filterCountries(countries, query, lang) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return countries;
  return countries.filter((c) => {
    const label = getCountryLabel(c, lang).toLowerCase();
    return (
      label.includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      `+${c.dial}`.includes(q)
    );
  });
}

export function BookingPhoneField({
  lang = "en",
  countryIso,
  nationalValue,
  onCountryChange,
  onNationalChange,
  label,
  hint,
  placeholder,
  countryAriaLabel,
  countrySearchPlaceholder,
}) {
  const countries = useMemo(() => sortedCountriesForLang(lang), [lang]);
  const country = getCountryByIso(countryIso) || getCountryByIso(DEFAULT_PHONE_COUNTRY_ISO);
  const dial = country?.dial ?? "34";
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterCountries(countries, search, lang),
    [countries, search, lang],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    setSearch("");
    return undefined;
  }, [open]);

  const pickCountry = (iso) => {
    onCountryChange(iso);
    setOpen(false);
    setSearch("");
  };

  const searchPh =
    countrySearchPlaceholder ||
    (lang === "es" ? "Buscar país…" : lang === "de" ? "Land suchen…" : lang === "fr" ? "Rechercher un pays…" : lang === "sv" ? "Sök land…" : "Search country…");
  const noMatchLabel = {
    es: "Ningún país coincide",
    de: "Kein Land gefunden",
    fr: "Aucun pays trouvé",
    sv: "Inget land hittades",
    en: "No matching country",
  }[lang] || "No matching country";

  return (
    <div className="booking-phone-field">
      <label className="booking-phone-label">{label}</label>
      <div className="booking-phone-row">
        <div className="booking-phone-country-picker" ref={rootRef}>
          <button
            type="button"
            className={`booking-phone-country-trigger${open ? " is-open" : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-label={countryAriaLabel || "Country"}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="booking-phone-country-trigger-text">
              {country?.flag} +{dial} {getCountryLabel(country, lang)}
            </span>
            <span className="booking-phone-country-chevron" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </button>
          {open ? (
            <div className="booking-phone-country-dropdown" role="listbox">
              <div className="booking-phone-country-search-wrap">
                <input
                  ref={searchRef}
                  type="search"
                  className="booking-phone-country-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPh}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={searchPh}
                />
              </div>
              <ul className="booking-phone-country-list">
                {filtered.length === 0 ? (
                  <li className="booking-phone-country-empty">{noMatchLabel}</li>
                ) : (
                  filtered.map((c) => (
                    <li key={c.iso}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={c.iso === country?.iso}
                        className={`booking-phone-country-option${c.iso === country?.iso ? " is-selected" : ""}`}
                        onClick={() => pickCountry(c.iso)}
                      >
                        <span>{c.flag} +{c.dial}</span>
                        <span className="booking-phone-country-option-label">{getCountryLabel(c, lang)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="booking-phone-national-wrap">
          <span className="booking-phone-dial-prefix" aria-hidden>
            +{dial}
          </span>
          <input
            type="tel"
            name="phone-national"
            className="booking-phone-national"
            value={nationalValue}
            onChange={(e) => onNationalChange(e.target.value.replace(/[^\d\s]/g, ""))}
            placeholder={placeholder}
            autoComplete="tel-national"
            inputMode="numeric"
          />
        </div>
      </div>
      {hint ? <p className="booking-promo-hint is-info booking-phone-hint">{hint}</p> : null}
    </div>
  );
}
