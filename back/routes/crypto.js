import { Router } from "express";
import { db, accountsTable, cryptoHoldingsTable, cryptoTransactionsTable, siteSettingsTable } from "../db/index.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";
import { getCryptoPrices, getPrice } from "../lib/crypto-prices.js";
const router = Router();
router.use(authenticate);
router.get("/prices", async (_req, res) => {
  res.json(getCryptoPrices());
});
router.get("/wallet-info", async (_req, res) => {
  try {
    const keys = [
      "crypto_btc_address",
      "crypto_eth_address",
      "crypto_usdt_trc20_address",
      "crypto_usdt_erc20_address",
      "crypto_bnb_address",
      "crypto_deposit_note"
    ];
    const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys));
    const info = {};
    for (const row of rows) info[row.key] = row.value ?? "";
    res.json({ info });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch wallet info" });
  }
});
router.get("/portfolio", async (req, res) => {
  try {
    const userId = req.user.userId;
    const holdings = await db.select().from(cryptoHoldingsTable).where(eq(cryptoHoldingsTable.userId, userId));
    const prices = getCryptoPrices();
    const priceMap = Object.fromEntries(prices.map((p) => [p.symbol, p.price]));
    let totalValue = 0;
    let totalCost = 0;
    const enrichedHoldings = holdings.filter((h) => parseFloat(h.amount) > 0).map((h) => {
      const currentPrice = priceMap[h.symbol] || 0;
      const amount = parseFloat(h.amount);
      const avgBuyPrice = parseFloat(h.avgBuyPrice);
      const value = amount * currentPrice;
      const cost = amount * avgBuyPrice;
      const profitLoss = value - cost;
      const profitLossPercent = cost > 0 ? profitLoss / cost * 100 : 0;
      totalValue += value;
      totalCost += cost;
      return {
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        amount,
        avgBuyPrice,
        currentPrice,
        value,
        profitLoss,
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2))
      };
    });
    res.json({
      holdings: enrichedHoldings,
      totalValue,
      totalProfitLoss: totalValue - totalCost,
      walletAddress: `0x${userId.toString().padStart(4, "0")}abc123def456789`
    });
  } catch (err) {
    req.log.error({ err }, "Get portfolio error");
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});
router.post("/buy", async (req, res) => {
  try {
    const { symbol, amountUsd, accountId } = req.body;
    const userId = req.user.userId;
    if (!symbol || !amountUsd || amountUsd <= 0 || !accountId) {
      res.status(400).json({ error: "Invalid buy request" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId))).limit(1);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (account.status === "frozen") {
      res.status(400).json({ error: "Account is frozen" });
      return;
    }
    const balance = parseFloat(account.balance);
    const usdAmount = parseFloat(amountUsd);
    if (balance < usdAmount) {
      res.status(400).json({ error: "Insufficient funds" });
      return;
    }
    const currentPrice = getPrice(symbol);
    const cryptoAmount = usdAmount / currentPrice;
    const upperSymbol = symbol.toUpperCase();
    const [existingHolding] = await db.select().from(cryptoHoldingsTable).where(and(eq(cryptoHoldingsTable.userId, userId), eq(cryptoHoldingsTable.symbol, upperSymbol))).limit(1);
    await db.update(accountsTable).set({ balance: (balance - usdAmount).toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, accountId));
    if (existingHolding) {
      const oldAmount = parseFloat(existingHolding.amount);
      const oldAvg = parseFloat(existingHolding.avgBuyPrice);
      const newAmount = oldAmount + cryptoAmount;
      const newAvg = (oldAmount * oldAvg + usdAmount) / newAmount;
      await db.update(cryptoHoldingsTable).set({ amount: newAmount.toFixed(8), avgBuyPrice: newAvg.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(cryptoHoldingsTable.id, existingHolding.id));
    } else {
      await db.insert(cryptoHoldingsTable).values({
        userId,
        symbol: upperSymbol,
        name: upperSymbol,
        amount: cryptoAmount.toFixed(8),
        avgBuyPrice: currentPrice.toFixed(2)
      });
    }
    const [tx] = await db.insert(cryptoTransactionsTable).values({
      userId,
      type: "buy",
      symbol: upperSymbol,
      cryptoAmount: cryptoAmount.toFixed(8),
      usdAmount: usdAmount.toFixed(2),
      price: currentPrice.toFixed(2),
      status: "completed"
    }).returning();
    res.json({
      id: tx.id,
      type: tx.type,
      symbol: tx.symbol,
      cryptoAmount: parseFloat(tx.cryptoAmount),
      usdAmount: parseFloat(tx.usdAmount),
      price: parseFloat(tx.price),
      status: tx.status,
      createdAt: tx.createdAt.toISOString()
    });
  } catch (err) {
    req.log.error({ err }, "Buy crypto error");
    res.status(500).json({ error: "Purchase failed" });
  }
});
router.post("/sell", async (req, res) => {
  try {
    const { symbol, cryptoAmount, accountId } = req.body;
    const userId = req.user.userId;
    if (!symbol || !cryptoAmount || cryptoAmount <= 0 || !accountId) {
      res.status(400).json({ error: "Invalid sell request" });
      return;
    }
    const upperSymbol = symbol.toUpperCase();
    const sellAmount = parseFloat(cryptoAmount);
    const [holding] = await db.select().from(cryptoHoldingsTable).where(and(eq(cryptoHoldingsTable.userId, userId), eq(cryptoHoldingsTable.symbol, upperSymbol))).limit(1);
    if (!holding || parseFloat(holding.amount) < sellAmount) {
      res.status(400).json({ error: "Insufficient crypto balance" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId))).limit(1);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (account.status === "frozen") {
      res.status(400).json({ error: "Account is frozen" });
      return;
    }
    const currentPrice = getPrice(upperSymbol);
    const usdAmount = sellAmount * currentPrice;
    const newHoldingAmount = parseFloat(holding.amount) - sellAmount;
    const newBalance = parseFloat(account.balance) + usdAmount;
    await db.update(cryptoHoldingsTable).set({ amount: newHoldingAmount.toFixed(8), updatedAt: /* @__PURE__ */ new Date() }).where(eq(cryptoHoldingsTable.id, holding.id));
    await db.update(accountsTable).set({ balance: newBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, accountId));
    const [tx] = await db.insert(cryptoTransactionsTable).values({
      userId,
      type: "sell",
      symbol: upperSymbol,
      cryptoAmount: sellAmount.toFixed(8),
      usdAmount: usdAmount.toFixed(2),
      price: currentPrice.toFixed(2),
      status: "completed"
    }).returning();
    res.json({
      id: tx.id,
      type: tx.type,
      symbol: tx.symbol,
      cryptoAmount: parseFloat(tx.cryptoAmount),
      usdAmount: parseFloat(tx.usdAmount),
      price: parseFloat(tx.price),
      status: tx.status,
      createdAt: tx.createdAt.toISOString()
    });
  } catch (err) {
    req.log.error({ err }, "Sell crypto error");
    res.status(500).json({ error: "Sale failed" });
  }
});
router.post("/send", async (req, res) => {
  try {
    const { symbol, cryptoAmount, toWalletAddress } = req.body;
    const userId = req.user.userId;
    if (!symbol || !cryptoAmount || cryptoAmount <= 0 || !toWalletAddress) {
      res.status(400).json({ error: "Invalid send request" });
      return;
    }
    const upperSymbol = symbol.toUpperCase();
    const sendAmount = parseFloat(cryptoAmount);
    const [holding] = await db.select().from(cryptoHoldingsTable).where(and(eq(cryptoHoldingsTable.userId, userId), eq(cryptoHoldingsTable.symbol, upperSymbol))).limit(1);
    if (!holding || parseFloat(holding.amount) < sendAmount) {
      res.status(400).json({ error: "Insufficient crypto balance" });
      return;
    }
    const currentPrice = getPrice(upperSymbol);
    const usdAmount = sendAmount * currentPrice;
    const newAmount = parseFloat(holding.amount) - sendAmount;
    await db.update(cryptoHoldingsTable).set({ amount: newAmount.toFixed(8), updatedAt: /* @__PURE__ */ new Date() }).where(eq(cryptoHoldingsTable.id, holding.id));
    const [tx] = await db.insert(cryptoTransactionsTable).values({
      userId,
      type: "send",
      symbol: upperSymbol,
      cryptoAmount: sendAmount.toFixed(8),
      usdAmount: usdAmount.toFixed(2),
      price: currentPrice.toFixed(2),
      status: "completed",
      toWalletAddress
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
    req.log.error({ err }, "Send crypto error");
    res.status(500).json({ error: "Send failed" });
  }
});
router.get("/transactions", async (req, res) => {
  try {
    const userId = req.user.userId;
    const txs = await db.select().from(cryptoTransactionsTable).where(eq(cryptoTransactionsTable.userId, userId)).orderBy(desc(cryptoTransactionsTable.createdAt)).limit(50);
    res.json(
      txs.map((t) => ({
        id: t.id,
        type: t.type,
        symbol: t.symbol,
        cryptoAmount: parseFloat(t.cryptoAmount),
        usdAmount: parseFloat(t.usdAmount),
        price: parseFloat(t.price),
        status: t.status,
        toWalletAddress: t.toWalletAddress,
        createdAt: t.createdAt.toISOString()
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Get crypto transactions error");
    res.status(500).json({ error: "Failed to fetch crypto transactions" });
  }
});
var crypto_default = router;
export {
  crypto_default as default
};
//# sourceMappingURL=crypto.js.map
