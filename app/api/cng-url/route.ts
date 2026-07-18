import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/server";
import { makeOrderNumber } from "@/lib/cashango/client";

const schema = z.object({
  linkId: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "linkId is required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Accept either UUID id or link_token
  const { data: link, error } = await supabase
    .from("payment_links")
    .select("*")
    .or(`id.eq.${parsed.data.linkId},link_token.eq.${parsed.data.linkId}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (!link) {
    return NextResponse.json({ message: "Link not found" }, { status: 404 });
  }
  if (link.status === "paid") {
    return NextResponse.json(
      { message: "This link has already been paid" },
      { status: 400 }
    );
  }

  const orderNumber = makeOrderNumber(link.link_token);

  const { error: sessionError } = await supabase.from("checkout_sessions").insert({
    link_id: link.id,
    order_number: orderNumber,
    expected_amount_cents: link.amount_cents,
    status: "pending",
  });

  if (sessionError) {
    return NextResponse.json(
      { message: sessionError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    redirectPath: `/api/cng/redirect/${encodeURIComponent(orderNumber)}`,
    orderNumber,
  });
}
