export type WebSocketConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface MarketDataEnvelope<T> {
  type: 'trade' | 'book' | 'heartbeat' | 'snapshot' | 'error';
  symbol?: string;
  ts?: number;
  payload?: T;
  message?: string;
}

export interface TradeUpdate {
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  tradeId: string;
  ts: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  sequence: number;
  ts: number;
}

export interface MarketDataFrame {
  type: 'trade' | 'book' | 'snapshot' | 'heartbeat' | 'error';
  ts?: number;
  message?: string;
  trade?: TradeUpdate;
  book?: OrderBookSnapshot;
}

export interface UseMarketDataWebSocketResult {
  socket: WebSocket | null;
  connectionState: WebSocketConnectionState;
  lastMessage: MarketDataFrame | null;
  lastError: string | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  send: (data: unknown) => boolean;
}
