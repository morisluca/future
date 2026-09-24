import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, accountsTable, transactionsTable, usersTable, siteSettingsTable } from "../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";
import { sendDepositNotification, sendWithdrawalNotification, sendDepositApprovedEmail } from "../lib/email.js";
import { streamReceiptPdf } from "../lib/pdf-receipt.js";
const router = Router();
router.use(authenticate);
async function getSetting(key) {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? "";
}
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const accountId = req.query.accountId ? parseInt(req.query.accountId) : null;
    const userAccounts = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.userId, req.user.userId));
    const accountIds = userAccounts.map((a) => a.id);
    if (accountIds.length === 0) {
      res.json({ transactions: [], total: 0 });
      return;
    }
    const filterAccountId = accountId && accountIds.includes(accountId) ? accountId : null;
    const whereClause = filterAccountId ? eq(transactionsTable.accountId, filterAccountId) : sql`${transactionsTable.accountId} = ANY(ARRAY[${sql.join(accountIds.map((id) => sql`${id}`), sql`, `)}]::integer[])`;
    const [countResult] = await db.select({ count: sql`count(*)` }).from(transactionsTable).where(whereClause);
    const txs = await db.select().from(transactionsTable).where(whereClause).orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset);
    res.json({
      transactions: txs.map((t) => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        description: t.description,
        status: t.status,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
        createdAt: t.createdAt.toISOString(),
        fromAccountId: t.fromAccountId,
        toAccountId: t.toAccountId,
        accountId: t.accountId,
        balanceAfter: t.balanceAfter ? parseFloat(t.balanceAfter) : null
      })),
      total: Number(countResult.count)
    });
  } catch (err) {
    req.log.error({ err }, "Get transactions error");
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
router.get("/deposit-info", async (req, res) => {
  try {
    const keys = ["deposit_bank_name", "deposit_account_number", "deposit_account_name", "deposit_bank_address", "deposit_instructions"];
    const info = {};
    for (const key of keys) {
      info[key] = await getSetting(key);
    }
    res.json({ info });
  } catch (err) {
    req.log.error({ err }, "Deposit info error");
    res.status(500).json({ error: "Failed to fetch deposit info" });
  }
});
router.post("/deposit", async (req, res) => {
  try {
    const { accountId, amount, description, senderBank, senderAccountNumber, senderAccountName } = req.body;
    if (!accountId || !amount || amount <= 0) {
      res.status(400).json({ error: "Invalid deposit request" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, req.user.userId))).limit(1);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (account.status === "frozen") {
      res.status(400).json({ error: "Account is frozen" });
      return;
    }
    const autoApprove = await getSetting("deposit_auto_approve") === "true";
    const status = autoApprove ? "completed" : "pending";
    const newBalance = autoApprove ? parseFloat(account.balance) + parseFloat(amount) : parseFloat(account.balance);
    if (autoApprove) {
      await db.update(accountsTable).set({ balance: newBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, accountId));
    }
    const meta = JSON.stringify({ senderBank, senderAccountNumber, senderAccountName });
    const [tx] = await db.insert(transactionsTable).values({
      accountId,
      type: "deposit",
      amount: parseFloat(amount).toFixed(2),
      currency: account.currency,
      description: description || "Deposit",
      status,
      balanceAfter: autoApprove ? newBalance.toFixed(2) : account.balance,
      metadata: meta
    }).returning();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (user) {
      sendDepositNotification(user.email, user.firstName, parseFloat(amount), status, account.accountNumber).catch(() => {
      });
    }
    res.json({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      accountId: tx.accountId,
      balanceAfter: tx.balanceAfter ? parseFloat(tx.balanceAfter) : null
    });
  } catch (err) {
    req.log.error({ err }, "Deposit error");
    res.status(500).json({ error: "Deposit failed" });
  }
});
router.post("/withdraw", async (req, res) => {
  try {
    const { accountId, amount, description, transferPin, bankName, bankAccountNumber, bankAccountName } = req.body;
    if (!accountId || !amount || amount <= 0) {
      res.status(400).json({ error: "Invalid withdrawal request" });
      return;
    }
    if (!bankName || !bankAccountNumber || !bankAccountName) {
      res.status(400).json({ error: "Recipient bank details are required" });
      return;
    }
    if (!transferPin) {
      res.status(400).json({ error: "Transfer PIN is required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.canWithdraw) {
      res.status(403).json({ error: "Withdrawals are restricted on your account. Please contact support." });
      return;
    }
    if (!user.transferPin) {
      res.status(400).json({ error: "You have not set a transfer PIN. Please set one in your account settings." });
      return;
    }
    const pinValid = await bcrypt.compare(String(transferPin), user.transferPin);
    if (!pinValid) {
      res.status(401).json({ error: "Invalid transfer PIN" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, req.user.userId))).limit(1);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (account.status === "frozen") {
      res.status(400).json({ error: "Account is frozen" });
      return;
    }
    const currentBalance = parseFloat(account.balance);
    if (currentBalance < parseFloat(amount)) {
      res.status(400).json({ error: "Insufficient funds" });
      return;
    }
    const newBalance = currentBalance - parseFloat(amount);
    await db.update(accountsTable).set({ balance: newBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, accountId));
    const meta = JSON.stringify({ bankName, bankAccountNumber, bankAccountName });
    const [tx] = await db.insert(transactionsTable).values({
      accountId,
      type: "withdrawal",
      amount: parseFloat(amount).toFixed(2),
      currency: account.currency,
      description: description || `Withdrawal to ${bankName}`,
      status: "completed",
      balanceAfter: newBalance.toFixed(2),
      metadata: meta
    }).returning();
    sendWithdrawalNotification(user.email, user.firstName, parseFloat(amount), bankName).catch(() => {
    });
    res.json({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      accountId: tx.accountId,
      balanceAfter: parseFloat(tx.balanceAfter)
    });
  } catch (err) {
    req.log.error({ err }, "Withdraw error");
    res.status(500).json({ error: "Withdrawal failed" });
  }
});
router.get("/:id/receipt", async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    if (isNaN(txId)) {
      res.status(400).json({ error: "Invalid transaction ID" });
      return;
    }
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, tx.accountId), eq(accountsTable.userId, req.user.userId))).limit(1);
    if (!account) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const metadata = tx.metadata ? JSON.parse(tx.metadata) : null;
    const bankName = await getSetting("bank_name") || await getSetting("deposit_bank_name") || "SecureBank";
    streamReceiptPdf(res, {
      transactionId: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt,
      balanceAfter: tx.balanceAfter ? parseFloat(tx.balanceAfter) : null,
      accountNumber: account.accountNumber,
      userName: `${user.firstName} ${user.lastName}`,
      bankName,
      metadata
    });
  } catch (err) {
    req.log.error({ err }, "Receipt error");
    res.status(500).json({ error: "Failed to generate receipt" });
  }
});
var transactions_default = router;
export {
  transactions_default as default,
  sendDepositApprovedEmail
};
//# sourceMappingURL=transactions.js.map
