import { decrypt, encrypt } from "@/lib/crypto";
import { getServiceSupabase } from "@/lib/supabase/server";
import { SETTINGS_KEYS } from "@/lib/db/schema";
import { resolveCngEndpoint } from "@/lib/cashango/endpoints";
import { parsePromoPercent } from "@/lib/promo";

const ENCRYPTED_KEYS = new Set<string>([
  SETTINGS_KEYS.cngApiKey,
  SETTINGS_KEYS.cngWebhookSecret,
]);

export type AppSettings = {
  businessName: string;
  contactEmail: string;
  logoPath: string | null;
  cngMerchantId: string;
  cngApiKey: string;
  cngWebhookSecret: string;
  cngEnvironment: "qa" | "prod";
  cngEndpointOverride: string;
  promoCode: string;
  promoPercent: number;
};

const DEFAULTS: AppSettings = {
  businessName: "The Calabash Studio",
  contactEmail: "",
  logoPath: null,
  cngMerchantId: process.env.CASHANGO_MERCHANT_ID ?? "",
  cngApiKey: process.env.CASHANGO_API_KEY ?? "",
  cngWebhookSecret: process.env.CASHANGO_WEBHOOK_SECRET ?? "",
  cngEnvironment:
    process.env.CASHANGO_DEFAULT_ENV === "prod" ? "prod" : "qa",
  cngEndpointOverride: "",
  promoCode: "",
  promoPercent: 0,
};

export async function getSettingMap(): Promise<Record<string, string>> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.key && row.value != null) {
      map[row.key] = row.value;
    }
  }
  return map;
}

export async function getAppSettings(): Promise<AppSettings> {
  const map = await getSettingMap();

  const readPlain = (key: string, fallback: string) =>
    map[key] !== undefined && map[key] !== "" ? map[key] : fallback;

  const readEncrypted = (key: string, fallback: string) => {
    const raw = map[key];
    if (!raw) return fallback;
    try {
      return decrypt(raw);
    } catch {
      return fallback;
    }
  };

  const env = readPlain(SETTINGS_KEYS.cngEnvironment, DEFAULTS.cngEnvironment);

  return {
    businessName: readPlain(SETTINGS_KEYS.businessName, DEFAULTS.businessName),
    contactEmail: readPlain(SETTINGS_KEYS.contactEmail, DEFAULTS.contactEmail),
    logoPath: map[SETTINGS_KEYS.logoPath] || null,
    cngMerchantId: readPlain(
      SETTINGS_KEYS.cngMerchantId,
      DEFAULTS.cngMerchantId
    ),
    cngApiKey: readEncrypted(SETTINGS_KEYS.cngApiKey, DEFAULTS.cngApiKey),
    cngWebhookSecret: readEncrypted(
      SETTINGS_KEYS.cngWebhookSecret,
      DEFAULTS.cngWebhookSecret
    ),
    cngEnvironment: env === "prod" ? "prod" : "qa",
    cngEndpointOverride: readPlain(
      SETTINGS_KEYS.cngEndpointOverride,
      DEFAULTS.cngEndpointOverride
    ),
    promoCode: readPlain(SETTINGS_KEYS.promoCode, DEFAULTS.promoCode)
      .trim()
      .toUpperCase(),
    promoPercent: parsePromoPercent(
      readPlain(SETTINGS_KEYS.promoPercent, String(DEFAULTS.promoPercent))
    ),
  };
}

export async function upsertSettings(
  updates: Partial<Record<string, string | null>>
): Promise<void> {
  const supabase = getServiceSupabase();
  const rows = Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      let stored = value ?? "";
      if (ENCRYPTED_KEYS.has(key) && stored) {
        stored = encrypt(stored);
      }
      return { key, value: stored };
    });

  if (rows.length === 0) return;

  const { error } = await supabase.from("settings").upsert(rows, {
    onConflict: "key",
  });
  if (error) throw error;
}

export async function getCngCredentials() {
  const settings = await getAppSettings();
  const endpoint = resolveCngEndpoint(
    settings.cngEnvironment,
    settings.cngEndpointOverride || null
  );

  return {
    merchantId: settings.cngMerchantId,
    apiKey: settings.cngApiKey,
    webhookSecret: settings.cngWebhookSecret,
    environment: settings.cngEnvironment,
    endpoint,
  };
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}${"•".repeat(8)}${value.slice(-4)}`;
}
