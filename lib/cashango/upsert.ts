import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionUpsertRow } from "./map";

export type UpsertAction = "inserted" | "updated";

type ExistingRow = {
  id: string;
  customer_ref: string | null;
  link_id: string | null;
};

export async function upsertTransactionRow(
  supabase: SupabaseClient,
  row: TransactionUpsertRow
): Promise<UpsertAction> {
  let existing: ExistingRow | null = null;

  if (row.cng_payment_id) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, customer_ref, link_id")
      .eq("cng_payment_id", row.cng_payment_id)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && row.order_number) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, customer_ref, link_id")
      .eq("order_number", row.order_number)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  const payload: Record<string, unknown> = { ...row };
  if (existing?.customer_ref) {
    payload.customer_ref = existing.customer_ref;
  }
  if (existing?.link_id && !row.link_id) {
    payload.link_id = existing.link_id;
  }
  if (!row.synced_at) {
    delete payload.synced_at;
  }

  if (existing) {
    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }

  if (row.cng_created_at) {
    payload.created_at = row.cng_created_at;
  }

  const { error } = await supabase.from("transactions").insert(payload);
  if (error) throw error;
  return "inserted";
}
