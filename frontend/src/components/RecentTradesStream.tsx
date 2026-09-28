import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createStreamScheduler, type MockTrade } from '../benchmarks/mockTradeStream';

const DEFAULT_LIMIT = 120;
const FPS_INTERVAL_MS = 1000 / 60;

function formatPrice(value: number) {
  return value.toFixed(2);
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
}

const RecentTradesRow = memo(function RecentTradesRow({ trade }: { trade: MockTrade }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 90px 80px 90px 100px',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
        color: '#e2e8f0',
        fontSize: 12,
      }}
    >
      <span>{trade.symbol}</span>
      <span style={{ color: trade.side === 'BUY' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{trade.side}</span>
      <span>{formatPrice(trade.price)}</span>
      <span>{trade.quantity}</span>
      <span style={{ color: '#93c5fd' }}>{formatTs(trade.ts)}</span>
    </div>
  );
});

export function RecentTradesStream() {
  const [trades, setTrades] = useState<MockTrade[]>([]);
  const [fps, setFps] = useState<number>(60);
  const [isLive, setIsLive] = useState(true);
  const lastRenderRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const pendingTradesRef = useRef<MockTrade[]>([]);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const scheduler = createStreamScheduler({
      ratePerSecond: 10000,
      durationMs: 15000,
      startDelayMs: 100,
    }, (trade) => {
      pendingTradesRef.current.push(trade);

      const now = performance.now();
      if (now - lastFrameTimeRef.current >= FPS_INTERVAL_MS || pendingTradesRef.current.length > 30) {
        flushPendingTrades();
      }
    });

    const flushPendingTrades = () => {
      if (pendingTradesRef.current.length === 0) {
        return;
      }

      const nextBatch = pendingTradesRef.current.splice(0, pendingTradesRef.current.length);
      setTrades((previous) => {
        const merged = [...previous, ...nextBatch];
        return merged.slice(-DEFAULT_LIMIT);
      });

      lastFrameTimeRef.current = performance.now();
      const delta = performance.now() - lastRenderRef.current || 16;
      lastRenderRef.current = performance.now();
      setFps(Math.round(1000 / delta));
    };

    const tick = () => {
      if (pendingTradesRef.current.length > 0) {
        flushPendingTrades();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      setIsLive(false);
      scheduler.stop();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      pendingTradesRef.current = [];
    };
  }, []);

  const visibleTrades = useMemo(() => trades.slice(-DEFAULT_LIMIT), [trades]);

  return (
    <div style={{ maxWidth: 760, margin: '24px auto', background: '#0b1220', color: '#f8fafc', borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Recent Trades Stream</h3>
        <div style={{ display: 'flex', gap: 12, color: '#cbd5e1' }}>
          <span>{isLive ? 'LIVE' : 'PAUSED'}</span>
          <span>{fps} FPS</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 80px 90px 100px', gap: 8, padding: '8px 12px', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        <span>Symbol</span>
        <span>Side</span>
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>

      <div style={{ maxHeight: 440, overflow: 'auto', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 12 }}>
        {visibleTrades.length === 0 ? (
          <div style={{ padding: 18, color: '#94a3b8' }}>Waiting for live trade updates…</div>
        ) : (
          visibleTrades.map((trade) => <RecentTradesRow key={trade.id} trade={trade} />)
        )}
      </div>
    </div>
  );
}
