import { Router } from "express";
import { db, accountsTable, transactionsTable, usersTable, siteSettingsTable, cardsTable } from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";
import { eq, and, desc } from "drizzle-orm";
const router = Router();
router.use(authenticate);
async function getSetting(key) {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? "";
}
router.get("/me", async (req, res) => {
  try {
    const [card] = await db.select().from(cardsTable).where(eq(cardsTable.userId, req.user.userId)).orderBy(desc(cardsTable.createdAt)).limit(1);
    if (!card) return res.json({ card: null });
    const expiry = (() => {
      const dt = new Date(card.createdAt);
      dt.setFullYear(dt.getFullYear() + 3);
      return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
    })();
    res.json({ card: {
      id: card.id,
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      status: card.status,
      holderName: card.holderName,
      shippingAddress: card.shippingAddress,
      createdAt: card.createdAt.toISOString(),
      expiry,
      cvc: card.cardNumber ? card.cardNumber.slice(-3) : void 0
    } });
  } catch (err) {
    req.log.error({ err }, "Get user card error");
    res.status(500).json({ error: "Failed to fetch card" });
  }
});
router.get("/settings", async (req, res) => {
  try {
    const fee = await getSetting("card_processing_fee");
    res.json({ settings: { card_processing_fee: fee } });
  } catch (err) {
    req.log.error({ err }, "Get card settings error");
    res.status(500).json({ error: "Failed to fetch card settings" });
  }
});
router.post("/request", async (req, res) => {
  try {
    const { cardType, accountId, address } = req.body;
    if (!cardType || !accountId) {
      res.status(400).json({ error: "Invalid request payload" });
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
    const feeStr = await getSetting("card_processing_fee");
    const fee = parseFloat(feeStr || "0") || 0;
    if (fee > 0) {
      const current = parseFloat(account.balance);
      if (current < fee) {
        res.status(400).json({ error: "Insufficient funds to cover card processing fee" });
        return;
      }
      const newBalance = current - fee;
      await db.update(accountsTable).set({ balance: newBalance.toFixed(2), updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsTable.id, account.id));
      await db.insert(transactionsTable).values({
        accountId: account.id,
        type: "withdrawal",
        amount: fee.toFixed(2),
        currency: account.currency,
        description: "Card processing fee",
        status: "completed",
        balanceAfter: newBalance.toFixed(2),
        metadata: JSON.stringify({ reason: "card_processing_fee" })
      });
    }
    const [pending] = await db.select().from(cardsTable).where(and(eq(cardsTable.userId, req.user.userId), eq(cardsTable.status, "pending"))).limit(1);
    if (pending) {
      res.json({ success: true, status: "pending", requestId: pending.id });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    const holderName = user ? `${user.firstName} ${user.lastName}`.trim() : null;
    const [card] = await db.insert(cardsTable).values({
      userId: req.user.userId,
      cardType,
      holderName: holderName || null,
      shippingAddress: address || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    res.json({ success: true, status: card.status, requestId: card.id });
  } catch (err) {
    req.log.error({ err }, "Card request error");
    res.status(500).json({ error: "Failed to submit card request" });
  }
});
var cards_default = router;
export {
  cards_default as default
};
//# sourceMappingURL=cards.js.map
