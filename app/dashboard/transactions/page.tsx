import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getServiceSupabase } from "@/lib/supabase/server";
import { formatBsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "successful")
    return "bg-[var(--calabash-light-green)]/40 text-[var(--calabash-dark-green)]";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-[var(--calabash-orange)]/15 text-[var(--calabash-orange)]";
}

export default async function TransactionsPage() {
  let rows: Array<{
    id: string;
    customer_ref: string | null;
    amount_cents: number;
    status: string;
    created_at: string;
  }> = [];

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("transactions")
      .select("id, customer_ref, amount_cents, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    rows = data ?? [];
  } catch {
    rows = [];
  }

  return (
    <DashboardShell title="Transactions">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--calabash-light-green)] bg-white p-10 text-center text-sm text-[var(--calabash-dark-green)]/60">
          No transactions yet. Completed Cash N&apos; Go payments will appear
          here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--calabash-light-green)]/50 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--calabash-light-green)]/40 bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/70">
              <tr>
                <th className="px-4 py-3 font-medium">Customer reference</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-[var(--calabash-light-green)]/25 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[var(--calabash-dark-green)]">
                    {tx.customer_ref || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                    {formatBsd(tx.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--calabash-dark-green)]/70">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
