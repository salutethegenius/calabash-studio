import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LinkGenerator } from "@/components/dashboard/link-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/analytics";
import { formatBsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let loadError: string | null = null;
  let stats = {
    totalInvoicedCents: 0,
    paymentsDueCents: 0,
    todaysRevenueCents: 0,
    todaysFeesCents: 0,
  };

  try {
    stats = await getDashboardStats();
  } catch {
    loadError = "Could not load dashboard stats. Check the database connection.";
  }

  const cards = [
    {
      label: "Total Invoiced",
      value: formatBsd(stats.totalInvoicedCents),
      accent: "text-[var(--calabash-dark-green)]",
    },
    {
      label: "Payments Due",
      value: formatBsd(stats.paymentsDueCents),
      accent: "text-[var(--calabash-orange)]",
    },
    {
      label: "Today's Revenue (net)",
      value: formatBsd(stats.todaysRevenueCents),
      accent: "text-[var(--calabash-dark-green)]",
    },
    {
      label: "Today's Fees",
      value: formatBsd(stats.todaysFeesCents),
      accent: "text-[var(--calabash-orange)]",
    },
  ];

  return (
    <DashboardShell title="Dashboard">
      {loadError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <div className="h-1 bg-[var(--calabash-orange)]" />
            <CardHeader>
              <CardTitle>{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`font-heading text-3xl font-semibold ${card.accent}`}
              >
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LinkGenerator />
    </DashboardShell>
  );
}
