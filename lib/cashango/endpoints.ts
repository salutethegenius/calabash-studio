export const CNG_ENDPOINTS = {
  qa: "https://paylanes-qa.sprocket.solutions/merchant/web-payment/auth",
  prod: "https://paylanes.sprocket.solutions/merchant/web-payment/auth",
} as const;

export type CngEnvironment = keyof typeof CNG_ENDPOINTS;

export function resolveCngEndpoint(
  environment: string | null | undefined,
  override?: string | null
): string {
  if (override?.trim()) return override.trim();
  if (environment === "prod") return CNG_ENDPOINTS.prod;
  if (environment === "qa") return CNG_ENDPOINTS.qa;
  return process.env.CASHANGO_DEFAULT_ENV === "prod"
    ? CNG_ENDPOINTS.prod
    : CNG_ENDPOINTS.qa;
}
