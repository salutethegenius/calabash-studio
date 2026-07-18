import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { getAppSettings, maskSecret } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings: Awaited<ReturnType<typeof getAppSettings>> = {
    businessName: "The Calabash Studio",
    contactEmail: "",
    logoPath: null,
    cngMerchantId: "",
    cngApiKey: "",
    cngWebhookSecret: "",
    cngEnvironment: "qa",
    cngEndpointOverride: "",
  };

  try {
    settings = await getAppSettings();
  } catch {
    // env not configured yet
  }

  return (
    <DashboardShell title="Settings">
      <SettingsForm
        initial={{
          businessName: settings.businessName,
          contactEmail: settings.contactEmail,
          logoPath: settings.logoPath,
          cngMerchantId: settings.cngMerchantId,
          cngApiKeyMasked: maskSecret(settings.cngApiKey),
          cngWebhookSecretMasked: maskSecret(settings.cngWebhookSecret),
          cngEnvironment: settings.cngEnvironment,
          cngEndpointOverride: settings.cngEndpointOverride,
          hasApiKey: Boolean(settings.cngApiKey),
          hasWebhookSecret: Boolean(settings.cngWebhookSecret),
        }}
      />
    </DashboardShell>
  );
}
