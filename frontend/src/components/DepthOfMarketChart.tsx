import type { OrderBookSnapshot } from '../types/marketData';

function DepthColumn({ title, color, levels, side }: { title: string; color: string; levels: OrderBookSnapshot['bids']; side: 'BUY' | 'SELL' }) {
  const maxVolume = Math.max(...levels.map((level) => level.size), 1);

  return (
    <div style={{ flex: 1, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#dbeafe', fontWeight: 700 }}>{title}</span>
        <span style={{ color, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>{side}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {levels.map((level) => (
          <div key={`${side}-${level.price}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 56, color: '#cbd5e1', fontSize: 12 }}>{`$${level.price.toFixed(2)}`}</span>
            <div style={{ flex: 1, height: 18, position: 'relative', background: 'rgba(15, 23, 42, 0.9)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(level.size / maxVolume) * 100}%`,
                  background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.85))`,
                  borderRadius: 999,
                }}
              />
            </div>
            <span style={{ width: 48, textAlign: 'right', color: '#e2e8f0', fontSize: 12 }}>{level.size.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DepthOfMarketChart({ book }: { book: OrderBookSnapshot | null }) {
  const bids = book?.bids.slice(0, 8) ?? [];
  const asks = book?.asks.slice(0, 8) ?? [];
  const bidVolume = bids.reduce((total, level) => total + level.size, 0);
  const askVolume = asks.reduce((total, level) => total + level.size, 0);
  const totalVolume = bidVolume + askVolume;
  const buyPressure = totalVolume === 0 ? 0 : (bidVolume / totalVolume) * 100;

  return (
    <div style={{ background: '#0b1220', borderRadius: 16, padding: 14, border: '1px solid rgba(148,163,184,0.14)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4 style={{ margin: 0, color: '#f8fafc' }}>Depth of Market</h4>
        <span style={{ color: '#a5b4cf' }}>
          {book ? `${book.symbol} · Seq ${book.sequence}` : 'Waiting for live book'}
        </span>
      </div>

      {!book ? (
        <div style={{ color: '#94a3b8', padding: '24px 8px', textAlign: 'center' }}>
          Connect to the market-data feed to view live buy and sell pressure.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, color: '#cbd5e1', fontSize: 12 }}>
            Buy pressure {buyPressure.toFixed(1)}% · Bid volume {bidVolume.toLocaleString()} · Ask volume {askVolume.toLocaleString()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <DepthColumn title="Bids" color="#4ade80" levels={bids} side="BUY" />
            <DepthColumn title="Asks" color="#f87171" levels={asks} side="SELL" />
          </div>
        </>
      )}
    </div>
  );
}
