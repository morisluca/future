import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "securebank-jwt-secret-change-in-production";
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
function signPendingToken(payload, type) {
  return jwt.sign({ ...payload, type }, JWT_SECRET, { expiresIn: "5m" });
}
function verifyPendingToken(token, type) {
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p.type !== type) return null;
    return { userId: p.userId, email: p.email, role: p.role };
  } catch {
    return null;
  }
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function signTwoFactorToken(payload) {
  return signPendingToken(payload, "2fa_pending");
}
function signLoginPasscodeToken(payload) {
  return signPendingToken(payload, "login_passcode_pending");
}
function verifyTwoFactorToken(token) {
  const payload = verifyPendingToken(token, "2fa_pending");
  if (!payload) return null;
  return { ...payload, type: "2fa_pending" };
}
function verifyLoginPasscodeToken(token) {
  return verifyPendingToken(token, "login_passcode_pending");
}
export {
  authenticate,
  requireAdmin,
  signLoginPasscodeToken,
  signToken,
  signTwoFactorToken,
  verifyLoginPasscodeToken,
  verifyTwoFactorToken
};
//# sourceMappingURL=auth.js.map
