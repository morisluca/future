import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts } from "@/lib/api-client";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VirtualCard } from "@/components/ui/virtual-card";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";

export default function CardsPage() {
  const { data: accounts } = useGetAccounts();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<any | null>(null);
  const [processingFee, setProcessingFee] = useState<number | null>(null);
  const [form, setForm] = useState({ cardType: "mastercard", accountId: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([api.getUserCard(), api.getCardSettings()])
      .then((results) => {
        if (!mounted) return;
        const [cardResult, settingsResult] = results;
        if (cardResult.status === "fulfilled") {
          setCard(cardResult.value.card ?? null);
        }
        if (settingsResult.status === "fulfilled") {
          const fee = parseFloat(settingsResult.value.settings?.card_processing_fee || "0") || null;
          setProcessingFee(fee);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false };
  }, []);


  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const hasPendingRequest = card?.status === "pending";
  const canRequest = !hasPendingRequest;
  const requestButtonLabel = card ? "Request Another Card" : "Request Card";

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId) { toast({ variant: "destructive", title: "Error", description: "Select an account to charge the processing fee." }); return; }
    if (!canRequest) { return; }
    setSubmitting(true);
    try {
      const res = await api.requestCard({ cardType: form.cardType as any, accountId: parseInt(form.accountId), address: form.address || undefined });
      if (res.success) {
        toast({ title: "Requested", description: "Card request submitted — awaiting approval." });
        setCard({ status: "pending", cardType: form.cardType });
      } else {
        toast({ variant: "destructive", title: "Request Failed" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Request Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Cards</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage your debit/credit cards.</p>
          </div>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-zinc-800/50 animate-pulse" />
        ) : (
          <div className="space-y-6">
            {card ? (
              <div className="space-y-4">
                {card.status === "active" ? (
                  <>
                    <VirtualCard
                      accountType={card.cardType || "checking"}
                      balance={card.availableBalance ?? 0}
                      accountNumber={card.cardNumber ?? "0000000000000000"}
                      holderName={card.holderName || "Card Holder"}
                      expiry={card.expiry}
                      cvc={card.cvc}
                      className="max-w-md"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Status</p>
                        <p className="text-sm font-semibold text-white capitalize">{card.status}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Type</p>
                        <p className="text-sm font-semibold text-white capitalize">{card.cardType}</p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
                      <p className="font-medium">Active card</p>
                      <p className="mt-1 text-zinc-400">You can request a replacement or additional card below.</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Card Request Pending</h3>
                    <p className="text-zinc-500 text-sm">Your card request is being reviewed by the admin.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6">
                  <p className="text-sm text-zinc-400">You don't have an active card.</p>
                  <p className="text-xs text-zinc-500 mt-1">Request a physical card (Mastercard or Visa). Requests require admin approval and a processing fee.</p>
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{card ? "Request Another Card" : "Request a Card"}</h2>
                  <p className="text-sm text-zinc-500">Choose your card type and the account to charge for the processing fee.</p>
                </div>
                {hasPendingRequest && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Pending</span>
                )}
              </div>

              <form onSubmit={handleRequest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400">Card Type</label>
                    <select value={form.cardType} onChange={setField("cardType")} className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", "bg-zinc-900/60 border-zinc-800 text-white") }>
                      <option value="mastercard">Mastercard</option>
                      <option value="visa">Visa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Charge From Account</label>
                    <select value={form.accountId} onChange={setField("accountId")} className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", "bg-zinc-900/60 border-zinc-800 text-white") }>
                      <option value="">Select account...</option>
                      {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.accountType} (···{a.accountNumber.slice(-4)}) — {formatCurrency(a.balance)}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Shipping Address (optional)</label>
                  <Input value={form.address} onChange={setField("address")} className="bg-zinc-900/60" placeholder="Address to ship card" />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-400">
                    Processing fee: <span className="font-semibold text-white">{processingFee !== null ? formatCurrency(processingFee) : "—"}</span>
                  </p>
                  <Button type="submit" disabled={submitting || !canRequest}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : requestButtonLabel}
                  </Button>
                </div>

                {hasPendingRequest && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    You already have a pending card request. Wait for admin approval before submitting a new request.
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
