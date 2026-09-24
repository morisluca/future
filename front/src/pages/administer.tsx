import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, ArrowRight, Download, Delete } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useLogin } from "@/lib/api-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});


type LoginData = z.infer<typeof loginSchema>;

export default function Administer() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();

  const { toast } = useToast();

  const loginMutation = useLogin();

  const [passcodeMode, setPasscodeMode] = useState(false);
  const [passcodeToken, setPasscodeToken] = useState<string | null>(null);
  const [passcodeUser, setPasscodeUser] = useState<{ profileImageUrl?: string | null; firstName?: string; lastName?: string } | null>(null);
  const [passcode, setPasscode] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [passcodePending, setPasscodePending] = useState(false);

  const isPending = loginMutation.isPending;

  // const handleDownload = () => {
  //   const link = document.createElement("a");
  //   link.href = `${import.meta.env.BASE_URL}securebank-project.zip`;
  //   link.download = "securebank-project.zip";
  //   link.click();
  // };

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onLogin = async (data: LoginData) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      const result = res as any;

      if (result.requiresPasscode) {
        setPasscodeMode(true);
        setPasscodeToken(result.passcodeToken);
        setPasscodeUser(result.user ?? null);
        setLoginMessage("Enter your login passcode to continue.");
        return;
      }

      if (result.requiresPasscodeSetup) {
        toast({
          variant: "destructive",
          title: "Login Passcode Required",
          description: result.message || "Please set your login passcode in account settings.",
        });
        setLocation("/settings/pin");
        return;
      }

      if (result.requiresTwoFactor) {
        toast({
          variant: "default",
          title: "Two-factor authentication required",
          description: "Please use the 2FA login flow.",
        });
        return;
      }

      setToken(result.token);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation(result.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid credentials." });
    }
  };

  const onVerifyPasscode = async () => {
    if (!passcodeToken) {
      toast({ variant: "destructive", title: "Error", description: "Missing passcode verification session." });
      return;
    }

    if (!passcode) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your passcode." });
      return;
    }

    setPasscodePending(true);
    try {
      const res = await api.verifyLoginPasscode(passcodeToken, passcode);
      setToken(res.token);
      toast({ title: "Welcome back!", description: "Passcode verified successfully." });
      setLocation(res.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message || "Invalid passcode." });
    } finally {
      setPasscodePending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      {/* Pattern background */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        {/* <img 
          src={`${import.meta.env.BASE_URL}images/auth-pattern.png`} 
          alt="" 
          className="w-full h-full object-cover mix-blend-overlay"
        /> */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background/20" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10 glass-card p-8 sm:p-10 rounded-[2rem] border border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <Shield className="w-8 h-8 text-zinc-950" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white text-center">
            Admin Portal
          </h2>
          <p className="text-zinc-400 mt-2 text-center">
            Access the administrator restricted area.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!passcodeMode ? (
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
                  <button type="button" onClick={() => setLocation('/forgot-password')} className="text-emerald-400 hover:underline">
                    Forgot?
                  </button>
                </label>
                <Input type="password" placeholder="••••••••" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>}
              </div>
              
              <Button type="submit" size="lg" className="w-full mt-8 h-14 text-base" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              
              <p className="text-center text-sm text-zinc-400 pt-4 hidden">
                Don't have an account? <button type="button" onClick={() => setLocation('/register')} className="text-emerald-400 font-medium hover:underline">Register</button>
              </p>
            </motion.form>
          ) : (
            <motion.div
              key="passcode"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-4 text-center">
                <div className="mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-400/20 bg-zinc-950 shadow-lg shadow-emerald-500/10">
                  {passcodeUser?.profileImageUrl ? (
                    <img
                      src={passcodeUser.profileImageUrl}
                      alt={`${passcodeUser.firstName ?? ""} ${passcodeUser.lastName ?? ""}`.trim()}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white text-2xl font-semibold">
                      {(passcodeUser?.firstName?.[0] ?? "") + (passcodeUser?.lastName?.[0] ?? "")}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  {passcodeUser ? `Welcome back, ${passcodeUser.firstName ?? "User"}` : loginMessage || "Enter your login passcode."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      className={
                        "w-4 h-4 rounded-full border border-zinc-700 " +
                        (index < passcode.length ? "bg-emerald-400 border-emerald-400" : "bg-zinc-900")
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => passcode.length < 6 && setPasscode((prev) => prev + digit)}
                    className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-semibold hover:border-emerald-400 hover:text-emerald-300 transition"
                  >
                    {digit}
                  </button>
                ))}
                <div className="h-16 rounded-2xl bg-zinc-950 border border-zinc-800" />
                <button
                  type="button"
                  onClick={() => passcode.length < 6 && setPasscode((prev) => prev + '0')}
                  className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-semibold hover:border-emerald-400 hover:text-emerald-300 transition"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPasscode((prev) => prev.slice(0, -1))}
                  className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-semibold hover:border-emerald-400 hover:text-emerald-300 transition"
                >
                  <Delete className="w-5 h-5 mx-auto" />
                </button>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full mt-3 h-14 text-base"
                onClick={onVerifyPasscode}
                disabled={passcode.length < 4 || passcodePending}
              >
                {passcodePending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Passcode <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>

              <p className="text-center text-sm text-zinc-400 pt-2">
                <button
                  type="button"
                  onClick={() => { setPasscodeMode(false); setPasscode(""); setLoginMessage(""); setPasscodeToken(null); setPasscodeUser(null); }}
                  className="text-emerald-400 font-medium hover:underline"
                >
                  Log in using credentials
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/*  button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">

      </div>
    </div>
  );
}
