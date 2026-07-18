"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsFormProps = {
  initial: {
    businessName: string;
    contactEmail: string;
    logoPath: string | null;
    cngMerchantId: string;
    cngApiKeyMasked: string;
    cngWebhookSecretMasked: string;
    cngEnvironment: "qa" | "prod";
    cngEndpointOverride: string;
    hasApiKey: boolean;
    hasWebhookSecret: boolean;
  };
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [cngMerchantId, setCngMerchantId] = useState(initial.cngMerchantId);
  const [cngApiKey, setCngApiKey] = useState("");
  const [cngWebhookSecret, setCngWebhookSecret] = useState("");
  const [cngEnvironment, setCngEnvironment] = useState<"qa" | "prod">(
    initial.cngEnvironment
  );
  const [cngEndpointOverride, setCngEndpointOverride] = useState(
    initial.cngEndpointOverride
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPath, setLogoPath] = useState(initial.logoPath);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setToast(null);

    try {
      const form = new FormData();
      form.set("businessName", businessName);
      form.set("contactEmail", contactEmail);
      form.set("cngMerchantId", cngMerchantId);
      form.set("cngEnvironment", cngEnvironment);
      form.set("cngEndpointOverride", cngEndpointOverride);
      if (cngApiKey.trim()) form.set("cngApiKey", cngApiKey.trim());
      if (cngWebhookSecret.trim())
        form.set("cngWebhookSecret", cngWebhookSecret.trim());
      if (logoFile) form.set("logo", logoFile);

      const res = await fetch("/api/settings", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");

      if (data.logoPath) setLogoPath(data.logoPath);
      setCngApiKey("");
      setCngWebhookSecret("");
      setToast("Settings saved");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold text-[var(--calabash-dark-green)]">
            Business Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            {logoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPath}
                alt="Business logo"
                className="mb-2 h-16 w-16 rounded-full object-cover"
              />
            )}
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold text-[var(--calabash-dark-green)]">
            Cash N&apos; Go Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchantId">Merchant ID</Label>
            <Input
              id="merchantId"
              value={cngMerchantId}
              onChange={(e) => setCngMerchantId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={
                initial.hasApiKey
                  ? initial.cngApiKeyMasked
                  : "Paste Headers API key"
              }
              value={cngApiKey}
              onChange={(e) => setCngApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-[var(--calabash-dark-green)]/55">
              Use the Headers key (apikey). Leave blank to keep the current
              value.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder={
                initial.hasWebhookSecret
                  ? initial.cngWebhookSecretMasked
                  : "HMAC webhook secret"
              }
              value={cngWebhookSecret}
              onChange={(e) => setCngWebhookSecret(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <select
              id="environment"
              value={cngEnvironment}
              onChange={(e) =>
                setCngEnvironment(e.target.value as "qa" | "prod")
              }
              className="flex h-10 w-full rounded-md border border-[var(--calabash-light-green)] bg-white px-3 text-sm text-[var(--calabash-dark-green)]"
            >
              <option value="qa">QA (sandbox)</option>
              <option value="prod">Production</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endpointOverride">Endpoint override (optional)</Label>
            <Input
              id="endpointOverride"
              value={cngEndpointOverride}
              onChange={(e) => setCngEndpointOverride(e.target.value)}
              placeholder="Leave blank to use QA/Prod default"
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {toast && (
        <p className="rounded-md bg-[var(--calabash-light-green)]/30 px-3 py-2 text-sm text-[var(--calabash-dark-green)]">
          {toast}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
