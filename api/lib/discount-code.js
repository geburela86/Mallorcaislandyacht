import { FieldValue } from "firebase-admin/firestore";
import { VIP_CHARTER_DISCOUNT_PCT } from "./vip-code.js";

export const DISCOUNT_PCT_OPTIONS = [5, 10, 15, 20, 25, 30];
export const DISCOUNT_MAX_USES_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 60];

export function isAllowedDiscountPct(n) {
  return DISCOUNT_PCT_OPTIONS.includes(Number(n));
}

export function isAllowedMaxUses(n) {
  return DISCOUNT_MAX_USES_OPTIONS.includes(Number(n));
}

/** @returns {"single"|"multi"|null} */
export function discountCodeKind(data) {
  if (!data || typeof data !== "object") return null;
  if (data.type === "multi") return "multi";
  if (data.type === "single" || data.maxUses == null) return "single";
  return null;
}

/**
 * Resuelve un código activo y usable (lectura; la reserva debe validar de nuevo en transacción).
 * @returns {{ pct: number, kind: "single"|"multi" } | null}
 */
export function resolveUsableDiscountFromData(data) {
  if (!data || data.active === false) return null;
  const kind = discountCodeKind(data);
  if (kind === "single") {
    const pct = Number(data.pct);
    if (pct !== VIP_CHARTER_DISCOUNT_PCT) return null;
    if (data.usedByBookingId) return null;
    return { pct, kind: "single" };
  }
  if (kind === "multi") {
    const pct = Number(data.pct);
    const maxUses = Number(data.maxUses);
    const useCount = Number(data.useCount) || 0;
    if (!isAllowedDiscountPct(pct) || !isAllowedMaxUses(maxUses)) return null;
    if (useCount >= maxUses) return null;
    return { pct, kind: "multi" };
  }
  return null;
}

/**
 * Actualización Firestore al reservar con código (dentro de transacción).
 * @returns {{ pct: number, kind: "single"|"multi" }}
 */
export function buildPromoRedeemUpdate(codeData, bookingId) {
  const resolved = resolveUsableDiscountFromData(codeData);
  if (!resolved) {
    throw Object.assign(new Error("invalid_promo"), { code: "invalid_promo" });
  }
  if (resolved.kind === "single") {
    return {
      pct: resolved.pct,
      kind: "single",
      update: {
        active: false,
        usedAt: FieldValue.serverTimestamp(),
        usedByBookingId: bookingId,
      },
    };
  }
  const useCount = Number(codeData.useCount) || 0;
  const maxUses = Number(codeData.maxUses);
  const nextCount = useCount + 1;
  const update = {
    useCount: nextCount,
    lastUsedAt: FieldValue.serverTimestamp(),
    lastUsedByBookingId: bookingId,
  };
  if (nextCount >= maxUses) {
    update.active = false;
  }
  return { pct: resolved.pct, kind: "multi", update };
}

/** Revierte consumo si se cancela una reserva pending_payment con ese código. */
export function buildPromoReleaseUpdate(codeData, bookingId) {
  if (!codeData) return null;
  const kind = discountCodeKind(codeData);
  if (kind === "multi") {
    if (codeData.lastUsedByBookingId !== bookingId) return null;
    const useCount = Math.max(0, (Number(codeData.useCount) || 1) - 1);
    return {
      useCount,
      active: true,
      lastUsedAt: FieldValue.delete(),
      lastUsedByBookingId: FieldValue.delete(),
    };
  }
  if (codeData.usedByBookingId === bookingId) {
    return {
      active: true,
      usedAt: FieldValue.delete(),
      usedByBookingId: FieldValue.delete(),
    };
  }
  return null;
}
