import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts, useGetTransactions } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { VirtualCard } from "@/components/ui/virtual-card";
import {
  ArrowUpRight, ArrowDownLeft, Plus, Clock,
  TrendingUp, TrendingDown, ArrowRightLeft, Bitcoin,
  ShoppingCart, Coffee, Building, Globe, Landmark,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { VirtualCards } from "@/components/ui/virtual-cards";

// Pick an icon by transaction type / description
function getTxIcon(type: string, description?: string | null) {
  const d = (description || "").toLowerCase();
  if (d.includes("coffee") || d.includes("café") || d.includes("cafe")) return Coffee;
  if (d.includes("shop") || d.includes("store") || d.includes("market")) return ShoppingCart;
  if (d.includes("wire") || d.includes("international")) return Globe;
  if (d.includes("bank")) return Landmark;
  if (type === "transfer_out" || type === "transfer_in") return ArrowRightLeft;
  if (type === "deposit") return ArrowDownLeft;
  if (type === "withdrawal") return ArrowUpRight;
  return Building;
}

const txColor: Record<string, string> = {
  deposit:       "bg-emerald-500/15 text-emerald-400",
  transfer_in:   "bg-blue-500/15 text-blue-400",
  withdrawal:    "bg-red-500/15 text-red-400",
  transfer_out:  "bg-amber-500/15 text-amber-400",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const QuickAction = ({ icon: Icon, label, href, accent = false }: { icon: React.ElementType; label: string; href: string; accent?: boolean }) => (
  <Link href={href}>
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex flex-col items-center gap-2.5 cursor-pointer",
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
        accent
          ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
          : "bg-zinc-800 border border-zinc-700/60 hover:bg-zinc-700"
      )}>
        <Icon className={cn("w-5 h-5", accent ? "text-zinc-950" : "text-zinc-300")} />
      </div>
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
    </motion.div>
  </Link>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useGetAccounts();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ limit: 6 });

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
  const primaryAccount = accounts?.[0];
  const txs = txData?.transactions || [];

  // Compute basic income / expense from recent transactions
  const income  = txs.filter(t => t.type === "deposit" || t.type === "transfer_in").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === "withdrawal" || t.type === "transfer_out").reduce((s, t) => s + t.amount, 0);
  const net     = income - expense;

  return (
    <DashboardLayout>
      <div className="space-y-7 pb-4">

        {/* ── Greeting ── */}
        <div>
          <p className="text-zinc-500 text-sm font-medium">
            {getGreeting()},

              <span className="flex md:block text-xs text-zinc-600 font-medium tabular-nums text-right flex-col items-end">
                {format(new Date(), "EEEE, MMM d yyyy")}
              </span>
          </p>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">{user?.firstName} {user?.lastName}</h1>

        </div>

        {/* ── Hero: Virtual Card + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          {/* Virtual card */}
          {accountsLoading ? (
            <div className="h-52 rounded-3xl bg-zinc-800/50 animate-pulse" />
          ) : primaryAccount ? (
            <VirtualCards
              accountType={primaryAccount.accountType as "checking" | "savings"}
              balance={totalBalance}
              accountNumber={primaryAccount.accountNumber}
              holderName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
              currency={primaryAccount.currency}
                profileImageUrl={user?.profileImageUrl}
                initials={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`}
            />
          ) : null}

          {/* Quick actions */}
          <div className="flex lg:flex-col gap-4 lg:grid lg:grid-cols-3  justify-around lg:justify-start lg:pt-4 lg:pr-2">
            <QuickAction icon={ArrowUpRight}   label="Send"     href="/transfers/wire"    accent />
            <QuickAction icon={Plus}           label="Deposit"  href="/deposit" />
            <QuickAction icon={Bitcoin}        label="Crypto"   href="/crypto" />
            <QuickAction icon={Clock}          label="History"  href="/transactions" />
            <QuickAction icon={ArrowDownLeft}  label="Receive"  href="/transfers/wire" />
            {/* <QuickAction icon={ArrowDownLeft}  label="Receive"  href="/withdraw" /> */}
          </div>
        </div>

        {/* ── Monthly summary ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-1 overflow-hidden">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-widest font-semibold">Income</span>
            </div>
            <p className="max-w-full break-words text-base font-bold text-white sm:text-xl">{formatCurrency(income)}</p>
            <p className="text-[11px] text-zinc-500">Recent activity</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-1 overflow-hidden">
            <div className="flex items-center gap-1.5 text-red-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-widest font-semibold">Spent</span>
            </div>
            <p className="max-w-full break-words text-base font-bold text-white sm:text-xl">{formatCurrency(expense)}</p>
            <p className="text-[11px] text-zinc-500">Recent activity</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-1 overflow-hidden">
            <div className={cn("flex items-center gap-1.5", net >= 0 ? "text-emerald-400" : "text-red-400")}>
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-widest font-semibold">Net</span>
            </div>
            <p className={cn("max-w-full break-words text-base font-bold sm:text-xl", net >= 0 ? "text-emerald-400" : "text-red-400")}>{net >= 0 ? "+" : ""}{formatCurrency(net)}</p>
            <p className="text-[11px] text-zinc-500">Recent activity</p>
          </div>
        </div>

        {/* ── Accounts + Transactions ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Accounts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Your Accounts</h3>
              <Link href="/accounts" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {accountsLoading
                ? Array(2).fill(0).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-zinc-800/50 animate-pulse" />)
                : accounts?.map((acc) => {
                    const isChecking = acc.accountType === "checking";
                    return (
                      <motion.div
                        key={acc.id}
                        whileHover={{ x: 3 }}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors cursor-default"
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0",
                          isChecking ? "bg-emerald-500/15 text-emerald-400" : "bg-violet-500/15 text-violet-400"
                        )}>
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white capitalize text-sm">{acc.accountType} Account</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">•••• {acc.accountNumber.slice(-4)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-white text-sm">{formatCurrency(acc.balance, acc.currency)}</p>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block",
                            acc.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>{acc.status}</span>
                        </div>
                      </motion.div>
                    );
                  })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Recent Activity</h3>
              <Link href="/transactions" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">View all →</Link>
            </div>
            <div className="space-y-1">
              {txLoading
                ? Array(5).fill(0).map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-800/40 animate-pulse mb-1" />)
                : txs.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-zinc-800 text-zinc-500">
                      <Clock className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">No transactions yet</p>
                    </div>
                  )
                  : txs.map((tx) => {
                      const isCredit = tx.type === "deposit" || tx.type === "transfer_in";
                      const Icon = getTxIcon(tx.type, tx.description);
                      const colorClass = txColor[tx.type] || "bg-zinc-800 text-zinc-400";
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800/30 transition-colors group">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white capitalize leading-tight truncate">
                              {tx.description || tx.type.replace("_", " ")}
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{format(new Date(tx.createdAt), "MMM d · h:mm a")}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={cn("text-sm font-bold", isCredit ? "text-emerald-400" : "text-zinc-200")}>
                              {isCredit ? "+" : "−"}{formatCurrency(tx.amount)}
                            </p>
                            {tx.status !== "completed" && (
                              <span className="text-[10px] text-amber-400 font-semibold">{tx.status}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
