import React from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { useAdminGetStats, useAdminGetTransactions } from "@/lib/api-client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading: isStatsLoading } = useAdminGetStats();
  const { data: txData } = useAdminGetTransactions({ limit: 10 });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-2">System Overview</h1>
          <p className="text-zinc-400 text-sm">Monitor platform metrics and activity.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats?.totalUsers} icon={Users} loading={isStatsLoading} color="text-indigo-400" bg="bg-indigo-400/10" />
          <StatCard title="Total Deposits" value={stats?.totalDeposits} isCurrency icon={Activity} loading={isStatsLoading} color="text-emerald-400" bg="bg-emerald-400/10" />
          <StatCard title="Total Withdrawals" value={stats?.totalWithdrawals} isCurrency icon={ArrowRightLeft} loading={isStatsLoading} color="text-amber-400" bg="bg-amber-400/10" />
          <StatCard title="Frozen Accounts" value={stats?.frozenUsers} icon={ShieldAlert} loading={isStatsLoading} color="text-red-400" bg="bg-red-400/10" />
        </div>

        {/* System Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Recent Bank Activity</h3>
              <Link href="/admin/transactions" className="text-xs font-medium text-emerald-400">View All</Link>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {txData?.transactions?.map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-800/30">
                      <td className="px-6 py-4">
                        <p className="text-white capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(tx.createdAt), 'MMM d, h:mm a')}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-300">
                        {tx.currency === 'CNY' ? formatCurrency(tx.amount) : `${tx.amount} ${tx.currency}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, loading, isCurrency, color, bg }: any) {
  return (
    <Card className="border-white/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
        </div>
        <h3 className="text-1xl font-display font-bold text-white">
          {loading ? "..." : isCurrency ? formatCurrency(value) : formatNumber(value)}
        </h3>
      </CardContent>
    </Card>
  );
}
