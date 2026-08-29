export type PromoConfig = {
  code: string;
  percent: number;
};

export type PromoResult =
  | { ok: true; amountCents: number; applied: boolean }
  | { ok: false; message: string };

export function normalizePromoCode(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

export function parsePromoPercent(value?: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return 0;
  return Math.round(n);
}

/**
 * Apply a configured promo to an amount in cents.
 * Empty entered code → full price.
 * Matching configured code (case-insensitive) → percent off.
 * Any other non-empty code → invalid.
 * Empty configured code → promo off (any entered code is invalid).
 */
export function applyPromo(
  amountCents: number,
  enteredCode?: string | null,
  config?: PromoConfig | null
): PromoResult {
  const trimmed = enteredCode?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, amountCents, applied: false };
  }

  const configured = normalizePromoCode(config?.code);
  const percent = config?.percent ?? 0;
  if (!configured || percent <= 0) {
    return { ok: false, message: "Invalid promo code" };
  }

  if (trimmed.toUpperCase() !== configured) {
    return { ok: false, message: "Invalid promo code" };
  }

  const discounted = Math.round((amountCents * (100 - percent)) / 100);
  return { ok: true, amountCents: discounted, applied: true };
}

/** Client-side preview helper — server still validates on Pay Now. */
export function previewPromoAmount(
  amountCents: number,
  enteredCode: string,
  config?: PromoConfig | null
): number {
  const result = applyPromo(amountCents, enteredCode, config);
  return result.ok ? result.amountCents : amountCents;
}

export function isValidPromoPreview(
  enteredCode: string,
  config?: PromoConfig | null
): boolean {
  const trimmed = enteredCode.trim();
  const configured = normalizePromoCode(config?.code);
  return (
    trimmed.length > 0 &&
    configured.length > 0 &&
    (config?.percent ?? 0) > 0 &&
    trimmed.toUpperCase() === configured
  );
}
