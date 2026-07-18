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
    return NextResponse.json({ message: "Unknown order" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.redirect(
      new URL(`/cng/return/success?ORDER_NUMBER=${orderNumber}&STATUS=PAID`, appBaseUrl())
    );
  }

  let credentials;
  try {
    credentials = await getCngCredentials();
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error
            ? err.message
            : "Cash N' Go credentials not configured",
      },
      { status: 500 }
    );
  }

  if (!credentials.merchantId || !credentials.apiKey) {
    return NextResponse.json(
      { message: "Cash N' Go merchant credentials are not configured" },
      { status: 500 }
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
