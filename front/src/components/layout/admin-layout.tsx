import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useGetAccounts } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import {
  LayoutDashboard, CreditCard, ArrowRightLeft,
  Bitcoin, Users, Shield, LogOut, Activity,
  Menu, Bell, Settings, KeyRound, FileText, ShieldCheck,
  ChevronRight,
  PlusSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

  const userRoutes = [
    { href: "/dashboard",           label: "Overview",       icon: LayoutDashboard },
    { href: "/accounts",            label: "My Accounts",    icon: CreditCard },
    { href: "/transfers",           label: "Transfers",      icon: ArrowRightLeft },
    { href: "/transactions",        label: "Transactions",   icon: Activity },
    { href: "/crypto",              label: "Crypto Trading", icon: Bitcoin },
  ];

  const settingsRoutes = [
    { href: "/settings/pin",        label: "Transfer PIN",   icon: KeyRound },
    { href: "/settings/two-factor", label: "Two-Factor Auth",icon: ShieldCheck },
  ];

  const adminRoutes = [
    { href: "/admin",               label: "System Stats",   icon: Shield },
    { href: "/admin/users",         label: "Manage Users",   icon: Users },
    { href: "/admin/cards",         label: "Cards",          icon: CreditCard },
    { href: "/admin/transactions",  label: "All Transactions",icon: FileText },
    { href: "/admin/create-transaction", label: "Create Transaction", icon: PlusSquare },
    { href: "/admin/pending-approvals", label: "Approvals", icon: Bell },
    { href: "/admin/settings",      label: "Site Settings",  icon: Settings },
  ];

  const navLinks = isAdmin ? adminRoutes : userRoutes;
  const pageTitle = [...navLinks, ...settingsRoutes, ...adminRoutes].find(l => l.href === location)?.label || "Dashboard";
  const avatarGradient = getAvatarGradient(user?.firstName ?? "S");
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = location === href;
    return (
      <Link href={href} onClick={() => setIsMobileMenuOpen(false)}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-150 cursor-pointer group relative",
          isActive
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
        )}>
          {isActive && (
            <motion.div layoutId="nav-pill"
              className="absolute inset-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            />
          )}
          <Icon className={cn("w-4 h-4 flex-shrink-0 relative z-10 transition-colors", isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
          <span className="relative z-10 text-sm">{label}</span>
          {isActive && <ChevronRight className="w-3 h-3 ml-auto relative z-10 text-emerald-500/60" />}
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
            <Shield className="w-4 h-4 text-zinc-950" />
          </div>
          <div>
            <span className="text-base font-display font-bold text-white tracking-tight">Portal</span>
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
      <nav className="flex-1 px-3 mt-4 space-y-0.5 overflow-y-auto">
        {isAdmin ? (
          <>
            <p className="px-3 pb-1.5 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Administration</p>
            {adminRoutes.map(r => <NavItem key={r.href} {...r} />)}
          </>
        ) : (
          <>
            <p className="px-3 pb-1.5 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Banking</p>
            {userRoutes.map(r => <NavItem key={r.href} {...r} />)}
            <p className="px-3 pt-4 pb-1.5 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Security</p>
            {settingsRoutes.map(r => <NavItem key={r.href} {...r} />)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-default mb-2">
          <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md", avatarGradient)}>
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
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
      <main className="flex-1 lg:pl-[260px] flex flex-col min-h-screen overflow-auto">
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

          <div className="hidden lg:flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">{pageTitle}</h2>
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
            <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 lg:hidden", avatarGradient)}>
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 overflow-x-hidden overflow-y-auto">
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
      </main>
    </div>
  );
}
