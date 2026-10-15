import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '../tradeFeed.js';

const API_URL = import.meta.env.VITE_ORDERFLOW_API ?? 'http://localhost:8080';

export function calculateBookSpread(snapshot = {}) {
  const bestPrice = (levels, isBid) => {
    if (!Array.isArray(levels)) return null;

    return levels.reduce((best, level) => {
      const value = level?.price;
      if (typeof value !== 'number' && typeof value !== 'string') return best;

      const price = Number(value);
      if (!Number.isFinite(price) || price <= 0) return best;
      if (best === null) return price;
      return isBid ? Math.max(best, price) : Math.min(best, price);
    }, null);
  };

  const bestBid = bestPrice(snapshot?.bids, true);
  const bestAsk = bestPrice(snapshot?.asks, false);
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

  return {
    bestBid,
    bestAsk,
    spread: Number.isFinite(spread) ? spread : null,
  };
}

export function normalizeBookSnapshot(snapshot = {}) {
  const toFiniteNumber = (value) => {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && value.trim() === '') return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const normalizeSide = (side) => {
    if (!side || typeof side !== 'object') return [];

    const entries = Array.isArray(side)
      ? side
      : Object.entries(side).map(([price, quantities]) => ({
          price,
          quantities,
        }));

    return entries
      .flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];

        const price = toFiniteNumber(entry.price ?? entry[0]);
        const quantitySource = entry.quantities ?? entry.quantity ?? entry[1] ?? 0;
        const quantities = Array.isArray(quantitySource) ? quantitySource : [quantitySource];
        const parsedQuantities = quantities.map(toFiniteNumber);

        if (
          price === null
          || price <= 0
          || parsedQuantities.some((quantity) => quantity === null || quantity < 0)
        ) {
          return [];
        }

        return [{
          price,
          quantity: parsedQuantities.reduce((sum, quantity) => sum + quantity, 0),
        }];
      })
      .sort((left, right) => right.price - left.price);
  };

  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const normalizedBids = normalizeSide(safeSnapshot.bids ?? {});
  const normalizedAsks = normalizeSide(safeSnapshot.asks ?? {});

  return {
    bids: normalizedBids.sort((left, right) => right.price - left.price),
    asks: normalizedAsks.sort((left, right) => left.price - right.price),
  };
}

function OrderBook({ instrument = 'ACME' }) {
  const [snapshot, setSnapshot] = useState({ bids: [], asks: [] });
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Loading order book…');

  useEffect(() => {
    if (!instrument) {
      setStatus('empty');
      setMessage('No instrument selected.');
      return undefined;
    }

    let isMounted = true;

    const loadInitialSnapshot = async () => {
      try {
        setStatus('loading');
        setMessage('Loading order book…');

        const response = await fetch(`${API_URL}/api/book/${encodeURIComponent(instrument)}`);
        if (!response.ok) {
          throw new Error('Unable to fetch order book snapshot.');
        }

        const payload = await response.json();
        const nextSnapshot = normalizeBookSnapshot(payload);

        if (isMounted) {
          setSnapshot(nextSnapshot);
          setStatus('connected');
          setMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(error.message || 'Order book unavailable.');
        }
      }
    };

    loadInitialSnapshot();

    const source = new EventSource(`${API_URL}/api/stream/book/${encodeURIComponent(instrument)}`);

    source.onopen = () => {
      if (isMounted) {
        setStatus((current) => (current === 'error' ? 'connected' : current));
        setMessage('');
      }
    };

    source.addEventListener('book', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const nextSnapshot = normalizeBookSnapshot(payload);
        if (isMounted) {
          setSnapshot(nextSnapshot);
          setStatus('connected');
          setMessage('');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
          setMessage('Order book stream returned an invalid payload.');
        }
      }
    });

    source.onerror = () => {
      if (isMounted) {
        setStatus('disconnected');
        setMessage('Order book stream disconnected.');
      }
    };

    return () => {
      isMounted = false;
      source.close();
    };
  }, [instrument]);

  const hasBidData = snapshot.bids.length > 0;
  const hasAskData = snapshot.asks.length > 0;
  const { bestBid, bestAsk, spread } = calculateBookSpread(snapshot);
  const visibleBids = useMemo(() => snapshot.bids.slice(0, 12), [snapshot.bids]);
  const visibleAsks = useMemo(() => snapshot.asks.slice(0, 12), [snapshot.asks]);

  return (
    <section className="order-book-panel" aria-label="Order book panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ORDER BOOK</p>
          <h2>{instrument}</h2>
        </div>
        <span className={`order-book-status ${status}`}>{status}</span>
      </div>

      {message && (
        <div className="order-book-message" role="status">
          {message}
        </div>
      )}

      <div className="order-book-summary" aria-label="Best prices and spread">
        <div className="order-book-summary-item">
          <span>BEST BID</span>
          <strong className="bid-price">{formatPrice(bestBid)}</strong>
        </div>
        <div className="order-book-summary-item">
          <span>BEST ASK</span>
          <strong className="ask-price">{formatPrice(bestAsk)}</strong>
        </div>
        <div className="order-book-summary-item">
          <span>SPREAD</span>
          <strong>{formatPrice(spread)}</strong>
        </div>
      </div>

      <div className="order-book-grid">
        <div className="book-column asks-column">
          <div className="book-header">
            <span>ASKS</span>
            <span>PRICE / QTY</span>
          </div>
          <div className="book-table-wrap">
            <table className="book-table">
              <tbody>
                {visibleAsks.length > 0 ? (
                  visibleAsks.map((level, index) => (
                    <tr key={`ask-${level.price}-${index}`}>
                      <td className="price ask-price">{formatPrice(level.price)}</td>
                      <td className="quantity">{level.quantity.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-row" colSpan="2">No asks</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="book-column bids-column">
          <div className="book-header">
            <span>BIDS</span>
            <span>PRICE / QTY</span>
          </div>
          <div className="book-table-wrap">
            <table className="book-table">
              <tbody>
                {visibleBids.length > 0 ? (
                  visibleBids.map((level, index) => (
                    <tr key={`bid-${level.price}-${index}`}>
                      <td className="price bid-price">{formatPrice(level.price)}</td>
                      <td className="quantity">{level.quantity.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-row" colSpan="2">No bids</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!hasAskData && !hasBidData && status === 'connected' && (
        <div className="order-book-message empty">Order book is empty for {instrument}.</div>
      )}
    </section>
  );
}

export default OrderBook;
