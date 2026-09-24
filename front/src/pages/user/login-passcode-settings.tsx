import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGetMe, getGetMeQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPasscodeSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loginPassword, setLoginPassword] = useState("");
  const [loginPasscode, setLoginPasscode] = useState("");
  const [confirmLoginPasscode, setConfirmLoginPasscode] = useState("");
  const [showLoginPasscode, setShowLoginPasscode] = useState(false);
  const [loginPasscodeLoading, setLoginPasscodeLoading] = useState(false);

  const handleSetLoginPasscode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginPassword) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your current account password." });
      return;
    }

    if (!/^[0-9]{4,6}$/.test(loginPasscode)) {
      toast({ variant: "destructive", title: "Error", description: "Login passcode must be 4–6 digits." });
      return;
    }

    if (loginPasscode !== confirmLoginPasscode) {
      toast({ variant: "destructive", title: "Error", description: "Passcodes do not match." });
      return;
    }

    setLoginPasscodeLoading(true);
    try {
      await api.setLoginPasscode(loginPassword, loginPasscode);
      toast({ title: "Login Passcode Saved", description: "Your login passcode has been configured." });
      setLoginPassword("");
      setLoginPasscode("");
      setConfirmLoginPasscode("");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message || "Could not save your login passcode." });
    } finally {
      setLoginPasscodeLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white mb-2">Login Passcode</h1>
          <p className="text-zinc-400 text-sm">
            {user?.hasLoginPasscode
              ? "Update the passcode used for login verification when required."
              : "Set a login passcode to add an extra verification step after password entry."
            }
          </p>
        </div>

        <div className={cn(
          "flex items-center gap-4 p-5 rounded-2xl border",
          user?.hasLoginPasscode
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-amber-500/5 border-amber-500/20"
        )}>
          <ShieldCheck className={cn("w-8 h-8 flex-shrink-0", user?.hasLoginPasscode ? "text-emerald-400" : "text-amber-400")} />
          <div>
            <p className={cn("font-semibold", user?.hasLoginPasscode ? "text-emerald-400" : "text-amber-400")}>
              {user?.hasLoginPasscode ? "Login passcode is active" : "No login passcode set"}
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">
              {user?.hasLoginPasscode
                ? "Your account will prompt for this passcode after password login when the feature is enabled."
                : "Your account will not be challenged for a login passcode until one is configured."
              }
            </p>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-5 h-5 text-emerald-400" />
              {user?.hasLoginPasscode ? "Update Login Passcode" : "Set Login Passcode"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetLoginPasscode} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Current Account Password</label>
                <Input
                  type="password"
                  placeholder="Enter your login password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500">
                  {user?.hasLoginPasscode
                    ? "Required to verify your identity before updating your login passcode."
                    : "Required to set your login passcode for the first time."
                  }
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Login Passcode</label>
                <div className="relative">
                  <Input
                    type={showLoginPasscode ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="4–6 digit passcode"
                    value={loginPasscode}
                    onChange={(e) => setLoginPasscode(e.target.value.replace(/\D/g, ""))}
                    className="bg-zinc-800 border-zinc-700 tracking-widest font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPasscode(!showLoginPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showLoginPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Confirm Login Passcode</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Re-enter passcode"
                  value={confirmLoginPasscode}
                  onChange={(e) => setConfirmLoginPasscode(e.target.value.replace(/\D/g, ""))}
                  className="bg-zinc-800 border-zinc-700 tracking-widest font-mono"
                />
                {confirmLoginPasscode && loginPasscode && (
                  <p className={cn("text-xs", loginPasscode === confirmLoginPasscode ? "text-emerald-400" : "text-red-400")}>
                    {loginPasscode === confirmLoginPasscode ? "Passcodes match" : "Passcodes do not match"}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loginPasscodeLoading}>
                {loginPasscodeLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                {user?.hasLoginPasscode ? "Update Passcode" : "Set Passcode"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Login Passcode Notes</p>
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>Login passcode is separate from your account password.</li>
            <li>It is only required when the login passcode feature is enabled.</li>
            <li>Do not share your passcode with anyone.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
