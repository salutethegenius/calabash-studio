export const CNG_ENDPOINTS = {
  qa: "https://paylanes-qa.sprocket.solutions/merchant/web-payment/auth",
  prod: "https://paylanes.sprocket.solutions/merchant/web-payment/auth",
} as const;

export const CNG_API_PATHS = {
  transactionInfo: "/merchant/web-payment/transaction-info",
  transactions: "/merchant/web-payment/transactions",
} as const;

export type CngEnvironment = keyof typeof CNG_ENDPOINTS;

function validateHttpsUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Cash N' Go endpoint override must be a valid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Cash N' Go endpoint override must use HTTPS");
  }
  return value.trim();
}

export function resolveCngEndpoint(
  environment: string | null | undefined,
  override?: string | null
): string {
  if (override?.trim()) return validateHttpsUrl(override.trim());
  if (environment === "prod") return CNG_ENDPOINTS.prod;
  if (environment === "qa") return CNG_ENDPOINTS.qa;
  return process.env.CASHANGO_DEFAULT_ENV === "prod"
    ? CNG_ENDPOINTS.prod
    : CNG_ENDPOINTS.qa;
}

/** Origin (and optional prefix) for Transaction API paths, derived from the auth endpoint. */
export function resolveCngBaseUrl(authEndpoint: string): string {
  const url = new URL(authEndpoint);
  url.pathname = url.pathname.replace(/\/merchant\/web-payment\/auth\/?$/, "");
  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/$/, "");
  return `${url.origin}${path === "/" ? "" : path}`;
}
