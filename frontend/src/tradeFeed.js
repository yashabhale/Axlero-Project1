export const MAX_VISIBLE_TRADES = 250;

export function appendTrades(current, incoming, limit = MAX_VISIBLE_TRADES) {
  if (incoming.length === 0) return current;
  return [...incoming].reverse().concat(current).slice(0, limit);
}

export function formatPrice(value) {
  if (value == null || !Number.isFinite(Number(value))) return '--';
  return (Number(value) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}