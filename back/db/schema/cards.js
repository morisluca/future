import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
const cardStatusEnum = pgEnum("card_status", ["pending", "active", "frozen", "suspended", "deleted"]);
const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cardNumber: text("card_number"),
  cardType: text("card_type").notNull(),
  status: cardStatusEnum("status").notNull().default("pending"),
  holderName: text("holder_name"),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
export {
  cardStatusEnum,
  cardsTable
};
//# sourceMappingURL=cards.js.map
