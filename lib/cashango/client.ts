import { toDollarsString } from "@/lib/utils";
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
 * Pass the Headers API key value as API_KEY query param (not as an HTTP header).
 */
export function buildCngPaymentUrl(params: CngUrlParams): string {
  // Browser return pages (display only — settlement is via signed webhook)
  const successUrl = `${params.callbackBaseUrl}/cng/return/success`;
  const cancelUrl = `${params.callbackBaseUrl}/cng/return/cancel`;
  const resolvedPaymentOpts = resolveCngPaymentOptions(
    params.paymentOptions || "card,mmx,cng"
  );

  const urlParams = new URLSearchParams();
  urlParams.set("AUTH_ID", params.authId);
  urlParams.set("AMOUNT", toDollarsString(params.amountCents));
  urlParams.set("URL_SUCCESS", successUrl);
  urlParams.set("URL_CANCEL", cancelUrl);
  urlParams.set("ORDER_NUMBER", params.orderNumber);
  urlParams.set("PAYMENT_OPTIONS", resolvedPaymentOpts);

  return `${params.endpoint}?API_KEY=${encodeURIComponent(params.apiKey)}&${urlParams.toString()}`;
}

export function makeOrderNumber(linkToken: string): string {
  return `${linkToken}__${Date.now()}`;
}

export { resolveCngEndpoint };
