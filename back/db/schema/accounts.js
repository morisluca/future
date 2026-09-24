import { pgTable, text, serial, timestamp, numeric, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users.js";
const accountTypeEnum = pgEnum("account_type", ["checking", "savings"]);
const accountStatusEnum = pgEnum("account_status", ["active", "frozen"]);
const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  accountNumber: text("account_number").notNull().unique(),
  accountType: accountTypeEnum("account_type").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("USD"),
  status: accountStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export {
  accountStatusEnum,
  accountTypeEnum,
  accountsTable,
  insertAccountSchema
};
//# sourceMappingURL=accounts.js.map
