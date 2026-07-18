"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PayButton({ linkId }: { linkId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cng-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
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
    <div className="space-y-3">
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
