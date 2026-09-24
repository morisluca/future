import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, accountsTable, transactionsTable, usersTable, siteSettingsTable } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";
import { sendTransferNotification } from "../lib/email.js";
const router = Router();
router.use(authenticate);
async function getSetting(key) {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? "";
}
router.post("/", async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountNumber,
      amount,
      description,
      transferType = "local",
      bankName,
      bankAccountNumber,
      bankAccountName,
      imfCode,
      cotCode,
      transferPin
    } = req.body;
    if (!fromAccountId || !amount || amount <= 0) {
      res.status(400).json({ error: "Invalid transfer request" });
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
    if (!user.canTransfer) {
      res.status(403).json({ error: "Transfers are restricted on your account. Please contact support." });
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
    if (transferType === "wire" && !user.wireBypassCodes) {
      const requiredImf = await getSetting("wire_imf_code");
      const requiredCot = await getSetting("wire_cot_code");
      if (requiredImf && imfCode !== requiredImf) {
        res.status(401).json({ error: "Invalid IMF code" });
        return;
      }
      if (requiredCot && cotCode !== requiredCot) {
        res.status(401).json({ error: "Invalid COT code" });
        return;
      }
    }
    const [fromAccount] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, fromAccountId), eq(accountsTable.userId, req.user.userId))).limit(1);
    if (!fromAccount) {
      res.status(404).json({ error: "Source account not found" });
      return;
    }
    if (fromAccount.status === "frozen") {
      res.status(400).json({ error: "Source account is frozen" });
      return;
    }
    const fromBalance = parseFloat(fromAccount.balance);
    const transferAmount = parseFloat(amount);
    if (fromBalance < transferAmount) {
      res.status(400).json({ error: "Insufficient funds" });
      return;
    }
    const autoApprove = await getSetting("transfer_auto_approve") === "true";
    const meta = JSON.stringify({
      transferType,
      bankName,
      bankAccountNumber,
      bankAccountName,
      toAccountNumber: toAccountNumber || bankAccountNumber
    });
    const newFromBalance = fromBalance - transferAmount;
    await db.update(accountsTable).set({ balance: newFromBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, fromAccount.id));
    let toAccount = toAccountNumber ? (await db.select().from(accountsTable).where(eq(accountsTable.accountNumber, toAccountNumber)).limit(1))[0] : null;
    const status = autoApprove ? "completed" : "pending";
    const desc = description || `${transferType.charAt(0).toUpperCase() + transferType.slice(1)} transfer to ${bankAccountName}`;
    const [outTx] = await db.insert(transactionsTable).values({
      accountId: fromAccount.id,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount?.id ?? null,
      type: "transfer_out",
      amount: transferAmount.toFixed(2),
      currency: fromAccount.currency,
      description: desc,
      status,
      balanceAfter: newFromBalance.toFixed(2),
      metadata: meta
    }).returning();
    if (toAccount && autoApprove) {
      const newToBalance = parseFloat(toAccount.balance) + transferAmount;
      await db.update(accountsTable).set({ balance: newToBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, toAccount.id));
      await db.insert(transactionsTable).values({
        accountId: toAccount.id,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        type: "transfer_in",
        amount: transferAmount.toFixed(2),
        currency: toAccount.currency,
        description: `Transfer from ${fromAccount.accountNumber}`,
        status: "completed",
        balanceAfter: newToBalance.toFixed(2),
        metadata: meta
      });
    }
    if (status === "completed") {
      sendTransferNotification(user.email, user.firstName, transferAmount, desc, "sent").catch(() => {
      });
    }
    res.json({
      id: outTx.id,
      type: "transfer_out",
      transferType,
      amount: transferAmount,
      currency: fromAccount.currency,
      description: desc,
      status,
      createdAt: outTx.createdAt.toISOString(),
      fromAccountId: fromAccount.id,
      toAccountId: toAccount?.id ?? null,
      accountId: fromAccount.id,
      balanceAfter: newFromBalance,
      pendingApproval: !autoApprove
    });
  } catch (err) {
    req.log.error({ err }, "Transfer error");
    res.status(500).json({ error: "Transfer failed" });
  }
});
var transfers_default = router;
export {
  transfers_default as default
};
//# sourceMappingURL=transfers.js.map
