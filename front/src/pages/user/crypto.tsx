import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  useGetCryptoPortfolio, useGetCryptoPrices, useGetAccounts, 
  useBuyCrypto, useSellCrypto, useSendCrypto, getGetCryptoPortfolioQueryKey
} from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatCrypto, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bitcoin, TrendingUp, TrendingDown, Loader2, Copy, CheckCheck, AlertTriangle } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const generateSparkline = (isUp: boolean) => 
  Array.from({ length: 15 }, (_, i) => ({ val: 100 + (isUp ? i * Math.random() * 10 : -i * Math.random() * 10) + Math.random() * 20 }));

// Network options mapped to site-settings keys
const NETWORKS = [
  { label: "Bitcoin", symbol: "BTC", key: "crypto_btc_address", color: "text-orange-400", bg: "bg-orange-400/10" },
  { label: "Ethereum", symbol: "ETH", key: "crypto_eth_address", color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { label: "USDT (TRC-20)", symbol: "USDT", key: "crypto_usdt_trc20_address", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { label: "USDT (ERC-20)", symbol: "USDT", key: "crypto_usdt_erc20_address", color: "text-emerald-300", bg: "bg-emerald-300/10" },
  { label: "BNB (BEP-20)", symbol: "BNB", key: "crypto_bnb_address", color: "text-yellow-400", bg: "bg-yellow-400/10" },
];
const Action = [
    "buy",
    "sell", 
    "send",
    "receive"
]

export default function CryptoPage() {
  const { data: portfolio, isLoading: isPortfolioLoading } = useGetCryptoPortfolio();
  const { data: prices, isLoading: isPricesLoading } = useGetCryptoPrices();
  const { data: accounts } = useGetAccounts();
  
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'send' | 'receive'>('buy');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [selectedNetwork, setSelectedNetwork] = useState(0);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [address, setAddress] = useState('');
  const [walletInfo, setWalletInfo] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const buyMut = useBuyCrypto();
  const sellMut = useSellCrypto();
  const sendMut = useSendCrypto();
  const isPending = buyMut.isPending || sellMut.isPending || sendMut.isPending;

  const currentPrice = prices?.find(p => p.symbol === selectedAsset)?.price || 0;

  useEffect(() => {
    api.getCryptoWalletInfo().then(r => setWalletInfo(r.info)).catch(() => {});
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tradeType === 'buy') {
        await buyMut.mutateAsync({ data: { symbol: selectedAsset, amountUsd: Number(amount), accountId: Number(accountId) }});
      } else if (tradeType === 'sell') {
        await sellMut.mutateAsync({ data: { symbol: selectedAsset, cryptoAmount: Number(amount), accountId: Number(accountId) }});
      } else {
        await sendMut.mutateAsync({ data: { symbol: selectedAsset, cryptoAmount: Number(amount), toWalletAddress: address }});
      }
      toast({ title: "Trade Executed", description: `Successfully processed ${tradeType} order.` });
      setAmount('');
      queryClient.invalidateQueries({ queryKey: getGetCryptoPortfolioQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Trade Failed", description: err.message });
    }
  };

  const activeNetwork = NETWORKS[selectedNetwork];
  const activeAddress = walletInfo[activeNetwork?.key ?? ''] ?? '';
  const configuredNetworks = NETWORKS.filter(n => walletInfo[n.key]);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Col: Portfolio & Markets */}
        <div className="xl:col-span-2 space-y-8">
          <div>
            <h1 className="text-2xl font-bold font-display text-white mb-2">Crypto Portfolio</h1>
            <p className="text-zinc-400 text-sm">Manage your digital assets and track live markets.</p>
          </div>

          {/* Portfolio Summary Card */}
          <Card className="bg-gradient-to-br from-indigo-900/40 via-background to-teal-900/20 border-indigo-500/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-indigo-200/80 font-medium mb-1">Total Balance</p>
                  <h2 className="text-5xl font-display font-bold text-white mb-2">
                    {isPortfolioLoading ? "..." : formatCurrency(portfolio?.totalValue)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1",
                      (portfolio?.totalProfitLoss || 0) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {(portfolio?.totalProfitLoss || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatCurrency(portfolio?.totalProfitLoss)} All time
                    </span>
                  </div>
                </div>

                {/* Quick receive info — shows first configured network */}
                {configuredNetworks.length > 0 && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md min-w-0 max-w-xs">
                    <p className="text-xs text-zinc-500 mb-1 font-mono uppercase">Receiving Address ({configuredNetworks[0].label})</p>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm text-zinc-300 truncate">
                        {walletInfo[configuredNetworks[0].key]
                          ? `${walletInfo[configuredNetworks[0].key].slice(0, 10)}...${walletInfo[configuredNetworks[0].key].slice(-6)}`
                          : "Not configured"}
                      </p>
                      <button
                        className="text-indigo-400 hover:text-indigo-300 text-xs shrink-0"
                        onClick={() => { setTradeType('receive'); setSelectedNetwork(0); }}
                      >
                        View all
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Your Holdings */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Your Assets</h3>
            <div className="space-y-3">
              {portfolio?.holdings?.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl">
                  <p className="text-zinc-500">You don't own any crypto yet.</p>
                </div>
              ) : (
                portfolio?.holdings?.map(h => (
                  <div key={h.id} className="p-4 rounded-xl bg-card border border-white/5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                        {h.symbol[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white">{h.name}</p>
                        <p className="text-xs text-zinc-500">{formatCrypto(h.amount, h.symbol)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(h.value)}</p>
                      <p className={cn("text-xs font-medium", h.profitLoss >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {h.profitLoss >= 0 ? "+" : ""}{h.profitLossPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Market Prices */}
          <div className="hidden">
            <h3 className="text-lg font-bold text-white mb-4">Live Markets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isPricesLoading ? (
                Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />)
              ) : (
                prices?.map(p => {
                  const isUp = p.changePercent24h >= 0;
                  return (
                    <div key={p.symbol} 
                         onClick={() => setSelectedAsset(p.symbol)}
                         className={cn(
                           "p-4 rounded-xl border cursor-pointer transition-all hover:bg-zinc-800/50",
                           selectedAsset === p.symbol ? "border-indigo-500 bg-indigo-500/5" : "border-white/5 bg-card"
                         )}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {p.name} <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{p.symbol}</span>
                          </p>
                          <p className="text-sm font-medium mt-1">{formatCurrency(p.price)}</p>
                        </div>
                        <div className={cn("text-xs font-bold px-2 py-1 rounded flex items-center gap-1", isUp ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10")}>
                          {isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                          {Math.abs(p.changePercent24h).toFixed(2)}%
                        </div>
                      </div>
                      <div className="h-8 mt-2 opacity-50">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={generateSparkline(isUp)}>
                            <Area type="monotone" dataKey="val" stroke={isUp ? "#10b981" : "#ef4444"} fill={isUp ? "#10b98120" : "#ef444420"} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Trade Widget */}
        <div>
          <div className="sticky top-24">
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-zinc-800">
                {(["send", "receive"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTradeType(tab)}
                    className={cn(
                      "flex-1 py-4 text-xs font-semibold uppercase tracking-wider transition-colors",
                      tradeType === tab
                        ? 
                          // tab === "buy" ? "text-emerald-400 border-b-2 border-emerald-400"
                          // : tab === "sell" ? "text-red-400 border-b-2 border-red-400"
                          // : 
                          tab === "send" ? "text-indigo-400 border-b-2 border-indigo-400"
                          : "text-orange-400 border-b-2 border-orange-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <CardContent className="p-6">
                {/* ── Receive Tab ──────────────────────────────────────── */}
                {tradeType === 'receive' ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Network</label>
                      <div className="space-y-2">
                        {NETWORKS.map((net, idx) => {
                          const addr = walletInfo[net.key];
                          if (!addr) return null;
                          return (
                            <button
                              key={net.key}
                              type="button"
                              onClick={() => setSelectedNetwork(idx)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                selectedNetwork === idx
                                  ? "border-orange-500/50 bg-orange-500/5"
                                  : "border-zinc-800 hover:border-zinc-700"
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full shrink-0", net.color.replace("text-", "bg-"))} />
                              <div className="min-w-0">
                                <p className={cn("text-xs font-bold", net.color)}>{net.label}</p>
                                <p className="text-xs text-zinc-500 font-mono truncate">{addr.slice(0, 16)}...{addr.slice(-6)}</p>
                              </div>
                              {selectedNetwork === idx && <CheckCheck className="w-4 h-4 text-orange-400 ml-auto shrink-0" />}
                            </button>
                          );
                        })}
                        {configuredNetworks.length === 0 && (
                          <p className="text-sm text-zinc-500 text-center py-4">No wallet addresses configured yet.</p>
                        )}
                      </div>
                    </div>

                    {activeAddress && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Receiving Address</label>
                          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                            <p className="font-mono text-sm text-zinc-200 break-all leading-relaxed">{activeAddress}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full gap-2 border-zinc-700 hover:border-orange-500/50 hover:text-orange-400"
                            onClick={() => handleCopy(activeAddress)}
                          >
                            {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy Address"}
                          </Button>
                        </div>

                        <div className="flex gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300/80">
                            {walletInfo.crypto_deposit_note ||
                              "Only send the correct coin to this address. Sending the wrong asset or using the wrong network will result in permanent loss of funds."}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* ── Buy / Sell / Send form ──────────────────────────── */
                  <form onSubmit={handleTrade} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Asset</label>
                      <select 
                        value={selectedAsset}
                        onChange={e => setSelectedAsset(e.target.value)}
                        className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-white font-medium focus:ring-1 outline-none"
                      >
                        {prices?.map(p => <option key={p.symbol} value={p.symbol}>{p.name} ({p.symbol}) - {formatCurrency(p.price)}</option>)}
                      </select>
                    </div>

                    {tradeType !== 'send' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Payment Account</label>
                        <select 
                          required
                          value={accountId}
                          onChange={e => setAccountId(e.target.value)}
                          className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-white font-medium focus:ring-1 outline-none"
                        >
                          <option value="">Select Account</option>
                          {accounts?.filter(a => a.status==='active').map(a => 
                            <option key={a.id} value={a.id}>{a.accountType} - {formatCurrency(a.balance)}</option>
                          )}
                        </select>
                      </div>
                    )}

                    {tradeType === 'send' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recipient Address</label>
                        <Input required value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." className="bg-zinc-950" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {tradeType === 'buy' ? 'Amount to Spend (CNY)' : `Amount to ${tradeType} (${selectedAsset})`}
                      </label>
                      <div className="relative">
                        <Input 
                          required 
                          type="number" 
                          step="any"
                          value={amount} 
                          onChange={e => setAmount(e.target.value)} 
                          className="text-2xl h-16 font-display font-bold bg-zinc-950 pl-4 pr-16" 
                          placeholder="0.00" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                          {tradeType === 'buy' ? 'CNY' : selectedAsset}
                        </span>
                      </div>
                      {amount && Number(amount) > 0 && currentPrice > 0 && (
                        <p className="text-xs text-zinc-400 text-right mt-1">
                          ≈ {tradeType === 'buy' ? formatCrypto(Number(amount) / currentPrice, selectedAsset) : formatCurrency(Number(amount) * currentPrice)}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className={cn(
                        "w-full h-14 mt-4 text-white font-bold", 
                        tradeType === 'buy' ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950" : 
                        tradeType === 'sell' ? "bg-red-500 hover:bg-red-400" : "bg-indigo-500 hover:bg-indigo-400"
                      )}
                      disabled={isPending || !amount}
                    >
                      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `${tradeType === 'buy' ? 'Buy' : tradeType === 'sell' ? 'Sell' : 'Send'} ${selectedAsset}`}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
