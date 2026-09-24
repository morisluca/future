import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts, useTransfer, getGetAccountsQueryKey, getGetTransactionsQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ArrowRightLeft, Globe, MapPin, Wifi, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const inputCls = "bg-zinc-900/60 border-zinc-800 focus:border-emerald-500 text-white placeholder:text-zinc-600";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-300">{label}</label>
    {children}
  </div>
);

type FormState = {
  fromAccountId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amount: string;
  description: string;
  imfCode: string;
  transferPin: string;
};

type TransferType = "local" | "international" | "wire";

type TransferPageProps = {
  transferType: TransferType;
};

const transferMeta: Record<TransferType, { title: string; subtitle: string; icon: React.ElementType }> = {
  local: { title: "Send Money — Local", subtitle: "Send funds to another domestic bank account.", icon: MapPin },
  international: { title: "Send Money — International", subtitle: "Send funds across borders with full currency support.", icon: Globe },
  wire: { title: "Move Money", subtitle: "Send funds internationally fast and securely.", icon: Globe },
};
// wire: { title: "Wire Transfer", subtitle: "Send funds internationally fast and securely.", icon: Wifi },

function SendMoneyPage({ transferType }: TransferPageProps) {
  const { data: accounts } = useGetAccounts();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const transferMut = useTransfer();
  const [form, setForm] = useState<FormState>({
    fromAccountId: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    amount: "",
    description: "",
    imfCode: "",

    transferPin: "",
  });

  const [showWireModal, setShowWireModal] = useState(false);
  const [wireModalStep, setWireModalStep] = useState<"input" | "progress">("input");
  const [currentProgressStep, setCurrentProgressStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransferSubmitted, setIsTransferSubmitted] = useState(false);

  const wireProgressSteps = [
    "TRANSACTION CODE SUBMITTED",
    "TRANSACTION IN PROGRESS...",
    "ACCOUNT DETAILS VERIFIED...",
    "TRANSFER DATA PROCESSING...",
    "CONTACTING BENEFICIARY BANK...",
    "INITIATING TRANSFER...",
    "90% COMPLETED...",
  ];

  // Auto-advance progress steps
  useEffect(() => {
    if (wireModalStep === "progress" && currentProgressStep < wireProgressSteps.length) {
      const timer = setTimeout(() => {
        setCurrentProgressStep((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [wireModalStep, currentProgressStep]);

  const activeAccounts = accounts?.filter((a) => a.status === "active") || [];

  const reset = () => setForm({
    fromAccountId: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    amount: "",
    description: "",
    imfCode: "",
    transferPin: "",
  });

  const setField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
    reset();
    toast({ title: "Success", description: message });
    setShowWireModal(false);
    setWireModalStep("input");
    setCurrentProgressStep(0);
    setIsProcessing(false);
  };

  const handleWireModalConfirm = async () => {
    if (!form.imfCode || !form.transferPin) {
      toast({ variant: "destructive", title: "Error", description: "IMF code and Transfer PIN are required." });
      return;
    }

    setWireModalStep("progress");
    setCurrentProgressStep(0);
    setIsProcessing(true);

    // Wait for all progress steps to complete
    await new Promise((resolve) => setTimeout(resolve, wireProgressSteps.length * 1200 + 500));

    try {
      const result = await transferMut.mutateAsync({
        data: {
          fromAccountId: parseInt(form.fromAccountId),
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankAccountName: form.bankAccountName,
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          transferType,
          imfCode: form.imfCode,
          transferPin: form.transferPin,
        } as any,
      });

      const pending = (result as any)?.pendingApproval;
      setIsTransferSubmitted(true);
      onSuccess(pending ? "Transfer submitted — awaiting confirmation." : "Transfer completed successfully.");
    } catch (error: any) {
      setWireModalStep("input");
      setCurrentProgressStep(0);
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Transfer Failed", description: error?.message || "Unable to complete transfer." });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromAccountId) { toast({ variant: "destructive", title: "Error", description: "Please select a source account." }); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast({ variant: "destructive", title: "Error", description: "Enter a valid amount." }); return; }
    if (!form.bankName || !form.bankAccountNumber || !form.bankAccountName) { toast({ variant: "destructive", title: "Error", description: "Recipient bank details are required." }); return; }

    // For wire transfers, show the modal instead of submitting directly
    if (transferType === "wire") {
      if (!user?.wireBypassCodes) {
        setShowWireModal(true);
      } else {
        // Wire bypass: only need PIN
        if (!form.transferPin) { toast({ variant: "destructive", title: "Error", description: "Transfer PIN is required." }); return; }
        setWireModalStep("progress");
        setCurrentProgressStep(0);
        setIsProcessing(true);

        await new Promise((resolve) => setTimeout(resolve, wireProgressSteps.length * 1200 + 500));

        try {
          const result = await transferMut.mutateAsync({
            data: {
              fromAccountId: parseInt(form.fromAccountId),
              bankName: form.bankName,
              bankAccountNumber: form.bankAccountNumber,
              bankAccountName: form.bankAccountName,
              amount: parseFloat(form.amount),
              description: form.description || undefined,
              transferType,
              transferPin: form.transferPin,
            } as any,
          });

          const pending = (result as any)?.pendingApproval;
          setIsTransferSubmitted(true);
          onSuccess(pending ? "Transfer submitted — awaiting admin approval." : "Transfer completed successfully.");
        } catch (error: any) {
          setWireModalStep("input");
          setCurrentProgressStep(0);
          setIsProcessing(false);
          toast({ variant: "destructive", title: "Transfer Failed", description: error?.message || "Unable to complete transfer." });
        }
      }
    } else {
      // For local and international transfers
      if (!form.transferPin) { toast({ variant: "destructive", title: "Error", description: "Transfer PIN is required." }); return; }

      try {
        const result = await transferMut.mutateAsync({
          data: {
            fromAccountId: parseInt(form.fromAccountId),
            bankName: form.bankName,
            bankAccountNumber: form.bankAccountNumber,
            bankAccountName: form.bankAccountName,
            amount: parseFloat(form.amount),
            description: form.description || undefined,
            transferType,
            transferPin: form.transferPin,
          } as any,
        });

        const pending = (result as any)?.pendingApproval;
        setIsTransferSubmitted(true);
        onSuccess(pending ? "Transfer submitted — awaiting admin approval." : "Transfer completed successfully.");
      } catch (error: any) {
        toast({ variant: "destructive", title: "Transfer Failed", description: error?.message || "Unable to complete transfer." });
      }
    }
  };

  const meta = transferMeta[transferType];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <meta.icon className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold font-display text-white">{meta.title}</h1>
          </div>
          <p className="text-zinc-400 text-sm">{meta.subtitle}</p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-zinc-800">
          <form onSubmit={handleSend} className="space-y-5">
            <Field label="From Account">
              <select className={cn("w-full h-12 rounded-xl border px-4 text-sm outline-none", inputCls)} value={form.fromAccountId} onChange={setField("fromAccountId")}>
                <option value="">Select account...</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountType} (•••{account.accountNumber.slice(-4)}) — {formatCurrency(account.balance)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Recipient Bank">
                <Input className={inputCls} placeholder="Bank name" value={form.bankName} onChange={setField("bankName")} />
              </Field>
              <Field label="Recipient Account #">
                <Input className={inputCls} placeholder="Account number" value={form.bankAccountNumber} onChange={setField("bankAccountNumber")} />
              </Field>
            </div>

            <Field label="Recipient Name">
              <Input className={inputCls} placeholder="Account holder name" value={form.bankAccountName} onChange={setField("bankAccountName")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount">
                <Input className={inputCls} placeholder="0.00" value={form.amount} onChange={setField("amount")} />
              </Field>
              <Field label="Description">
                <Input className={inputCls} placeholder="Transfer note (optional)" value={form.description} onChange={setField("description")} />
              </Field>
            </div>

            {transferType === "wire" && (
              <div className="space-y-4 p-4 rounded-3xl border border-amber-500/20 bg-amber-500/10 hidden">
                <div className="flex items-center gap-2 text-amber-300 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Wire transfers require IMF verification{user?.wireBypassCodes && " (or just PIN if account is approved)"} — the code will be entered in the next step.</span>
                </div>
              </div>
            )}
            {user?.wireBypassCodes && (
                <Field label="Transfer PIN">
                    <Input type="password" className={cn(inputCls, "tracking-[0.35em]")} placeholder="••••" value={form.transferPin} onChange={setField("transferPin")} maxLength={6} />
                </Field>
            )}

            <Button type="submit" size="lg" className="w-full h-14 text-base" disabled={isTransferSubmitted || transferMut.isPending || isProcessing}>
              {transferMut.isPending || isProcessing
                ? "Transferring funds..."
                : `Send ${transferType === "wire" ? "Wire" : transferType.charAt(0).toUpperCase() + transferType.slice(1)} Transfer`}
            </Button>
          </form>
        </div>

        {/* Wire Transfer Modal */}
        <Dialog open={showWireModal} onOpenChange={setShowWireModal}>
          <DialogContent className="max-w-md">
            {wireModalStep === "input" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Wire Transfer Verification</h2>
                  <p className="text-sm text-zinc-400">Enter your IMF code and transfer PIN to proceed.</p>
                </div>

                <div className="space-y-4">
                  <div className="animate-in fade-in">
                    <Field label="IMF Code">
                      <Input className={inputCls} placeholder="IMF code" value={form.imfCode} onChange={setField("imfCode")} />
                    </Field>
                  </div>
                  {form.imfCode && (
                    <div className="animate-in fade-in">
                      <Field label="Transfer PIN">
                        <Input type="password" className={cn(inputCls, "tracking-[0.35em]")} placeholder="••••" value={form.transferPin} onChange={setField("transferPin")} maxLength={6} />
                      </Field>
                    </div>
                  )}
                </div>

                {form.imfCode && form.transferPin && (
                  <div className="flex gap-3 animate-in fade-in">
                    <Button variant="outline" className="flex-1" onClick={() => setShowWireModal(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleWireModalConfirm}>
                      Proceed
                    </Button>
                  </div>
                )}
              </div>
            )}

            {wireModalStep === "progress" && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Processing Wire Transfer</h2>
                  <p className="text-sm text-zinc-400">Please wait while we process your transfer...</p>
                </div>

                <div className="space-y-3">
                  {wireProgressSteps.slice(0, Math.min(currentProgressStep + 2, wireProgressSteps.length)).map((step, index) => (
                    <div key={index} className="flex items-center gap-3 animate-in fade-in">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{
                        background: index < currentProgressStep ? "rgb(34, 197, 94)" : index === currentProgressStep ? "rgb(59, 130, 246)" : "rgb(63, 63, 70)",
                      }}>
                        {index < currentProgressStep ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : index === currentProgressStep ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : null}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        index < currentProgressStep ? "text-emerald-400" : index === currentProgressStep ? "text-blue-400" : "text-zinc-500"
                      )}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

                {currentProgressStep >= wireProgressSteps.length && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-400 font-medium">✓ Transfer processing complete</p>
                    </div>
                    <Button className="w-full" onClick={() => setShowWireModal(false)} disabled={isProcessing}>
                      Close
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export function SendMoneyLocalPage() {
  return <SendMoneyPage transferType="local" />;
}

export function SendMoneyInternationalPage() {
  return <SendMoneyPage transferType="international" />;
}

export function WireTransferPage() {
  return <SendMoneyPage transferType="wire" />;
}
