import bcrypt from "bcryptjs";
import { db, usersTable } from "./index.js";
import { eq } from "drizzle-orm";
async function createAdminUser() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
  if (existing.length) {
    console.log("Admin user already exists");
    return;
  }
  if (!existing.length) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(usersTable).values({
      email: "admin@asrsecurebank.com",
      passwordHash,
      firstName: "Admin user",
      lastName: "superadmin",
      phone: null,
      role: "admin",
      status: "active",
      walletAddress: null,
      canWithdraw: true,
      canTransfer: true,
      wireBypassCodes: false,
      transferPin: null,
      loginPasscodeHash: null
    });
  }
}
var bootstrap_default = createAdminUser;
export {
  bootstrap_default as default
};
//# sourceMappingURL=bootstrap.js.map
