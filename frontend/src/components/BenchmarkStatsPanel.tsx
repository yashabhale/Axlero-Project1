import { useEffect, useRef, useState } from 'react';

export type BenchmarkStats = {
  rate: number;
  fps: number;
  queueDepth: number;
  droppedFrames: number;
  renderLatencyMs: number;
};

export function BenchmarkStatsPanel({
  rate,
  queueDepth,
  droppedFrames,
  renderLatencyMs,
}: {
  rate: number;
  queueDepth: number;
  droppedFrames: number;
  renderLatencyMs: number;
}) {
  const [fps, setFps] = useState(60);
  const framesRef = useRef(0);
  const lastTsRef = useRef(performance.now());

  useEffect(() => {
    let rafId = 0;

    const tick = (now: number) => {
      framesRef.current += 1;
      const elapsed = now - lastTsRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / elapsed));
        framesRef.current = 0;
        lastTsRef.current = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const stats: BenchmarkStats = {
    rate,
    fps,
    queueDepth,
    droppedFrames,
    renderLatencyMs,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
      <Metric label="Input Rate" value={`${stats.rate.toLocaleString()} msg/s`} />
      <Metric label="FPS" value={`${stats.fps}`} />
      <Metric label="Queue" value={`${stats.queueDepth}`} />
      <Metric label="Dropped Frames" value={`${stats.droppedFrames}`} />
      <Metric label="Latency" value={`${stats.renderLatencyMs.toFixed(1)} ms`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, padding: 12 }}>
      <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{value}</div>
    </div>
  );
}
