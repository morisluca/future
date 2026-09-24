import { pgTable, text, serial, timestamp, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { accountsTable } from "./accounts.js";
const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out"
]);
const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);
const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accountsTable.id),
  fromAccountId: integer("from_account_id").references(() => accountsTable.id),
  toAccountId: integer("to_account_id").references(() => accountsTable.id),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description"),
  status: transactionStatusEnum("status").notNull().default("completed"),
  balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true
});
export {
  insertTransactionSchema,
  transactionStatusEnum,
  transactionTypeEnum,
  transactionsTable
};
//# sourceMappingURL=transactions.js.map
