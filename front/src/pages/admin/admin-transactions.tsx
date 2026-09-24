import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { useAdminGetTransactions } from "@/lib/api-client/";
import { api } from "@/lib/api";
import { formatCurrency, getStatusColor, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TX_ICONS: Record<string, React.ElementType> = {
  deposit: ArrowDownRight,
  withdrawal: ArrowUpRight,
  transfer_in: ArrowDownRight,
  transfer_out: ArrowUpRight,
};

const TX_COLORS: Record<string, string> = {
  deposit: "text-emerald-400 bg-emerald-400/10",
  withdrawal: "text-red-400 bg-red-400/10",
  transfer_in: "text-blue-400 bg-blue-400/10",
  transfer_out: "text-amber-400 bg-amber-400/10",
};

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pageSize = 20;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useAdminGetTransactions({
    limit: pageSize,
    offset: page * pageSize,
  });

  const txs = data?.transactions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleDeleteTransaction = async (txId: number) => {
    if (!window.confirm("Delete this transaction? This action cannot be undone.")) return;

    setDeletingId(txId);
    try {
      await api.deleteTransaction(txId);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Transaction deleted", description: "The transaction was removed successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message || "Unable to delete transaction." });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-1">All Transactions</h1>
          <p className="text-zinc-400 text-sm">{total} total transactions across all accounts</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : txs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">ID</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Account</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {txs.map((tx) => {
                      const Icon = TX_ICONS[tx.type] || Activity;
                      const colorClass = TX_COLORS[tx.type] || "text-zinc-400 bg-zinc-700";
                      const isCredit = tx.type === "deposit" || tx.type === "transfer_in";
                      return (
                        <tr key={tx.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 text-xs text-zinc-500 font-mono">#{tx.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm text-zinc-300 capitalize">{tx.type.replace("_", " ")}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400 max-w-[200px] truncate">{tx.description || "-"}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn("font-mono text-sm font-semibold", isCredit ? "text-emerald-400" : "text-red-400")}>
                              {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(tx.status))}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400">{format(new Date(tx.createdAt), "MMM d, h:mm a")}</td>
                          <td className="px-6 py-4 text-xs text-zinc-100 font-mono">#{tx.accountId}</td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDeleteTransaction(tx.id)}
                              disabled={deletingId === tx.id}
                              className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
                            >
                              {deletingId === tx.id ? "Deleting..." : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
