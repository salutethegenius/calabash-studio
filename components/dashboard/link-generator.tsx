"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

export function LinkGenerator({ onCreated }: { onCreated?: () => void }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLinkUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create link");

      setLinkUrl(data.url);
      setLabel("");
      setAmount("");
      onCreated?.();
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
          Generate payment link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Service or product name</Label>
              <Input
                id="label"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Portrait session"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BSD)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate Link"}
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
