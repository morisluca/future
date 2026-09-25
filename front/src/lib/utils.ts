import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null, currency = "USD") {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCrypto(amount: number | undefined | null, symbol: string) {
  if (amount === undefined || amount === null) return `0.0000 ${symbol}`;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount) + ` ${symbol}`;
}

export function formatNumber(amount: number | undefined | null) {
  if (amount === undefined || amount === null) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short"
  }).format(amount);
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'active':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'pending':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'failed':
    case 'frozen':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    default:
      return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
