import { NextResponse } from "next/server";
import { z } from "zod";
import { makeOrderNumber } from "@/lib/cashango/client";
import { applyPromo } from "@/lib/promo";
import { getAppSettings } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";

const PENDING_TTL_MS = 60 * 60 * 1000;

const schema = z.object({
  linkId: z.string().min(1),
  promoCode: z.string().optional(),
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

  // Public pay URLs use link_token (not UUID). Query by the right column —
  // PostgREST rejects non-UUIDs in an `id.eq.` OR filter with 22P02.
  const linkId = parsed.data.linkId;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      linkId
    );

  const { data: link, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq(isUuid ? "id" : "link_token", linkId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: "Failed to look up payment link" },
      { status: 500 }
    );
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

  const settings = await getAppSettings();
  const promo = applyPromo(link.amount_cents, parsed.data.promoCode, {
    code: settings.promoCode,
    percent: settings.promoPercent,
  });
  if (!promo.ok) {
    return NextResponse.json({ message: promo.message }, { status: 400 });
  }

  const { data: pending, error: pendingError } = await supabase
    .from("checkout_sessions")
    .select("id, order_number, expected_amount_cents, created_at")
    .eq("link_id", link.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    return NextResponse.json(
      { message: "Failed to start checkout" },
      { status: 500 }
    );
  }

  if (pending) {
    const ageMs = Date.now() - new Date(pending.created_at).getTime();
    if (ageMs < PENDING_TTL_MS) {
      if (pending.expected_amount_cents !== promo.amountCents) {
        const { error: updateError } = await supabase
          .from("checkout_sessions")
          .update({ expected_amount_cents: promo.amountCents })
          .eq("id", pending.id);
        if (updateError) {
          return NextResponse.json(
            { message: "Failed to start checkout" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        redirectPath: `/api/cng/redirect/${encodeURIComponent(pending.order_number)}`,
        orderNumber: pending.order_number,
        amountCents: promo.amountCents,
        promoApplied: promo.applied,
      });
    }

    const { error: expireError } = await supabase
      .from("checkout_sessions")
      .update({ status: "expired" })
      .eq("id", pending.id)
      .eq("status", "pending");
    if (expireError) {
      return NextResponse.json(
        { message: "Failed to start checkout" },
        { status: 500 }
      );
    }
  }

  const orderNumber = makeOrderNumber(link.link_token);

  const { error: sessionError } = await supabase.from("checkout_sessions").insert({
    link_id: link.id,
    order_number: orderNumber,
    expected_amount_cents: promo.amountCents,
    status: "pending",
  });

  if (sessionError) {
    if (sessionError.code === "23505") {
      const { data: existing } = await supabase
        .from("checkout_sessions")
        .select("order_number")
        .eq("link_id", link.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          redirectPath: `/api/cng/redirect/${encodeURIComponent(existing.order_number)}`,
          orderNumber: existing.order_number,
          amountCents: promo.amountCents,
          promoApplied: promo.applied,
        });
      }
      return NextResponse.json(
        { message: "Checkout already in progress" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Failed to start checkout" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    redirectPath: `/api/cng/redirect/${encodeURIComponent(orderNumber)}`,
    orderNumber,
    amountCents: promo.amountCents,
    promoApplied: promo.applied,
  });
}
