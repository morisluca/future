import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import accountsRouter from "./accounts.js";
import transactionsRouter from "./transactions.js";
import transfersRouter from "./transfers.js";
import cryptoRouter from "./crypto.js";
import cardsRouter from "./cards.js";
import adminRouter from "./admin.js";
const router = Router();
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/accounts", accountsRouter);
router.use("/transactions", transactionsRouter);
router.use("/transfers", transfersRouter);
router.use("/crypto", cryptoRouter);
router.use("/cards", cardsRouter);
router.use("/admin", adminRouter);
var routes_default = router;
export {
  routes_default as default
};
//# sourceMappingURL=index.js.map
