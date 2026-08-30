"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseDollarsToCents } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

export function EventForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [salesEndAt, setSalesEndAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLinkUrl(null);
    setLoading(true);

    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null) {
      setError("Enter a valid amount with up to two decimals");
      setLoading(false);
      return;
    }

    const cap = capacity.trim();
    const capacityNum = cap ? Number(cap) : null;
    if (cap && (!Number.isInteger(capacityNum) || (capacityNum ?? 0) < 1)) {
      setError("Max tickets must be a whole number of 1 or more");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          amount: amountCents,
          salesEndAt,
          capacity: capacityNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create event");

      setLinkUrl(data.url);
      setLabel("");
      setAmount("");
      setSalesEndAt("");
      setCapacity("");
      onCreated?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold text-[var(--calabash-dark-green)]">
          Create event ticket link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-label">Event name</Label>
              <Input
                id="event-label"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Independence Day party"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-amount">Ticket price (BSD)</Label>
              <Input
                id="event-amount"
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Sales end (Nassau time)</Label>
              <Input
                id="event-end"
                type="datetime-local"
                required
                value={salesEndAt}
                onChange={(e) => setSalesEndAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-capacity">Max tickets (optional)</Label>
              <Input
                id="event-capacity"
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create event link"}
          </Button>
        </form>

        {linkUrl && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-[var(--calabash-light-green)] bg-[var(--calabash-beige)] p-3">
            <Input readOnly value={linkUrl} className="bg-white" />
            <Button type="button" variant="outline" size="icon" onClick={copyLink}>
              {copied ? (
                <Check className="h-4 w-4 text-[var(--calabash-dark-green)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
