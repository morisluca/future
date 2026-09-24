import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Activity, Check, Loader2, X } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
};

const TYPE_STYLES: Record<string, string> = {
  deposit: "bg-emerald-500/10 text-emerald-300",
  withdrawal: "bg-red-500/10 text-red-300",
  transfer_out: "bg-amber-500/10 text-amber-300",
  transfer_in: "bg-sky-500/10 text-sky-300",
};

export default function AdminPendingApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const { toast } = useToast();

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const result = await api.getPendingApprovals();
      setApprovals(result.transfers || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Unable to load approvals", description: error?.message || "Failed to fetch pending approvals." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApproval = async (txId: number, approve: boolean) => {
    setActionInProgress(txId);
    try {
      const result = await api.approveTransfer(txId, approve);
      toast({ title: approve ? "Approved" : "Rejected", description: `Transaction ${result.status}.` });
      await loadApprovals();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action failed", description: error?.message || "Could not update approval status." });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-1">Pending Approvals</h1>
          <p className="text-zinc-400 text-sm">Review pending deposit and transfer requests before approval.</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : approvals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p>No pending approvals at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Account</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Created</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {approvals.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", TYPE_STYLES[tx.type] || "bg-zinc-800 text-zinc-300")}> 
                            {TYPE_LABELS[tx.type] || tx.type}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[320px] truncate text-zinc-300">{tx.description || "No description"}</td>
                        <td className="px-6 py-4 text-right font-mono text-white">{tx.type === "deposit" ? "+" : tx.type === "withdrawal" ? "-" : tx.type === "transfer_out" ? "-" : "+"}{formatCurrency(tx.amount)}</td>
                        <td className="px-6 py-4 text-xs text-zinc-400 font-mono">#{tx.accountId ?? tx.toAccountId ?? tx.fromAccountId}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}</td>
                        <td className="px-6 py-4 text-right space-x-2 flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(tx.id, false)}
                            disabled={actionInProgress === tx.id}
                            className="border-red-500 text-red-300 hover:bg-red-500/10"
                          >
                            {actionInProgress === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproval(tx.id, true)}
                            disabled={actionInProgress === tx.id}
                            className="gap-2"
                          >
                            {actionInProgress === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
