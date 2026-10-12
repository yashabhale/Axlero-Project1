import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_ORDERFLOW_API ?? 'http://localhost:8080';

export function normalizeBookSnapshot(snapshot = {}) {
  const normalizeSide = (side) => {
    if (!side || typeof side !== 'object') return [];

    const entries = Array.isArray(side)
      ? side
      : Object.entries(side).map(([price, quantities]) => ({
          price,
          quantities,
        }));

    return entries
      .map((entry) => {
        const priceValue = Number(entry.price ?? entry[0] ?? 0);
        const quantityValue = Array.isArray(entry.quantities)
          ? entry.quantities.reduce((sum, quantity) => sum + Number(quantity || 0), 0)
          : Number(entry.quantities ?? 0);

        return {
          price: Number.isFinite(priceValue) ? priceValue : 0,
          quantity: Number.isFinite(quantityValue) ? quantityValue : 0,
        };
      })
      .filter((level) => Number.isFinite(level.price) && level.price > 0 && level.quantity >= 0)
      .sort((left, right) => right.price - left.price);
  };

  const normalizedBids = normalizeSide(snapshot.bids ?? {});
  const normalizedAsks = normalizeSide(snapshot.asks ?? {});

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
                      <td className="price ask-price">{level.price.toLocaleString()}</td>
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
                      <td className="price bid-price">{level.price.toLocaleString()}</td>
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
