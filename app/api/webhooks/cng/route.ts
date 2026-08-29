import { NextResponse } from "next/server";
import { fetchCngTransaction, getCngApiAuth } from "@/lib/cashango/api";
import {
  mapCngTransactionToRow,
  mapWebhookPayloadToRow,
} from "@/lib/cashango/map";
import { settlePaidCheckout } from "@/lib/cashango/settle";
import { upsertTransactionRow } from "@/lib/cashango/upsert";
import { verifyWebhookSignature } from "@/lib/cashango/webhook";
import { getCngCredentials } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import { parseDollarsToCents } from "@/lib/utils";

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

  const paidCents = parseDollarsToCents(AMOUNT);
  if (paidCents == null) {
    return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: session, error: sessionError } = await supabase
    .from("checkout_sessions")
    .select("id, link_id, status, expected_amount_cents")
    .eq("order_number", ORDER_NUMBER)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { message: "Failed to look up checkout session" },
      { status: 500 }
    );
  }
  if (!session) {
    return NextResponse.json({ message: "Unknown order" }, { status: 404 });
  }

  if (paidCents !== session.expected_amount_cents) {
    return NextResponse.json(
      { message: "Amount does not match checkout" },
      { status: 400 }
    );
  }

  try {
    await settlePaidCheckout(supabase, session);
  } catch {
    return NextResponse.json(
      { message: "Failed to settle checkout" },
      { status: 500 }
    );
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
  } catch {
    return NextResponse.json(
      { message: "Failed to save transaction" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadySettled: session.status === "completed",
  });
}
