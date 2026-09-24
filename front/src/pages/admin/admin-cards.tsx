import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);
  const { toast } = useToast();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminCards();
      setCards(res.cards || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const perform = async (cardId: number, action: string) => {
    setActioning(cardId);
    try {
      const res = await api.adminUpdateCard(cardId, { action: action as any });
      if (res.success) {
        toast({ title: "Success", description: `Card ${action}ed.` });
        fetch();
      } else {
        toast({ variant: "destructive", title: "Failed", description: `Action ${action} failed.` });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setActioning(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Card Management</h1>
            <p className="text-zinc-400 text-sm">Manage user card requests and card lifecycle.</p>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : cards.length === 0 ? (
              <div className="p-8 text-center text-zinc-500"><CreditCard className="w-12 h-12 mx-auto mb-3" /><p>No card requests found.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">User</th>
                      <th className="px-6 py-3 text-left">Card</th>
                      <th className="px-6 py-3 text-left">Expiry</th>
                      <th className="px-6 py-3 text-left">CVV</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {cards.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-800/20">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{c.userEmail ?? `User ${c.userId}`}</div>
                          <div className="text-xs text-zinc-500">{c.holderName ?? "—"}</div>
                        </td>
                        <td className="px-6 py-4"><span className="text-sm text-white font-mono">{c.cardNumber ? c.cardNumber.replace(/(.{4})/g, "$1 ").trim() : "—"}</span></td>
                        <td className="px-6 py-4"><span className="text-sm text-white">{c.expiry ?? "—"}</span></td>
                        <td className="px-6 py-4"><span className="text-sm text-white">{c.cvc ?? "—"}</span></td>
                        <td className="px-6 py-4"><span className="text-sm text-white capitalize">{c.cardType}</span></td>
                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{c.status}</span></td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{format(new Date(c.createdAt), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.status !== 'active' && (
                              <Button size="sm" onClick={() => perform(c.id, 'activate')} disabled={actioning === c.id}>
                                {actioning === c.id ? '...' : 'Activate'}
                              </Button>
                            )}
                            {c.status === 'active' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => perform(c.id, 'freeze')} disabled={actioning === c.id}>Freeze</Button>
                                <Button size="sm" variant="ghost" onClick={() => perform(c.id, 'suspend')} disabled={actioning === c.id}>Suspend</Button>
                              </>
                            )}
                            {(c.status === 'frozen' || c.status === 'suspended') && (
                              <Button size="sm" onClick={() => perform(c.id, 'unfreeze')} disabled={actioning === c.id}>Unfreeze</Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => perform(c.id, 'delete')} disabled={actioning === c.id}><Trash2 className="w-4 h-4" /></Button>
                          </div>
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
