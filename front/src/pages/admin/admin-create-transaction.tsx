import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { useAdminGetUsers } from "@/lib/api-client";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const bankTypes = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "transfer_out", label: "Transfer" },
];

const transferTypes = [
  { value: "local", label: "Local" },
  { value: "wire", label: "Wire" },
  { value: "international", label: "International" },
];

const cryptoTypes = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "send", label: "Send" },
  { value: "receive", label: "Receive" },
];

const statusOptions = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const currencyOptions = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD"];

export default function AdminCreateTransactionPage() {
  const [mode, setMode] = useState<"bank" | "crypto">("bank");
  const [transactionType, setTransactionType] = useState("deposit");
  const [cryptoType, setCryptoType] = useState("buy");
  const [status, setStatus] = useState("completed");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [transferType, setTransferType] = useState("local");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [cryptoSymbol, setCryptoSymbol] = useState("BTC");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [price, setPrice] = useState("");
  const [toWalletAddress, setToWalletAddress] = useState("");
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useAdminGetUsers({ limit: 200, offset: 0 });
  const users = data?.users || [];

  const accounts = useMemo(
    () =>
      users.flatMap((user) =>
        user.accounts.map((account: any) => ({
          ...account,
          ownerName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          userId: user.id,
        })),
      ),
    [users],
  );

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedUserAccounts = selectedUser?.accounts || [];

  const handleModeChange = (newMode: "bank" | "crypto") => {
    setMode(newMode);
    setTransactionType("deposit");
    setCryptoType("buy");
    setDescription("");
    setAmount("");
    setCryptoAmount("");
    setUsdAmount("");
    setPrice("");
    setToWalletAddress("");
    setDestinationAccountId("");
    setBankName("");
    setBankAccountNumber("");
    setBankAccountName("");
    setStatus("completed");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if(!confirm("Are you sure you want to create this transaction? This action cannot be undone.")) {
      return;
    }

    if (!selectedUserId) {
      toast({ variant: "destructive", title: "Missing user", description: "Please select a user." });
      return;
    }

    if (mode === "bank") {
      if (!amount || Number(amount) <= 0) {
        toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a positive amount." });
        return;
      }

      if (!selectedAccountId) {
        toast({ variant: "destructive", title: "Missing account", description: "Please select a source account." });
        return;
      }

      if (transactionType === "transfer_out" && !destinationAccountId && !bankName) {
        toast({ variant: "destructive", title: "Missing transfer details", description: "Please select a destination account or provide external bank information." });
        return;
      }
    }

    if (mode === "crypto") {
      if (!cryptoSymbol.trim()) {
        toast({ variant: "destructive", title: "Missing symbol", description: "Please enter a crypto symbol." });
        return;
      }
      if (!cryptoAmount || Number(cryptoAmount) <= 0) {
        toast({ variant: "destructive", title: "Invalid crypto amount", description: "Please enter a positive crypto amount." });
        return;
      }
      if (!usdAmount || Number(usdAmount) <= 0) {
        toast({ variant: "destructive", title: "Invalid USD amount", description: "Please enter a positive USD amount." });
        return;
      }
      if (!price || Number(price) <= 0) {
        toast({ variant: "destructive", title: "Invalid price", description: "Please enter a positive price." });
        return;
      }
      if ((cryptoType === "buy" || cryptoType === "sell") && !selectedAccountId) {
        toast({ variant: "destructive", title: "Missing account", description: "Please select an account for buy/sell." });
        return;
      }
      if (cryptoType === "send" && !toWalletAddress.trim()) {
        toast({ variant: "destructive", title: "Missing wallet address", description: "Please enter a wallet address." });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "bank") {
        const payload: Record<string, unknown> = {
          userId: selectedUserId,
          type: transactionType,
          amount: Number(amount),
          currency,
          description: description || undefined,
          status,
          createdAt: new Date(createdAt).toISOString(),
        };

        if (transactionType === "deposit" || transactionType === "withdrawal") {
          payload.accountId = selectedAccountId;
        }

        if (transactionType === "transfer_out") {
          payload.fromAccountId = selectedAccountId;
          if (destinationAccountId) payload.toAccountId = Number(destinationAccountId);
          payload.transferType = transferType;
          payload.bankName = bankName || undefined;
          payload.bankAccountNumber = bankAccountNumber || undefined;
          payload.bankAccountName = bankAccountName || undefined;
        }

        await api.createAdminTransaction(payload);
      } else {
        const payload: Record<string, unknown> = {
          userId: selectedUserId,
          type: cryptoType,
          symbol: cryptoSymbol.toUpperCase(),
          cryptoAmount: Number(cryptoAmount),
          usdAmount: Number(usdAmount),
          price: Number(price),
          status,
          createdAt: new Date(createdAt).toISOString(),
        };

        if (cryptoType === "buy" || cryptoType === "sell") {
          payload.accountId = selectedAccountId;
        }
        if (cryptoType === "send") {
          payload.toWalletAddress = toWalletAddress;
        }

        await api.createAdminCryptoTransaction(payload);
      }

      toast({ title: "Transaction created", description: "The admin transaction was created successfully." });
      setAmount("");
      setDescription("");
      setCryptoAmount("");
      setUsdAmount("");
      setPrice("");
      setToWalletAddress("");
      setBankName("");
      setBankAccountNumber("");
      setBankAccountName("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Create failed", description: error?.message || "Unable to create transaction." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white mb-1">Create Admin Transaction</h1>
            <p className="text-zinc-400 text-sm">Create deposits, withdrawals, transfers, or on-chain crypto transactions for any user.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={mode === "bank" ? "secondary" : "ghost"} onClick={() => handleModeChange("bank")}>Bank Transaction</Button>
            <Button size="sm" variant={mode === "crypto" ? "secondary" : "ghost"} onClick={() => handleModeChange("crypto")}>Crypto Transaction</Button>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                  <Activity className="w-12 h-12 mb-3 opacity-30" />
                  <p>No users available to select.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="user">User</Label>
                      <select
                        id="user"
                        value={selectedUserId || ""}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setSelectedUserId(value || null);
                          setSelectedAccountId(null);
                        }}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      >
                        <option value="">Select user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} — {user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {mode === "bank" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="transactionType">Transaction Type</Label>
                          <select
                            id="transactionType"
                            value={transactionType}
                            onChange={(event) => setTransactionType(event.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                          >
                            {bankTypes.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <select
                            id="currency"
                            value={currency}
                            onChange={(event) => setCurrency(event.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                          >
                            {currencyOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="account">Account</Label>
                          <select
                            id="account"
                            value={selectedAccountId || ""}
                            onChange={(event) => setSelectedAccountId(Number(event.target.value) || null)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                          >
                            <option value="">Select account</option>
                            {selectedUserAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.accountNumber} — {account.accountType} ({formatCurrency(account.balance)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {transactionType === "transfer_out" && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="destinationAccount">Destination Account</Label>
                            <select
                              id="destinationAccount"
                              value={destinationAccountId}
                              onChange={(event) => setDestinationAccountId(event.target.value)}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            >
                              <option value="">External / manual bank transfer</option>
                              {accounts
                                .filter((account: any) => account.id !== selectedAccountId)
                                .map((account: any) => (
                                  <option key={account.id} value={String(account.id)}>
                                    {account.ownerName} — {account.accountNumber} ({account.accountType})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="transferType">Transfer Type</Label>
                            <select
                              id="transferType"
                              value={transferType}
                              onChange={(event) => setTransferType(event.target.value)}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            >
                              {transferTypes.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {transactionType === "transfer_out" && !destinationAccountId && (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bankAccountNumber">Bank Account</Label>
                            <Input id="bankAccountNumber" value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} placeholder="Account number" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bankAccountName">Account Name</Label>
                            <Input id="bankAccountName" value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} placeholder="Account name" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cryptoType">Crypto Type</Label>
                          <select
                            id="cryptoType"
                            value={cryptoType}
                            onChange={(event) => setCryptoType(event.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                          >
                            {cryptoTypes.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cryptoSymbol">Symbol</Label>
                          <Input id="cryptoSymbol" value={cryptoSymbol} onChange={(event) => setCryptoSymbol(event.target.value)} placeholder="BTC" />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cryptoAmount">Crypto Amount</Label>
                          <Input id="cryptoAmount" type="number" step="0.00000001" value={cryptoAmount} onChange={(event) => setCryptoAmount(event.target.value)} placeholder="0.00000000" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="usdAmount">CNY Value</Label>
                          <Input id="usdAmount" type="number" step="0.01" value={usdAmount} onChange={(event) => setUsdAmount(event.target.value)} placeholder="0.00" />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="price">Price</Label>
                          <Input id="price" type="number" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
                        </div>
                        {(cryptoType === "buy" || cryptoType === "sell") && (
                          <div className="space-y-2">
                            <Label htmlFor="cryptoAccount">Account</Label>
                            <select
                              id="cryptoAccount"
                              value={selectedAccountId || ""}
                              onChange={(event) => setSelectedAccountId(Number(event.target.value) || null)}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            >
                              <option value="">Select account</option>
                              {selectedUserAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.accountNumber} — {account.accountType} ({formatCurrency(account.balance)})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {cryptoType === "send" && (
                        <div className="space-y-2">
                          <Label htmlFor="toWalletAddress">Destination Wallet Address</Label>
                          <Input id="toWalletAddress" value={toWalletAddress} onChange={(event) => setToWalletAddress(event.target.value)} placeholder="0x..." />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="createdAt">Transaction Date</Label>
                      <Input
                        id="createdAt"
                        type="datetime-local"
                        value={createdAt}
                        onChange={(event) => setCreatedAt(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="optionalNote">Selected Account</Label>
                      <div className="h-12 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 flex items-center">
                        {selectedAccountId
                          ? `${selectedUserAccounts.find((account) => account.id === selectedAccountId)?.accountNumber ?? "Unknown account"}`
                          : "No account selected"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Create Transaction
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
