/**
 * Server-side charter pricing (must match `charterBaseEurosClient` / DUR_PRICES in App.jsx).
 * Never trust client-submitted totals.
 */

const PRICING_FIELD_KEYS = ["half", "full", "sunset", "skipper"];
const ALL_BOOKING_SLOT_IDS = ["half_am", "half_pm", "sunset", "full"];

const DEFAULT_PRICING = { half: 0, full: 0, sunset: 0, skipper: 0 };

/** Fallback display prices if Firestore prices are still zero (matches legacy DUR_PRICES in App). */
const FALLBACK_DUR = { half: 550, full: 850, sunset: 450 };

export function seasonKeyFromMonthKey(mk) {
  if (typeof mk !== "string" || !/^\d{2}$/.test(mk)) return "low";
  const m = parseInt(mk, 10);
  if (m === 11 || m === 12 || (m >= 1 && m <= 4)) return "low";
  if (m === 5 || m === 10) return "medium";
  return "high";
}

export function monthKeyFromDateStr(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  return dateStr.slice(5, 7);
}

function normalizeSpecialDayEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const prices = {};
  const schedule = {};
  const labels = {};
  const slots = [];
  const srcPrices = raw.prices && typeof raw.prices === "object" ? raw.prices : raw;
  const srcLabels =
    raw.labels && typeof raw.labels === "object" ? raw.labels : raw.titles && typeof raw.titles === "object" ? raw.titles : {};
  for (const sid of ALL_BOOKING_SLOT_IDS) {
    if (Number.isFinite(+srcPrices[sid]) && +srcPrices[sid] > 0) prices[sid] = Math.round(+srcPrices[sid]);
    const sub = raw.schedule?.[sid] ?? raw[`sub_${sid}`];
    if (typeof sub === "string" && sub.trim()) schedule[sid] = sub.trim().slice(0, 80);
    const lab = srcLabels[sid] ?? raw[`label_${sid}`];
    if (typeof lab === "string" && lab.trim()) labels[sid] = lab.trim().slice(0, 100);
  }
  if (Number.isFinite(+srcPrices.half) && +srcPrices.half > 0) {
    if (!prices.half_am) prices.half_am = Math.round(+srcPrices.half);
    if (!prices.half_pm) prices.half_pm = Math.round(+srcPrices.half);
  }
  for (const k of ["half", "full", "sunset", "skipper"]) {
    if (Number.isFinite(+srcPrices[k]) && +srcPrices[k] > 0) prices[k] = Math.round(+srcPrices[k]);
  }
  const slotSrc = Array.isArray(raw.slots) ? raw.slots : null;
  if (slotSrc) {
    for (const sid of slotSrc) {
      if (ALL_BOOKING_SLOT_IDS.includes(sid)) slots.push(sid);
    }
  } else {
    for (const sid of ALL_BOOKING_SLOT_IDS) {
      if (prices[sid] || schedule[sid] || labels[sid]) slots.push(sid);
    }
  }
  if (!slots.length && !Object.keys(prices).length && !Object.keys(schedule).length && !Object.keys(labels).length)
    return null;
  const out = {};
  if (Object.keys(prices).length) out.prices = prices;
  if (Object.keys(schedule).length) out.schedule = schedule;
  if (Object.keys(labels).length) out.labels = labels;
  if (slots.length) out.slots = [...new Set(slots)];
  else if (Object.keys(prices).length || Object.keys(schedule).length) out.slots = [...ALL_BOOKING_SLOT_IDS];
  return out;
}

export function getSpecialDayEntry(settings, dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const sd = settings?.specialDays;
  if (!sd || typeof sd !== "object") return null;
  return normalizeSpecialDayEntry(sd[dateStr]);
}

/** Días especiales configurados en admin: sin códigos promocionales. */
export function isPromoExcludedDate(settings, dateStr) {
  return !!getSpecialDayEntry(settings, dateStr);
}

export function getMonthlyPricing(settings, dateStr) {
  const p = settings?.pricing && typeof settings.pricing === "object" ? settings.pricing : {};
  const base = {
    half: Number.isFinite(+p.half) ? +p.half : DEFAULT_PRICING.half,
    full: Number.isFinite(+p.full) ? +p.full : DEFAULT_PRICING.full,
    sunset: Number.isFinite(+p.sunset) ? +p.sunset : DEFAULT_PRICING.sunset,
    skipper: Number.isFinite(+p.skipper) ? +p.skipper : DEFAULT_PRICING.skipper,
  };
  const mk = monthKeyFromDateStr(dateStr);
  const seasonKey = mk ? seasonKeyFromMonthKey(mk) : "low";
  const seasons =
    settings?.pricingSeasons && typeof settings.pricingSeasons === "object" ? settings.pricingSeasons : {};
  const tier = seasons[seasonKey] && typeof seasons[seasonKey] === "object" ? seasons[seasonKey] : null;
  const out = { ...base };
  if (tier) {
    for (const k of PRICING_FIELD_KEYS) {
      if (Number.isFinite(+tier[k])) out[k] = +tier[k];
    }
  }
  const byMonth =
    settings?.pricingByMonth && typeof settings.pricingByMonth === "object" ? settings.pricingByMonth : {};
  const monthOverride = mk && byMonth?.[mk] && typeof byMonth[mk] === "object" ? byMonth[mk] : null;
  if (monthOverride) {
    for (const k of PRICING_FIELD_KEYS) {
      if (Number.isFinite(+monthOverride[k])) out[k] = +monthOverride[k];
    }
  }
  return out;
}

export function charterBaseEuros(settings, dateStr, durId) {
  const special = getSpecialDayEntry(settings, dateStr);
  if (special?.prices) {
    const direct = special.prices[durId];
    if (Number.isFinite(+direct) && +direct > 0) return +direct;
    if (
      (durId === "half_am" || durId === "half_pm") &&
      Number.isFinite(+special.prices.half) &&
      +special.prices.half > 0
    ) {
      return +special.prices.half;
    }
  }
  const pricing = getMonthlyPricing(settings, dateStr);
  const key = durId === "half_am" || durId === "half_pm" ? "half" : durId;
  const raw = Number.isFinite(+pricing?.[key]) ? +pricing[key] : 0;
  if (raw > 0) return raw;
  const fb = FALLBACK_DUR[key] ?? 0;
  return fb;
}

export function computeCharterTotalEuros(settings, dateStr, durId, discountPct) {
  const charterBase = charterBaseEuros(settings, dateStr, durId);
  const pct = Number(discountPct);
  if (Number.isFinite(pct) && pct > 0 && pct <= 100) {
    return Math.max(0, Math.round((charterBase * (100 - pct)) / 100));
  }
  return charterBase;
}
