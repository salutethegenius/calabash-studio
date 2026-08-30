import { startOfDayInTimeZone } from "@/lib/time";
import { getServiceSupabase } from "@/lib/supabase/server";

export type DashboardStats = {
  totalInvoicedCents: number;
  paymentsDueCents: number;
  /** Merchant net when available; falls back to gross `amount_cents`. */
  todaysRevenueCents: number;
  todaysFeesCents: number;
};

function revenueCents(row: {
  amount_cents: number | null;
  net_cents?: number | null;
}): number {
  if (row.net_cents != null) return row.net_cents;
  return row.amount_cents ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getServiceSupabase();

  const { data: links, error: linksError } = await supabase
    .from("payment_links")
    .select("amount_cents, status, kind")
    .eq("kind", "invoice");

  if (linksError) throw linksError;

  const totalInvoicedCents = (links ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );
  const paymentsDueCents = (links ?? [])
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  const startMs = startOfDayInTimeZone().getTime();

  const { data: txs, error: txsError } = await supabase
    .from("transactions")
    .select("amount_cents, net_cents, fee_cents, created_at, cng_created_at")
    .eq("status", "successful");

  if (txsError) throw txsError;
  const todays = (txs ?? []).filter((row) => {
    const when = row.cng_created_at || row.created_at;
    return when ? new Date(when).getTime() >= startMs : false;
  });

  const todaysRevenueCents = todays.reduce(
    (sum, row) => sum + revenueCents(row),
    0
  );
  const todaysFeesCents = todays.reduce(
    (sum, row) => sum + (row.fee_cents ?? 0),
    0
  );

  return {
    totalInvoicedCents,
    paymentsDueCents,
    todaysRevenueCents,
    todaysFeesCents,
  };
}
