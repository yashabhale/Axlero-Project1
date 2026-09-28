import { describe, expect, it } from 'vitest';
import { appendTrades, formatPrice, MAX_VISIBLE_TRADES } from './tradeFeed.js';

describe('trade feed performance', () => {
  it('bounds retained trades while appending a 50,000-event burst', () => {
    const batch = Array.from({ length: 50_000 }, (_, index) => ({ id: index }));
    const startedAt = performance.now();
    const result = appendTrades([], batch);
    const elapsedMs = performance.now() - startedAt;

    expect(result).toHaveLength(MAX_VISIBLE_TRADES);
    expect(result[0].id).toBe(49_999);
    expect(result.at(-1).id).toBe(49_750);
    console.info(`50,000 incoming events buffered in ${elapsedMs.toFixed(2)} ms`);
  });

  it('formats fixed-point prices for the trade tape', () => {
    expect(formatPrice(101025)).toBe('1,010.25');
    expect(formatPrice(null)).toBe('--');
  });
});