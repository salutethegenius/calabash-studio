import Image from "next/image";
import { notFound } from "next/navigation";
import { PayButton } from "@/components/pay/pay-button";
import { getAppSettings } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import { formatBsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;
  const supabase = getServiceSupabase();

  const { data: link, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("link_token", linkId)
    .maybeSingle();

  if (error || !link) notFound();

  let settings = {
    businessName: "The Calabash Studio",
    logoPath: null as string | null,
  };

  try {
    const app = await getAppSettings();
    settings = { businessName: app.businessName, logoPath: app.logoPath };
  } catch {
    // fall back to defaults
  }

  const logoSrc = settings.logoPath || "/calabash-logo.png";
  const isPaid = link.status === "paid";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--calabash-beige)]">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-[var(--calabash-light-green)]/30">
          <div className="mb-8 flex flex-col items-center text-center">
            {settings.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={settings.businessName}
                className="mb-4 h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <Image
                src="/calabash-logo.png"
                alt={settings.businessName}
                width={80}
                height={80}
                className="mb-4 rounded-full"
                priority
              />
            )}
            <h1 className="font-heading text-2xl font-semibold text-[var(--calabash-dark-green)]">
              {settings.businessName}
            </h1>
          </div>

          <div className="mb-8 space-y-2 text-center">
            <p className="font-body text-sm uppercase tracking-wide text-[var(--calabash-light-green)]">
              Payment for
            </p>
            <p className="font-heading text-xl text-[var(--calabash-dark-green)]">
              {link.label}
            </p>
            <p className="font-heading text-4xl font-semibold text-[var(--calabash-orange)]">
              {formatBsd(link.amount_cents)}
            </p>
          </div>

          {isPaid ? (
            <div className="rounded-lg bg-green-50 px-4 py-6 text-center">
              <p className="font-heading text-xl text-green-800">Paid</p>
              <p className="mt-1 text-sm text-green-700">
                This payment has already been completed. Thank you!
              </p>
            </div>
          ) : (
            <PayButton linkId={link.link_token} />
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-[var(--calabash-dark-green)]/60">
        Powered by KemisPay · Payments processed by Cash N&apos; Go
      </footer>
    </div>
  );
}
