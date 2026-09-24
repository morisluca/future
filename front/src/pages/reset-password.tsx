import React, { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

function useSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || "";
}

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const token = useSearchParam("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid or missing reset token. Please request a new link."); return; }
    setError("");
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <img src={`${import.meta.env.BASE_URL}images/auth-pattern.png`} alt="" className="w-full h-full object-cover mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background/20" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10 glass-card p-8 sm:p-10 rounded-[2rem] border border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
             <img className="w-8 h-8 inline-flex items-center justify-center text-zinc-950 font-bold text-xl" src={`${import.meta.env.BASE_URL}favicon.png`} alt="Logo" />
          
          </div>
          <h2 className="text-3xl font-display font-bold text-white text-center">New Password</h2>
          <p className="text-zinc-400 mt-2 text-center text-sm">Choose a strong password for your account.</p>
        </div>

        {!token ? (
          <div className="text-center space-y-4">
            <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/forgot-password")}>
              Request a new link
            </Button>
          </div>
        ) : done ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Password updated!</p>
              <p className="text-zinc-400 text-sm">You can now sign in with your new password.</p>
            </div>
            <Button className="w-full" onClick={() => setLocation("/login")}>Sign In</Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Confirm Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full h-14 text-base mt-2" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Set New Password"}
            </Button>

            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="w-full text-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
