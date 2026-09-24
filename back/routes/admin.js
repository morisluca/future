import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, accountsTable, transactionsTable, cryptoTransactionsTable, cryptoHoldingsTable, siteSettingsTable, cardsTable } from "../db/index.js";
import { eq, ilike, desc, sql, or, and } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { sendAccountFrozenEmail, sendDepositApprovedEmail, sendWelcomeEmail } from "../lib/email.js";
import { generateAccountNumber, generateWalletAddress } from "../lib/account-numbers.js";
const router = Router();
router.use(authenticate, requireAdmin);
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});
router.put("/settings", async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Invalid settings payload" });
      return;
    }
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue;
      await db.insert(siteSettingsTable).values({ key, value, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: /* @__PURE__ */ new Date() } });
    }
    const rows = await db.select().from(siteSettingsTable);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Failed to update settings" });
  }
});
router.put("/users/:userId/permissions", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { canWithdraw, canTransfer, wireBypassCodes } = req.body;
    if (userId === req.user.userId) {
      res.status(400).json({ error: "Cannot modify your own permissions" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (typeof canWithdraw === "boolean") updates.canWithdraw = canWithdraw;
    if (typeof canTransfer === "boolean") updates.canTransfer = canTransfer;
    if (typeof wireBypassCodes === "boolean") updates.wireBypassCodes = wireBypassCodes;
    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    res.json({ success: true, userId, canWithdraw, canTransfer, wireBypassCodes });
  } catch (err) {
    req.log.error({ err }, "Update user permissions error");
    res.status(500).json({ error: "Failed to update permissions" });
  }
});
router.get("/users", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;
    const whereClause = search ? or(
      ilike(usersTable.email, `%${search}%`),
      ilike(usersTable.firstName, `%${search}%`),
      ilike(usersTable.lastName, `%${search}%`)
    ) : void 0;
    const [countResult] = await db.select({ count: sql`count(*)` }).from(usersTable).where(whereClause);
    const users = await db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
    const usersWithAccounts = await Promise.all(
      users.map(async (user) => {
        const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, user.id));
        const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profileImageUrl: user.profileImageUrl ?? null,
          role: user.role,
          status: user.status,
          canWithdraw: user.canWithdraw,
          canTransfer: user.canTransfer,
          wireBypassCodes: user.wireBypassCodes,
          hasTransferPin: !!user.transferPin,
          totalBalance,
          createdAt: user.createdAt.toISOString(),
          accounts: accounts.map((a) => ({
            id: a.id,
            accountNumber: a.accountNumber,
            accountType: a.accountType,
            balance: parseFloat(a.balance),
            currency: a.currency,
            status: a.status,
            createdAt: a.createdAt.toISOString()
          }))
        };
      })
    );
    res.json({ users: usersWithAccounts, total: Number(countResult.count) });
  } catch (err) {
    req.log.error({ err }, "Admin get users error");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
router.post("/users", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, profileImageUrl } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const walletAddress = generateWalletAddress("ETH");
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      profileImageUrl: profileImageUrl || null,
      role: "user",
      status: "active",
      walletAddress
    }).returning();
    await db.insert(accountsTable).values([
      { userId: user.id, accountNumber: generateAccountNumber(), accountType: "checking", balance: "1000.00", currency: "USD", status: "active" },
      { userId: user.id, accountNumber: generateAccountNumber(), accountType: "savings", balance: "5000.00", currency: "USD", status: "active" }
    ]);
    sendWelcomeEmail(user.email, user.firstName).catch(() => {
    });
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl ?? null,
        role: user.role,
        status: user.status,
        canWithdraw: user.canWithdraw,
        canTransfer: user.canTransfer,
        wireBypassCodes: user.wireBypassCodes,
        hasTransferPin: !!user.transferPin,
        createdAt: user.createdAt.toISOString()
      }
    });
  } catch (err) {
    req.log.error({ err }, "Admin create user error");
    res.status(500).json({ error: "Failed to create user" });
  }
});
router.delete("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    if (userId === req.user.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db.delete(accountsTable).where(eq(accountsTable.userId, userId));
    await db.delete(transactionsTable).where(eq(transactionsTable.accountId, userId));
    await db.delete(cryptoTransactionsTable).where(eq(cryptoTransactionsTable.userId, userId));
    await db.delete(cryptoHoldingsTable).where(eq(cryptoHoldingsTable.userId, userId));
    await db.delete(cardsTable).where(eq(cardsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete user error");
    res.status(500).json({ error: "Failed to delete user" });
  }
});
router.get("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, userId));
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl ?? null,
      role: user.role,
      status: user.status,
      canWithdraw: user.canWithdraw,
      canTransfer: user.canTransfer,
      wireBypassCodes: user.wireBypassCodes,
      hasTransferPin: !!user.transferPin,
      totalBalance,
      createdAt: user.createdAt.toISOString(),
      accounts: accounts.map((a) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        accountType: a.accountType,
        balance: parseFloat(a.balance),
        currency: a.currency,
        status: a.status,
        createdAt: a.createdAt.toISOString()
      }))
    });
  } catch (err) {
    req.log.error({ err }, "Admin get user error");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
router.post("/transactions", async (req, res) => {
  try {
    const {
      userId,
      accountId,
      fromAccountId,
      toAccountId,
      type,
      amount,
      currency,
      description,
      status,
      transferType,
      bankName,
      bankAccountNumber,
      bankAccountName,
      metadata,
      createdAt
    } = req.body;
    if (!userId || !type || !amount || amount <= 0) {
      res.status(400).json({ error: "Invalid transaction payload" });
      return;
    }
    const validTypes = ["deposit", "withdrawal", "transfer_out"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: "Unsupported transaction type" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const txStatus = status === "pending" ? "pending" : status === "failed" ? "failed" : "completed";
    const txDate = createdAt ? new Date(createdAt) : /* @__PURE__ */ new Date();
    if (Number.isNaN(txDate.getTime())) {
      res.status(400).json({ error: "Invalid transaction date" });
      return;
    }
    const baseMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const details = {
      ...baseMetadata,
      transferType: transferType || "local",
      bankName,
      bankAccountNumber,
      bankAccountName
    };
    let txRecord;
    if (type === "deposit") {
      if (!accountId) {
        res.status(400).json({ error: "Account ID is required for deposits" });
        return;
      }
      const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId))).limit(1);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }
      const currentBalance = parseFloat(account.balance);
      const depositAmount = parseFloat(amount);
      let balanceAfter = currentBalance;
      if (txStatus === "completed") {
        balanceAfter = currentBalance + depositAmount;
        await db.update(accountsTable).set({ balance: balanceAfter.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
      }
      [txRecord] = await db.insert(transactionsTable).values({
        accountId: account.id,
        type: "deposit",
        amount: depositAmount.toFixed(2),
        currency: currency || account.currency,
        description: description || "Admin deposit",
        status: txStatus,
        balanceAfter: txStatus === "completed" ? balanceAfter.toFixed(2) : account.balance,
        metadata: JSON.stringify(details),
        createdAt: txDate
      }).returning();
    } else if (type === "withdrawal") {
      if (!accountId) {
        res.status(400).json({ error: "Account ID is required for withdrawals" });
        return;
      }
      const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId))).limit(1);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }
      if (txStatus !== "completed") {
        res.status(400).json({ error: "Withdrawals must be completed or failed" });
        return;
      }
      const currentBalance = parseFloat(account.balance);
      const withdrawalAmount = parseFloat(amount);
      if (currentBalance < withdrawalAmount) {
        res.status(400).json({ error: "Insufficient funds" });
        return;
      }
      const balanceAfter = currentBalance - withdrawalAmount;
      await db.update(accountsTable).set({ balance: balanceAfter.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
      [txRecord] = await db.insert(transactionsTable).values({
        accountId: account.id,
        type: "withdrawal",
        amount: withdrawalAmount.toFixed(2),
        currency: currency || account.currency,
        description: description || "Admin withdrawal",
        status: txStatus,
        balanceAfter: balanceAfter.toFixed(2),
        metadata: JSON.stringify(details),
        createdAt: txDate
      }).returning();
    } else {
      if (!fromAccountId || !amount) {
        res.status(400).json({ error: "Source account and amount are required for transfers" });
        return;
      }
      const [fromAccount] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, fromAccountId), eq(accountsTable.userId, userId))).limit(1);
      if (!fromAccount) {
        res.status(404).json({ error: "Source account not found" });
        return;
      }
      const transferAmount = parseFloat(amount);
      const currentFromBalance = parseFloat(fromAccount.balance);
      const outgoingBalance = currentFromBalance - transferAmount;
      if (txStatus !== "failed" && outgoingBalance < 0) {
        res.status(400).json({ error: "Insufficient funds" });
        return;
      }
      if (txStatus !== "failed") {
        await db.update(accountsTable).set({ balance: outgoingBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, fromAccount.id));
      }
      const [tx] = await db.insert(transactionsTable).values({
        accountId: fromAccount.id,
        fromAccountId: fromAccount.id,
        toAccountId: toAccountId || null,
        type: "transfer_out",
        amount: transferAmount.toFixed(2),
        currency: currency || fromAccount.currency,
        description: description || `Admin ${transferType || "local"} transfer`,
        status: txStatus,
        balanceAfter: txStatus === "failed" ? null : outgoingBalance.toFixed(2),
        metadata: JSON.stringify(details),
        createdAt: txDate
      }).returning();
      txRecord = tx;
      if (txStatus === "completed" && toAccountId) {
        const [toAccount] = await db.select().from(accountsTable).where(eq(accountsTable.id, toAccountId)).limit(1);
        if (toAccount) {
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
            metadata: JSON.stringify(details),
            createdAt: txDate
          });
        }
      }
    }
    res.json({
      id: txRecord.id,
      type: txRecord.type,
      amount: parseFloat(txRecord.amount),
      currency: txRecord.currency,
      description: txRecord.description,
      status: txRecord.status,
      createdAt: txRecord.createdAt.toISOString(),
      accountId: txRecord.accountId,
      fromAccountId: txRecord.fromAccountId,
      toAccountId: txRecord.toAccountId,
      balanceAfter: txRecord.balanceAfter ? parseFloat(txRecord.balanceAfter) : null,
      metadata: txRecord.metadata ? JSON.parse(txRecord.metadata) : null
    });
  } catch (err) {
    req.log.error({ err }, "Admin create transaction error");
    res.status(500).json({ error: "Failed to create transaction" });
  }
});
router.get("/cards", async (req, res) => {
  try {
    const rows = await db.select().from(cardsTable).orderBy(desc(cardsTable.createdAt));
    const cards = await Promise.all(rows.map(async (c) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId)).limit(1);
      const expiry = (() => {
        const dt = new Date(c.createdAt);
        dt.setFullYear(dt.getFullYear() + 3);
        return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
      })();
      const cvc = c.cardNumber ? c.cardNumber.slice(-3) : null;
      return {
        id: c.id,
        userId: c.userId,
        userEmail: user?.email ?? null,
        cardNumber: c.cardNumber,
        cardType: c.cardType,
        status: c.status,
        holderName: c.holderName,
        shippingAddress: c.shippingAddress,
        createdAt: c.createdAt.toISOString(),
        expiry,
        cvc
      };
    }));
    res.json({ cards });
  } catch (err) {
    req.log.error({ err }, "Admin get cards error");
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});
router.post("/cards/:cardId", async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const { action } = req.body;
    if (!action) {
      res.status(400).json({ error: "Action required" });
      return;
    }
    const [card] = await db.select().from(cardsTable).where(eq(cardsTable.id, cardId)).limit(1);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    if (action === "activate") {
      const gen = () => Array.from({ length: 16 }).map(() => Math.floor(Math.random() * 10)).join("");
      const cardNumber = gen();
      await db.update(cardsTable).set({ status: "active", cardNumber, updatedAt: /* @__PURE__ */ new Date() }).where(eq(cardsTable.id, cardId));
      res.json({ success: true, status: "active", cardNumber });
      return;
    }
    if (action === "freeze") {
      await db.update(cardsTable).set({ status: "frozen", updatedAt: /* @__PURE__ */ new Date() }).where(eq(cardsTable.id, cardId));
      res.json({ success: true, status: "frozen" });
      return;
    }
    if (action === "unfreeze") {
      await db.update(cardsTable).set({ status: "active", updatedAt: /* @__PURE__ */ new Date() }).where(eq(cardsTable.id, cardId));
      res.json({ success: true, status: "active" });
      return;
    }
    if (action === "suspend") {
      await db.update(cardsTable).set({ status: "suspended", updatedAt: /* @__PURE__ */ new Date() }).where(eq(cardsTable.id, cardId));
      res.json({ success: true, status: "suspended" });
      return;
    }
    if (action === "delete") {
      await db.update(cardsTable).set({ status: "deleted", updatedAt: /* @__PURE__ */ new Date() }).where(eq(cardsTable.id, cardId));
      res.json({ success: true, status: "deleted" });
      return;
    }
    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    req.log.error({ err }, "Admin card action error");
    res.status(500).json({ error: "Failed to perform action" });
  }
});
router.post("/crypto-transactions", async (req, res) => {
  try {
    const {
      userId,
      type,
      symbol,
      cryptoAmount,
      usdAmount,
      price,
      accountId,
      toWalletAddress,
      status,
      createdAt
    } = req.body;
    const validTypes = ["buy", "sell", "send", "receive"];
    if (!userId || !type || !symbol || !cryptoAmount || !usdAmount || !price || !validTypes.includes(type)) {
      res.status(400).json({ error: "Invalid crypto transaction payload" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const txStatus = status === "pending" ? "pending" : status === "failed" ? "failed" : "completed";
    const txDate = createdAt ? new Date(createdAt) : /* @__PURE__ */ new Date();
    if (Number.isNaN(txDate.getTime())) {
      res.status(400).json({ error: "Invalid transaction date" });
      return;
    }
    const upperSymbol = String(symbol).toUpperCase();
    const amountCrypto = parseFloat(cryptoAmount);
    const amountUsd = parseFloat(usdAmount);
    const unitPrice = parseFloat(price);
    if (amountCrypto <= 0 || amountUsd <= 0 || unitPrice <= 0) {
      res.status(400).json({ error: "Crypto amounts must be positive" });
      return;
    }
    let account = null;
    if (type === "buy" || type === "sell") {
      if (!accountId) {
        res.status(400).json({ error: "Account ID is required for crypto buy/sell" });
        return;
      }
      account = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId))).limit(1).then((rows) => rows[0]);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }
      if (account.status === "frozen") {
        res.status(400).json({ error: "Account is frozen" });
        return;
      }
    }
    const [holding] = await db.select().from(cryptoHoldingsTable).where(and(eq(cryptoHoldingsTable.userId, userId), eq(cryptoHoldingsTable.symbol, upperSymbol))).limit(1);
    if (txStatus === "completed") {
      if (type === "buy") {
        const balance = parseFloat(account.balance);
        if (balance < amountUsd) {
          res.status(400).json({ error: "Insufficient account funds for crypto purchase" });
          return;
        }
        await db.update(accountsTable).set({ balance: (balance - amountUsd).toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
      }
      if (type === "sell") {
        const holdingAmount = holding ? parseFloat(holding.amount) : 0;
        if (holdingAmount < amountCrypto) {
          res.status(400).json({ error: "Insufficient crypto holdings to sell" });
          return;
        }
        const balance = parseFloat(account.balance);
        await db.update(accountsTable).set({ balance: (balance + amountUsd).toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
      }
      if (type === "send") {
        const holdingAmount = holding ? parseFloat(holding.amount) : 0;
        if (holdingAmount < amountCrypto) {
          res.status(400).json({ error: "Insufficient crypto holdings to send" });
          return;
        }
      }
      if (type === "receive" || type === "buy") {
        const newAmount = (holding ? parseFloat(holding.amount) : 0) + amountCrypto;
        if (holding) {
          await db.update(cryptoHoldingsTable).set({ amount: newAmount.toFixed(8), updatedAt: /* @__PURE__ */ new Date() }).where(eq(cryptoHoldingsTable.id, holding.id));
        } else {
          await db.insert(cryptoHoldingsTable).values({
            userId,
            symbol: upperSymbol,
            name: upperSymbol,
            amount: amountCrypto.toFixed(8),
            avgBuyPrice: unitPrice.toFixed(2)
          });
        }
      }
      if (type === "sell" || type === "send") {
        const newAmount = (holding ? parseFloat(holding.amount) : 0) - amountCrypto;
        await db.update(cryptoHoldingsTable).set({ amount: newAmount.toFixed(8), updatedAt: /* @__PURE__ */ new Date() }).where(eq(cryptoHoldingsTable.id, holding?.id));
      }
    }
    const [tx] = await db.insert(cryptoTransactionsTable).values({
      userId,
      type,
      symbol: upperSymbol,
      cryptoAmount: amountCrypto.toFixed(8),
      usdAmount: amountUsd.toFixed(2),
      price: unitPrice.toFixed(2),
      status: txStatus,
      toWalletAddress: toWalletAddress || null,
      createdAt: txDate
    }).returning();
    res.json({
      id: tx.id,
      type: tx.type,
      symbol: tx.symbol,
      cryptoAmount: parseFloat(tx.cryptoAmount),
      usdAmount: parseFloat(tx.usdAmount),
      price: parseFloat(tx.price),
      status: tx.status,
      toWalletAddress: tx.toWalletAddress,
      createdAt: tx.createdAt.toISOString()
    });
  } catch (err) {
    req.log.error({ err }, "Admin create crypto transaction error");
    res.status(500).json({ error: "Failed to create crypto transaction" });
  }
});
router.post("/users/:userId/freeze", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { freeze } = req.body;
    if (userId === req.user.userId) {
      res.status(400).json({ error: "Cannot freeze your own account" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const newStatus = freeze ? "frozen" : "active";
    await db.update(usersTable).set({ status: newStatus, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, userId));
    sendAccountFrozenEmail(user.email, user.firstName, freeze).catch(() => {
    });
    res.json({ success: true, userId, status: newStatus });
  } catch (err) {
    req.log.error({ err }, "Freeze user error");
    res.status(500).json({ error: "Failed to update user status" });
  }
});
router.get("/transactions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const [countResult] = await db.select({ count: sql`count(*)` }).from(transactionsTable);
    const txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset);
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
    req.log.error({ err }, "Admin get transactions error");
    res.status(500).json({ error: "Failed to fetch admin transactions" });
  }
});
router.delete("/transactions/:txId", async (req, res) => {
  try {
    const txId = parseInt(req.params.txId);
    if (!Number.isFinite(txId)) {
      res.status(400).json({ error: "Invalid transaction id" });
      return;
    }
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    await db.delete(transactionsTable).where(eq(transactionsTable.id, txId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete transaction error");
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});
router.get("/pending-transfers", async (req, res) => {
  try {
    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "pending")).orderBy(desc(transactionsTable.createdAt));
    res.json({
      transfers: txs.map((t) => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        description: t.description,
        status: t.status,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
        createdAt: t.createdAt.toISOString(),
        accountId: t.accountId,
        fromAccountId: t.fromAccountId,
        toAccountId: t.toAccountId
      }))
    });
  } catch (err) {
    req.log.error({ err }, "Pending transfers error");
    res.status(500).json({ error: "Failed to fetch pending transfers" });
  }
});
router.post("/transfers/:txId/approve", async (req, res) => {
  try {
    const txId = parseInt(req.params.txId);
    const { approve } = req.body;
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
    if (!tx || tx.status !== "pending") {
      res.status(404).json({ error: "Pending transfer not found" });
      return;
    }
    if (!approve) {
      await db.update(transactionsTable).set({ status: "failed" }).where(eq(transactionsTable.id, txId));
      if (tx.fromAccountId) {
        const [fromAcc] = await db.select().from(accountsTable).where(eq(accountsTable.id, tx.fromAccountId)).limit(1);
        if (fromAcc) {
          const restored = parseFloat(fromAcc.balance) + parseFloat(tx.amount);
          await db.update(accountsTable).set({ balance: restored.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, tx.fromAccountId));
        }
      }
      res.json({ success: true, status: "rejected" });
      return;
    }
    if (tx.type === "deposit") {
      const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, tx.accountId)).limit(1);
      if (account) {
        const newBal = parseFloat(account.balance) + parseFloat(tx.amount);
        await db.update(accountsTable).set({ balance: newBal.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
        await db.update(transactionsTable).set({ status: "completed", balanceAfter: newBal.toFixed(2) }).where(eq(transactionsTable.id, txId));
      } else {
        await db.update(transactionsTable).set({ status: "completed" }).where(eq(transactionsTable.id, txId));
      }
    } else {
      await db.update(transactionsTable).set({ status: "completed" }).where(eq(transactionsTable.id, txId));
    }
    if (tx.type === "transfer_out" && tx.toAccountId) {
      const [toAcc] = await db.select().from(accountsTable).where(eq(accountsTable.id, tx.toAccountId)).limit(1);
      if (toAcc) {
        const newBal = parseFloat(toAcc.balance) + parseFloat(tx.amount);
        await db.update(accountsTable).set({ balance: newBal.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, tx.toAccountId));
        await db.insert(transactionsTable).values({
          accountId: tx.toAccountId,
          fromAccountId: tx.fromAccountId,
          toAccountId: tx.toAccountId,
          type: "transfer_in",
          amount: tx.amount,
          currency: tx.currency,
          description: `Transfer approved`,
          status: "completed",
          balanceAfter: newBal.toFixed(2)
        });
      }
    }
    if (tx.type === "deposit") {
      const [txAccount] = await db.select().from(accountsTable).where(eq(accountsTable.id, tx.accountId)).limit(1);
      if (txAccount) {
        const [txUser] = await db.select().from(usersTable).where(eq(usersTable.id, txAccount.userId)).limit(1);
        if (txUser) {
          sendDepositApprovedEmail(txUser.email, txUser.firstName, parseFloat(tx.amount), txAccount.accountNumber).catch(() => {
          });
        }
      }
    }
    res.json({ success: true, status: "approved" });
  } catch (err) {
    req.log.error({ err }, "Approve transfer error");
    res.status(500).json({ error: "Failed to process transfer approval" });
  }
});
router.get("/stats", async (req, res) => {
  try {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [totalUsersResult] = await db.select({ count: sql`count(*)` }).from(usersTable);
    const [activeUsersResult] = await db.select({ count: sql`count(*)` }).from(usersTable).where(eq(usersTable.status, "active"));
    const [frozenUsersResult] = await db.select({ count: sql`count(*)` }).from(usersTable).where(eq(usersTable.status, "frozen"));
    const [newUsersTodayResult] = await db.select({ count: sql`count(*)` }).from(usersTable).where(sql`created_at >= ${today}`);
    const [totalTxResult] = await db.select({ count: sql`count(*)` }).from(transactionsTable);
    const [txTodayResult] = await db.select({ count: sql`count(*)` }).from(transactionsTable).where(sql`created_at >= ${today}`);
    const [depositsResult] = await db.select({ total: sql`COALESCE(sum(amount::numeric), 0)` }).from(transactionsTable).where(eq(transactionsTable.type, "deposit"));
    const [withdrawalsResult] = await db.select({ total: sql`COALESCE(sum(amount::numeric), 0)` }).from(transactionsTable).where(eq(transactionsTable.type, "withdrawal"));
    const [transfersResult] = await db.select({ total: sql`COALESCE(sum(amount::numeric), 0)` }).from(transactionsTable).where(eq(transactionsTable.type, "transfer_out"));
    const [cryptoVolumeResult] = await db.select({ total: sql`COALESCE(sum(usd_amount::numeric), 0)` }).from(cryptoTransactionsTable);
    res.json({
      totalUsers: Number(totalUsersResult.count),
      activeUsers: Number(activeUsersResult.count),
      frozenUsers: Number(frozenUsersResult.count),
      totalTransactions: Number(totalTxResult.count),
      totalDeposits: Number(depositsResult.total),
      totalWithdrawals: Number(withdrawalsResult.total),
      totalTransfers: Number(transfersResult.total),
      totalCryptoVolume: Number(cryptoVolumeResult.total),
      newUsersToday: Number(newUsersTodayResult.count),
      transactionsToday: Number(txTodayResult.count)
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
var admin_default = router;
export {
  admin_default as default
};
//# sourceMappingURL=admin.js.map
