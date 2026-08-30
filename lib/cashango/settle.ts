import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckoutSessionRow = {
  id: string;
  link_id: string;
  status: string;
};

export async function settlePaidCheckout(
  supabase: SupabaseClient,
  session: CheckoutSessionRow
): Promise<{ alreadySettled: boolean }> {
  const { data: link, error: linkLookupError } = await supabase
    .from("payment_links")
    .select("kind")
    .eq("id", session.link_id)
    .maybeSingle();
  if (linkLookupError) throw linkLookupError;

  const kind = link?.kind === "event" ? "event" : "invoice";
  const alreadySettled = session.status === "completed";
  const now = new Date().toISOString();

  if (!alreadySettled) {
    const { error: sessionError } = await supabase
      .from("checkout_sessions")
      .update({
        status: "completed",
        completed_at: now,
      })
      .eq("id", session.id)
      .eq("status", "pending");
    if (sessionError) throw sessionError;
  }

  if (kind === "event") {
    // Recount from completed sessions so webhook + sync cannot double-count
    // and a failed increment on a later retry still heals.
    const { error: soldError } = await supabase.rpc(
      "increment_event_sold_count",
      { p_link_id: session.link_id }
    );
    if (soldError) throw soldError;
    return { alreadySettled };
  }

  const { error: linkError } = await supabase
    .from("payment_links")
    .update({
      status: "paid",
      paid_at: now,
    })
    .eq("id", session.link_id)
    .neq("status", "paid");
  if (linkError) throw linkError;

  const { error: expireOthersError } = await supabase
    .from("checkout_sessions")
    .update({ status: "expired" })
    .eq("link_id", session.link_id)
    .eq("status", "pending")
    .neq("id", session.id);
  if (expireOthersError) throw expireOthersError;

  return { alreadySettled };
}
