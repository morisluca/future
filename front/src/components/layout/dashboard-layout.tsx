import React from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useGetAccounts } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  LayoutDashboard, CreditCard, ArrowRightLeft,
  Bitcoin, Users, Shield, LogOut, Activity,
  Menu, Bell, Settings, KeyRound, FileText, ShieldCheck,
  ChevronRight, Globe, Wifi, MapPin, Download, Upload,
  ChartBar,
} from "lucide-react";
import BottomNav from "./bottom-nav";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import LanguageSwitcher from "../LanguageSwitcher";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const AVATAR_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
];

function getAvatarGradient(name: string) {
  const code = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { data: accounts } = useGetAccounts();
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getPublicSettings(),
    retry: 1,
  });
  const siteName = settingsData?.settings?.site_name ?? "FuturebkAssest";
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const userRoutes = [
    { href: "/dashboard",           label: "Overview",           icon: LayoutDashboard, variant: "emerald" },
    { href: "/accounts",            label: "My Accounts",        icon: CreditCard,      variant: "emerald" },
    // { href: "/transfers/local",     label: "Send Money Local",   icon: MapPin,          variant: "emerald" },
    // { href: "/transfers/international", label: "Send Money Int'l", icon: Globe,           variant: "amber" },
    { href: "/crypto",             label: "Crypto Trading",     icon: Bitcoin,         variant: "amber" },
    // { href: "/transfers",           label: "Transfers",          icon: ArrowRightLeft,  variant: "sky" },
    { href: "/deposit",            label: "Deposit",            icon: Download,        variant: "emerald" },
    { href: "/transfers/wire",      label: "Transfer",      icon: Wifi,            variant: "amber" },
    // { href: "/transfers/wire",      label: "Wire Transfer",      icon: Wifi,            variant: "amber" },
    // { href: "/withdraw",           label: "Withdraw",           icon: Upload,          variant: "amber" },
    { href: "/cards",               label: "Cards",             icon: CreditCard,      variant: "emerald" },
    { href: "/transactions",        label: "Transactions",       icon: Activity,        variant: "emerald" },
  ];

  const settingsRoutes = [
    { href: "/settings/pin",        label: "Transfer PIN",   icon: KeyRound,        variant: "sky" },
    { href: "/settings/two-factor", label: "Two-Factor Auth",icon: ShieldCheck,     variant: "violet" },
  ];

  const VARIANT_STYLES: Record<string, { card: string; icon: string; accent: string }> = {
    emerald: {
      card: "bg-emerald-500/10 border-emerald-500/15 text-emerald-200",
      icon: "bg-emerald-500/15 text-emerald-400",
      accent: "border-emerald-500/20",
    },
    amber: {
      card: "bg-amber-400/10 border-amber-400/15 text-amber-300",
      icon: "bg-amber-300/15 text-amber-400",
      accent: "border-amber-400/20",
    },
    sky: {
      card: "bg-sky-500/10 border-sky-500/15 text-sky-300",
      icon: "bg-sky-500/15 text-sky-400",
      accent: "border-sky-500/20",
    },
    violet: {
      card: "bg-violet-500/10 border-violet-500/15 text-violet-300",
      icon: "bg-violet-500/15 text-violet-400",
      accent: "border-violet-500/20",
    },
  };

  const navLinks = userRoutes;
  const pageTitle = [...navLinks, ...settingsRoutes].find(l => l.href === location)?.label || "Dashboard";
  const avatarGradient = getAvatarGradient(user?.firstName ?? "S");
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || "";

  const NavItem = ({ href, label, icon: Icon, variant }: { href: string; label: string; icon: React.ElementType; variant: string }) => {
    const isActive = location === href;
    const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.emerald;
    return (
      <Link href={href} onClick={() => setIsMobileMenuOpen(false)}>
        <div className={cn(
          "relative rounded-3xl border p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center",
          isActive
            ? `border-transparent shadow-[0_25px_60px_-35px_rgba(16,185,129,0.8)] bg-white/5 ${styles.accent}`
            : `border-zinc-800/80 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/80`,
        )}>
          <div className={cn(
            "w-14 h-14 rounded-3xl grid place-items-center border border-zinc-800/70 shadow-sm",
            isActive ? styles.icon : "bg-white/5 text-zinc-300"
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <span className={cn("text-sm font-semibold transition-colors", isActive ? "text-white" : "text-zinc-200")}>{label}</span>
        </div>
      </Link>
    );
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800/50">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <ChartBar className="w-4 h-4 text-zinc-950" />
           </div>
          <div>
            <span className="text-base uppercase font-display font-bold text-white tracking-tight">{siteName}</span>
            {isAdmin && <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Admin</span>}
          </div>
        </Link>
      </div>

      {/* Balance preview (user only) */}
      {!isAdmin && (
        <div className="mx-4 mt-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-900/30 to-zinc-900/40 border border-emerald-500/10">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Total Balance</p>
          <p className="text-lg font-bold text-white">{formatCurrency(totalBalance)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{accounts?.length ?? 0} account{(accounts?.length ?? 0) !== 1 ? "s" : ""}</p>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 mt-5 overflow-hidden">
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">Banking Menu</p>
          <p className="mt-2 hidden text-sm font-semibold text-zinc-100">Select an option to continue</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {userRoutes.map(r => <NavItem key={r.href} {...r} />)}
          {settingsRoutes.map(r => <NavItem key={r.href} {...r} />)}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="p-4 border-t border-zinc-800/50">



        {/* contact support card */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-900/30 to-zinc-900/40 border border-emerald-500/10">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Need Help?</p>
          <p className="text-sm font-semibold text-white mb-2">Contact Support</p>
          <a
            href={`mailto:${supportEmail}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-colors border border-zinc-700/80 hover:border-emerald-500/50 bg-zinc-900/60"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            Support Center
          </a>
        </div>
        <br />

        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-default mb-2">
          <Avatar className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0 shadow-md">
            {user?.profileImageUrl ? (
              <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
            ) : (
              <AvatarFallback className={cn("bg-gradient-to-br flex items-center justify-center", avatarGradient)}>
                <span className="text-xs font-bold text-white">{initials}</span>
              </AvatarFallback>
            )}
          </Avatar>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

      </div>
      <br/><br/><br/>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] fixed inset-y-0 left-0 border-r border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl z-20">
        <NavContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-[260px] bg-zinc-950 border-r border-zinc-800 z-50 lg:hidden shadow-2xl"
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:pl-[260px] flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800/40 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between px-4 sm:px-8 gap-4">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="lg:flex items-center gap-2">
            {/* <h2 className="text-sm font-semibold text-zinc-100">{pageTitle}</h2> */}
            <LanguageSwitcher/>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <span className="hidden md:block text-xs text-zinc-600 font-medium tabular-nums">
              {format(new Date(), "EEEE, MMM d yyyy")}
            </span>
            <button className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-zinc-950" />
            </button>
            {/* Avatar in header (mobile) */}
            <Avatar className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0 lg:hidden">
              {user?.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
              ) : (
                <AvatarFallback className={cn("bg-gradient-to-br flex items-center justify-center", avatarGradient)}>
                  <span className="text-xs font-bold text-white">{initials}</span>
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
        <br/><br/><br/>
      </main>
      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
