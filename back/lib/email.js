import nodemailer from "nodemailer";
import { logger } from "./logger.js";
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "Bank <noreply@securebank.com>";
  if (!host || !user || !pass) return null;
  return { transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}
async function sendEmail(to, subject, html) {
  const t = createTransport();
  if (!t) {
    logger.info({ to, subject }, "Email skipped \u2014 SMTP not configured");
    return;
  }
  try {
    await t.transport.sendMail({ from: t.from, to, subject, html });
    logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
  }
}
const base = (body) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#e4e4e7;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px">\u{1F3E6} SecureBank</h1>
  </div>
  <div style="padding:32px">${body}</div>
  <div style="padding:16px 32px;background:#18181b;text-align:center;font-size:12px;color:#71717a">
    SecureBank &mdash; Secure Online Banking &mdash; Do not reply to this email
  </div>
</div>`;
async function sendWelcomeEmail(to, firstName) {
  await sendEmail(to, "Welcome to SecureBank!", base(`
    <h2 style="color:#10b981">Welcome, ${firstName}!</h2>
    <p>Your account has been created successfully. You now have access to your checking and savings accounts.</p>
    <p style="color:#a1a1aa;font-size:14px">If you didn't create this account, please contact support immediately.</p>`));
}
async function sendPasswordResetEmail(to, firstName, resetUrl) {
  await sendEmail(to, "Reset Your SecureBank Password", base(`
    <h2 style="color:#10b981">Password Reset Request</h2>
    <p>Hi ${firstName}, we received a request to reset your password.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${resetUrl}" style="background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Reset Password</a>
    </div>
    <p style="color:#a1a1aa;font-size:13px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>`));
}
async function sendDepositNotification(to, firstName, amount, status, accountNumber) {
  const approved = status === "completed";
  await sendEmail(to, `Deposit ${approved ? "Credited" : "Received"} \u2014 $${amount.toFixed(2)}`, base(`
    <h2 style="color:#10b981">Deposit ${approved ? "Credited" : "Received"}</h2>
    <p>Hi ${firstName},</p>
    <div style="background:#18181b;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#a1a1aa;padding:6px 0">Amount</td><td style="text-align:right;color:#10b981;font-weight:bold;font-size:18px">$${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#a1a1aa;padding:6px 0">Account</td><td style="text-align:right">\u2022\u2022\u2022\u2022${accountNumber.slice(-4)}</td></tr>
        <tr><td style="color:#a1a1aa;padding:6px 0">Status</td><td style="text-align:right;color:${approved ? "#10b981" : "#f59e0b"}">${approved ? "\u2713 Completed" : "\u23F3 Pending Review"}</td></tr>
      </table>
    </div>
    <p style="color:#a1a1aa;font-size:13px">${approved ? "The funds are now available in your account." : "Your deposit is under review and will be credited shortly."}</p>`));
}
async function sendTransferNotification(to, firstName, amount, description, type) {
  const sent = type === "sent";
  await sendEmail(to, `Transfer ${sent ? "Sent" : "Completed"} \u2014 $${amount.toFixed(2)}`, base(`
    <h2 style="color:${sent ? "#f59e0b" : "#10b981"}">Transfer ${sent ? "Processed" : "Completed"}</h2>
    <p>Hi ${firstName},</p>
    <div style="background:#18181b;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#a1a1aa;padding:6px 0">Amount</td><td style="text-align:right;color:#ef4444;font-weight:bold;font-size:18px">-$${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#a1a1aa;padding:6px 0">Reference</td><td style="text-align:right">${description}</td></tr>
      </table>
    </div>`));
}
async function sendWithdrawalNotification(to, firstName, amount, bankName) {
  await sendEmail(to, `Withdrawal Processed \u2014 $${amount.toFixed(2)}`, base(`
    <h2 style="color:#f59e0b">Withdrawal Processed</h2>
    <p>Hi ${firstName},</p>
    <div style="background:#18181b;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#a1a1aa;padding:6px 0">Amount</td><td style="text-align:right;color:#ef4444;font-weight:bold;font-size:18px">-$${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#a1a1aa;padding:6px 0">Destination</td><td style="text-align:right">${bankName}</td></tr>
      </table>
    </div>`));
}
async function sendAccountFrozenEmail(to, firstName, frozen) {
  await sendEmail(to, `Your Account Has Been ${frozen ? "Frozen" : "Reactivated"}`, base(`
    <h2 style="color:${frozen ? "#ef4444" : "#10b981"}">${frozen ? "\u26A0\uFE0F Account Frozen" : "\u2713 Account Reactivated"}</h2>
    <p>Hi ${firstName},</p>
    <p>${frozen ? "Your SecureBank account has been temporarily frozen by our security team. You will not be able to make transactions until it is reactivated." : "Your SecureBank account has been reactivated. You can now log in and perform transactions."}</p>
    <p style="color:#a1a1aa;font-size:13px">If you believe this was a mistake, please contact support.</p>`));
}
async function sendDepositApprovedEmail(to, firstName, amount, accountNumber) {
  await sendDepositNotification(to, firstName, amount, "completed", accountNumber);
}
export {
  sendAccountFrozenEmail,
  sendDepositApprovedEmail,
  sendDepositNotification,
  sendPasswordResetEmail,
  sendTransferNotification,
  sendWelcomeEmail,
  sendWithdrawalNotification
};
//# sourceMappingURL=email.js.map
