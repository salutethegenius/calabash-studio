import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EventForm } from "@/components/dashboard/event-form";
import { EventsTable, type EventRow } from "@/components/dashboard/events-table";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export default async function EventsPage() {
  let rows: EventRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("payment_links")
      .select(
        "id, label, amount_cents, link_token, sales_end_at, capacity, sold_count"
      )
      .eq("kind", "event")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const base = appBaseUrl();
    rows = (data ?? []).map((row) => ({
      ...row,
      sold_count: row.sold_count ?? 0,
      url: `${base}/event/${row.link_token}`,
    }));
  } catch {
    rows = [];
    loadError = "Could not load events. Check the database connection.";
  }

  return (
    <DashboardShell title="Event tickets">
      {loadError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}
      <div className="mb-6">
        <EventForm />
      </div>
      <EventsTable initialEvents={rows} />
    </DashboardShell>
  );
}
