"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { fromDate: localIsoDate(from), toDate: localIsoDate(to) };
}

type SyncSummary = {
  synced: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export function SyncTransactionsButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter();
  const initial = useMemo(defaultRange, []);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSync() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/cng/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      });
      const data = (await res.json()) as SyncSummary & { message?: string };
      if (!res.ok) throw new Error(data.message || "Sync failed");

      const parts = [
        `${data.inserted} inserted`,
        `${data.updated} updated`,
      ];
      if (data.skipped) parts.push(`${data.skipped} skipped`);
      if (data.errors?.length) parts.push(`${data.errors.length} errors`);
      setMessage(`Synced ${data.synced} from CNG (${parts.join(", ")}).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[var(--calabash-light-green)]/50 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="cng-from">From</Label>
          <Input
            id="cng-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 w-40"
          />
        </div>
        <div>
          <Label htmlFor="cng-to">To</Label>
          <Input
            id="cng-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-40"
          />
        </div>
        <Button type="button" onClick={onSync} disabled={loading}>
          {loading ? "Syncing…" : "Sync from CNG"}
        </Button>
      </div>
      <div className="text-sm text-[var(--calabash-dark-green)]/70">
        {lastSyncedAt ? (
          <p>Last synced {new Date(lastSyncedAt).toLocaleString()}</p>
        ) : (
          <p>Not synced from CNG yet</p>
        )}
        {message && <p className="text-[var(--calabash-dark-green)]">{message}</p>}
        {error && <p className="text-red-700">{error}</p>}
      </div>
    </div>
  );
}
