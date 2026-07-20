export const PROMO_CODE = "SAP0726";
export const PROMO_PERCENT_OFF = 10;

export type PromoResult =
  | { ok: true; amountCents: number; applied: boolean }
  | { ok: false; message: string };

/**
 * Apply the hardcoded promo to an amount in cents.
 * Empty / whitespace-only code → full price.
 * Matching SAP0726 (case-insensitive) → 10% off.
 * Any other non-empty code → invalid.
 */
export function applyPromo(
  amountCents: number,
  promoCode?: string | null
): PromoResult {
  const trimmed = promoCode?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, amountCents, applied: false };
  }

  if (trimmed.toUpperCase() !== PROMO_CODE) {
    return { ok: false, message: "Invalid promo code" };
  }

  const discounted = Math.round(
    (amountCents * (100 - PROMO_PERCENT_OFF)) / 100
  );
  return { ok: true, amountCents: discounted, applied: true };
}

/** Client-side preview helper — server still validates on Pay Now. */
export function previewPromoAmount(
  amountCents: number,
  promoCode: string
): number {
  const result = applyPromo(amountCents, promoCode);
  return result.ok ? result.amountCents : amountCents;
}

export function isValidPromoPreview(promoCode: string): boolean {
  const trimmed = promoCode.trim();
  return trimmed.length > 0 && trimmed.toUpperCase() === PROMO_CODE;
}
