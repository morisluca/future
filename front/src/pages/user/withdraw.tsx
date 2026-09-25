import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts, useTransfer, useDeposit, useWithdraw, getGetAccountsQueryKey, getGetTransactionsQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { ArrowRightLeft, Download, Upload, Loader2, Globe, Wifi, MapPin, Copy, CheckCircle2, Lock, Building2, AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type Tab = "transfer" | "deposit" | "withdraw";
type TransferType = "local" | "international" | "wire";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-300">{label}</label>
    {children}
  </div>
);

const inputCls = "bg-zinc-900/60 border-zinc-800 focus:border-emerald-500 text-white placeholder:text-zinc-600";

export default function WithdrawPage() {
  const [activeTab, setActiveTab] = useState<Tab>("withdraw");
  const [transferType, setTransferType] = useState<TransferType>("local");
  const { data: accounts } = useGetAccounts();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [depositInfo, setDepositInfo] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const transferMut = useTransfer();
  const depositMut = useDeposit();
  const withdrawMut = useWithdraw();

  useEffect(() => {
    api.getDepositInfo().then((r) => setDepositInfo(r.info)).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountNumber: "",
    amount: "",
    description: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    imfCode: "",
    cotCode: "",
    transferPin: "",
    senderBank: "",
    senderAccountNumber: "",
    senderAccountName: "",
  });

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const reset = () => setForm({ fromAccountId: "", toAccountNumber: "", amount: "", description: "", bankName: "", bankAccountNumber: "", bankAccountName: "", imfCode: "", cotCode: "", transferPin: "", senderBank: "", senderAccountNumber: "", senderAccountName: "" });

  const onSuccess = (msg = "Transaction completed successfully.") => {
    queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
    reset();
    toast({ title: "Success", description: msg });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  };

  const isPending = transferMut.isPending || depositMut.isPending || withdrawMut.isPending;
  const activeAccounts = accounts?.filter((a) => a.status === "active") || [];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromAccountId) { toast({ variant: "destructive", title: "Error", description: "Please select a source account." }); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast({ variant: "destructive", title: "Error", description: "Enter a valid amount." }); return; }
    if (!form.bankName || !form.bankAccountNumber || !form.bankAccountName) { toast({ variant: "destructive", title: "Error", description: "Recipient bank details are required." }); return; }
    if (!form.transferPin) { toast({ variant: "destructive", title: "Error", description: "Transfer PIN is required." }); return; }
    if (transferType === "wire" && !user?.wireBypassCodes) {
      if (!form.imfCode) { toast({ variant: "destructive", title: "Error", description: "IMF code is required for wire transfers." }); return; }
      if (!form.cotCode) { toast({ variant: "destructive", title: "Error", description: "COT code is required for wire transfers." }); return; }
    }
    try {
      const result = await transferMut.mutateAsync({
        data: {
          fromAccountId: parseInt(form.fromAccountId),
          toAccountNumber: form.toAccountNumber || undefined,
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          transferType,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankAccountName: form.bankAccountName,
          imfCode: form.imfCode || undefined,
          cotCode: form.cotCode || undefined,
          transferPin: form.transferPin,
        } as any,
      });
      const pending = (result as any).pendingApproval;
      onSuccess(pending ? "Transfer submitted — awaiting admin approval." : "Transfer completed successfully.");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Transfer Failed", description: err.message });
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromAccountId || !form.amount || parseFloat(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select an account and enter a valid amount." }); return;
    }
    try {
      const result = await depositMut.mutateAsync({
        data: {
          accountId: parseInt(form.fromAccountId),
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          senderBank: form.senderBank || undefined,
          senderAccountNumber: form.senderAccountNumber || undefined,
          senderAccountName: form.senderAccountName || undefined,
        } as any,
      });
      const pending = (result as any).status === "pending";
      onSuccess(pending ? "Deposit submitted — awaiting admin approval." : "Deposit credited to your account.");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deposit Failed", description: err.message });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fromAccountId || !form.amount || parseFloat(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select an account and enter a valid amount." }); return;
    }
    if (!form.bankName || !form.bankAccountNumber || !form.bankAccountName) {
      toast({ variant: "destructive", title: "Error", description: "Recipient bank details are required." }); return;
    }
    // Show PIN dialog to confirm withdrawal
    setPinDialogOpen(true);
  };

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");

  const confirmWithdraw = async () => {
    if (!pinValue || pinValue.length < 1) { toast({ variant: "destructive", title: "Error", description: "Transfer PIN is required." }); return; }
    try {
      await withdrawMut.mutateAsync({
        data: {
          accountId: parseInt(form.fromAccountId),
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          transferPin: pinValue,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankAccountName: form.bankAccountName,
        } as any,
      });
      setPinDialogOpen(false);
      setPinValue("");
      onSuccess("Withdrawal processed successfully.");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: err.message });
    }
  };


  const tabs = [
    // { id: "transfer" as Tab, label: "Send Money", icon: ArrowRightLeft },
    { id: "withdraw" as Tab, label: "Withdraw", icon: Upload },
    // { id: "deposit" as Tab, label: "Deposit", icon: Download }
  ];

  const transferTypes: { id: TransferType; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "local", label: "Local", icon: MapPin, desc: "Domestic bank transfer" },
    { id: "international", label: "International", icon: Globe, desc: "Cross-border transfer" },
    { id: "wire", label: "Wire Transfer", icon: Wifi, desc: "Requires IMF + COT codes" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-2"> Withdraw Money</h1>
          <p className="text-zinc-400 text-sm">Withdraw funds from your accounts.</p>
        </div>

        {/* Main tabs */}
        <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); reset(); }}
              className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.id ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 border border-zinc-800">

          {/* ─── TRANSFER ─────────────────────────────────────────────── */}
          {activeTab === "transfer" && (
            <form onSubmit={handleTransfer} className="space-y-5">
              {/* Transfer type selector */}
              <div className="grid grid-cols-3 gap-2">
                {transferTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransferType(t.id)}
                    className={cn("flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all",
                      transferType === t.id ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300")}
                  >
                    <t.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{t.label}</span>
                    <span className="text-[10px] text-zinc-500 hidden sm:block">{t.desc}</span>
                  </button>
                ))}
              </div>

              {transferType === "wire" && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Wire transfers require your IMF code and COT code provided by the bank.{" "}
                    {user?.wireBypassCodes && <span className="font-semibold text-emerald-400">Your account is approved — PIN only required.</span>}
                  </p>
                </div>
              )}

              <Field label="From Account">
                <select className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", inputCls)} value={form.fromAccountId} onChange={setField("fromAccountId")}>
                  <option value="">Select account...</option>
                  {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountType} (···{a.accountNumber.slice(-4)}) — {formatCurrency(a.balance)}</option>)}
                </select>
              </Field>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Recipient Details</p>
                <div className="space-y-3">
                  <Field label="Bank Name">
                    <Input className={inputCls} placeholder="Recipient's bank name" value={form.bankName} onChange={setField("bankName")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Account Number">
                      <Input className={inputCls} placeholder="Account number" value={form.bankAccountNumber} onChange={setField("bankAccountNumber")} />
                    </Field>
                    <Field label="Account Name">
                      <Input className={inputCls} placeholder="Account holder name" value={form.bankAccountName} onChange={setField("bankAccountName")} />
                    </Field>
                  </div>
                  {(transferType === "local") && (
                    <Field label="Internal Account Number (optional)">
                      <Input className={inputCls} placeholder="SecureBank account number to credit directly" value={form.toAccountNumber} onChange={setField("toAccountNumber")} />
                    </Field>
                  )}
                </div>
              </div>

              <Field label="Amount (USD)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <Input type="number" step="0.01" className={cn(inputCls, "pl-8")} placeholder="0.00" value={form.amount} onChange={setField("amount")} />
                </div>
              </Field>

              <Field label="Description (optional)">
                <Input className={inputCls} placeholder="What is this for?" value={form.description} onChange={setField("description")} />
              </Field>

              {/* Wire codes */}
              {transferType === "wire" && !user?.wireBypassCodes && (
                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Wire Verification Codes</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="IMF Code">
                      <Input className={cn(inputCls, "font-mono")} placeholder="IMF-XXXX-XXXXX" value={form.imfCode} onChange={setField("imfCode")} />
                    </Field>
                    <Field label="COT Code">
                      <Input className={cn(inputCls, "font-mono")} placeholder="COT-XXXX-XXXXX" value={form.cotCode} onChange={setField("cotCode")} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Transfer PIN */}
              <div className="border-t border-zinc-800 pt-4">
                <Field label="Transfer PIN">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input type="password" maxLength={6} className={cn(inputCls, "pl-10 tracking-widest font-mono")} placeholder="••••" value={form.transferPin} onChange={setField("transferPin")} />
                  </div>
                  {!user?.hasTransferPin && (
                    <p className="text-xs text-amber-400 mt-1.5">You haven't set a transfer PIN yet. Go to Account Settings to set one.</p>
                  )}
                </Field>
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-base mt-2" disabled={isPending || !user?.hasTransferPin}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Send ${transferType.charAt(0).toUpperCase() + transferType.slice(1)} Transfer`}
              </Button>
            </form>
          )}

          {/* ─── DEPOSIT ──────────────────────────────────────────────── */}
          {activeTab === "deposit" && (
            <div className="space-y-6">
              {/* Admin bank details */}
              {(depositInfo.deposit_bank_name || depositInfo.deposit_account_number) ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">Bank Transfer Details</p>
                  </div>
                  <p className="text-xs text-zinc-400">Send your funds to the account below, then submit the form to notify us.</p>
                  {[
                    { key: "deposit_bank_name", label: "Bank Name" },
                    { key: "deposit_account_number", label: "Account Number" },
                    { key: "deposit_account_name", label: "Account Name" },
                    { key: "deposit_bank_address", label: "Bank Address" },
                  ].filter(f => depositInfo[f.key]).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white font-mono">{depositInfo[key]}</span>
                        <button onClick={() => copyToClipboard(depositInfo[key], key)} className="text-zinc-500 hover:text-emerald-400 transition-colors">
                          {copied === key ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {depositInfo.deposit_instructions && (
                    <div className="bg-zinc-900/60 rounded-lg p-3">
                      <p className="text-xs text-zinc-400"><span className="font-semibold text-zinc-300">Instructions: </span>{depositInfo.deposit_instructions}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-5 text-center">
                  <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Deposit bank details have not been configured by the admin yet.</p>
                </div>
              )}

              <form onSubmit={handleDeposit} className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Notification Form</p>

                <Field label="Credit to Account">
                  <select className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", inputCls)} value={form.fromAccountId} onChange={setField("fromAccountId")}>
                    <option value="">Select account...</option>
                    {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountType} (···{a.accountNumber.slice(-4)}) — {formatCurrency(a.balance)}</option>)}
                  </select>
                </Field>

                <Field label="Amount Sent (USD)">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <Input type="number" step="0.01" className={cn(inputCls, "pl-8")} placeholder="0.00" value={form.amount} onChange={setField("amount")} />
                  </div>
                </Field>

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <p className="text-xs text-zinc-500">Your sending bank details (optional, for verification)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Your Bank">
                      <Input className={inputCls} placeholder="Bank name" value={form.senderBank} onChange={setField("senderBank")} />
                    </Field>
                    <Field label="Your Account Name">
                      <Input className={inputCls} placeholder="Account holder" value={form.senderAccountName} onChange={setField("senderAccountName")} />
                    </Field>
                  </div>
                  <Field label="Your Account Number">
                    <Input className={inputCls} placeholder="Sending account number" value={form.senderAccountNumber} onChange={setField("senderAccountNumber")} />
                  </Field>
                </div>

                <Field label="Reference / Note (optional)">
                  <Input className={inputCls} placeholder="e.g. your name or email" value={form.description} onChange={setField("description")} />
                </Field>

                <Button type="submit" size="lg" className="w-full h-14 text-base" disabled={isPending}>
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Deposit Notification"}
                </Button>
              </form>
            </div>
          )}

          {/* ─── WITHDRAW ─────────────────────────────────────────────── */}
          {activeTab === "withdraw" && (
            <form onSubmit={handleWithdraw} className="space-y-5">
              <Field label="From Account">
                <select className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", inputCls)} value={form.fromAccountId} onChange={setField("fromAccountId")}>
                  <option value="">Select account...</option>
                  {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountType} (···{a.accountNumber.slice(-4)}) — {formatCurrency(a.balance)}</option>)}
                </select>
              </Field>

              <Field label="Amount (USD)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <Input type="number" step="0.01" className={cn(inputCls, "pl-8")} placeholder="0.00" value={form.amount} onChange={setField("amount")} />
                </div>
              </Field>

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recipient Bank Details</p>
                <Field label="Bank Name">
                  <Input className={inputCls} placeholder="Beneficiary bank name" value={form.bankName} onChange={setField("bankName")} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Account Number">
                    <Input className={inputCls} placeholder="Account number" value={form.bankAccountNumber} onChange={setField("bankAccountNumber")} />
                  </Field>
                  <Field label="Account Name">
                    <Input className={inputCls} placeholder="Account holder name" value={form.bankAccountName} onChange={setField("bankAccountName")} />
                  </Field>
                </div>
              </div>

              <Field label="Description (optional)">
                <Input className={inputCls} placeholder="Reason for withdrawal" value={form.description} onChange={setField("description")} />
              </Field>

              {/* Transfer PIN is requested via dialog on submit */}

              <Button type="submit" size="lg" className="w-full h-14 text-base" disabled={isPending || !user?.hasTransferPin}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Withdrawal"}
              </Button>
            </form>
          )}
          <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enter Transfer PIN</DialogTitle>
                <DialogDescription>Enter your transfer PIN to confirm this withdrawal.</DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <Input autoFocus type="password" maxLength={6} className={cn(inputCls, "pl-3 tracking-widest font-mono")} placeholder="••••" value={pinValue} onChange={(e) => setPinValue(e.target.value)} />
              </div>
              <DialogFooter>
                <div className="flex align-center justify-center">
                  <Button type="button" className="mr-2" onClick={() => { setPinDialogOpen(false); setPinValue(""); }}>Cancel</Button>
                  <Button type="button" onClick={confirmWithdraw} disabled={isPending || !user?.hasTransferPin}>
                    {withdrawMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
