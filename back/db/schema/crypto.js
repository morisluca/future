import { pgTable, text, serial, timestamp, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users.js";
const cryptoTxTypeEnum = pgEnum("crypto_tx_type", ["buy", "sell", "send", "receive"]);
const cryptoTxStatusEnum = pgEnum("crypto_tx_status", ["pending", "completed", "failed"]);
const cryptoHoldingsTable = pgTable("crypto_holdings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull().default("0"),
  avgBuyPrice: numeric("avg_buy_price", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const cryptoTransactionsTable = pgTable("crypto_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: cryptoTxTypeEnum("type").notNull(),
  symbol: text("symbol").notNull(),
  cryptoAmount: numeric("crypto_amount", { precision: 20, scale: 8 }).notNull(),
  usdAmount: numeric("usd_amount", { precision: 15, scale: 2 }).notNull(),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  status: cryptoTxStatusEnum("status").notNull().default("completed"),
  toWalletAddress: text("to_wallet_address"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const insertCryptoHoldingSchema = createInsertSchema(cryptoHoldingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
const insertCryptoTransactionSchema = createInsertSchema(cryptoTransactionsTable).omit({
  id: true,
  createdAt: true
});
export {
  cryptoHoldingsTable,
  cryptoTransactionsTable,
  cryptoTxStatusEnum,
  cryptoTxTypeEnum,
  insertCryptoHoldingSchema,
  insertCryptoTransactionSchema
};
//# sourceMappingURL=crypto.js.map
