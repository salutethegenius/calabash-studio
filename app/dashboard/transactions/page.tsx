import { SyncTransactionsButton } from "@/components/dashboard/sync-transactions-button";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SETTINGS_KEYS } from "@/lib/db/schema";
import { getSettingMap } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import { formatBsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TransactionRow = {
  id: string;
  link_id: string | null;
  customer_ref: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  order_number: string | null;
  cng_payment_id: string | null;
  fee_cents: number | null;
  net_cents: number | null;
  payer_email: string | null;
  payer_phone: string | null;
  payment_method: string | null;
  cng_created_at: string | null;
};

function statusClass(status: string) {
  if (status === "successful")
    return "bg-[var(--calabash-light-green)]/40 text-[var(--calabash-dark-green)]";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-[var(--calabash-orange)]/15 text-[var(--calabash-orange)]";
}

function sortKey(row: TransactionRow) {
  return new Date(row.cng_created_at || row.created_at).getTime();
}

export default async function TransactionsPage() {
  let rows: TransactionRow[] = [];
  let lastSyncedAt: string | null = null;

  try {
    const supabase = getServiceSupabase();
    const [{ data, error }, settings] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, link_id, customer_ref, amount_cents, status, created_at, order_number, cng_payment_id, fee_cents, net_cents, payer_email, payer_phone, payment_method, cng_created_at"
        )
        .order("created_at", { ascending: false }),
      getSettingMap(),
    ]);

    if (error) throw error;
    rows = (data ?? []).slice().sort((a, b) => sortKey(b) - sortKey(a));
    lastSyncedAt = settings[SETTINGS_KEYS.cngLastSyncAt] || null;
  } catch {
    rows = [];
  }

  return (
    <DashboardShell title="Transactions">
      <SyncTransactionsButton lastSyncedAt={lastSyncedAt} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--calabash-light-green)] bg-white p-10 text-center text-sm text-[var(--calabash-dark-green)]/60">
          No transactions yet. Sync from Cash N&apos; Go or wait for a completed
          payment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--calabash-light-green)]/50 bg-white">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-[var(--calabash-light-green)]/40 bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/70">
              <tr>
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">CNG Payment ID</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Payer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const payer =
                  tx.payer_email || tx.payer_phone || tx.customer_ref || "—";
                const when = tx.cng_created_at || tx.created_at;
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-[var(--calabash-light-green)]/25 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--calabash-dark-green)]">
                      {tx.order_number || "—"}
                      {!tx.link_id && (
                        <div className="text-xs font-normal text-[var(--calabash-dark-green)]/55">
                          External / pre-Calabash
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {tx.cng_payment_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {formatBsd(tx.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {tx.fee_cents != null ? formatBsd(tx.fee_cents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {tx.net_cents != null ? formatBsd(tx.net_cents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {tx.payment_method || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                      {payer}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(tx.status)}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--calabash-dark-green)]/70">
                      {new Date(when).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
