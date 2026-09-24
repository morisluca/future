import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, ArrowRight, Download, Smartphone } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useLogin, useRegister } from "@/lib/api-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Must be at least 6 characters"),
  phone: z.string().optional(),
  profileImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage({ isRegister = false }: { isRegister?: boolean }) {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  // 2FA state
  const [twoFactorMode, setTwoFactorMode] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${import.meta.env.BASE_URL}securebank-project.zip`;
    link.download = "securebank-project.zip";
    link.click();
  };

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", phone: "", profileImageUrl: "" }
  });

  const onLogin = async (data: LoginData) => {
    try {
      const res = await loginMutation.mutateAsync({ data }) as any;

      // 2FA required
      if (res.requiresTwoFactor) {
        setTwoFactorToken(res.twoFactorToken);
        setTwoFactorMode(true);
        return;
      }

      setToken(res.token);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation(res.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid credentials." });
    }
  };

  const onVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Enter the 6-digit code from your authenticator app." });
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.verifyLoginOtp(twoFactorToken, otpCode);
      setToken(res.token);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation(res.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message || "Invalid code." });
      setOtpCode("");
    } finally {
      setOtpLoading(false);
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const res = await registerMutation.mutateAsync({ data });
      setToken(res.token);
      toast({ title: "Account created!", description: "Welcome to SecureBank." });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message || "Something went wrong." });
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      {/* Pattern background */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-pattern.png`}
          alt=""
          className="w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background/20" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10 glass-card p-8 sm:p-10 rounded-[2rem] border border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            {twoFactorMode ? <Smartphone className="w-8 h-8 text-zinc-950" /> : <Shield className="w-8 h-8 text-zinc-950" />}
          </div>
          <h2 className="text-3xl font-display font-bold text-white text-center">
            {twoFactorMode ? "Two-Factor Auth" : isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-zinc-400 mt-2 text-center">
            {twoFactorMode
              ? "Enter the 6-digit code from your authenticator app."
              : isRegister ? "Enter your details to get started." : "Sign in to access your dashboard."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── 2FA verification step ── */}
          {twoFactorMode ? (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 ml-1">Verification Code</label>
                <Input
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-mono text-center text-2xl tracking-[0.5em] h-14"
                  autoFocus
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && onVerifyOtp()}
                />
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-base"
                onClick={onVerifyOtp}
                disabled={otpLoading || otpCode.length !== 6}
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>

              <button
                type="button"
                onClick={() => { setTwoFactorMode(false); setOtpCode(""); setTwoFactorToken(""); }}
                className="w-full text-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors pt-2"
              >
                ← Back to login
              </button>
            </motion.div>

          /* ── Register form ── */
          ) : isRegister ? (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={registerForm.handleSubmit(onRegister)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input placeholder="First Name" {...registerForm.register("firstName")} />
                  {registerForm.formState.errors.firstName && <p className="text-xs text-red-400">{registerForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Input placeholder="Last Name" {...registerForm.register("lastName")} />
                  {registerForm.formState.errors.lastName && <p className="text-xs text-red-400">{registerForm.formState.errors.lastName.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Input type="email" placeholder="Email Address" {...registerForm.register("email")} />
                {registerForm.formState.errors.email && <p className="text-xs text-red-400">{registerForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Input type="password" placeholder="Password (min 6 characters)" {...registerForm.register("password")} />
                {registerForm.formState.errors.password && <p className="text-xs text-red-400">{registerForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Input type="tel" placeholder="Phone Number (Optional)" {...registerForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Input type="url" placeholder="Profile Picture URL (Optional)" {...registerForm.register("profileImageUrl")} />
                {registerForm.formState.errors.profileImageUrl && (
                  <p className="text-xs text-red-400">{registerForm.formState.errors.profileImageUrl.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full mt-6 h-14 text-base" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>

              <p className="text-center text-sm text-zinc-400 pt-4">
                Already have an account? <button type="button" onClick={() => setLocation('/login')} className="text-emerald-400 font-medium hover:underline">Sign in</button>
              </p>
            </motion.form>

          /* ── Login form ── */
          ) : (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              onSubmit={loginForm.handleSubmit(onLogin)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 ml-1">Email Address</label>
                <Input type="email" placeholder="john@example.com" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 ml-1 flex justify-between">
                  Password
                  <button type="button" onClick={() => setLocation("/forgot-password")} className="text-emerald-400 hover:underline font-normal">
                    Forgot?
                  </button>
                </label>
                <Input type="password" placeholder="••••••••" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full mt-8 h-14 text-base" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>

              {/* <p className="text-center text-sm text-zinc-400 pt-4">
                Don't have an account? <button type="button" onClick={() => setLocation('/register')} className="text-emerald-400 font-medium hover:underline">Register</button>
              </p> */}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Download source button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">

      </div>
    </div>
  );
}
