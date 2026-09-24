import { pgTable, text, serial, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
const roleEnum = pgEnum("role", ["user", "admin"]);
const userStatusEnum = pgEnum("user_status", ["active", "frozen"]);
const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  walletAddress: text("wallet_address"),
  canWithdraw: boolean("can_withdraw").notNull().default(true),
  canTransfer: boolean("can_transfer").notNull().default(true),
  wireBypassCodes: boolean("wire_bypass_codes").notNull().default(false),
  transferPin: text("transfer_pin"),
  loginPasscodeHash: text("login_passcode_hash"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export {
  insertUserSchema,
  roleEnum,
  userStatusEnum,
  usersTable
};
//# sourceMappingURL=users.js.map
