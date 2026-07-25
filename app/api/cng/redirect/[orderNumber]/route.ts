import { NextResponse } from "next/server";
import { buildCngPaymentUrl } from "@/lib/cashango/client";
import { getCngCredentials } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber: raw } = await context.params;
  const orderNumber = decodeURIComponent(raw);

  const supabase = getServiceSupabase();
  const { data: session, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !session) {
    return NextResponse.redirect(
      new URL("/cng/return/error?reason=unknown_order", appBaseUrl())
    );
  }

  if (session.status === "completed") {
    return NextResponse.redirect(
      new URL(
        `/cng/return/success?ORDER_NUMBER=${encodeURIComponent(orderNumber)}&STATUS=PAID`,
        appBaseUrl()
      )
    );
  }

  let credentials;
  try {
    credentials = await getCngCredentials();
  } catch {
    return NextResponse.redirect(
      new URL(
        `/cng/return/error?reason=no_credentials`,
        appBaseUrl()
      )
    );
  }

  if (!credentials.merchantId || !credentials.apiKey) {
    return NextResponse.redirect(
      new URL(
        "/cng/return/error?reason=invalid_merchant",
        appBaseUrl()
      )
    );
  }

  const paymentUrl = buildCngPaymentUrl({
    endpoint: credentials.endpoint,
    authId: credentials.merchantId,
    apiKey: credentials.apiKey,
    amountCents: session.expected_amount_cents,
    orderNumber,
    callbackBaseUrl: appBaseUrl(),
  });

  return NextResponse.redirect(paymentUrl, 302);
}
