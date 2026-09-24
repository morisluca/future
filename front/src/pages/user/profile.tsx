import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { KeyRound, ShieldCheck, CheckCircle2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Building, Link } from "lucide-react";
import { useGetTransactions } from "@/lib/api-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-zinc-300">{label}</label>
    {children}
  </div>
);

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ limit: 6 });
  const txs = (txData as any)?.transactions || [];

  const { toast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isChanging, setIsChanging] = useState(false);


  const setPwField = (key: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) => setPwForm(p => ({ ...p, [key]: e.target.value }));

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast({ variant: "destructive", title: "Error", description: "Please fill all fields." });
    if (pwForm.newPassword.length < 6) return toast({ variant: "destructive", title: "Error", description: "New password must be at least 6 characters." });
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast({ variant: "destructive", title: "Error", description: "Passwords do not match." });
    setIsChanging(true);
    try {
      const res = await api.changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast({ title: "Success", description: res.message || "Password changed." });
      setShowChangePassword(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      // Force logout so user must re-authenticate with new password
      logout();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err?.message || "Could not change password." });
    } finally {
      setIsChanging(false);
    }
  };

  const passwordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-600"];
    return { score, label: labels[score], color: colors[score] };
  };

  function txIcon(type: string, desc?: string | null) {
    const d = (desc || "").toLowerCase();
    if (d.includes("coffee") || d.includes("cafe")) return Building;
    if (type === "withdrawal") return ArrowUpRight;
    if (type === "deposit") return ArrowDownLeft;
    return ArrowRightLeft;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Profile</h1>
            <p className="text-zinc-400 text-sm">Manage personal details, security and preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-zinc-800">
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-28 h-28 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3", "bg-gradient-to-br from-emerald-500 to-teal-600")}>
                <Avatar className="w-28 h-28 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0 shadow-md">
                  {user?.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                      ) : (
                  (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")
                  )}
                </Avatar>
              </div>
              <p className="text-lg font-semibold text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-zinc-400">{user?.email}</p>
              <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Verified</span>
              </div>

              <div className="mt-6 w-full space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>Member since</span>
                  <span className="text-white">{user?.createdAt
  ? new Date(
      new Date(user.createdAt).setFullYear(
        new Date(user.createdAt).getFullYear() - 5
      )
    ).toLocaleDateString()
  : "—"}</span>
                </div>
                <div className="hidden flex items-center justify-between text-sm text-zinc-400">
                  <span>Primary Account Balance</span>
                  <span className="text-white">{formatCurrency((user as any)?.primaryBalance ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-800">
              <h2 className="text-lg font-semibold text-white mb-4">Personal Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name">
                  <Input value={user?.firstName ?? ""} readOnly className="bg-zinc-900/60" />
                </Field>
                <Field label="Last Name">
                  <Input value={user?.lastName ?? ""} readOnly className="bg-zinc-900/60" />
                </Field>
                <Field label="Email">
                  <Input value={user?.email ?? ""} readOnly className="bg-zinc-900/60" />
                </Field>
                <Field label="Phone">
                  <Input value={user?.phone ?? ""} readOnly className="bg-zinc-900/60" />
                </Field>
              </div>
              <div className="mt-4 flex gap-3 hidden">
                <Button variant="outline">Edit Details</Button>
                <Button onClick={() => { /* open verification flow */ }}>Verify Identity</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Transfer PIN</p>
                    <p className="text-xs text-zinc-400">Used to authorize transfers</p>
                  </div>
                    <a href="/en/settings/pin" className="text-emerald-400 hover:text-emerald-300">
                      Change PIN
                    </a>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-zinc-400">Protect your account with 2FA</p>
                  </div>
                    <a href="/en/settings/two-factor" className="text-emerald-400 hover:text-emerald-300">
                      Manage
                    </a>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="glass-card rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Login Passcode</p>
                    <p className="text-xs text-zinc-400">
                      {user?.hasLoginPasscode
                        ? "A login passcode is configured for your account. Update it below."
                        : "No login passcode set. Add one to enable an extra login verification step when required."
                      }
                    </p>
                  </div>
                  <a href="/en/settings/login-passcode" className="text-emerald-400 hover:text-emerald-300">
                    {user?.hasLoginPasscode ? "Update Passcode" : "Set Passcode"}
                  </a>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-3">
              <div className="glass-card rounded-2xl p-6 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Account Password</p>
                    <p className="text-xs text-zinc-400">Change your login password.</p>
                  </div>
                  <Button onClick={() => setShowChangePassword(true)}>Change Password</Button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="glass-card rounded-2xl p-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                  <a href="/en/transactions" className="text-xs text-zinc-400 hover:text-emerald-400">See all</a>
                </div>
                {txLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800/40 rounded-lg animate-pulse" />)}
                  </div>
                ) : txs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No recent activity.</p>
                ) : (
                  <ul className="space-y-2">
                    {txs.map((t: any) => {
                      const Icon = txIcon(t.type, t.description);
                      const positive = t.type === "deposit" || t.type === "transfer_in";
                      return (
                        <li key={t.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg grid place-items-center", positive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-300") }>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{t.description || (t.type === 'deposit' ? 'Deposit' : t.type === 'withdrawal' ? 'Withdrawal' : 'Transfer')}</p>
                              <p className="text-xs text-zinc-500">{new Date(t.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className={cn("text-sm font-semibold", positive ? "text-emerald-400" : "text-zinc-200")}>
                            {positive ? "+" : "-"}{formatCurrency(t.amount)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        <br/> <br/> <br/>
      </div>
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Change Password</h3>
            <div className="space-y-2">
              <Field label="Current Password">
                <Input type="password" value={pwForm.currentPassword} onChange={setPwField("currentPassword")} />
              </Field>
              <Field label="New Password">
                <Input type="password" value={pwForm.newPassword} onChange={setPwField("newPassword")} />
              </Field>
              <div className="mt-1">
                {(() => {
                  const s = passwordStrength(pwForm.newPassword);
                  const pct = Math.round((s.score / 4) * 100);
                  return (
                    <div className="space-y-1">
                      <div className="w-full bg-zinc-800 rounded h-2 overflow-hidden">
                        <div className={`${s.color} h-2`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-zinc-400">Strength: <span className="font-medium text-white">{s.label}</span></p>
                    </div>
                  );
                })()}
              </div>
              <Field label="Confirm New Password">
                <Input type="password" value={pwForm.confirmPassword} onChange={setPwField("confirmPassword")} />
              </Field>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowChangePassword(false)} disabled={isChanging}>Cancel</Button>
              <Button onClick={handleChangePassword} disabled={isChanging}>{isChanging ? "Changing..." : "Change Password"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
