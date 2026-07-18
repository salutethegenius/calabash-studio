import Image from "next/image";
import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CngSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ORDER_NUMBER?: string; STATUS?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.ORDER_NUMBER;
  const status = params.STATUS;

  let settled = false;
  if (orderNumber && status === "PAID") {
    try {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from("checkout_sessions")
        .select("status")
        .eq("order_number", orderNumber)
        .maybeSingle();
      settled = data?.status === "completed";
    } catch {
      settled = false;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--calabash-beige)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <Image
          src="/calabash-logo.png"
          alt="The Calabash Studio"
          width={72}
          height={72}
          className="mx-auto mb-4 rounded-full"
        />
        {status !== "PAID" || !orderNumber ? (
          <>
            <h1 className="font-heading text-2xl text-red-700">
              Invalid payment response
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We could not verify this return. If you were charged, contact the
              studio.
            </p>
          </>
        ) : settled ? (
          <>
            <h1 className="font-heading text-2xl text-[var(--calabash-dark-green)]">
              Payment successful
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Thank you! Your payment has been confirmed.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl text-[var(--calabash-orange)]">
              Payment received
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;re confirming your payment. This usually takes a moment.
              You can close this window.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[var(--calabash-dark-green)] underline"
        >
          Done
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Powered by KemisPay · Payments processed by Cash N&apos; Go
      </p>
    </div>
  );
}
