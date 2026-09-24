import * as zod from "zod";
const HealthCheckResponse = zod.object({
  status: zod.string()
});
const registerBodyPasswordMin = 6;
const RegisterBody = zod.object({
  email: zod.string().email(),
  password: zod.string().min(registerBodyPasswordMin),
  firstName: zod.string(),
  lastName: zod.string(),
  phone: zod.string().optional()
});
const LoginBody = zod.object({
  email: zod.string(),
  password: zod.string()
});
const LoginResponse = zod.object({
  token: zod.string(),
  user: zod.object({
    id: zod.number(),
    email: zod.string(),
    firstName: zod.string(),
    lastName: zod.string(),
    phone: zod.string().optional(),
    role: zod.enum(["user", "admin"]),
    status: zod.enum(["active", "frozen"]),
    createdAt: zod.date()
  })
});
const LogoutResponse = zod.object({
  message: zod.string()
});
const GetMeResponse = zod.object({
  id: zod.number(),
  email: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
  phone: zod.string().optional(),
  role: zod.enum(["user", "admin"]),
  status: zod.enum(["active", "frozen"]),
  createdAt: zod.date()
});
const GetAccountsResponseItem = zod.object({
  id: zod.number(),
  accountNumber: zod.string(),
  accountType: zod.enum(["checking", "savings"]),
  balance: zod.number(),
  currency: zod.string(),
  status: zod.enum(["active", "frozen"]),
  createdAt: zod.date()
});
const GetAccountsResponse = zod.array(GetAccountsResponseItem);
const GetAccountParams = zod.object({
  accountId: zod.coerce.number()
});
const GetAccountResponse = zod.object({
  id: zod.number(),
  accountNumber: zod.string(),
  accountType: zod.enum(["checking", "savings"]),
  balance: zod.number(),
  currency: zod.string(),
  status: zod.enum(["active", "frozen"]),
  createdAt: zod.date()
});
const getTransactionsQueryLimitDefault = 20;
const getTransactionsQueryOffsetDefault = 0;
const GetTransactionsQueryParams = zod.object({
  accountId: zod.coerce.number().optional(),
  limit: zod.coerce.number().default(getTransactionsQueryLimitDefault),
  offset: zod.coerce.number().default(getTransactionsQueryOffsetDefault)
});
const GetTransactionsResponse = zod.object({
  transactions: zod.array(
    zod.object({
      id: zod.number(),
      type: zod.enum(["deposit", "withdrawal", "transfer_in", "transfer_out"]),
      amount: zod.number(),
      currency: zod.string(),
      description: zod.string().optional(),
      status: zod.enum(["pending", "completed", "failed"]),
      createdAt: zod.date(),
      fromAccountId: zod.number().optional(),
      toAccountId: zod.number().optional(),
      accountId: zod.number().optional(),
      balanceAfter: zod.number().optional()
    })
  ),
  total: zod.number()
});
const DepositBody = zod.object({
  accountId: zod.number(),
  amount: zod.number(),
  description: zod.string().optional()
});
const DepositResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["deposit", "withdrawal", "transfer_in", "transfer_out"]),
  amount: zod.number(),
  currency: zod.string(),
  description: zod.string().optional(),
  status: zod.enum(["pending", "completed", "failed"]),
  createdAt: zod.date(),
  fromAccountId: zod.number().optional(),
  toAccountId: zod.number().optional(),
  accountId: zod.number().optional(),
  balanceAfter: zod.number().optional()
});
const WithdrawBody = zod.object({
  accountId: zod.number(),
  amount: zod.number(),
  description: zod.string().optional()
});
const WithdrawResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["deposit", "withdrawal", "transfer_in", "transfer_out"]),
  amount: zod.number(),
  currency: zod.string(),
  description: zod.string().optional(),
  status: zod.enum(["pending", "completed", "failed"]),
  createdAt: zod.date(),
  fromAccountId: zod.number().optional(),
  toAccountId: zod.number().optional(),
  accountId: zod.number().optional(),
  balanceAfter: zod.number().optional()
});
const TransferBody = zod.object({
  fromAccountId: zod.number(),
  toAccountNumber: zod.string(),
  amount: zod.number(),
  description: zod.string().optional()
});
const TransferResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["deposit", "withdrawal", "transfer_in", "transfer_out"]),
  amount: zod.number(),
  currency: zod.string(),
  description: zod.string().optional(),
  status: zod.enum(["pending", "completed", "failed"]),
  createdAt: zod.date(),
  fromAccountId: zod.number().optional(),
  toAccountId: zod.number().optional(),
  accountId: zod.number().optional(),
  balanceAfter: zod.number().optional()
});
const GetCryptoPortfolioResponse = zod.object({
  holdings: zod.array(
    zod.object({
      id: zod.number(),
      symbol: zod.string(),
      name: zod.string(),
      amount: zod.number(),
      avgBuyPrice: zod.number(),
      currentPrice: zod.number(),
      value: zod.number(),
      profitLoss: zod.number(),
      profitLossPercent: zod.number()
    })
  ),
  totalValue: zod.number(),
  totalProfitLoss: zod.number(),
  walletAddress: zod.string()
});
const BuyCryptoBody = zod.object({
  symbol: zod.string(),
  amountUsd: zod.number(),
  accountId: zod.number()
});
const BuyCryptoResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["buy", "sell", "send", "receive"]),
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  usdAmount: zod.number(),
  price: zod.number(),
  status: zod.enum(["pending", "completed", "failed"]),
  toWalletAddress: zod.string().optional(),
  createdAt: zod.date()
});
const SellCryptoBody = zod.object({
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  accountId: zod.number()
});
const SellCryptoResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["buy", "sell", "send", "receive"]),
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  usdAmount: zod.number(),
  price: zod.number(),
  status: zod.enum(["pending", "completed", "failed"]),
  toWalletAddress: zod.string().optional(),
  createdAt: zod.date()
});
const SendCryptoBody = zod.object({
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  toWalletAddress: zod.string()
});
const SendCryptoResponse = zod.object({
  id: zod.number(),
  type: zod.enum(["buy", "sell", "send", "receive"]),
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  usdAmount: zod.number(),
  price: zod.number(),
  status: zod.enum(["pending", "completed", "failed"]),
  toWalletAddress: zod.string().optional(),
  createdAt: zod.date()
});
const GetCryptoPricesResponseItem = zod.object({
  symbol: zod.string(),
  name: zod.string(),
  price: zod.number(),
  change24h: zod.number(),
  changePercent24h: zod.number(),
  marketCap: zod.number().optional(),
  volume24h: zod.number().optional()
});
const GetCryptoPricesResponse = zod.array(GetCryptoPricesResponseItem);
const GetCryptoTransactionsResponseItem = zod.object({
  id: zod.number(),
  type: zod.enum(["buy", "sell", "send", "receive"]),
  symbol: zod.string(),
  cryptoAmount: zod.number(),
  usdAmount: zod.number(),
  price: zod.number(),
  status: zod.enum(["pending", "completed", "failed"]),
  toWalletAddress: zod.string().optional(),
  createdAt: zod.date()
});
const GetCryptoTransactionsResponse = zod.array(
  GetCryptoTransactionsResponseItem
);
const adminGetUsersQueryLimitDefault = 20;
const adminGetUsersQueryOffsetDefault = 0;
const AdminGetUsersQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  limit: zod.coerce.number().default(adminGetUsersQueryLimitDefault),
  offset: zod.coerce.number().default(adminGetUsersQueryOffsetDefault)
});
const AdminGetUsersResponse = zod.object({
  users: zod.array(
    zod.object({
      id: zod.number(),
      email: zod.string(),
      firstName: zod.string(),
      lastName: zod.string(),
      phone: zod.string().optional(),
      role: zod.string(),
      status: zod.string(),
      totalBalance: zod.number(),
      createdAt: zod.date(),
      accounts: zod.array(
        zod.object({
          id: zod.number(),
          accountNumber: zod.string(),
          accountType: zod.enum(["checking", "savings"]),
          balance: zod.number(),
          currency: zod.string(),
          status: zod.enum(["active", "frozen"]),
          createdAt: zod.date()
        })
      )
    })
  ),
  total: zod.number()
});
const AdminGetUserParams = zod.object({
  userId: zod.coerce.number()
});
const AdminGetUserResponse = zod.object({
  id: zod.number(),
  email: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
  phone: zod.string().optional(),
  role: zod.string(),
  status: zod.string(),
  totalBalance: zod.number(),
  createdAt: zod.date(),
  accounts: zod.array(
    zod.object({
      id: zod.number(),
      accountNumber: zod.string(),
      accountType: zod.enum(["checking", "savings"]),
      balance: zod.number(),
      currency: zod.string(),
      status: zod.enum(["active", "frozen"]),
      createdAt: zod.date()
    })
  )
});
const AdminFreezeUserParams = zod.object({
  userId: zod.coerce.number()
});
const AdminFreezeUserBody = zod.object({
  freeze: zod.boolean(),
  reason: zod.string().optional()
});
const AdminFreezeUserResponse = zod.object({
  message: zod.string()
});
const adminGetTransactionsQueryLimitDefault = 50;
const adminGetTransactionsQueryOffsetDefault = 0;
const AdminGetTransactionsQueryParams = zod.object({
  limit: zod.coerce.number().default(adminGetTransactionsQueryLimitDefault),
  offset: zod.coerce.number().default(adminGetTransactionsQueryOffsetDefault)
});
const AdminGetTransactionsResponse = zod.object({
  transactions: zod.array(
    zod.object({
      id: zod.number(),
      type: zod.enum(["deposit", "withdrawal", "transfer_in", "transfer_out"]),
      amount: zod.number(),
      currency: zod.string(),
      description: zod.string().optional(),
      status: zod.enum(["pending", "completed", "failed"]),
      createdAt: zod.date(),
      fromAccountId: zod.number().optional(),
      toAccountId: zod.number().optional(),
      accountId: zod.number().optional(),
      balanceAfter: zod.number().optional()
    })
  ),
  total: zod.number()
});
const AdminGetStatsResponse = zod.object({
  totalUsers: zod.number(),
  activeUsers: zod.number(),
  frozenUsers: zod.number(),
  totalTransactions: zod.number(),
  totalDeposits: zod.number(),
  totalWithdrawals: zod.number(),
  totalTransfers: zod.number(),
  totalCryptoVolume: zod.number(),
  newUsersToday: zod.number(),
  transactionsToday: zod.number()
});
export {
  AdminFreezeUserBody,
  AdminFreezeUserParams,
  AdminFreezeUserResponse,
  AdminGetStatsResponse,
  AdminGetTransactionsQueryParams,
  AdminGetTransactionsResponse,
  AdminGetUserParams,
  AdminGetUserResponse,
  AdminGetUsersQueryParams,
  AdminGetUsersResponse,
  BuyCryptoBody,
  BuyCryptoResponse,
  DepositBody,
  DepositResponse,
  GetAccountParams,
  GetAccountResponse,
  GetAccountsResponse,
  GetAccountsResponseItem,
  GetCryptoPortfolioResponse,
  GetCryptoPricesResponse,
  GetCryptoPricesResponseItem,
  GetCryptoTransactionsResponse,
  GetCryptoTransactionsResponseItem,
  GetMeResponse,
  GetTransactionsQueryParams,
  GetTransactionsResponse,
  HealthCheckResponse,
  LoginBody,
  LoginResponse,
  LogoutResponse,
  RegisterBody,
  SellCryptoBody,
  SellCryptoResponse,
  SendCryptoBody,
  SendCryptoResponse,
  TransferBody,
  TransferResponse,
  WithdrawBody,
  WithdrawResponse,
  adminGetTransactionsQueryLimitDefault,
  adminGetTransactionsQueryOffsetDefault,
  adminGetUsersQueryLimitDefault,
  adminGetUsersQueryOffsetDefault,
  getTransactionsQueryLimitDefault,
  getTransactionsQueryOffsetDefault,
  registerBodyPasswordMin
};
//# sourceMappingURL=api.js.map
