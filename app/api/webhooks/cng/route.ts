import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cashango/webhook";
import { getCngCredentials } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rawBody = await request.text();

  let credentials;
  try {
    credentials = await getCngCredentials();
  } catch {
    return NextResponse.json(
      { message: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const secret =
    credentials.webhookSecret || process.env.CASHANGO_WEBHOOK_SECRET;
  const signature =
    request.headers.get("x-calabash-signature") ??
    request.headers.get("x-webhook-signature");

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, string | undefined>;
  try {
    body = JSON.parse(rawBody) as Record<string, string | undefined>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { ORDER_NUMBER, AMOUNT, STATUS, EMAIL, PHONE } = body;

  if (!ORDER_NUMBER || !AMOUNT || STATUS !== "PAID") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: session, error: sessionError } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("order_number", ORDER_NUMBER)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { message: sessionError.message },
      { status: 500 }
    );
  }
  if (!session) {
    return NextResponse.json({ message: "Unknown order" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ ok: true, alreadySettled: true });
  }

  const amountCents = Math.round(parseFloat(AMOUNT) * 100);
  const customerRef = EMAIL || PHONE || ORDER_NUMBER;

  await supabase
    .from("checkout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  await supabase
    .from("payment_links")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", session.link_id);

  const { error: txError } = await supabase.from("transactions").insert({
    link_id: session.link_id,
    customer_ref: customerRef,
    amount_cents: amountCents,
    status: "successful",
    raw_payload: body,
  });

  if (txError) {
    return NextResponse.json({ message: txError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
