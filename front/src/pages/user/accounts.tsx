import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { VirtualCard } from "@/components/ui/virtual-card";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, Wallet, ArrowUpRight, ArrowDownLeft, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { VirtualCards } from "@/components/ui/virtual-cards";

export default function AccountsPage() {
  const { user } = useAuth();
  const { data: accounts, isLoading, error } = useGetAccounts();
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-full">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">My Accounts</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage your checking and savings accounts.</p>
          </div>
          {accounts && accounts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Total Balance</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBalance)}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Failed to load accounts. Please try again.</p>
          </div>
        )}

        <div className="space-y-10 max-w-full">
          {isLoading ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="space-y-5">
                <div className="h-52 rounded-3xl bg-zinc-800/50 animate-pulse" />
                <div className="grid grid-cols-3 gap-4">
                  {Array(3).fill(0).map((_, j) => <div key={j} className="h-16 rounded-2xl bg-zinc-800/40 animate-pulse" />)}
                </div>
              </div>
            ))
          ) : accounts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-zinc-700 mx-w-full">
              <Wallet className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No accounts yet</h3>
              <p className="text-zinc-500 text-sm">Your accounts will appear here once created.</p>
            </div>
          ) : (
            accounts?.map((account, idx) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-5"
              >
                {/* Virtual card */}
                <VirtualCards
                  accountType={account.accountType as "checking" | "savings"}
                  balance={account.balance}
                  accountNumber={account.accountNumber}
                  holderName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
                  currency={account.currency}
                  className="max-w-md"
                    profileImageUrl={user?.profileImageUrl}
                    initials={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`}
                />

                {/* Account stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-full">
                  <Link href="/transfers/wire">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">Send</span>
                    </div>
                  </Link>
                  <Link href="/deposit">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                        <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">Deposit</span>
                    </div>
                  </Link>
                  <Link href="/transactions">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center group-hover:bg-zinc-600 transition-colors">
                        <Clock className="w-4 h-4 text-zinc-300" />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">History</span>
                    </div>
                  </Link>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs text-zinc-400 font-medium">Growth</span>
                  </div>
                </div>

                {/* Account meta */}
                <div className="max-w-md grid grid-cols-2 gap-3 max-w-full">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Account Number</p>
                    <p className="text-sm font-mono text-white tracking-widest">
                      {account.accountNumber.replace(/(\d{4})/g, "$1 ").trim()}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        account.status === "active" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-red-400"
                      )} />
                      <span className="text-sm font-semibold text-white capitalize">{account.status}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Opened</p>
                    <p className="text-sm text-white">{format(new Date(account.createdAt), "MMMM d, yyyy")}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Currency</p>
                    <p className="text-sm font-bold text-white">{account.currency}</p>
                  </div>
                </div>

                {idx < (accounts?.length ?? 0) - 1 && (
                  <hr className="border-zinc-800/60" />
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
