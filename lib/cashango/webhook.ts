import { createHmac, timingSafeEqual } from "crypto";

export function signWebhookPayload(
  payload: string | Buffer,
  secret: string
): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify HMAC-SHA256 signature from x-calabash-signature (or x-webhook-signature) header.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !signatureHeader) return false;

  const expected = signWebhookPayload(rawBody, secret);
  try {
    const a = Buffer.from(signatureHeader, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
