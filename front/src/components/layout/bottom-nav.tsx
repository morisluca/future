import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Activity, CreditCard, ArrowRightLeft, User, X, HomeIcon, Bitcoin, KeyRound, Upload, ShieldCheck, Download, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/transactions", label: "Stats", icon: Activity },
  { href: "/accounts", label: "Cards", icon: LayoutDashboard, variant: "emerald"  },
  { href: "/transfers/wire", label: "Transfers", icon: ArrowRightLeft },
  { href: "/profile", label: "Profile", icon: User },
];

const navItemsOverlay = [
    { href: "/dashboard", label: "Home", icon: HomeIcon,      variant: "emerald"  },
    { href: "/transactions", label: "Stats", icon: Activity, variant: "amber"    },
    { href: "/accounts", label: "Cards", icon: LayoutDashboard, variant: "sky"      },
    { href: "/transfers/wire",      label: "Wire Transfer",      icon: Wifi,            variant: "amber" },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/accounts",            label: "My Accounts",        icon: CreditCard,      variant: "emerald" },
    // { href: "/transfers/local",     label: "Send Money Local",   icon: MapPin,          variant: "emerald" },
    // { href: "/transfers/international", label: "Send Money Int'l", icon: Globe,           variant: "amber" },
    { href: "/transfers/wire", label: "Transfers", icon: ArrowRightLeft, variant: "emerald" },
    { href: "/deposit",            label: "Deposit",            icon: Download,        variant: "emerald" },
    { href: "/withdraw",           label: "Withdraw",           icon: Upload,          variant: "amber" },
    { href: "/transactions",        label: "Transactions",       icon: Activity,        variant: "emerald" },
    // { href: "/transfers",           label: "Transfers",          icon: ArrowRightLeft,  variant: "sky" },
    { href: "/crypto",             label: "Crypto Trading",     icon: Bitcoin,         variant: "amber" },
    { href: "/settings/pin",        label: "Transfer PIN",   icon: KeyRound,        variant: "sky" },
    { href: "/settings/two-factor", label: "Two-Factor Auth",icon: ShieldCheck,     variant: "violet" },

];

export default function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [openFullNav, setOpenFullNav] = useState(false);

  const tileStyles = (variant?: string) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200";
      case "amber":
        return "bg-amber-100 text-amber-900 hover:bg-amber-200";
      case "sky":
        return "bg-sky-100 text-sky-900 hover:bg-sky-200";
      case "violet":
        return "bg-violet-100 text-violet-900 hover:bg-violet-200";
      case "pink":
        return "bg-pink-100 text-pink-900 hover:bg-pink-200";
      default:
        return "bg-zinc-100 text-zinc-900 hover:bg-zinc-200";
    }
  };

  useEffect(() => {
    if (!openFullNav) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFullNav(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFullNav]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <div className="mx-4 mb-4 bg-zinc-950/90 border border-zinc-800 rounded-3xl px-3 py-2 flex items-center justify-between shadow-2xl backdrop-blur">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isCenter = idx === 2;
            const isActive = location === item.href;

            if (isCenter) {
              return (
                <div key={item.href} className="relative -mt-6 flex-1 flex justify-center">
                  <button onClick={() => setOpenFullNav(true)} className="relative block focus:outline-none">
                    <div className="w-16 h-16 rounded-full grid place-items-center border-2 bg-emerald-500/90 border-emerald-600 text-white shadow-xl shadow-emerald-500/20">
                      <Icon className="w-6 h-6" />
                    </div>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white shadow-lg shadow-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />Active
                      </span>
                    )}
                  </button>
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={cn("flex-1 px-2 py-1 flex flex-col items-center justify-center text-xs", isActive ? "text-white" : "text-zinc-400") }>
                <Icon className="w-5 h-5 mb-1" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <AnimatePresence>
        {openFullNav && (
          <motion.div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center lg:hidden"
            onClick={() => setOpenFullNav(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="bg-white rounded-[32px] p-6 mx-4 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_35px_80px_rgba(15,23,42,0.2)]"
                  initial={{ y: 40, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 40, opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 rounded-full shadow-lg shadow-slate-200/20">
                        {user?.profileImageUrl ? (
                          <AvatarImage src={user.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                        ) : null}
                        <AvatarFallback className="bg-slate-900 text-white text-base font-semibold">
                          {user?.firstName?.[0] ?? "U"}{user?.lastName?.[0] ?? ""}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{user?.firstName ?? "User"} {user?.lastName ?? ""}</p>
                        <p className="text-sm text-slate-500">Account: 7779780543</p>
                        <span className="inline-flex items-center gap-2 mt-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Verified
                        </span>
                      </div>
                    </div>
                    <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => setOpenFullNav(false)} aria-label="Close menu">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <p className="text-2xl font-semibold text-slate-900">Banking Menu</p>
                    <p className="text-sm text-slate-500">Select an option to continue</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(90vh-240px)] pr-1 pb-1">
                    {navItemsOverlay.map((ni) => {
                      const I = ni.icon;
                      return (
                        <Link
                          key={`${ni.href}-${ni.label}`}
                          href={ni.href}
                          className={cn(
                            "p-4 rounded-3xl min-h-[140px] flex flex-col items-center justify-center gap-3 text-center border border-transparent transition",
                            tileStyles(ni.variant)
                          )}
                          onClick={() => setOpenFullNav(false)}
                        >
                          <div className="w-12 h-12 rounded-full bg-white grid place-items-center shadow-sm">
                            <I className="w-5 h-5" />
                          </div>
                          <div className="text-sm font-semibold leading-tight">{ni.label}</div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
