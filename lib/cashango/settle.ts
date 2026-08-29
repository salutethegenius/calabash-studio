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
  const alreadySettled = session.status === "completed";
  const now = new Date().toISOString();

  if (!alreadySettled) {
    const { error: sessionError } = await supabase
      .from("checkout_sessions")
      .update({
        status: "completed",
        completed_at: now,
      })
      .eq("id", session.id);
    if (sessionError) throw sessionError;
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

  // A 60-minute TTL replacement can leave a newer pending session. If this
  // (possibly older) order is the one that actually paid, drop the extra.
  const { error: expireOthersError } = await supabase
    .from("checkout_sessions")
    .update({ status: "expired" })
    .eq("link_id", session.link_id)
    .eq("status", "pending")
    .neq("id", session.id);
  if (expireOthersError) throw expireOthersError;

  return { alreadySettled };
}
