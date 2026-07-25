import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/server";
import { upsertSettings } from "@/lib/settings";
import { SETTINGS_KEYS } from "@/lib/db/schema";
import { resolveCngEndpoint } from "@/lib/cashango/endpoints";

const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const LOGO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const LOGO_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function getLogoExtension(file: File): string | null {
  if (file.type && LOGO_ALLOWED_TYPES.includes(file.type)) {
    return MIME_TO_EXT[file.type];
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && LOGO_ALLOWED_EXT.includes(ext)) return ext;
  return null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const businessName = String(form.get("businessName") ?? "").trim();
  const contactEmail = String(form.get("contactEmail") ?? "").trim();
  const cngMerchantId = String(form.get("cngMerchantId") ?? "").trim();
  const cngEnvironment = String(form.get("cngEnvironment") ?? "qa").trim();
  const cngEndpointOverride = String(
    form.get("cngEndpointOverride") ?? ""
  ).trim();

  if (cngEndpointOverride) {
    try {
      resolveCngEndpoint("qa", cngEndpointOverride);
    } catch (err) {
      return NextResponse.json(
        {
          message:
            err instanceof Error
              ? err.message
              : "Invalid Cash N' Go endpoint override",
        },
        { status: 400 }
      );
    }
  }

  const cngApiKey = String(form.get("cngApiKey") ?? "").trim();
  const cngWebhookSecret = String(form.get("cngWebhookSecret") ?? "").trim();
  const logo = form.get("logo");

  const updates: Record<string, string | null> = {
    [SETTINGS_KEYS.businessName]: businessName || "The Calabash Studio",
    [SETTINGS_KEYS.contactEmail]: contactEmail,
    [SETTINGS_KEYS.cngMerchantId]: cngMerchantId,
    [SETTINGS_KEYS.cngEnvironment]:
      cngEnvironment === "prod" ? "prod" : "qa",
    [SETTINGS_KEYS.cngEndpointOverride]: cngEndpointOverride,
  };

  // Only overwrite encrypted secrets when a new value is provided
  if (cngApiKey) updates[SETTINGS_KEYS.cngApiKey] = cngApiKey;
  if (cngWebhookSecret)
    updates[SETTINGS_KEYS.cngWebhookSecret] = cngWebhookSecret;

  let logoPath: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    if (logo.size > LOGO_MAX_SIZE) {
      return NextResponse.json(
        { message: "Logo must be under 2 MB" },
        { status: 400 }
      );
    }

    const ext = getLogoExtension(logo);
    if (!ext) {
      return NextResponse.json(
        { message: "Logo must be an image (jpg, png, webp, gif, svg)" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const path = `logos/logo-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await logo.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("calabash-assets")
      .upload(path, buffer, {
        contentType: logo.type || `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: `Logo upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("calabash-assets")
      .getPublicUrl(path);

    logoPath = publicUrl.publicUrl;
    updates[SETTINGS_KEYS.logoPath] = logoPath;
  }

  try {
    await upsertSettings(updates);
  } catch (err) {
    return NextResponse.json(
      {
        message: err instanceof Error ? err.message : "Failed to save settings",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, logoPath });
}
