import React from "react";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface VirtualCardProps {
  accountType: "checking" | "savings" | string;
  balance: number;
  accountNumber: string;
  holderName: string;
  currency?: string;
  expiry?: string;
  cvc?: string;
  className?: string;
}

const ChipIcon = () => (
  <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 grid grid-cols-2 grid-rows-3 gap-px p-1 shadow-inner">
    {Array(6).fill(0).map((_, i) => (
      <div key={i} className="bg-amber-600/40 rounded-sm" />
    ))}
  </div>
);

const brandStyles: Record<string, string> = {
  mastercard: "from-orange-600 via-red-600 to-pink-600",
  visa: "from-sky-600 via-blue-600 to-indigo-700",
  checking: "from-emerald-600 via-teal-600 to-emerald-800",
  savings: "from-violet-600 via-purple-600 to-indigo-700",
};

const brandGlow: Record<string, string> = {
  mastercard: "shadow-orange-500/30",
  visa: "shadow-sky-500/30",
  checking: "shadow-emerald-500/30",
  savings: "shadow-violet-500/30",
};

const formatCardNumber = (number: string) => {
  const digits = number.replace(/\D/g, "");
  return digits.length === 16
    ? digits.replace(/(.{4})/g, "¥1 ").trim()
    : number;
};

export function VirtualCard({ accountType, balance, accountNumber, holderName, currency = "CN¥", expiry = "12/30", cvc = "123", className }: VirtualCardProps) {
  const gradient = brandStyles[accountType.toLowerCase()] ?? brandStyles.checking;
  const glow = brandGlow[accountType.toLowerCase()] ?? brandGlow.checking;
  const formatted = new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(balance);
  const type = accountType.charAt(0).toUpperCase() + accountType.slice(1);
  const formattedNumber = formatCardNumber(accountNumber || "0000000000000000");
  const masked = `•••• •••• •• ${accountNumber.slice(-6)}`;

  return (
    <div className={cn("relative w-full h-56 rounded-[2rem] overflow-hidden select-none shadow-2xl", glow, className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5" />
      <div className="absolute right-10 -bottom-12 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -left-6 bottom-4 w-28 h-28 rounded-full bg-black/10" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative h-full flex flex-col justify-between p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center text-white/90">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-white/70 uppercase tracking-[0.3em]">FuturebkAssest</p>
              <p className="text-sm font-semibold text-white">{type} Card</p>
            </div>
          </div>
          <ChipIcon />
        </div>

        <div className="space-y-3">
          <p className="text-sm text-white/70 uppercase tracking-[0.3em]">Card Number</p>
          <p className="text-2xl font-semibold tracking-[0.26em] text-white">{masked}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-white/80">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">Card Holder</p>
            <p className="mt-1 font-semibold uppercase tracking-wider">{holderName || "Card Holder"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">Valid Thru</p>
            <p className="mt-1 font-semibold tracking-wider">{expiry}</p>
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between rounded-2xl bg-black/10 px-3 py-2">
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">CVV</span>
              <span className="text-base font-semibold tracking-[0.2em] text-white">{cvc}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
