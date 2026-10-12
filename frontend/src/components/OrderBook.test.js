import { describe, expect, it } from 'vitest';
import { normalizeBookSnapshot } from './OrderBook.jsx';

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
});
