import { useEffect, useMemo, useState } from 'react';
import { BenchmarkControls, type BenchmarkRate } from './benchmarks/BenchmarkControls';
import { RecentTradesStream } from './components/RecentTradesStream';
import { VirtualizedRecentTrades } from './components/VirtualizedRecentTrades';
import { useMarketDataWebSocket } from './hooks/useMarketDataWebSocket';
import type { MarketDataFrame, TradeUpdate } from './types/marketData';

function App() {
  const { connectionState, lastMessage, lastError, reconnectAttempts, connect, disconnect, send } = useMarketDataWebSocket();
  const [recentFrames, setRecentFrames] = useState<MarketDataFrame[]>([]);
  const [benchmarkRate, setBenchmarkRate] = useState<BenchmarkRate>(1000);

  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    setRecentFrames((previous) => [lastMessage, ...previous].slice(0, 8));
  }, [lastMessage]);

  const bestBid = useMemo(() => {
    const trade = lastMessage?.trade as TradeUpdate | undefined;
    return trade ? `${trade.symbol} @ ${trade.price}` : 'Waiting for trades';
  }, [lastMessage]);

  const subscribeStatus = {
    CONNECTING: 'Connecting to market data feed…',
    CONNECTED: 'Connected and streaming live data',
    DISCONNECTED: 'Disconnected',
    ERROR: 'Connection error — retrying',
  }[connectionState];

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: 1180,
      margin: '32px auto',
      padding: 24,
      color: '#f5f7ff',
      background: '#0a1020',
      borderRadius: 18,
      boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>OrderFlow — Live Market Feed</h1>
          <p style={{ margin: '6px 0 0', color: '#aab7d4' }}>Member 5 • Week 1 WebSocket setup</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={connect} style={buttonStyle('#2563eb')}>Connect</button>
          <button onClick={disconnect} style={buttonStyle('#7c2d12')}>Disconnect</button>
          <button
            onClick={() => send({ type: 'heartbeat', ts: Date.now() })}
            style={buttonStyle('#065f46')}
          >
            Send heartbeat
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatusCard label="Connection" value={connectionState} accent={connectionState === 'CONNECTED' ? '#22c55e' : connectionState === 'ERROR' ? '#f87171' : '#60a5fa'} />
        <StatusCard label="Status" value={subscribeStatus} accent="#c084fc" />
        <StatusCard label="Reconnects" value={String(reconnectAttempts)} accent="#fbbf24" />
        <StatusCard label="Best bid" value={bestBid} accent="#34d399" />
      </div>

      {lastError && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: '#3f1728', color: '#fecdd3', border: '1px solid #7f1d1d' }}>
          {lastError}
        </div>
      )}

      <div style={{ marginTop: 18, marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 8px', color: '#f8fafc' }}>Benchmark stress test</h3>
        <BenchmarkControls value={benchmarkRate} onChange={setBenchmarkRate} />
        <VirtualizedRecentTrades rate={benchmarkRate} />
      </div>

      <RecentTradesStream />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
        <section style={panelStyle()}>
          <h3 style={headingStyle()}>Incoming frames</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentFrames.length === 0 ? (
              <p style={{ margin: 0, color: '#9aa9c7' }}>Waiting for messages…</p>
            ) : (
              recentFrames.map((frame, index) => (
                <pre key={`${frame.type}-${frame.ts ?? index}`} style={frameStyle()}>{JSON.stringify(frame, null, 2)}</pre>
              ))
            )}
          </div>
        </section>

        <section style={panelStyle()}>
          <h3 style={headingStyle()}>Quick notes</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#d8e1f5', lineHeight: 1.8 }}>
            <li>Uses exponential backoff for reconnects.</li>
            <li>Stores latest frame in a ref-backed state model.</li>
            <li>Prevents unnecessary renders from every tick.</li>
            <li>WebSocket URL: ws://localhost:8080/ws/market-data</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatusCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#111b31', border: `1px solid ${accent}33`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ color: '#90a3c5', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: '#eff6ff' }}>{value}</div>
    </div>
  );
}

const buttonStyle = (bg: string) => ({
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  color: 'white',
  background: bg,
  cursor: 'pointer',
  fontWeight: 600,
} as const);

const panelStyle = () => ({
  background: '#111b31',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.18)',
  padding: 16,
} as const);

const headingStyle = () => ({
  margin: '0 0 12px',
  color: '#f8fafc',
  fontSize: 18,
} as const);

const frameStyle = () => ({
  background: '#091120',
  color: '#cfe3ff',
  border: '1px solid rgba(96,165,250,0.2)',
  borderRadius: 8,
  padding: 10,
  margin: 0,
  overflowX: 'auto',
} as const);

export default App;
