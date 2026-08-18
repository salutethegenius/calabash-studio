import { NextResponse } from "next/server";
import { fetchCngTransaction, getCngApiAuth } from "@/lib/cashango/api";
import {
  mapCngTransactionToRow,
  mapWebhookPayloadToRow,
} from "@/lib/cashango/map";
import { upsertTransactionRow } from "@/lib/cashango/upsert";
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

  const { ORDER_NUMBER, AMOUNT, STATUS } = body;

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

  if (session.status !== "completed") {
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
  }

  let row = mapWebhookPayloadToRow(body, session.link_id);
  try {
    const auth = await getCngApiAuth();
    const cngTx = await fetchCngTransaction(auth, {
      orderNumber: ORDER_NUMBER,
    });
    if (cngTx) {
      row = mapCngTransactionToRow(cngTx, { linkId: session.link_id });
    }
  } catch {
    // Enrichment is best-effort; cron/manual sync will fill fees later.
  }

  try {
    await upsertTransactionRow(supabase, row);
  } catch (err) {
    return NextResponse.json(
      {
        message: err instanceof Error ? err.message : "Failed to save transaction",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadySettled: session.status === "completed",
  });
}
