import { getCngCredentials } from "@/lib/settings";
import { CNG_API_PATHS, resolveCngBaseUrl } from "./endpoints";
import type {
  CngApiAuth,
  CngTransaction,
  CngTransactionDetailResponse,
  CngTransactionLookup,
  CngTransactionsResponse,
} from "./types";

export class CngApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "CngApiError";
  }
}

export async function getCngApiAuth(): Promise<CngApiAuth> {
  const credentials = await getCngCredentials();
  if (!credentials.merchantId || !credentials.apiKey) {
    throw new CngApiError("Cash N' Go credentials are not configured");
  }
  return {
    merchantId: credentials.merchantId,
    apiKey: credentials.apiKey,
    baseUrl: resolveCngBaseUrl(credentials.endpoint),
  };
}

/** PayLanes requires AUTH_ID + API_KEY as query params (header-only auth is rejected). */
export function buildCngApiUrl(
  auth: CngApiAuth,
  path: string,
  params: Record<string, string | number | undefined> = {}
): URL {
  const url = new URL(`${auth.baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("AUTH_ID", auth.merchantId);
  url.searchParams.set("API_KEY", auth.apiKey);
  return url;
}

async function cngGet<T>(auth: CngApiAuth, url: URL): Promise<T> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      API_KEY: auth.apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();
  let body: T | { success?: boolean; message?: string } | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      throw new CngApiError(
        `Cash N' Go returned invalid JSON (${response.status})`,
        response.status
      );
    }
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Cash N' Go request failed (${response.status})`;
    throw new CngApiError(message, response.status);
  }

  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    body.success === false
  ) {
    throw new CngApiError(
      "message" in body && body.message
        ? String(body.message)
        : "Cash N' Go request was unsuccessful",
      response.status
    );
  }

  return body as T;
}

export async function fetchCngTransaction(
  auth: CngApiAuth,
  lookup: CngTransactionLookup
): Promise<CngTransaction | null> {
  const params: Record<string, string> = {};
  if ("orderNumber" in lookup) params.ORDER_NUMBER = lookup.orderNumber;
  else if ("paymentId" in lookup) params.PAYMENT_ID = lookup.paymentId;
  else params.PASSPHRASE = lookup.passphrase;

  const url = buildCngApiUrl(auth, CNG_API_PATHS.transactionInfo, params);
  const body = await cngGet<CngTransactionDetailResponse>(auth, url);
  return body.transaction ?? null;
}

export async function fetchCngTransactions(
  auth: CngApiAuth,
  params: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
    sortDir?: "asc" | "desc";
  } = {}
): Promise<CngTransactionsResponse> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 50);
  const url = buildCngApiUrl(auth, CNG_API_PATHS.transactions, {
    PAGE: params.page ?? 1,
    LIMIT: limit,
    FROM_DATE: params.fromDate,
    TO_DATE: params.toDate,
    SORT_DIR: params.sortDir ?? "desc",
  });
  return cngGet<CngTransactionsResponse>(auth, url);
}
