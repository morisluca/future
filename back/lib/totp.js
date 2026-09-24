import { generateSecret as otpGenerateSecret, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
const APP_NAME = "SecureBank";
function generateTotpSecret() {
  return otpGenerateSecret();
}
function verifyTotpCode(secret, code) {
  try {
    const result = verifySync({ secret, token: code, strategy: "totp" });
    return result === true;
  } catch {
    return false;
  }
}
async function getTotpQrCode(email, secret) {
  const uri = generateURI({ strategy: "totp", issuer: APP_NAME, label: email, secret });
  return QRCode.toDataURL(uri);
}
export {
  generateTotpSecret,
  getTotpQrCode,
  verifyTotpCode
};
//# sourceMappingURL=totp.js.map
