import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT ?? 8081);
const server = new WebSocketServer({ port, path: '/ws/market-data' });

const createTrade = (symbol, side, price, quantity, index) => ({
  type: 'trade',
  ts: Date.now(),
  payload: {
    symbol,
    price,
    quantity,
    side,
    tradeId: `${symbol}-${side.toLowerCase()}-${index}`,
    ts: Date.now(),
  },
});

const createBook = (symbol, sequence) => ({
  type: 'book',
  ts: Date.now(),
  payload: {
    symbol,
    bids: [
      { price: 101.25, size: 1200 },
      { price: 101.20, size: 980 },
      { price: 101.15, size: 760 },
    ],
    asks: [
      { price: 101.35, size: 1100 },
      { price: 101.40, size: 1460 },
      { price: 101.45, size: 880 },
    ],
    sequence,
    ts: Date.now(),
  },
});

server.on('connection', (socket) => {
  console.log('Client connected to mock market data WS');

  socket.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));

  let tradeIndex = 0;
  let seq = 1;

  const interval = setInterval(() => {
    const symbol = 'AAPL';
    const side = tradeIndex % 2 === 0 ? 'BUY' : 'SELL';
    const price = 101 + ((tradeIndex % 7) * 0.05);
    const quantity = 50 + (tradeIndex % 10) * 10;

    socket.send(JSON.stringify(createTrade(symbol, side, Number(price.toFixed(2)), quantity, tradeIndex)));

    if (tradeIndex % 3 === 0) {
      socket.send(JSON.stringify(createBook(symbol, seq++)));
    }

    tradeIndex += 1;
  }, 1000);

  socket.on('close', () => {
    console.log('Client disconnected from mock market data WS');
    clearInterval(interval);
  });
});

console.log(`Mock WebSocket server is running at ws://localhost:${port}/ws/market-data`);
