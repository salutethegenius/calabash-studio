"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBsd } from "@/lib/utils";

export type LinkRow = {
  id: string;
  label: string;
  amount_cents: number;
  status: string;
  link_token: string;
  created_at: string;
  url: string;
};

function statusClass(status: string) {
  if (status === "paid")
    return "bg-[var(--calabash-light-green)]/40 text-[var(--calabash-dark-green)]";
  if (status === "expired")
    return "bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/60";
  return "bg-[var(--calabash-orange)]/15 text-[var(--calabash-orange)]";
}

export function LinksTable({ initialLinks }: { initialLinks: LinkRow[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function remove(id: string) {
    if (!confirm("Delete this payment link?")) return;
    setDeleteError(null);

    const res = await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.message || "Failed to delete link");
    }
  }

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--calabash-light-green)] bg-white p-10 text-center text-sm text-[var(--calabash-dark-green)]/60">
        No payment links yet. Generate one from the dashboard.
      </div>
    );
  }

  return (
    <>
      {deleteError && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {deleteError}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-[var(--calabash-light-green)]/50 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--calabash-light-green)]/40 bg-[var(--calabash-beige)] text-[var(--calabash-dark-green)]/70">
          <tr>
            <th className="px-4 py-3 font-medium">Service / Product</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Link</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr
              key={link.id}
              className="border-b border-[var(--calabash-light-green)]/25 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-[var(--calabash-dark-green)]">
                {link.label}
              </td>
              <td className="px-4 py-3 text-[var(--calabash-dark-green)]">
                {formatBsd(link.amount_cents)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(link.status)}`}
                >
                  {link.status}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--calabash-dark-green)]/70">
                {new Date(link.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy(link.url, link.id)}
                >
                  {copiedId === link.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy
                </Button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link href={`/pay/${link.link_token}`} target="_blank">
                    <Button type="button" variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(link.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-700" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
