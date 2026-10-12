import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createStreamScheduler, type MockTrade } from '../benchmarks/mockTradeStream';
import { BenchmarkStatsPanel } from './BenchmarkStatsPanel';

const ROW_HEIGHT = 30;
const VISIBLE_ROWS = 18;
const MAX_ITEMS = 500;
const FPS_INTERVAL_MS = 1000 / 60;

const Row = memo(function Row({ trade }: { trade: MockTrade }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 80px 90px 80px 110px',
        gap: 8,
        height: ROW_HEIGHT,
        boxSizing: 'border-box',
        alignItems: 'center',
        padding: '0 10px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        color: '#e2e8f0',
        fontSize: 12,
      }}
    >
      <span>{trade.symbol}</span>
      <span style={{ color: trade.side === 'BUY' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{trade.side}</span>
      <span>{trade.price.toFixed(2)}</span>
      <span>{trade.quantity}</span>
      <span style={{ color: '#93c5fd' }}>{new Date(trade.ts).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}</span>
    </div>
  );
});

export function VirtualizedRecentTrades({ rate }: { rate: 100 | 1000 | 5000 | 10000 }) {
  const [trades, setTrades] = useState<MockTrade[]>([]);
  const [fps, setFps] = useState(60);
  const [queueDepth, setQueueDepth] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [renderLatencyMs, setRenderLatencyMs] = useState(0);
  const lastFrameRef = useRef<number>(0);
  const pendingRef = useRef<MockTrade[]>([]);
  const maxQueueDepthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const renderStartRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (renderStartRef.current === null) {
      return;
    }

    setRenderLatencyMs(performance.now() - renderStartRef.current);
    renderStartRef.current = null;
  }, [trades]);

  useEffect(() => {
    setTrades([]);
    setFps(60);
    setQueueDepth(0);
    setDroppedFrames(0);
    setRenderLatencyMs(0);
    pendingRef.current = [];
    maxQueueDepthRef.current = 0;

    const scheduler = createStreamScheduler({ ratePerSecond: rate, durationMs: 20000, startDelayMs: 50 }, (trade) => {
      pendingRef.current.push(trade);
      maxQueueDepthRef.current = Math.max(maxQueueDepthRef.current, pendingRef.current.length);
    });

    const flushPending = () => {
      if (pendingRef.current.length === 0) {
        return;
      }

      const batch = pendingRef.current.splice(0, pendingRef.current.length);
      setQueueDepth(maxQueueDepthRef.current);
      maxQueueDepthRef.current = 0;
      renderStartRef.current = performance.now();
      setTrades((previous) => [...previous, ...batch].slice(-MAX_ITEMS));
      const now = performance.now();
      const delta = now - lastFrameRef.current || 16;
      if (delta > 33) {
        setDroppedFrames((previous) => previous + 1);
      }
      lastFrameRef.current = now;
      setFps(Math.round(1000 / delta));
    };

    const tick = () => {
      if (pendingRef.current.length > 0) {
        flushPending();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      scheduler.stop();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      pendingRef.current = [];
      maxQueueDepthRef.current = 0;
      renderStartRef.current = null;
    };
  }, [rate]);

  const visibleTrades = useMemo(() => trades.slice(-VISIBLE_ROWS), [trades]);

  return (
    <div style={{ background: '#0b1220', padding: 18, borderRadius: 16, border: '1px solid rgba(148,163,184,0.14)' }}>
      <BenchmarkStatsPanel rate={rate} queueDepth={queueDepth} droppedFrames={droppedFrames} renderLatencyMs={renderLatencyMs} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#f8fafc' }}>Recent Trades — Virtualized Stream</h3>
        <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{fps} FPS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 90px 80px 110px', gap: 8, padding: '0 10px', color: '#94a3b8', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        <span>Symbol</span>
        <span>Side</span>
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>

      <div style={{ height: VISIBLE_ROWS * ROW_HEIGHT, overflow: 'hidden', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)' }}>
        {visibleTrades.map((trade) => (
          <Row key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
}
