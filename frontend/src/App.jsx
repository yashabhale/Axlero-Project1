import { useEffect, useRef, useState } from 'react';
import { appendTrades, formatPrice } from './tradeFeed.js';

const API_URL = import.meta.env.VITE_ORDERFLOW_API ?? 'http://localhost:8080';
const BATCH_INTERVAL_MS = 100;
const METRIC_INTERVAL_MS = 500;

function App() {
  const [instrument, setInstrument] = useState('ACME');
  const [draftInstrument, setDraftInstrument] = useState('ACME');
  const [connected, setConnected] = useState(true);
  const [status, setStatus] = useState('connecting');
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [trades, setTrades] = useState([]);
  const [metrics, setMetrics] = useState({ rate: 0, peak: 0, renderMs: 0, received: 0 });
  const pending = useRef([]);
  const receiveCount = useRef(0);
  const sampledReceiveCount = useRef(0);
  const peakRate = useRef(0);
  const flushStarted = useRef(0);
  const benchmark = useRef(null);

  useEffect(() => {
    if (!connected) {
      setStatus('offline');
      return undefined;
    }

    setStatus('connecting');
    const source = new EventSource(`${API_URL}/api/stream/executions/${encodeURIComponent(instrument)}`);
    source.onopen = () => setStatus('live');
    source.onerror = () => setStatus('reconnecting');

    const receive = (event) => {
      try {
        const trade = JSON.parse(event.data);
        pending.current.push({ ...trade, id: `${trade.eventTime}-${receiveCount.current}` });
        receiveCount.current += 1;
      } catch {
        setStatus('invalid event');
      }
    };
    source.addEventListener('trade', receive);
    source.onmessage = receive;

    return () => source.close();
  }, [connected, instrument]);

  useEffect(() => {
    const flushTimer = window.setInterval(() => {
      if (pending.current.length === 0) return;
      const batch = pending.current.splice(0, pending.current.length);
      if (benchmark.current) {
        benchmark.current.remaining -= batch.filter((trade) => trade.benchmarkEvent).length;
      }
      flushStarted.current = performance.now();
      setTrades((current) => appendTrades(current, batch));
    }, BATCH_INTERVAL_MS);

    const metricTimer = window.setInterval(() => {
      const count = receiveCount.current;
      const rate = Math.round((count - sampledReceiveCount.current) / (METRIC_INTERVAL_MS / 1_000));
      sampledReceiveCount.current = count;
      peakRate.current = Math.max(peakRate.current, rate);
      setMetrics((current) => ({ ...current, rate, peak: peakRate.current, received: count }));
    }, METRIC_INTERVAL_MS);

    return () => {
      window.clearInterval(flushTimer);
      window.clearInterval(metricTimer);
    };
  }, []);

  useEffect(() => {
    if (benchmark.current && benchmark.current.remaining === 0) {
      const elapsedMs = performance.now() - benchmark.current.startedAt;
      setMetrics((current) => ({
        ...current,
        renderMs: elapsedMs,
      }));
      benchmark.current = null;
      setBenchmarkRunning(false);
      flushStarted.current = 0;
      return;
    }
    if (flushStarted.current) {
      setMetrics((current) => ({ ...current, renderMs: performance.now() - flushStarted.current }));
      flushStarted.current = 0;
    }
  }, [connected, trades]);

  function connectToInstrument(event) {
    event.preventDefault();
    const nextInstrument = draftInstrument.trim().toUpperCase();
    if (nextInstrument) {
      setTrades([]);
      setInstrument(nextInstrument);
      setConnected(true);
    }
  }

  function runStreamBenchmark() {
    const startedAt = performance.now();
    const now = new Date().toISOString();
    benchmark.current = { startedAt, remaining: 10_000 };
    for (let index = 0; index < 10_000; index += 1) {
      pending.current.push({
        id: `sim-${now}-${index}`,
        benchmarkEvent: true,
        eventType: 'TRADE',
        instrumentId: instrument,
        matchPrice: 100_000 + (index % 250),
        quantity: 1 + (index % 90),
        buyOrderId: `B-${index}`,
        sellOrderId: `S-${index}`,
        eventTime: now,
      });
    }
    receiveCount.current += 10_000;
    const injectedRate = Math.round(10_000 / Math.max((performance.now() - startedAt) / 1_000, 0.001));
    sampledReceiveCount.current = receiveCount.current;
    peakRate.current = Math.max(peakRate.current, injectedRate);
    setMetrics((current) => ({ ...current, rate: injectedRate, peak: peakRate.current, received: receiveCount.current }));
    setBenchmarkRunning(true);
  }

  const latestTrade = trades[0];

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Orderflow market monitor">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>ORDERFLOW</span>
        </a>
        <div className="topbar-right">
          <span className="environment"><span className="environment-dot" /> SIMULATED VENUE</span>
          <time>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</time>
        </div>
      </header>

      <section className="page-heading" id="top">
        <div>
          <p className="eyebrow">MARKET DATA / EXECUTIONS</p>
          <h1>Trade monitor</h1>
        </div>
        <form className="instrument-form" onSubmit={connectToInstrument}>
          <label htmlFor="instrument">Instrument</label>
          <input id="instrument" maxLength="24" value={draftInstrument} onChange={(event) => setDraftInstrument(event.target.value)} />
          <button className="connect-button" type="submit" title="Connect to instrument stream">
            <span aria-hidden="true">↗</span> Connect
          </button>
        </form>
      </section>

      <section className="overview" aria-label="Market summary">
        <div className="overview-instrument">
          <div className="instrument-avatar">{instrument.slice(0, 1)}</div>
          <div><span className="eyebrow">INSTRUMENT</span><strong>{instrument}</strong></div>
        </div>
        <div className="overview-stat">
          <span className="eyebrow">LAST TRADE</span>
          <strong>{latestTrade ? formatPrice(latestTrade.matchPrice) : '--'}</strong>
        </div>
        <div className="overview-stat">
          <span className="eyebrow">LAST SIZE</span>
          <strong>{latestTrade?.quantity?.toLocaleString() ?? '--'} <small>sh</small></strong>
        </div>
        <div className="overview-stat stream-stat">
          <span className="eyebrow">STREAM</span>
          <strong className={`stream-state ${status}`}><span />{status}</strong>
        </div>
      </section>

      <section className="monitor-grid">
        <div className="tape-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">LIVE FEED</p><h2>Recent trades <span>{trades.length}</span></h2></div>
            <button className="icon-button" type="button" onClick={() => setTrades([])} title="Clear visible trades" aria-label="Clear visible trades">⌫</button>
          </div>
          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead><tr><th>TIME</th><th>PRICE</th><th>SIZE</th><th>BUY ORDER</th><th>SELL ORDER</th></tr></thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="time-cell">{new Date(trade.eventTime).toLocaleTimeString('en-US', { hour12: false })}</td>
                    <td className="price-cell">{formatPrice(trade.matchPrice)}</td>
                    <td>{trade.quantity?.toLocaleString()}</td>
                    <td className="order-id buy-id">{trade.buyOrderId}</td>
                    <td className="order-id sell-id">{trade.sellOrderId}</td>
                  </tr>
                ))}
                {trades.length === 0 && <tr><td className="empty-state" colSpan="5">Waiting for executions on {instrument}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tape-footer"><span><span className={`live-indicator ${status === 'live' ? 'active' : ''}`} />{status === 'live' ? 'Receiving events' : status}</span><span>Newest first · 250 rows retained</span></div>
        </div>

        <aside className="performance-panel">
          <div className="panel-heading"><div><p className="eyebrow">CLIENT TELEMETRY</p><h2>Stream health</h2></div><span className="pulse-icon" aria-hidden="true">⌁</span></div>
          <div className="metric-primary"><strong>{metrics.rate.toLocaleString()}</strong><span>events / sec</span></div>
          <div className="rate-track"><span style={{ width: `${Math.min(metrics.rate / 1_000, 100)}%` }} /></div>
          <div className="metric-row"><span>Peak observed</span><strong>{metrics.peak.toLocaleString()} <small>evt/s</small></strong></div>
          <div className="metric-row"><span>UI update time</span><strong>{metrics.renderMs.toFixed(2)} <small>ms</small></strong></div>
          <div className="metric-row"><span>Total received</span><strong>{metrics.received.toLocaleString()}</strong></div>
          <div className="performance-divider" />
          <p className="eyebrow benchmark-label">STREAM BENCHMARK</p>
          <p className="benchmark-copy">Inject 10,000 local events to measure client-side buffering and display cost.</p>
          <button className="benchmark-button" type="button" onClick={runStreamBenchmark} disabled={benchmarkRunning}>{benchmarkRunning ? 'Rendering event burst…' : 'Run 10k event test'} <span aria-hidden="true">→</span></button>
          <button className="secondary-button" type="button" onClick={() => setConnected((current) => !current)}>{connected ? 'Disconnect stream' : 'Reconnect stream'}</button>
        </aside>
      </section>
      <footer className="statusbar"><span>ORDERFLOW ENGINE <b>●</b> {API_URL}</span><span>EVENTSOURCE / SERVER-SENT EVENTS</span></footer>
    </main>
  );
}

export default App;