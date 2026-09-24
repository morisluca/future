import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
export {
  siteSettingsTable
};
//# sourceMappingURL=settings.js.map
