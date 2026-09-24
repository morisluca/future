import React, { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
            {/* <Shield className="w-8 h-8 text-zinc-950" /> */}
             <img className="w-8 h-8 inline-flex items-center justify-center text-zinc-950 font-bold text-xl" src={`${import.meta.env.BASE_URL}favicon.png`} alt="Logo" />
          
          </div>
          <h2 className="text-3xl font-display font-bold text-white text-center">Reset Password</h2>
          <p className="text-zinc-400 mt-2 text-center text-sm">Enter your email and we'll send you a reset link.</p>
        </div>

        {sent ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Check your inbox</p>
              <p className="text-zinc-400 text-sm">If <span className="text-emerald-400">{email}</span> is registered, you'll receive a reset link shortly.</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full h-14 text-base mt-2" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
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
