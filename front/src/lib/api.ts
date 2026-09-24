const API_ROOT: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ??
  import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const api = {
  getSettings: () =>
    apiFetch<{ settings: Record<string, string> }>("/api/admin/settings"),

  getPublicSettings: () =>
    apiFetch<{ settings: Record<string, string> }>("/api/settings"),

  getCardSettings: () =>
    apiFetch<{ settings: Record<string, string> }>("/api/cards/settings"),

  updateSettings: (settings: Record<string, string>) =>
    apiFetch<{ settings: Record<string, string> }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  updateUserPermissions: (
    userId: number,
    perms: { canWithdraw?: boolean; canTransfer?: boolean; wireBypassCodes?: boolean },
  ) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${userId}/permissions`, {
      method: "PUT",
      body: JSON.stringify(perms),
    }),

  createAdminUser: (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string; profileImageUrl?: string }) =>
    apiFetch<{ success: boolean; user: any }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminUser: (userId: number, payload: { email: string; firstName: string; lastName: string; phone?: string | null; profileImageUrl?: string | null; password?: string }) =>
    apiFetch<{ success: boolean; user: any }>(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteUser: (userId: number) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  getDepositInfo: () =>
    apiFetch<{ info: Record<string, string> }>("/api/transactions/deposit-info"),

  getPendingTransfers: () =>
    apiFetch<{ transfers: any[] }>("/api/admin/pending-transfers"),

  getPendingApprovals: () =>
    apiFetch<{ transfers: any[] }>("/api/admin/pending-transfers"),

  approveTransfer: (txId: number, approve: boolean) =>
    apiFetch<{ success: boolean; status: string }>(
      `/api/admin/transfers/${txId}/approve`,
      { method: "POST", body: JSON.stringify({ approve }) },
    ),

  deleteTransaction: (txId: number) =>
    apiFetch<{ success: boolean }>(`/api/admin/transactions/${txId}`, {
      method: "DELETE",
    }),

  createAdminTransaction: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api/admin/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createAdminCryptoTransaction: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api/admin/crypto-transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  setTransferPin: (currentPassword: string, pin: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/set-transfer-pin", {
      method: "POST",
      body: JSON.stringify({ currentPassword, pin }),
    }),

  setLoginPasscode: (currentPassword: string, passcode: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/set-login-passcode", {
      method: "POST",
      body: JSON.stringify({ currentPassword, passcode }),
    }),

  verifyLoginPasscode: (passcodeToken: string, passcode: string) =>
    apiFetch<{ token: string; user: any }>("/api/auth/verify-login-passcode", {
      method: "POST",
      body: JSON.stringify({ passcodeToken, passcode }),
    }),

  getCryptoWalletInfo: () =>
    apiFetch<{ info: Record<string, string> }>("/api/crypto/wallet-info"),

  // ─── 2FA ──────────────────────────────────────────────────────────────────

  setup2FA: () =>
    apiFetch<{ secret: string; qrCode: string }>("/api/auth/2fa/setup"),

  enable2FA: (code: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  disable2FA: (password: string, code: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ password, code }),
    }),

  verifyLoginOtp: (twoFactorToken: string, code: string) =>
    apiFetch<{ token: string; user: any }>("/api/auth/2fa/verify-login", {
      method: "POST",
      body: JSON.stringify({ twoFactorToken, code }),
    }),

  // ─── Password Reset ────────────────────────────────────────────────────────

  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // ─── Card endpoints ─────────────────────────────────────────────────────

  getUserCard: () => apiFetch<{ card: any | null }>("/api/cards/me"),

  requestCard: (payload: { cardType: "mastercard" | "visa"; accountId: number; address?: string }) =>
    apiFetch<{ success: boolean; status: string; requestId?: number }>("/api/cards/request", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Admin: list and manage user cards
  getAdminCards: () => apiFetch<{ cards: any[] }>("/api/admin/cards"),

  adminUpdateCard: (cardId: number, payload: { action: "freeze" | "unfreeze" | "suspend" | "activate" | "delete" }) =>
    apiFetch<{ success: boolean; status?: string }>(`/api/admin/cards/${cardId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ─── Receipt ──────────────────────────────────────────────────────────────

  getReceiptUrl: (txId: number) =>
    `${API_ROOT}/api/transactions/${txId}/receipt`,
};
