'use client';

export default function MetricBar({ label, value, unit = '%' }) {
  const numericValue = typeof value === 'number' ? value : 0;
  const displayValue = value !== null && value !== undefined ? `${numericValue.toFixed(1)}${unit}` : '—';

  let level = 'low';
  if (numericValue >= 80) level = 'high';
  else if (numericValue >= 50) level = 'medium';

  return (
    <div className="metric-row">
      <div className="metric-label-row">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{displayValue}</span>
      </div>
      <div className="metric-bar-track">
        <div
          className={`metric-bar-fill ${level}`}
          style={{ width: `${Math.min(numericValue, 100)}%` }}
        />
      </div>
    </div>
  );
}
