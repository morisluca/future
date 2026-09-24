import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRightLeft, ShieldCheck, Settings, Loader2, Globe, CheckCircle2, XCircle, Bitcoin, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type Settings = Record<string, string>;

const Toggle = ({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
  <div className="flex items-center justify-between py-4 border-b border-zinc-800 last:border-0">
    <div>
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900",
        value ? "bg-emerald-500" : "bg-zinc-700"
      )}
    >
      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", value ? "translate-x-6" : "translate-x-0")} />
    </button>
  </div>
);

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((r) => {
      setSettings(r.settings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));
  const setBool = (key: string, value: boolean) => set(key, value ? "true" : "false");
  const getBool = (key: string, def = false) => settings[key] !== undefined ? settings[key] !== "false" : def;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast({ title: "Settings Saved", description: "Site settings have been updated successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-white mb-1">Site Settings</h1>
            <p className="text-zinc-400 text-sm">Configure platform-wide behaviour and banking details.</p>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Save All Settings
          </Button>
        </div>

        {/* ─── Site Details ─────────────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-5 h-5 text-emerald-400" />
              Site Details
            </CardTitle>
            <p className="text-xs text-zinc-500">General information about your platform.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Site Name</label>
                <Input
                  value={settings.site_name || ""}
                  onChange={(e) => set("site_name", e.target.value)}
                  placeholder="e.g. SecureBank"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Receipt Bank Name</label>
                <Input
                  value={settings.bank_name || ""}
                  onChange={(e) => set("bank_name", e.target.value)}
                  placeholder="e.g. SecureBank"
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500">This name appears on PDF transaction receipts and footer branding.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Email Address</label>
                <Input
                  value={settings.site_email || ""}
                  onChange={(e) => set("site_email", e.target.value)}
                  placeholder="e.g. contact@securebank.com"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Phone Number</label>
                <Input
                  value={settings.site_phone || ""}
                  onChange={(e) => set("site_phone", e.target.value)}
                  placeholder="e.g. +1 (555) 123-4567"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Website URL</label>
                <Input
                  value={settings.site_url || ""}
                  onChange={(e) => set("site_url", e.target.value)}
                  placeholder="e.g. https://securebank.com"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Physical Address</label>
              <Input
                value={settings.site_address || ""}
                onChange={(e) => set("site_address", e.target.value)}
                placeholder="e.g. 123 Finance Street, New York, NY 10001"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Login Passcode
            </CardTitle>
            <p className="text-xs text-zinc-500">Require users to enter a login passcode after successful password authentication.</p>
          </CardHeader>
          <CardContent>
            <Toggle
              value={getBool("login_passcode_enabled", false)}
              onChange={(value) => setBool("login_passcode_enabled", value)}
              label="Require login passcode"
              description="If enabled, users must enter their configured login passcode before reaching the dashboard."
            />
          </CardContent>
        </Card>

        {/* ─── Deposit Bank Details ─────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Deposit Bank Account
            </CardTitle>
            <p className="text-xs text-zinc-500">These details are shown to users when they want to make a deposit.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Bank Name</label>
                <Input
                  value={settings.deposit_bank_name || ""}
                  onChange={(e) => set("deposit_bank_name", e.target.value)}
                  placeholder="e.g. First National Bank"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Account Number</label>
                <Input
                  value={settings.deposit_account_number || ""}
                  onChange={(e) => set("deposit_account_number", e.target.value)}
                  placeholder="e.g. 0123456789"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Account Name</label>
                <Input
                  value={settings.deposit_account_name || ""}
                  onChange={(e) => set("deposit_account_name", e.target.value)}
                  placeholder="e.g. SecureBank Holdings Ltd"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Bank Address</label>
                <Input
                  value={settings.deposit_bank_address || ""}
                  onChange={(e) => set("deposit_bank_address", e.target.value)}
                  placeholder="e.g. 123 Finance St, New York, NY"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Deposit Instructions (shown to users)</label>
              <Input
                value={settings.deposit_instructions || ""}
                onChange={(e) => set("deposit_instructions", e.target.value)}
                placeholder="e.g. Use your email as reference when sending"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </CardContent>
        </Card>

          {/* ─── Card Settings ───────────────────────────────────────────── */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Card Settings
              </CardTitle>
              <p className="text-xs text-zinc-500">Configure card-related options such as processing fees.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Card Processing Fee (CNY)</label>
                <Input
                  value={settings.card_processing_fee || ""}
                  onChange={(e) => set("card_processing_fee", e.target.value)}
                  placeholder="e.g. 2.50"
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">Charged to the user's selected account when requesting a physical card.</p>
              </div>
            </CardContent>
          </Card>

          {/* ─── Crypto Receiving Wallets ─────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bitcoin className="w-5 h-5 text-orange-400" />
              Crypto Receiving Wallets
            </CardTitle>
            <p className="text-xs text-zinc-500">
              These wallet addresses are shown to users when they want to deposit cryptocurrency. Leave a field blank to hide that network.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Bitcoin (BTC) Address</label>
                <Input
                  value={settings.crypto_btc_address || ""}
                  onChange={(e) => set("crypto_btc_address", e.target.value)}
                  placeholder="bc1q..."
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Ethereum (ETH) Address</label>
                <Input
                  value={settings.crypto_eth_address || ""}
                  onChange={(e) => set("crypto_eth_address", e.target.value)}
                  placeholder="0x..."
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">USDT – TRC-20 (Tron) Address</label>
                <Input
                  value={settings.crypto_usdt_trc20_address || ""}
                  onChange={(e) => set("crypto_usdt_trc20_address", e.target.value)}
                  placeholder="T..."
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">USDT – ERC-20 (Ethereum) Address</label>
                <Input
                  value={settings.crypto_usdt_erc20_address || ""}
                  onChange={(e) => set("crypto_usdt_erc20_address", e.target.value)}
                  placeholder="0x..."
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-400">BNB (BEP-20) Address</label>
                <Input
                  value={settings.crypto_bnb_address || ""}
                  onChange={(e) => set("crypto_bnb_address", e.target.value)}
                  placeholder="0x..."
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Deposit Note (shown to users)</label>
              <Input
                value={settings.crypto_deposit_note || ""}
                onChange={(e) => set("crypto_deposit_note", e.target.value)}
                placeholder="e.g. Send only the selected coin to its address. Wrong network = lost funds."
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Transfer Settings ────────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Transfer Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Toggle
              value={getBool("transfer_auto_approve")}
              onChange={(v) => setBool("transfer_auto_approve", v)}
              label="Auto-Approve Transfers"
              description="When enabled, transfers complete immediately. When disabled, each transfer requires manual admin approval."
            />
            <Toggle
              value={getBool("deposit_auto_approve")}
              onChange={(v) => setBool("deposit_auto_approve", v)}
              label="Auto-Approve Deposits"
              description="When enabled, deposits are credited immediately. When disabled, they remain pending until admin approval."
            />
          </CardContent>
        </Card>

        {/* ─── Wire Transfer Codes ──────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-5 h-5 text-emerald-400" />
              Wire Transfer Verification Codes
            </CardTitle>
            <p className="text-xs text-zinc-500">
              Users must enter these codes to complete a wire transfer (unless their account has the "Wire PIN-only" permission enabled).
              Leave blank to disable that code requirement.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">IMF Code</label>
                <Input
                  value={settings.wire_imf_code || ""}
                  onChange={(e) => set("wire_imf_code", e.target.value)}
                  placeholder="e.g. IMF-2024-XXXXX"
                  className="bg-zinc-800 border-zinc-700 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">COT Code</label>
                <Input
                  value={settings.wire_cot_code || ""}
                  onChange={(e) => set("wire_cot_code", e.target.value)}
                  placeholder="e.g. COT-9876-XXXXX"
                  className="bg-zinc-800 border-zinc-700 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Security Settings ────────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Platform Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Toggle
              value={getBool("maintenance_mode", false)}
              onChange={(v) => setBool("maintenance_mode", v)}
              label="Maintenance Mode"
              description="When enabled, regular users cannot access the platform (admins still can)."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="lg" className="gap-2 px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save All Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
