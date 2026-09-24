import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetAccounts, useDeposit, useWithdraw, getGetAccountsQueryKey, getGetTransactionsQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const inputCls = "bg-zinc-900/60 border-zinc-800 focus:border-emerald-500 text-white placeholder:text-zinc-600";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-300">{label}</label>
    {children}
  </div>
);

type BaseFormState = {
  fromAccountId: string;
  amount: string;
  description: string;
  senderBank: string;
  senderAccountNumber: string;
  senderAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferPin: string;
};

type DepositWithdrawPageProps = {
  mode: "deposit" | "withdraw";
};

function DepositWithdrawPage({ mode }: DepositWithdrawPageProps) {
  const { data: accounts } = useGetAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const depositMut = useDeposit();
  const withdrawMut = useWithdraw();
  const [form, setForm] = useState<BaseFormState>({
    fromAccountId: "",
    amount: "",
    description: "",
    senderBank: "",
    senderAccountNumber: "",
    senderAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    transferPin: "",
  });

  const activeAccounts = accounts?.filter((a) => a.status === "active") || [];

  const reset = () => setForm({
    fromAccountId: "",
    amount: "",
    description: "",
    senderBank: "",
    senderAccountNumber: "",
    senderAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    transferPin: "",
  });

  const setField = (key: keyof BaseFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
    reset();
    toast({ title: "Success", description: message });
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
      const pending = (result as any)?.status === "pending";
      onSuccess(pending ? "Deposit submitted — awaiting admin approval." : "Deposit credited to your account.");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deposit Failed", description: error?.message || "Unable to process deposit." });
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
    if (!form.transferPin) {
      toast({ variant: "destructive", title: "Error", description: "Transfer PIN is required." }); return;
    }
    try {
      await withdrawMut.mutateAsync({
        data: {
          accountId: parseInt(form.fromAccountId),
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankAccountName: form.bankAccountName,
          transferPin: form.transferPin,
        } as any,
      });
      onSuccess("Withdrawal processed successfully.");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: error?.message || "Unable to process withdrawal." });
    }
  };

  const isDeposit = mode === "deposit";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            {isDeposit ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-amber-400" />}
            <h1 className="text-2xl font-bold font-display text-white">{isDeposit ? "Deposit Funds" : "Withdraw Funds"}</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            {isDeposit
              ? "Deposit funds into your account using bank transfer details."
              : "Withdraw funds to an external bank using your transfer PIN."}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-zinc-800">
          <form onSubmit={isDeposit ? handleDeposit : handleWithdraw} className="space-y-5">
            <Field label={isDeposit ? "Deposit Account" : "From Account"}>
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
              <Field label="Amount">
                <Input className={inputCls} placeholder="0.00" value={form.amount} onChange={setField("amount")} />
              </Field>
              <Field label="Description">
                <Input className={inputCls} placeholder="Memo or note (optional)" value={form.description} onChange={setField("description")} />
              </Field>
            </div>

            {isDeposit ? (
              <>
                <p className="text-xs text-zinc-500">Optional sender bank details help us reconcile your deposit faster.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Sender Bank">
                    <Input className={inputCls} placeholder="Bank name" value={form.senderBank} onChange={setField("senderBank")} />
                  </Field>
                  <Field label="Sender Account#">
                    <Input className={inputCls} placeholder="Account number" value={form.senderAccountNumber} onChange={setField("senderAccountNumber")} />
                  </Field>
                  <Field label="Sender Name">
                    <Input className={inputCls} placeholder="Account holder name" value={form.senderAccountName} onChange={setField("senderAccountName")} />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Recipient Bank">
                    <Input className={inputCls} placeholder="Bank name" value={form.bankName} onChange={setField("bankName")} />
                  </Field>
                  <Field label="Recipient Account#">
                    <Input className={inputCls} placeholder="Account number" value={form.bankAccountNumber} onChange={setField("bankAccountNumber")} />
                  </Field>
                </div>
                <Field label="Recipient Name">
                  <Input className={inputCls} placeholder="Account holder name" value={form.bankAccountName} onChange={setField("bankAccountName")} />
                </Field>
                <Field label="Transfer PIN">
                  <Input type="password" className={cn(inputCls, "tracking-[0.35em]")} placeholder="••••" value={form.transferPin} onChange={setField("transferPin")} maxLength={6} />
                </Field>
              </>
            )}

            <Button type="submit" size="lg" className="w-full h-14 text-base">
              {isDeposit ? "Submit Deposit" : "Confirm Withdrawal"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function DepositPage() {
  return <DepositWithdrawPage mode="deposit" />;
}

export function WithdrawPage() {
  return <DepositWithdrawPage mode="withdraw" />;
}
