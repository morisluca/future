import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetTransactions, useGetAccounts } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ChevronLeft, ChevronRight, Activity, FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TX_ICONS: Record<string, React.ElementType> = {
  deposit:      ArrowDownLeft,
  withdrawal:   ArrowUpRight,
  transfer_in:  ArrowDownLeft,
  transfer_out: ArrowUpRight,
};

const TX_COLORS: Record<string, string> = {
  deposit:      "text-emerald-400 bg-emerald-400/10",
  withdrawal:   "text-red-400 bg-red-400/10",
  transfer_in:  "text-blue-400 bg-blue-400/10",
  transfer_out: "text-amber-400 bg-amber-400/10",
};

const TX_LABEL: Record<string, string> = {
  deposit:      "Deposit",
  withdrawal:   "Withdrawal",
  transfer_in:  "Transfer In",
  transfer_out: "Transfer Out",
};

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "deposit",      label: "Deposits" },
  { value: "withdrawal",   label: "Withdrawals" },
  { value: "transfer_in",  label: "In" },
  { value: "transfer_out", label: "Out" },
];

export default function TransactionsPage() {
  const [page, setPage]                       = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [typeFilter, setTypeFilter]           = useState("");
  const [search, setSearch]                   = useState("");
  const [downloadingId, setDownloadingId]     = useState<number | null>(null);
  const pageSize = 15;
  const { toast } = useToast();

  const { data: accounts } = useGetAccounts();
  const { data, isLoading } = useGetTransactions({
    accountId: selectedAccount,
    limit: pageSize,
    offset: page * pageSize,
  });

  const allTxs   = data?.transactions || [];
  const filtered = allTxs
    .filter(tx => !typeFilter || tx.type === typeFilter)
    .filter(tx => !search || (tx.description ?? "").toLowerCase().includes(search.toLowerCase()));

  const total      = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const downloadReceipt = async (txId: number) => {
    setDownloadingId(txId);
    try {
      const url = api.getReceiptUrl(txId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error("Failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `receipt-${txId}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast({ variant: "destructive", title: "Download failed", description: "Could not generate the receipt." });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Transaction History</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{total} total transactions</p>
          </div>
          <select
            value={selectedAccount ?? ""}
            onChange={(e) => { setSelectedAccount(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
            className="bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white px-4 py-2.5 w-full sm:w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Accounts</option>
            {accounts?.map((acc) => (
              <option key={acc.id} value={acc.id}>
                •••• {acc.accountNumber.slice(-4)} ({acc.accountType})
              </option>
            ))}
          </select>
        </div>

        {/* Filter pills + search row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setTypeFilter(tab.value); setPage(0); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                  typeFilter === tab.value
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description..."
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-zinc-800/60 overflow-hidden bg-zinc-900/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <Activity className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {filtered.map((tx) => {
                const Icon     = TX_ICONS[tx.type] || Activity;
                const colorCls = TX_COLORS[tx.type] || "text-zinc-400 bg-zinc-700";
                const isCredit = tx.type === "deposit" || tx.type === "transfer_in";
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/20 transition-colors group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", colorCls)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">
                          {tx.description || TX_LABEL[tx.type] || tx.type.replace("_", " ")}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[10px] font-bold uppercase px-1.5 py-px rounded", colorCls)}>
                            {TX_LABEL[tx.type] || tx.type}
                          </span>
                          <span className="text-[11px] text-zinc-600">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className={cn("font-bold font-mono text-sm", isCredit ? "text-emerald-400" : "text-red-400")}>
                          {isCredit ? "+" : "−"}{formatCurrency(tx.amount)}
                        </p>
                        {tx.status !== "completed" && (
                          <p className="text-[10px] text-amber-400 font-semibold uppercase mt-0.5">{tx.status}</p>
                        )}
                      </div>
                      <button
                        onClick={() => downloadReceipt(tx.id)}
                        disabled={downloadingId === tx.id}
                        title="Download Receipt"
                        className="opacity-80 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 disabled:cursor-wait"
                      >
                        {downloadingId === tx.id
                          ? <div className="w-4 h-4 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          : <FileDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 tabular-nums">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}
                className="rounded-xl border-zinc-700 hover:bg-zinc-800">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex items-center px-3 text-xs text-zinc-400 bg-zinc-900 border border-zinc-700 rounded-xl tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                className="rounded-xl border-zinc-700 hover:bg-zinc-800">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
