import { dollarsToCents } from "@/lib/utils";
import type { CngTransaction } from "./types";

/**
 * amount_cents — gross (what the customer paid; CNG `amount` / webhook AMOUNT)
 * net_cents — merchant net after fees (CNG `total`)
 * fee_cents — PayLanes fee (CNG `fee`)
 */
export type TransactionUpsertRow = {
  link_id: string | null;
  customer_ref: string | null;
  amount_cents: number;
  status: string;
  raw_payload: unknown;
  cng_payment_id: string | null;
  order_number: string | null;
  fee_cents: number | null;
  net_cents: number | null;
  payer_email: string | null;
  payer_phone: string | null;
  payment_method: string | null;
  card_type: string | null;
  processed: boolean | null;
  cng_created_at: string | null;
  synced_at?: string | null;
};

export function unixSecondsToIso(value: unknown): string | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

export function toCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return dollarsToCents(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return dollarsToCents(n);
  }
  return null;
}

function asString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function isProcessed(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

export function mapCngTransactionToRow(
  tx: CngTransaction,
  options?: { linkId?: string | null; syncedAt?: string | null }
): TransactionUpsertRow {
  const processed = isProcessed(tx.processed);
  const orderNumber = asString(tx.webOrderNumber);
  const email = asString(tx.ownerEmail);
  const phone = asString(tx.owner);

  return {
    link_id: options?.linkId ?? null,
    customer_ref: email || phone || orderNumber,
    amount_cents: toCents(tx.amount) ?? 0,
    status: processed ? "successful" : "pending",
    raw_payload: tx,
    cng_payment_id: asString(tx.specialId),
    order_number: orderNumber,
    fee_cents: toCents(tx.fee),
    net_cents: toCents(tx.total),
    payer_email: email,
    payer_phone: phone,
    payment_method: asString(tx.transactionType),
    card_type: asString(tx.cardType),
    processed,
    cng_created_at:
      unixSecondsToIso(tx.datetimestamp) ?? unixSecondsToIso(tx.dateProcessed),
    synced_at: options?.syncedAt ?? null,
  };
}

export function mapWebhookPayloadToRow(
  body: Record<string, string | undefined>,
  linkId: string | null
): TransactionUpsertRow {
  const orderNumber = body.ORDER_NUMBER ?? null;
  const email = body.EMAIL || null;
  const phone = body.PHONE || null;
  const paid = body.STATUS === "PAID";

  return {
    link_id: linkId,
    customer_ref: email || phone || orderNumber,
    amount_cents: toCents(body.AMOUNT) ?? 0,
    status: paid ? "successful" : "pending",
    raw_payload: body,
    cng_payment_id: body.PAYMENT_ID || null,
    order_number: orderNumber,
    fee_cents: null,
    net_cents: null,
    payer_email: email,
    payer_phone: phone,
    payment_method: body.PAYMENT_PLATFORM || null,
    card_type: null,
    processed: paid,
    cng_created_at: unixSecondsToIso(body.TIMESTAMP),
  };
}
