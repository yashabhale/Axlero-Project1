import { useState } from 'react';

export type BenchmarkRate = 100 | 1000 | 5000 | 10000;

export function BenchmarkControls({
  value,
  onChange,
}: {
  value: BenchmarkRate;
  onChange: (nextRate: BenchmarkRate) => void;
}) {
  const rates: BenchmarkRate[] = [100, 1000, 5000, 10000];

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 16px' }}>
      {rates.map((rate) => (
        <button
          key={rate}
          onClick={() => onChange(rate)}
          style={{
            border: value === rate ? '1px solid #67e8f9' : '1px solid rgba(148,163,184,0.3)',
            background: value === rate ? '#0f172a' : '#111827',
            color: '#e2e8f0',
            borderRadius: 999,
            padding: '8px 12px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {rate.toLocaleString()} msg/s
        </button>
      ))}
    </div>
  );
}
