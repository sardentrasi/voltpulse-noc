'use client';

export default function StatusBadge({ status }) {
  const labels = {
    online: 'Online',
    offline: 'Offline',
    restarting: 'Restarting',
    unknown: 'Unknown',
    auth_error: 'Auth Error',
    error: 'Error',
  };

  return (
    <span className={`status-badge ${status || 'unknown'}`}>
      <span className="status-dot" />
      {labels[status] || status || 'Unknown'}
    </span>
  );
}
