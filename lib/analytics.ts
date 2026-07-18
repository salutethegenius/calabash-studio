import { getServiceSupabase } from "@/lib/supabase/server";

export type DashboardStats = {
  totalInvoicedCents: number;
  paymentsDueCents: number;
  todaysRevenueCents: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getServiceSupabase();

  const { data: links, error: linksError } = await supabase
    .from("payment_links")
    .select("amount_cents, status");

  if (linksError) throw linksError;

  const totalInvoicedCents = (links ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );
  const paymentsDueCents = (links ?? [])
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: txs, error: txsError } = await supabase
    .from("transactions")
    .select("amount_cents")
    .eq("status", "successful")
    .gte("created_at", startOfDay.toISOString());

  if (txsError) throw txsError;

  const todaysRevenueCents = (txs ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );

  return { totalInvoicedCents, paymentsDueCents, todaysRevenueCents };
}
