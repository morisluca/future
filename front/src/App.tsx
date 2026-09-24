import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { setAuthTokenGetter, setBaseUrl } from "@/lib/api-client";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/public/landing";

import Dashboard from "@/pages/user/dashboard";
import AccountsPage from "@/pages/user/accounts";
import TransfersPage from "@/pages/user/transfers";
import { SendMoneyLocalPage, SendMoneyInternationalPage, WireTransferPage } from "@/pages/user/send-money";
import  DepositPage from "@/pages/user/deposit";
import  WithdrawPage from "@/pages/user/withdraw";
import TransactionsPage from "@/pages/user/transactions";
import CryptoPage from "@/pages/user/crypto";
import CardsPage from "@/pages/user/cards";
import PinSettingsPage from "@/pages/user/pin-settings";
import LoginPasscodeSettingsPage from "@/pages/user/login-passcode-settings";
import TwoFactorPage from "@/pages/admin/settings/two-factor";
import ProfilePage from "@/pages/user/profile";

import AdminDashboard from "@/pages/admin/admin-dashboard";
import AdminUsersPage from "@/pages/admin/admin-users";
import AdminTransactionsPage from "@/pages/admin/admin-transactions";
import AdminCreateTransactionPage from "@/pages/admin/admin-create-transaction";
import AdminSettingsPage from "@/pages/admin/admin-settings";
import AdminPendingApprovalsPage from "@/pages/admin/AdminPendingApprovalsPage";
import AdminCardsPage from "@/pages/admin/admin-cards";

import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import Login from "./pages/login";
import Register from "./pages/register";
import Administer from "./pages/administer";
import { useGoogleTranslate } from "./components/useGoogleTranslate";

// When deployed on Vercel (or any host separate from the API), set VITE_API_URL
// to point at the Render backend, e.g. https://securebak-api.onre
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL as string);
}
setAuthTokenGetter(() => localStorage.getItem("auth_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) setLocation("/login");
      else if (adminOnly && !isAdmin) setLocation("/dashboard");
    }
  }, [isAuthenticated, isAdmin, isLoading, adminOnly]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (adminOnly && !isAdmin) return null;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) setLocation(isAdmin ? "/admin" : "/dashboard");
  }, [isAuthenticated, isAdmin, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      {/* <Route path="/">{() => <GuestRoute component={() => <Login />} />}</Route> */}
      <Route path="/ccc">{() => <GuestRoute component={() => <Administer />} />}</Route>
      <Route path="/login">{() => <GuestRoute component={() => <Login />} />}</Route>
      {/* <Route path="/login">{() => <GuestRoute component={() => <AuthPage isRegister={false} />} />}</Route> */}
      <Route path="/registeration">{() => <GuestRoute component={() => <Register />} />}</Route>
      <Route path="/forgot-password">{() => <GuestRoute component={ForgotPasswordPage} />}</Route>
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* User routes */}
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/accounts">{() => <ProtectedRoute component={AccountsPage} />}</Route>
      <Route path="/transfers">{() => <ProtectedRoute component={TransfersPage} />}</Route>
      <Route path="/transfers/local">{() => <ProtectedRoute component={SendMoneyLocalPage} />}</Route>
      <Route path="/transfers/international">{() => <ProtectedRoute component={SendMoneyInternationalPage} />}</Route>
      <Route path="/transfers/wire">{() => <ProtectedRoute component={WireTransferPage} />}</Route>
      <Route path="/deposit">{() => <ProtectedRoute component={DepositPage} />}</Route>
      <Route path="/withdraw">{() => <ProtectedRoute component={WithdrawPage} />}</Route>
      <Route path="/transactions">{() => <ProtectedRoute component={TransactionsPage} />}</Route>
      <Route path="/crypto">{() => <ProtectedRoute component={CryptoPage} />}</Route>
      <Route path="/cards">{() => <ProtectedRoute component={CardsPage} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={ProfilePage} />}</Route>
      <Route path="/settings/pin">{() => <ProtectedRoute component={PinSettingsPage} />}</Route>
      <Route path="/settings/login-passcode">{() => <ProtectedRoute component={LoginPasscodeSettingsPage} />}</Route>
      <Route path="/settings/two-factor">{() => <ProtectedRoute component={TwoFactorPage} />}</Route>

      {/* Admin routes */}
      <Route path="/admin">{() => <ProtectedRoute component={AdminDashboard} adminOnly />}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsersPage} adminOnly />}</Route>
      <Route path="/admin/transactions">{() => <ProtectedRoute component={AdminTransactionsPage} adminOnly />}</Route>
      <Route path="/admin/create-transaction">{() => <ProtectedRoute component={AdminCreateTransactionPage} adminOnly />}</Route>
      <Route path="/admin/pending-approvals">{() => <ProtectedRoute component={AdminPendingApprovalsPage} adminOnly />}</Route>
      <Route path="/admin/settings">{() => <ProtectedRoute component={AdminSettingsPage} adminOnly />}</Route>
      <Route path="/admin/cards">{() => <ProtectedRoute component={AdminCardsPage} adminOnly />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useGoogleTranslate("en");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="/en">
          <AuthProvider>
          <div id="google_translate_element" style={{ display: "none" }} />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
