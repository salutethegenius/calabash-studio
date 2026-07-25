import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBsd(cents: number): string {
  return new Intl.NumberFormat("en-BS", {
    style: "currency",
    currency: "BSD",
  }).format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Parse a dollar string (e.g. "12.34") into an integer number of cents without floating-point drift. */
export function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const dollars = parseInt(match[1], 10);
  const centsPart = match[2] ?? "0";
  const cents = parseInt(centsPart.padEnd(2, "0"), 10);

  return dollars * 100 + cents;
}

export function toDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}
