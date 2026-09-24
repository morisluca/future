import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, ArrowRight, Download } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useLogin, useRegister } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


const registerSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Must be at least 6 characters"),
  phone: z.string().optional(),
  profileImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type RegisterData = z.infer<typeof registerSchema>;

export default function Register() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
  const [step, setStep] = useState(1);

  const { toast } = useToast();

  const registerMutation = useRegister();

const isPending =  registerMutation.isPending;

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", phone: "", profileImageUrl: "" }
  });


  const onRegister = async (data: RegisterData) => {
    try {
      await registerMutation.mutateAsync({ data });
      toast({ title: "Account created!", description: "Account created successfully" });
      setLocation("/login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message || "Something went wrong." });
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await registerForm.trigger(["firstName", "lastName", "email", "password"]);
      if (isValid) setStep(2);
      return;
    }

    if (step === 2) { 
      
      const isValid = await registerForm.trigger(["phone"]);
      if (isValid) setStep(3);
    }
  };

  const prevStep = () => setStep((current) => Math.max(1, current - 1));

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (step < 3) {
        void nextStep();
      }
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (step < 3) {
        event.preventDefault();
        return;
      }

    void registerForm.handleSubmit(onRegister)(event);
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
             <img className="w-8 h-8 inline-flex items-center justify-center text-zinc-950 font-bold text-xl" src={`${import.meta.env.BASE_URL}favicon.png`} alt="Logo" />
          
          </div>
          <h2 className="text-3xl font-display font-bold text-white text-center">
            Create Account
          </h2>
          <p className="text-zinc-400 mt-2 text-center">
            Complete your onboarding in three simple steps
          </p>
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-2 w-10 rounded-full ${step >= item ? "bg-emerald-400" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

            <motion.form
              key="register"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleFormSubmit}
              onKeyDown={handleFormKeyDown}
              className="space-y-4"
            >
              {step === 1 && (
                <>
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
                </>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <Input type="tel" placeholder="Phone Number (Optional)" {...registerForm.register("phone")} />
                </div>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Input
                      type="url"
                      placeholder="Profile Picture URL (Optional)"
                      {...registerForm.register("profileImageUrl")}
                    />
                    {registerForm.formState.errors.profileImageUrl && (
                      <p className="text-xs text-red-400">{registerForm.formState.errors.profileImageUrl.message}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    Review your details and create your account when you are ready.
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={step === 1 ? () => setLocation("/login") : prevStep} className="h-11">
                  {step === 1 ? "Cancel" : "Back"}
                </Button>

                {step < 3 ? (
                  <span onClick={nextStep} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] px-4 py-2 h-11">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                ) : (
                  <Button type="submit" className="h-11" disabled={isPending}>
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                )}
              </div>

              <p className="text-center text-sm text-zinc-400 pt-2">
                Already have an account? <button type="button" onClick={() => setLocation('/login')} className="text-emerald-400 font-medium hover:underline">Sign in</button>
              </p>
            </motion.form>
     
        </AnimatePresence>
      </motion.div>

      {/*  button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
      </div>
    </div>
  );
}
