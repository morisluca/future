import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useGetMe, getGetMeQueryKey } from "@/lib/api-client";
import type { UserProfile } from "@/lib/api-client";

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_EXPIRES_AT_KEY = "auth_expires_at";

export type ExtendedUser = UserProfile & {
  canWithdraw?: boolean;
  canTransfer?: boolean;
  wireBypassCodes?: boolean;
  hasTransferPin?: boolean;
  hasLoginPasscode?: boolean;
  twoFactorEnabled?: boolean;
};

type AuthContextType = {
  user: ExtendedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  setToken: (token: string) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));

  const setToken = useCallback((newToken: string) => {
    const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setTokenState(null);
    window.location.href = "/en/login";
  }, []);

  const { data: user, isLoading: isUserLoading, isError, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  const refreshUser = async () => {
    await refetch();
  };

  useEffect(() => {
    if (!token) return;

    const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY) ?? "0");
    if (!expiresAt) {
      setToken(token);
      return;
    }

    const checkSession = () => {
      if (!localStorage.getItem(AUTH_TOKEN_KEY)) return;

      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        logout();
      }
    };

    checkSession();
    const intervalId = window.setInterval(checkSession, 30000);

    return () => window.clearInterval(intervalId);
  }, [token, setToken, logout]);

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  return (
    <AuthContext.Provider
      value={{
        user: (user as ExtendedUser) || null,
        isLoading: !!token && isUserLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        logout,
        setToken,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
