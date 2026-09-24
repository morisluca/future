import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, accountsTable, siteSettingsTable } from "../db/index.js";
import { eq } from "drizzle-orm";
import { authenticate, signToken, signTwoFactorToken, signLoginPasscodeToken, verifyTwoFactorToken, verifyLoginPasscodeToken } from "../middlewares/auth.js";
import { generateAccountNumber, generateWalletAddress } from "../lib/account-numbers.js";
import { generateTotpSecret, verifyTotpCode, getTotpQrCode } from "../lib/totp.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail
} from "../lib/email.js";
const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || "http://localhost:5173";
const formatUser = (user) => ({
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
  hasLoginPasscode: !!user.loginPasscodeHash,
  twoFactorEnabled: user.twoFactorEnabled,
  createdAt: user.createdAt.toISOString()
});
router.post("/register", async (req, res) => {
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
      { userId: user.id, accountNumber: generateAccountNumber(), accountType: "checking", balance: "0.00", currency: "USD", status: "active" },
      { userId: user.id, accountNumber: generateAccountNumber(), accountType: "savings", balance: "0.00", currency: "USD", status: "active" }
    ]);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    });
    sendWelcomeEmail(user.email, user.firstName).catch(() => {
    });
    res.status(201).json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Registration failed" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.status === "frozen") {
      res.status(401).json({ error: "Account is frozen. Please contact support." });
      return;
    }
    const [passcodeSetting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "login_passcode_enabled")).limit(1);
    const loginPasscodeEnabled = passcodeSetting?.value !== "false";
    if (loginPasscodeEnabled && user.role !== "admin" && user.loginPasscodeHash) {
      const passcodeToken = signLoginPasscodeToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ requiresPasscode: true, passcodeToken, user: formatUser(user) });
      return;
    }
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const twoFactorToken = signTwoFactorToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ requiresTwoFactor: true, twoFactorToken });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});
router.get("/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
router.post("/set-transfer-pin", authenticate, async (req, res) => {
  try {
    const { currentPassword, pin } = req.body;
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      res.status(400).json({ error: "PIN must be 4\u20136 digits" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    const pinHash = await bcrypt.hash(pin, 10);
    await db.update(usersTable).set({ transferPin: pinHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, req.user.userId));
    res.json({ success: true, message: "Transfer PIN set successfully" });
  } catch (err) {
    req.log.error({ err }, "Set transfer pin error");
    res.status(500).json({ error: "Failed to set transfer PIN" });
  }
});
router.get("/2fa/setup", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.twoFactorEnabled) {
      res.status(400).json({ error: "2FA is already enabled" });
      return;
    }
    const secret = generateTotpSecret();
    await db.update(usersTable).set({ twoFactorSecret: secret, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, user.id));
    const qrCode = await getTotpQrCode(user.email, secret);
    res.json({ secret, qrCode });
  } catch (err) {
    req.log.error({ err }, "2FA setup error");
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
});
router.post("/2fa/enable", authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Verification code required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.twoFactorSecret) {
      res.status(400).json({ error: "Please call /2fa/setup first" });
      return;
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      res.status(401).json({ error: "Invalid verification code" });
      return;
    }
    await db.update(usersTable).set({ twoFactorEnabled: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, user.id));
    res.json({ success: true, message: "Two-factor authentication enabled" });
  } catch (err) {
    req.log.error({ err }, "2FA enable error");
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});
router.post("/2fa/disable", authenticate, async (req, res) => {
  try {
    const { password, code } = req.body;
    if (!password || !code) {
      res.status(400).json({ error: "Password and verification code required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    if (!user.twoFactorSecret || !verifyTotpCode(user.twoFactorSecret, code)) {
      res.status(401).json({ error: "Invalid verification code" });
      return;
    }
    await db.update(usersTable).set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, user.id));
    res.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (err) {
    req.log.error({ err }, "2FA disable error");
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});
router.post("/2fa/verify-login", async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body;
    if (!twoFactorToken || !code) {
      res.status(400).json({ error: "Token and code required" });
      return;
    }
    const payload = verifyTwoFactorToken(twoFactorToken);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired session. Please log in again." });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.twoFactorSecret) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    if (user.status === "frozen") {
      res.status(401).json({ error: "Account is frozen. Please contact support." });
      return;
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      res.status(401).json({ error: "Invalid verification code" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "2FA verify login error");
    res.status(500).json({ error: "Verification failed" });
  }
});
router.post("/verify-login-passcode", async (req, res) => {
  try {
    const { passcodeToken, passcode } = req.body;
    if (!passcodeToken || !passcode) {
      res.status(400).json({ error: "Token and passcode required" });
      return;
    }
    const payload = verifyLoginPasscodeToken(passcodeToken);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired session. Please log in again." });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.loginPasscodeHash) {
      res.status(401).json({ error: "Invalid passcode session" });
      return;
    }
    if (user.status === "frozen") {
      res.status(401).json({ error: "Account is frozen. Please contact support." });
      return;
    }
    const valid = await bcrypt.compare(passcode, user.loginPasscodeHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid passcode" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login passcode verify error");
    res.status(500).json({ error: "Verification failed" });
  }
});
router.post("/set-login-passcode", authenticate, async (req, res) => {
  try {
    const { currentPassword, passcode } = req.body;
    if (!passcode || passcode.length < 4 || passcode.length > 6 || !/^[0-9]+$/.test(passcode)) {
      res.status(400).json({ error: "Passcode must be 4\u20136 digits" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required" });
      return;
    }
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    const passcodeHash = await bcrypt.hash(passcode, 10);
    await db.update(usersTable).set({ loginPasscodeHash: passcodeHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, user.id));
    res.json({ success: true, message: "Login passcode set successfully" });
  } catch (err) {
    req.log.error({ err }, "Set login passcode error");
    res.status(500).json({ error: "Failed to set login passcode" });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1e3);
      await db.update(usersTable).set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(usersTable.id, user.id));
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(() => {
      });
    }
    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Failed to process request" });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password required" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.passwordResetToken, token)).limit(1);
    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < /* @__PURE__ */ new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(usersTable.id, user.id));
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Failed to reset password" });
  }
});
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password required" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect current password" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq(usersTable.id, user.id));
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    res.json({ success: true, message: "Password changed successfully. Please log in again." });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Failed to change password" });
  }
});
var auth_default = router;
export {
  auth_default as default
};
//# sourceMappingURL=auth.js.map
