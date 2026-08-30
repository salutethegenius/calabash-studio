import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { PayButton } from "@/components/pay/pay-button";
import {
  eventSalesClosed,
  eventSalesMessage,
  eventSalesState,
} from "@/lib/events";
import { getAppSettings } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import { formatBusinessDateTime } from "@/lib/time";
import { formatBsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getServiceSupabase();

  const { data: event, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("link_token", token)
    .maybeSingle();

  if (error || !event) notFound();
  if (event.kind !== "event") redirect(`/pay/${event.link_token}`);

  let settings = {
    businessName: "The Calabash Studio",
    logoPath: null as string | null,
    promoCode: "",
    promoPercent: 0,
  };

  try {
    const app = await getAppSettings();
    settings = {
      businessName: app.businessName,
      logoPath: app.logoPath,
      promoCode: app.promoCode,
      promoPercent: app.promoPercent,
    };
  } catch {
    // fall back to defaults
  }

  const logoSrc = settings.logoPath || "/calabash-logo.png";
  const state = eventSalesState(event);
  const closed = eventSalesClosed(event);
  const remaining =
    event.capacity != null
      ? Math.max(0, event.capacity - (event.sold_count ?? 0))
      : null;

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
              Event ticket
            </p>
            <p className="font-heading text-xl text-[var(--calabash-dark-green)]">
              {event.label}
            </p>
            {event.sales_end_at && (
              <p className="text-sm text-[var(--calabash-dark-green)]/70">
                Sales end {formatBusinessDateTime(event.sales_end_at)}
              </p>
            )}
            {remaining != null && !closed && (
              <p className="text-sm text-[var(--calabash-dark-green)]/70">
                {remaining} ticket{remaining === 1 ? "" : "s"} left
              </p>
            )}
          </div>

          {closed ? (
            <div className="space-y-4">
              <p className="text-center font-heading text-4xl font-semibold text-[var(--calabash-orange)]">
                {formatBsd(event.amount_cents)}
              </p>
              <div className="rounded-lg bg-[var(--calabash-beige)] px-4 py-6 text-center">
                <p className="font-heading text-xl text-[var(--calabash-dark-green)]">
                  {state === "sold_out" ? "Sold out" : "Sales ended"}
                </p>
                <p className="mt-1 text-sm text-[var(--calabash-dark-green)]/70">
                  {eventSalesMessage(state)}
                </p>
              </div>
            </div>
          ) : (
            <PayButton
              linkId={event.link_token}
              amountCents={event.amount_cents}
              promoCode={settings.promoCode}
              promoPercent={settings.promoPercent}
            />
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-[var(--calabash-dark-green)]/60">
        Powered by KemisPay · Payments processed by Cash N&apos; Go
      </footer>
    </div>
  );
}
