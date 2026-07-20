"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isValidPromoPreview,
  previewPromoAmount,
} from "@/lib/promo";
import { formatBsd } from "@/lib/utils";

export function PayButton({
  linkId,
  amountCents,
}: {
  linkId: string;
  amountCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const promoMatches = isValidPromoPreview(promoCode);
  const displayAmount = previewPromoAmount(amountCents, promoCode);

  async function startPayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cng-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to start payment");

      window.location.href = data.redirectPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed to start");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        {promoMatches ? (
          <>
            <p className="font-body text-sm text-[var(--calabash-dark-green)]/50 line-through">
              {formatBsd(amountCents)}
            </p>
            <p className="font-heading text-4xl font-semibold text-[var(--calabash-orange)]">
              {formatBsd(displayAmount)}
            </p>
            <p className="font-body text-sm text-[var(--calabash-dark-green)]">
              10% promo applied
            </p>
          </>
        ) : (
          <p className="font-heading text-4xl font-semibold text-[var(--calabash-orange)]">
            {formatBsd(amountCents)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="promoCode">Promo code (optional)</Label>
        <Input
          id="promoCode"
          name="promoCode"
          autoComplete="off"
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => {
            setPromoCode(e.target.value);
            setError(null);
          }}
          disabled={loading}
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={startPayment}
        disabled={loading}
      >
        {loading ? "Redirecting…" : "Pay Now"}
      </Button>
      {error && (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
