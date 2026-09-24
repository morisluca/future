import { Router } from "express";
import { db, accountsTable } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, req.user.userId));
    res.json(
      accounts.map((a) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        accountType: a.accountType,
        balance: parseFloat(a.balance),
        currency: a.currency,
        status: a.status,
        createdAt: a.createdAt.toISOString()
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Get accounts error");
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});
router.get("/:accountId", async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, req.user.userId))).limit(1);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({
      id: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: parseFloat(account.balance),
      currency: account.currency,
      status: account.status,
      createdAt: account.createdAt.toISOString()
    });
  } catch (err) {
    req.log.error({ err }, "Get account error");
    res.status(500).json({ error: "Failed to fetch account" });
  }
});
var accounts_default = router;
export {
  accounts_default as default
};
//# sourceMappingURL=accounts.js.map
