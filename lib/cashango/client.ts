import { toDollarsString } from "@/lib/utils";
import { nanoid } from "nanoid";
import { resolveCngEndpoint } from "./endpoints";

const CNG_OPTION_MAP: Record<string, string> = {
  card: "card",
  cng: "cng",
  mmx: "mmx",
  sd: "sd",
  moneymaxx: "mmx",
  moneymax: "mmx",
  cashngo: "cng",
};

export function resolveCngPaymentOptions(rawOpts: string): string {
  return rawOpts
    .split(",")
    .map((o) => CNG_OPTION_MAP[o.trim().toLowerCase()] ?? o.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
}

export type CngUrlParams = {
  endpoint: string;
  authId: string;
  apiKey: string;
  amountCents: number;
  orderNumber: string;
  callbackBaseUrl: string;
  paymentOptions?: string;
};

/**
 * Build the Cash N' Go / PayLanes Web Payment Auth redirect URL.
 * The Cash N' Go docs allow the API key as a header or query parameter, but the
 * browser-initiated GET to the payment page must carry it in the URL, so the key
 * is visible to the customer. Rotate it regularly and keep it scoped to this integration.
 */
export function buildCngPaymentUrl(params: CngUrlParams): string {
  // Browser return pages (display only — settlement is via signed webhook)
  const successUrl = `${params.callbackBaseUrl}/cng/return/success`;
  const cancelUrl = `${params.callbackBaseUrl}/cng/return/cancel`;
  const resolvedPaymentOpts = resolveCngPaymentOptions(
    params.paymentOptions || "card,mmx,cng"
  );

  const url = new URL(params.endpoint);
  url.searchParams.set("API_KEY", params.apiKey);
  url.searchParams.set("AUTH_ID", params.authId);
  url.searchParams.set("AMOUNT", toDollarsString(params.amountCents));
  url.searchParams.set("URL_SUCCESS", successUrl);
  url.searchParams.set("URL_CANCEL", cancelUrl);
  url.searchParams.set("ORDER_NUMBER", params.orderNumber);
  url.searchParams.set("PAYMENT_OPTIONS", resolvedPaymentOpts);

  return url.toString();
}

export function makeOrderNumber(linkToken: string): string {
  return `${linkToken}__${Date.now()}__${nanoid(6)}`;
}

export { resolveCngEndpoint };
