import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldOff, Loader2, Smartphone, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Step = "idle" | "setup" | "verify" | "disable";

export default function TwoFactorPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const enabled = user?.twoFactorEnabled ?? false;

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await api.setup2FA();
      setQrCode(res.qrCode);
      setSecret(res.secret);
      setCode("");
      setStep("setup");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (code.length !== 6) { toast({ variant: "destructive", title: "Enter 6-digit code", description: "Open your authenticator app." }); return; }
    setLoading(true);
    try {
      await api.enable2FA(code);
      toast({ title: "2FA Enabled", description: "Your account is now protected with two-factor authentication." });
      await refreshUser();
      setStep("idle");
      setCode("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invalid Code", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) { toast({ variant: "destructive", title: "Password required" }); return; }
    if (code.length !== 6) { toast({ variant: "destructive", title: "Enter 6-digit code" }); return; }
    setLoading(true);
    try {
      await api.disable2FA(password, code);
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed." });
      await refreshUser();
      setStep("idle");
      setCode("");
      setPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-1">Two-Factor Authentication</h1>
          <p className="text-zinc-400 text-sm">Add an extra layer of security to your account using an authenticator app.</p>
        </div>

        {/* Status Card */}
        <Card className={cn("border", enabled ? "bg-emerald-950/30 border-emerald-800/40" : "bg-zinc-900/50 border-zinc-800")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", enabled ? "bg-emerald-500/20" : "bg-zinc-800")}>
                {enabled ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <ShieldOff className="w-6 h-6 text-zinc-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">2FA is {enabled ? "enabled" : "disabled"}</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {enabled ? "Your account requires a verification code on every login." : "Enable 2FA to protect your account from unauthorized access."}
                </p>
              </div>
              {step === "idle" && (
                <Button
                  variant={enabled ? "outline" : "default"}
                  size="sm"
                  onClick={() => enabled ? setStep("disable") : startSetup()}
                  disabled={loading}
                  className={enabled ? "border-zinc-700" : ""}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? "Disable" : "Enable 2FA"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Flow */}
        {step === "setup" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Scan QR Code</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-zinc-400">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.
                </p>

                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl">
                    <img src={qrCode} alt="2FA QR Code" className="w-44 h-44" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-zinc-500">Can't scan? Enter this key manually:</p>
                  <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2.5">
                    <code className="text-xs text-emerald-400 font-mono flex-1 break-all">{secret}</code>
                    <button onClick={copySecret} className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0">
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-sm font-medium text-zinc-300">Verification Code</label>
                  <Input
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="font-mono text-center text-xl tracking-[0.4em] h-12"
                    autoFocus
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setStep("idle")}>Cancel</Button>
                  <Button className="flex-1" onClick={handleEnable} disabled={loading || code.length !== 6}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Disable Flow */}
        {step === "disable" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-zinc-900/50 border-red-900/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold text-white">Disable 2FA</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-400">Enter your account password and a current authenticator code to confirm.</p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Account Password</label>
                  <Input
                    type="password"
                    placeholder="Your current password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Authenticator Code</label>
                  <Input
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="font-mono text-center text-xl tracking-[0.4em] h-12"
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => { setStep("idle"); setCode(""); setPassword(""); }}>Cancel</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDisable} disabled={loading || !password || code.length !== 6}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info boxes */}
        {step === "idle" && (
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Works with any TOTP app</p>
                <p className="text-xs text-zinc-500 mt-0.5">Google Authenticator, Authy, Microsoft Authenticator, 1Password, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Required on every login</p>
                <p className="text-xs text-zinc-500 mt-0.5">After entering your password, you'll be prompted for a 6-digit code from your app.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
