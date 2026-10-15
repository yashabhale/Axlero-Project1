import { describe, expect, it } from 'vitest';
import { calculateBookSpread, normalizeBookSnapshot } from './OrderBook.jsx';

describe('calculateBookSpread', () => {
  it('selects the best bid and ask and calculates their spread', () => {
    expect(calculateBookSpread({
      bids: [{ price: 100500 }, { price: 101000 }, { price: 99500 }],
      asks: [{ price: 102000 }, { price: 101500 }, { price: 103000 }],
    })).toEqual({
      bestBid: 101000,
      bestAsk: 101500,
      spread: 500,
    });
  });

  it('does not calculate a spread when either side is empty or missing', () => {
    expect(calculateBookSpread({ bids: [], asks: [{ price: 101500 }] })).toEqual({
      bestBid: null,
      bestAsk: 101500,
      spread: null,
    });
    expect(calculateBookSpread({ bids: [{ price: 101000 }] })).toEqual({
      bestBid: 101000,
      bestAsk: null,
      spread: null,
    });
    expect(calculateBookSpread()).toEqual({
      bestBid: null,
      bestAsk: null,
      spread: null,
    });
  });

  it('ignores missing, non-finite, and non-positive prices', () => {
    expect(calculateBookSpread({
      bids: [{}, { price: 'invalid' }, { price: Infinity }, { price: 0 }, { price: true }, { price: Symbol('invalid') }, { price: 100000 }],
      asks: [{ price: NaN }, { price: -1 }, { price: '101000' }],
    })).toEqual({
      bestBid: 100000,
      bestAsk: 101000,
      spread: 1000,
    });

    expect(calculateBookSpread({
      bids: [{ price: 'invalid' }],
      asks: [{ price: 101000 }],
    })).toEqual({
      bestBid: null,
      bestAsk: 101000,
      spread: null,
    });
  });
});

describe('normalizeBookSnapshot', () => {
  it('formats bid and ask maps into sortable price levels', () => {
    const snapshot = {
      bids: {
        100000: [10, 15],
        99000: [5],
      },
      asks: {
        101000: [3],
        102000: [8, 2],
      },
    };

    const normalized = normalizeBookSnapshot(snapshot);

    expect(normalized.bids).toEqual([
      { price: 100000, quantity: 25 },
      { price: 99000, quantity: 5 },
    ]);

    expect(normalized.asks).toEqual([
      { price: 101000, quantity: 3 },
      { price: 102000, quantity: 10 },
    ]);
  });

  it('returns empty arrays when the book is empty', () => {
    expect(normalizeBookSnapshot({ bids: {}, asks: {} })).toEqual({
      bids: [],
      asks: [],
    });
  });

  it('returns empty sides for missing or invalid snapshots', () => {
    expect(normalizeBookSnapshot(null)).toEqual({ bids: [], asks: [] });
    expect(normalizeBookSnapshot({ bids: [null, 5], asks: 'invalid' })).toEqual({
      bids: [],
      asks: [],
    });
  });

  it('drops malformed levels and accepts normalized quantity fields', () => {
    expect(normalizeBookSnapshot({
      bids: [
        null,
        { price: Symbol('invalid'), quantity: 1 },
        { price: 100000, quantities: [2, 'invalid'] },
        { price: '99000', quantity: '3' },
      ],
      asks: [[101000, [4, 5]]],
    })).toEqual({
      bids: [{ price: 99000, quantity: 3 }],
      asks: [{ price: 101000, quantity: 9 }],
    });
  });
});
