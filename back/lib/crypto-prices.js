const CRYPTO_LIST = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" }
];
const BASE_PRICES = {
  BTC: 65e3,
  ETH: 3500,
  USDT: 1,
  BNB: 400,
  SOL: 150
};
const MARKET_CAPS = {
  BTC: 128e10,
  ETH: 42e10,
  USDT: 11e10,
  BNB: 58e9,
  SOL: 65e9
};
const VOLUMES = {
  BTC: 35e9,
  ETH: 18e9,
  USDT: 85e9,
  BNB: 2e9,
  SOL: 5e9
};
function getSimulatedPrice(symbol) {
  const base = BASE_PRICES[symbol] || 100;
  const hour = Math.floor(Date.now() / (1e3 * 60 * 60));
  const seed = (hour * 1234567 + symbol.charCodeAt(0) * 987) % 1e4;
  const variation = (seed / 1e4 - 0.5) * 0.06;
  return parseFloat((base * (1 + variation)).toFixed(2));
}
function getSimulatedChange(symbol) {
  const hour = Math.floor(Date.now() / (1e3 * 60 * 60 * 24));
  const seed = (hour * 7654321 + symbol.charCodeAt(0) * 123) % 1e4;
  const change = (seed / 1e4 - 0.5) * 8;
  return parseFloat(change.toFixed(2));
}
function getCryptoPrices() {
  return CRYPTO_LIST.map((coin) => {
    const price = getSimulatedPrice(coin.symbol);
    const changePercent = getSimulatedChange(coin.symbol);
    const change24h = parseFloat((price * changePercent / 100).toFixed(2));
    return {
      symbol: coin.symbol,
      name: coin.name,
      price,
      change24h,
      changePercent24h: changePercent,
      marketCap: MARKET_CAPS[coin.symbol] || 0,
      volume24h: VOLUMES[coin.symbol] || 0
    };
  });
}
function getPrice(symbol) {
  return getSimulatedPrice(symbol.toUpperCase());
}
export {
  CRYPTO_LIST,
  getCryptoPrices,
  getPrice
};
//# sourceMappingURL=crypto-prices.js.map
