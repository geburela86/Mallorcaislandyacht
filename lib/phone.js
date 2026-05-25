import { getCountryByIso, parseE164ToCountryParts } from "./phone-countries.js";

export const E164_PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** @param {string} iso @param {string} nationalRaw */
export function buildE164FromParts(iso, nationalRaw) {
  const country = getCountryByIso(iso);
  if (!country) return { ok: false, reason: "unknown_country" };
  const national = digitsOnly(nationalRaw);
  if (!national) return { ok: false, reason: "empty" };
  if (country.nationalPattern && !country.nationalPattern.test(national)) {
    return { ok: false, reason: "invalid" };
  }
  if (country.nationalLength && !country.nationalLength.includes(national.length)) {
    return { ok: false, reason: "invalid" };
  }
  if (!country.nationalLength && (national.length < 4 || national.length > 14)) {
    return { ok: false, reason: "invalid" };
  }
  const e164 = `+${country.dial}${national}`;
  if (!E164_PHONE_RE.test(e164)) return { ok: false, reason: "invalid" };
  return { ok: true, e164, iso: country.iso, national };
}

export function normalizePhoneToE164(raw, opts = {}) {
  const defaultCountry = opts.defaultCountry || "ES";
  let s = String(raw ?? "").trim();
  if (!s) return { ok: false, reason: "empty" };
  s = s.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    const parsed = parseE164ToCountryParts(s);
    if (parsed) return buildE164FromParts(parsed.iso, parsed.national);
    const e164 = `+${digitsOnly(s.slice(1))}`;
    if (!E164_PHONE_RE.test(e164)) return { ok: false, reason: "invalid" };
    return { ok: true, e164 };
  }
  const d = digitsOnly(s);
  if (defaultCountry === "ES") {
    if (d.length === 9 && /^[67]\d{8}$/.test(d)) return { ok: true, e164: `+34${d}` };
    if (d.length === 11 && d.startsWith("34")) return buildE164FromParts("ES", d.slice(2));
  }
  const withDefault = buildE164FromParts(defaultCountry, d);
  if (withDefault.ok) return withDefault;
  if (d.length >= 10 && d.length <= 15) {
    const e164 = `+${d}`;
    if (E164_PHONE_RE.test(e164)) return { ok: true, e164 };
  }
  return { ok: false, reason: "missing_prefix" };
}

export function isValidE164Phone(value) {
  return E164_PHONE_RE.test(String(value ?? "").trim());
}
