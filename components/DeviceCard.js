'use client';

import StatusBadge from './StatusBadge';
import MetricBar from './MetricBar';

const BRAND_LABELS = {
  mikrotik: 'MT',
  ruijie: 'RJ',
  ruckus: 'RK',
  unifi: 'UF',
};

export default function DeviceCard({ device, onRestart, onPoll, onEdit, onDelete, isPolling, isRestarting }) {
  const status = device.status || 'unknown';
  const brandCode = BRAND_LABELS[device.brand] || '??';

  const formatLastPoll = (timestamp) => {
    if (!timestamp) return 'Never polled';
    const date = new Date(timestamp + 'Z');
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`device-card ${status}`}>
      <div className="device-card-header">
        <div className="device-identity">
          <div className={`device-avatar ${device.brand}`}>
            {brandCode}
          </div>
          <div className="device-name-group">
            <div className="device-name">{device.name}</div>
            <div className="device-ip">{device.ip}:{device.port}</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="device-metrics">
        <MetricBar label="CPU" value={device.cpu_percent} />
        <MetricBar label="RAM" value={device.ram_percent} />
      </div>

      <div className="uptime-row">
        <svg className="uptime-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="uptime-label">Uptime</span>
        <span className="uptime-value">{device.uptime || '—'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span className="brand-tag">{device.brand}</span>
        <span className="last-poll">{formatLastPoll(device.last_poll)}</span>
      </div>

      <div className="device-card-actions">
        <button
          className="btn btn-ghost btn-full"
          onClick={() => onPoll(device.id)}
          disabled={isPolling}
          title="Poll device"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {isPolling ? 'Polling...' : 'Poll'}
        </button>
        <button
          className="btn btn-restart"
          onClick={() => onRestart(device)}
          disabled={isRestarting || status === 'restarting'}
          title="Restart device"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {isRestarting ? '...' : 'Restart'}
        </button>
        <button
          className="btn btn-icon"
          onClick={() => onEdit(device)}
          title="Edit device"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="btn btn-icon"
          onClick={() => onDelete(device)}
          title="Delete device"
          style={{ color: 'var(--danger-coral)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
