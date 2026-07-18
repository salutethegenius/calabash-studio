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

export function toDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}
