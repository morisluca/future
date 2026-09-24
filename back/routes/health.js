import { Router } from "express";
import { HealthCheckResponse } from "../api-zod/src/index.js";
import { db, siteSettingsTable } from "../db/index.js";
const router = Router();
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Get public settings error");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});
var health_default = router;
export {
  health_default as default
};
//# sourceMappingURL=health.js.map
