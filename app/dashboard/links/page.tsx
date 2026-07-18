import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LinksTable, type LinkRow } from "@/components/dashboard/links-table";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export default async function LinksPage() {
  let rows: LinkRow[] = [];

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("payment_links")
      .select("id, label, amount_cents, status, link_token, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const base = appBaseUrl();
    rows = (data ?? []).map((row) => ({
      ...row,
      url: `${base}/pay/${row.link_token}`,
    }));
  } catch {
    rows = [];
  }

  return (
    <DashboardShell title="Payment Links">
      <LinksTable initialLinks={rows} />
    </DashboardShell>
  );
}
