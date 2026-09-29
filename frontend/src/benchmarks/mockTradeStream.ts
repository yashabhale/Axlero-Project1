export type TradeRate = 100 | 1000 | 5000 | 10000;

export interface MockTrade {
  id: number;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  ts: number;
  sequence: number;
}

export interface StreamConfig {
  ratePerSecond: TradeRate;
  durationMs: number;
  symbolPool?: string[];
  startDelayMs?: number;
}

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'NFLX', 'GOOG'];

export function createMockTradeStream(config: StreamConfig) {
  const {
    ratePerSecond,
    durationMs,
    symbolPool = SYMBOLS,
    startDelayMs = 0,
  } = config;

  const trades: MockTrade[] = [];
  const intervalMs = 1000 / ratePerSecond;
  const startAt = performance.now() + startDelayMs;
  const totalTicks = Math.max(1, Math.floor(durationMs / intervalMs));

  for (let i = 0; i < totalTicks; i += 1) {
    const ts = startAt + i * intervalMs;
    const symbol = symbolPool[i % symbolPool.length];
    const side = i % 2 === 0 ? 'BUY' : 'SELL';
    const basePrice = 100 + ((i * 13) % 200) / 100;
    const price = Number((basePrice + (Math.random() - 0.5) * 1.5).toFixed(2));
    const quantity = 10 + ((i * 7) % 1000);

    trades.push({
      id: i + 1,
      symbol,
      price,
      quantity,
      side,
      ts,
      sequence: i,
    });
  }

  return trades;
}

export function createStreamScheduler(config: StreamConfig, onTrade: (trade: MockTrade) => void) {
  const { ratePerSecond, durationMs, startDelayMs = 0 } = config;
  const intervalMs = 1000 / ratePerSecond;
  const startedAt = performance.now() + startDelayMs;
  const symbolPool = config.symbolPool ?? SYMBOLS;
  const totalTicks = Math.max(1, Math.floor(durationMs / intervalMs));
  let tick = 0;
  let rafId: number | null = null;
  let active = true;

  const emit = () => {
    if (!active) {
      return;
    }

    const now = performance.now();
    const elapsed = now - startedAt;
    const dueTicks = Math.min(totalTicks, Math.floor(Math.max(0, elapsed) / intervalMs) + 1);

    while (tick < dueTicks) {
      const symbol = symbolPool[tick % symbolPool.length];
      const side = tick % 2 === 0 ? 'BUY' : 'SELL';
      const price = Number((100 + ((tick * 13) % 200) / 100 + (Math.random() - 0.5) * 1.5).toFixed(2));
      const quantity = 10 + ((tick * 7) % 1000);

      onTrade({
        id: tick + 1,
        symbol,
        price,
        quantity,
        side,
        ts: now,
        sequence: tick,
      });

      tick += 1;
    }

    if (elapsed >= durationMs || tick >= totalTicks) {
      active = false;
      return;
    }

    rafId = requestAnimationFrame(emit);
  };

  if (startDelayMs > 0) {
    setTimeout(() => {
      rafId = requestAnimationFrame(emit);
    }, startDelayMs);
  } else {
    rafId = requestAnimationFrame(emit);
  }

  return {
    stop() {
      active = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}
