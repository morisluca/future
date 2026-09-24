import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
import { usersTable } from "./schema/users.js";
import { accountsTable } from "./schema/accounts.js";
import { transactionsTable } from "./schema/transactions.js";
import { cryptoTransactionsTable, cryptoHoldingsTable } from "./schema/crypto.js";
import { siteSettingsTable } from "./schema/settings.js";
import { cardsTable } from "./schema/cards.js";
export {
  accountsTable,
  cardsTable,
  cryptoHoldingsTable,
  cryptoTransactionsTable,
  db,
  pool,
  siteSettingsTable,
  transactionsTable,
  usersTable
};
//# sourceMappingURL=index.js.map
