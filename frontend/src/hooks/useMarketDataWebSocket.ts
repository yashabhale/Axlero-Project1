import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MarketDataEnvelope,
  MarketDataFrame,
  TradeUpdate,
  OrderBookSnapshot,
  UseMarketDataWebSocketResult,
  WebSocketConnectionState,
} from '../types/marketData';

const WS_URL = 'ws://localhost:8080/ws/market-data';
const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 1000;
const FRAME_BATCH_INTERVAL_MS = 50;

function parseFrame(raw: string): MarketDataFrame | null {
  if (!raw || !raw.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as MarketDataEnvelope<unknown>;

    if (parsed.type === 'trade' && parsed.payload && typeof parsed.payload === 'object') {
      return {
        type: 'trade',
        ts: parsed.ts,
        trade: parsed.payload as TradeUpdate,
      };
    }

    if ((parsed.type === 'book' || parsed.type === 'snapshot') && parsed.payload && typeof parsed.payload === 'object') {
      return {
        type: 'snapshot',
        ts: parsed.ts,
        book: parsed.payload as OrderBookSnapshot,
      };
    }

    if (parsed.type === 'heartbeat') {
      return {
        type: 'heartbeat',
        ts: parsed.ts,
      };
    }

    if (parsed.type === 'error') {
      return {
        type: 'error',
        message: parsed.message ?? 'WebSocket error frame received',
      };
    }

    return {
      type: 'error',
      message: `Unsupported frame type: ${String(parsed.type ?? 'unknown')}`,
    };
  } catch (error) {
    return {
      type: 'error',
      message: `Invalid JSON frame: ${String(error)}`,
    };
  }
}

export function useMarketDataWebSocket(): UseMarketDataWebSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastMessageRef = useRef<MarketDataFrame | null>(null);
  const batchFrameTimerRef = useRef<number | null>(null);
  const latestFrameRef = useRef<MarketDataFrame | null>(null);

  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('DISCONNECTED');
  const [lastMessage, setLastMessage] = useState<MarketDataFrame | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const flushLatestFrame = useCallback(() => {
    const nextFrame = latestFrameRef.current;
    if (!nextFrame) {
      return;
    }

    latestFrameRef.current = null;
    lastMessageRef.current = nextFrame;
    setLastMessage(nextFrame);
  }, []);

  const queueFrame = useCallback((frame: MarketDataFrame) => {
    latestFrameRef.current = frame;

    if (batchFrameTimerRef.current !== null) {
      return;
    }

    batchFrameTimerRef.current = window.setTimeout(() => {
      batchFrameTimerRef.current = null;
      flushLatestFrame();
    }, FRAME_BATCH_INTERVAL_MS);
  }, [flushLatestFrame]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearBatchTimer = useCallback(() => {
    if (batchFrameTimerRef.current !== null) {
      window.clearTimeout(batchFrameTimerRef.current);
      batchFrameTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();

    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current, MAX_RECONNECT_DELAY_MS);
    reconnectAttemptsRef.current += 1;
    setReconnectAttempts(reconnectAttemptsRef.current);
    setConnectionState('CONNECTING');

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, delay);
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    clearReconnectTimer();
    setConnectionState('CONNECTING');
    setLastError(null);

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!isMountedRef.current) {
        socket.close();
        return;
      }

      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      setConnectionState('CONNECTED');
      setLastError(null);
    };

    socket.onmessage = (event) => {
      const message = parseFrame(event.data);
      if (!message) {
        return;
      }

      queueFrame(message);
    };

    socket.onerror = () => {
      setConnectionState('ERROR');
      setLastError('WebSocket connection error');
    };

    socket.onclose = (event) => {
      if (!isMountedRef.current) {
        return;
      }

      if (event.wasClean) {
        setConnectionState('DISCONNECTED');
        return;
      }

      setConnectionState('ERROR');
      setLastError(`Connection closed unexpectedly (code: ${event.code})`);
      scheduleReconnect();
    };
  }, [clearReconnectTimer, queueFrame, scheduleReconnect]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    clearBatchTimer();
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    setConnectionState('DISCONNECTED');
    setLastError(null);
    latestFrameRef.current = null;
    lastMessageRef.current = null;
    setLastMessage(null);
  }, [clearBatchTimer, clearReconnectTimer]);

  const send = useCallback((data: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return useMemo<UseMarketDataWebSocketResult>(
    () => ({
      socket: socketRef.current,
      connectionState,
      lastMessage,
      lastError,
      reconnectAttempts,
      connect,
      disconnect,
      send,
    }),
    [connect, connectionState, disconnect, lastError, lastMessage, reconnectAttempts, send],
  );
}
