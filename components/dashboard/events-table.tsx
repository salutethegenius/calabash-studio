"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventSalesState } from "@/lib/events";
import { formatBusinessDateTime } from "@/lib/time";
import { formatBsd } from "@/lib/utils";

export type EventRow = {
  id: string;
  label: string;
  amount_cents: number;
  link_token: string;
  sales_end_at: string | null;
  capacity: number | null;
  sold_count: number;
  url: string;
};

function statusClass(state: string) {
  if (state === "open")
    return "bg-[var(--calabash-light-green)]/40 text-[var(--calabash-dark-green)]";
  if (state === "sold_out")
    return "bg-[var(--calabash-orange)]/15 text-[var(--calabash-orange)]";
  return "bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/60";
}

function statusLabel(state: string) {
  if (state === "sold_out") return "Sold out";
  if (state === "ended") return "Closed";
  return "Open";
}

export function EventsTable({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function closeSales(id: string) {
    if (!confirm("Close ticket sales for this event?")) return;
    setError(null);
    const res = await fetch(`/api/events/${id}/close`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message || "Failed to close sales");
      return;
    }
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? { ...event, sales_end_at: data.sales_end_at ?? new Date().toISOString() }
          : event
      )
    );
  }

  async function remove(id: string) {
    if (!confirm("Delete this event ticket link?")) return;
    setError(null);
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Failed to delete event");
    }
  }

  if (events.length === 0) {
    return (
      <>
        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="rounded-lg border border-dashed border-[var(--calabash-light-green)] bg-white p-10 text-center text-sm text-[var(--calabash-dark-green)]/60">
          No event ticket links yet. Create one above to share.
        </div>
      </>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-[var(--calabash-light-green)]/50 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[var(--calabash-light-green)]/40 bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/70">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">Sales end</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const state = eventSalesState(event);
              const soldLabel =
                event.capacity != null
                  ? `${event.sold_count} / ${event.capacity}`
                  : String(event.sold_count);
              return (
                <tr
                  key={event.id}
                  className="border-b border-[var(--calabash-light-green)]/25 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[var(--calabash-dark-green)]">
                    {event.label}
                  </td>
                  <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                    {formatBsd(event.amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                    {soldLabel}
                  </td>
                  <td className="px-4 py-3 text-[var(--calabash-dark-green)]/70">
                    {event.sales_end_at
                      ? formatBusinessDateTime(event.sales_end_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(state)}`}
                    >
                      {statusLabel(state)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copy(event.url, event.id)}
                    >
                      {copiedId === event.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/event/${event.link_token}`} target="_blank">
                        <Button type="button" variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      {state === "open" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => closeSales(event.id)}
                        >
                          Close sales
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(event.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-700" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
