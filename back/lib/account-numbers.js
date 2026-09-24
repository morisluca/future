function generateAccountNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  return `SB${timestamp}${random}`;
}
function generateWalletAddress(symbol) {
  const chars = "0123456789abcdef";
  let address = "";
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return symbol === "BTC" ? `1${address.slice(0, 33)}` : `0x${address}`;
}
export {
  generateAccountNumber,
  generateWalletAddress
};
//# sourceMappingURL=account-numbers.js.map
