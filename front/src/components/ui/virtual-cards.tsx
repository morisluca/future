import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

interface VirtualCardProps {
  accountType: "checking" | "savings" | string;
  balance: number;
  accountNumber: string;
  holderName: string;
  currency?: string;
  className?: string;
    profileImageUrl?: string | null;
    initials?: string;
}

const ChipIcon = () => (
  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-amber-500 grid grid-cols-2 grid-rows-3 gap-px p-1 shadow-inner">
    {Array(6).fill(0).map((_, i) => (
      <div key={i} className="bg-amber-600/40 rounded-sm" />
    ))}
  </div>
);

const cardGradients: Record<string, string> = {
  checking: "from-emerald-600 via-teal-600 to-emerald-800",
  savings:  "from-violet-600 via-purple-600 to-indigo-700",
};

const cardGlow: Record<string, string> = {
  checking: "shadow-emerald-500/30",
  savings:  "shadow-violet-500/30",
};

  export function VirtualCards({ accountType, balance, accountNumber, holderName, currency = "CN¥", className, profileImageUrl, initials = "U" }: VirtualCardProps) {
    const { data: settingsData } = useQuery({
      queryKey: ["settings"],
      queryFn: () => api.getPublicSettings(),
      retry: 1,
    });
    const siteName = settingsData?.settings?.site_name ?? "SecureBank";
    const gradient = cardGradients[accountType] ?? cardGradients.checking;
    const glow = cardGlow[accountType] ?? cardGlow.checking;
    const masked = `•••• •••• •••• ${accountNumber.slice(-4)}`;
    const formatted = "¥" + new Intl.NumberFormat("zh-CN").format(balance);
    const type = accountType.charAt(0).toUpperCase() + accountType.slice(1);

    return (
    <div className={cn("relative w-full h-52 rounded-3xl overflow-hidden select-none shadow-2xl", glow, className)}>
      {/* Gradient base */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />

      {/* Decorative orbs */}
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5" />
      <div className="absolute right-10 -bottom-12 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -left-6 bottom-4 w-28 h-28 rounded-full bg-black/10" />

      {/* Shimmer strip */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              {/* <Shield className="w-4 h-4 text-white" /> */}
              {/* Profile Image */}
              {profileImageUrl && (
                <div className="absolute top-6 left-6 w-7 h-7 rounded-lg overflow-hidden">
                  <Avatar className="w-7 h-7 border-2 border-white/30 shadow-lg">
                    <AvatarImage src={profileImageUrl} alt={holderName} />
                    <AvatarFallback className="bg-white/20 text-white font-bold text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
              <span className="text-white uppercase font-bold text-sm tracking-wide">{siteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs uppercase tracking-widest">{type}</span>
            <ChipIcon />
          </div>
        </div>


        {/* Balance */}
        <div>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Available Balance</p>
          <p className="text-white text-3xl font-bold tracking-tight leading-none">{formatted}</p>
        </div>

        {/* Bottom row */}
        <div className={cn("flex items-end justify-between", profileImageUrl && "pr-16")}>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Card Holder</p>
            <p className="text-white font-semibold text-sm uppercase tracking-wider line-clamp-1">{holderName}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Number</p>
            <p className="text-white font-mono text-sm tracking-widest">{masked}</p>
          </div>
        </div>
      </div>
    </div>
   );
 }
