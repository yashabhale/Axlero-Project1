import { useEffect, useRef, useState } from 'react';
import type { OrderBookSnapshot } from '../types/marketData';

const DISPLAY_LEVELS = 4;

export function OrderBookCanvas({ book }: { book: OrderBookSnapshot | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderTimeMs, setRenderTimeMs] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const startedAt = performance.now();
    const width = canvas.width;
    const height = canvas.height;
    const mid = width / 2;
    const bids = book?.bids.slice(0, DISPLAY_LEVELS) ?? [];
    const asks = book?.asks.slice(0, DISPLAY_LEVELS) ?? [];
    const maxVolume = Math.max(1, ...bids.map((level) => level.size), ...asks.map((level) => level.size));

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#081221';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#4ade80';
    context.font = '700 12px sans-serif';
    context.textAlign = 'left';
    context.fillText('BIDS', 16, 20);
    context.fillStyle = '#f87171';
    context.textAlign = 'right';
    context.fillText('ASKS', width - 16, 20);

    const renderSide = (levels: OrderBookSnapshot['bids'], isBid: boolean) => {
      levels.forEach((level, index) => {
        const y = 36 + index * 52;
        const barWidth = (level.size / maxVolume) * (mid - 36);
        const x = isBid ? 16 : mid + 20;

        context.fillStyle = '#e2e8f0';
        context.font = '12px sans-serif';
        context.textAlign = 'left';
        context.fillText(level.price.toFixed(2), x, y + 13);
        context.textAlign = 'right';
        context.fillText(level.size.toLocaleString(), x + mid - 36, y + 13);

        context.fillStyle = isBid ? 'rgba(34, 197, 94, 0.85)' : 'rgba(248, 113, 113, 0.85)';
        context.fillRect(x, y + 21, barWidth, 18);
      });
    };

    renderSide(bids, true);
    renderSide(asks, false);

    context.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    context.beginPath();
    context.moveTo(mid, 30);
    context.lineTo(mid, height - 12);
    context.stroke();

    if (!book) {
      context.fillStyle = '#94a3b8';
      context.font = '14px sans-serif';
      context.textAlign = 'center';
      context.fillText('Waiting for live order-book snapshot…', mid, height / 2);
    }

    setRenderTimeMs(performance.now() - startedAt);
  }, [book]);

  return (
    <div style={{ background: '#0b1220', borderRadius: 16, padding: 14, border: '1px solid rgba(148,163,184,0.14)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4 style={{ margin: 0, color: '#f8fafc' }}>Canvas Book View</h4>
        <span style={{ color: '#a5b4cf' }}>
          HTML5 Canvas{renderTimeMs === null ? '' : ` · ${renderTimeMs.toFixed(2)} ms`}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={620}
        height={260}
        style={{ width: '100%', height: 260, display: 'block', borderRadius: 12, background: '#081221' }}
      />
    </div>
  );
}
