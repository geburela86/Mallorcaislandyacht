export const VIP_CHARTER_DISCOUNT_PCT = 20;

export function normalizeVipDiscountCode(raw) {
  if (raw == null) return "";
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}
