'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DeviceCard from '@/components/DeviceCard';
import AddDeviceModal from '@/components/AddDeviceModal';
import GlowLoader from '@/components/GlowLoader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100';

export default function DashboardPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollingIds, setPollingIds] = useState(new Set());
  const [restartingIds, setRestartingIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [confirmRestart, setConfirmRestart] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pollAllLoading, setPollAllLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/devices`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Fetch devices error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 15000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const handlePoll = async (deviceId) => {
    setPollingIds(prev => new Set([...prev, deviceId]));
    try {
      const res = await fetch(`${API_BASE}/poll/${deviceId}`);
      if (!res.ok) throw new Error('Poll failed');
      showToast('Device polled successfully');
      await fetchDevices();
    } catch (err) {
      showToast(`Poll failed: ${err.message}`, 'error');
    } finally {
      setPollingIds(prev => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  };

  const handlePollAll = async () => {
    setPollAllLoading(true);
    try {
      const res = await fetch(`${API_BASE}/poll`);
      if (!res.ok) throw new Error('Poll all failed');
      const data = await res.json();
      showToast(`Polled ${data.polled} devices`);
      await fetchDevices();
    } catch (err) {
      showToast(`Poll all failed: ${err.message}`, 'error');
    } finally {
      setPollAllLoading(false);
    }
  };

  const handleRestart = async (device) => {
    setConfirmRestart(device);
  };

  const confirmRestartAction = async () => {
    const device = confirmRestart;
    setConfirmRestart(null);
    setRestartingIds(prev => new Set([...prev, device.id]));

    try {
      const res = await fetch(`${API_BASE}/restart/${device.id}`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Restart failed');
      }
      showToast(`Restart command sent to ${device.name}`);
      await fetchDevices();
    } catch (err) {
      showToast(`Restart failed: ${err.message}`, 'error');
    } finally {
      setRestartingIds(prev => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const handleEdit = (device) => {
    setEditDevice(device);
    setModalOpen(true);
  };

  const handleDelete = (device) => {
    setConfirmDelete(device);
  };

  const confirmDeleteAction = async () => {
    const device = confirmDelete;
    setConfirmDelete(null);

    try {
      const res = await fetch(`${API_BASE}/devices/${device.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`${device.name} deleted`);
      await fetchDevices();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleAddOrUpdate = async (formData, deviceId) => {
    try {
      const url = deviceId ? `${API_BASE}/devices/${deviceId}` : `${API_BASE}/devices`;
      const method = deviceId ? 'PUT' : 'POST';

      // for edit mode, only send password if it was actually entered
      const payload = { ...formData };
      if (deviceId && !payload.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Save failed');
      }
      showToast(deviceId ? 'Device updated' : 'Device added');
      setModalOpen(false);
      setEditDevice(null);
      await fetchDevices();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  // stats
  const totalDevices = devices.length;
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const warningCount = devices.filter(d => ['auth_error', 'error', 'restarting'].includes(d.status)).length;

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar deviceCount={0} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <GlowLoader />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <Sidebar deviceCount={totalDevices} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">VoltPulse NOC</h1>
              <p className="page-subtitle">Real-time monitoring of all network devices</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={handlePollAll} disabled={pollAllLoading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {pollAllLoading ? 'Polling All...' : 'Poll All'}
              </button>
              <button className="btn btn-primary" onClick={() => { setEditDevice(null); setModalOpen(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Device
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalDevices}</div>
              <div className="stat-label">Total Devices</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon online">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{onlineCount}</div>
              <div className="stat-label">Online</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon offline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{offlineCount}</div>
              <div className="stat-label">Offline</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{warningCount}</div>
              <div className="stat-label">Warnings</div>
            </div>
          </div>
        </div>

        {/* Device Grid or Empty State */}
        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" /><line x1="14" y1="10" x2="14" y2="14" /><circle cx="18" cy="12" r="1" />
              </svg>
            </div>
            <h3 className="empty-state-title">No Devices Yet</h3>
            <p className="empty-state-text">
              Start by adding your first network device. We support MikroTik, Ruijie, Ruckus, and UniFi devices.
            </p>
            <button className="btn btn-primary" onClick={() => { setEditDevice(null); setModalOpen(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add First Device
            </button>
          </div>
        ) : (
          <div className="device-grid">
            {devices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onPoll={handlePoll}
                onRestart={handleRestart}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isPolling={pollingIds.has(device.id)}
                isRestarting={restartingIds.has(device.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddDeviceModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditDevice(null); }}
        onSubmit={handleAddOrUpdate}
        editDevice={editDevice}
      />

      {/* Restart Confirmation */}
      {confirmRestart && (
        <div className="modal-overlay" onClick={() => setConfirmRestart(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Restart</h2>
              <button className="modal-close" onClick={() => setConfirmRestart(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-dialog">
                <div className="confirm-icon restart">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                </div>
                <p className="confirm-text">Are you sure you want to restart this device?</p>
                <div className="confirm-device-name">{confirmRestart.name} ({confirmRestart.ip})</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmRestart(null)}>Cancel</button>
              <button className="btn btn-restart" onClick={confirmRestartAction}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                Confirm Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Device</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-dialog">
                <div className="confirm-icon delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </div>
                <p className="confirm-text">This action cannot be undone. All metrics history will be lost.</p>
                <div className="confirm-device-name">{confirmDelete.name} ({confirmDelete.ip})</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteAction}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                Delete Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
