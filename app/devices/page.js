'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import AddDeviceModal from '@/components/AddDeviceModal';
import StatusBadge from '@/components/StatusBadge';
import GlowLoader from '@/components/GlowLoader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

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
  }, [fetchDevices]);

  const handleAddOrUpdate = async (formData, deviceId) => {
    try {
      const url = deviceId ? `${API_BASE}/devices/${deviceId}` : `${API_BASE}/devices`;
      const method = deviceId ? 'PUT' : 'POST';

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

  const brandColors = {
    mikrotik: '#009bde',
    ruijie: '#e84118',
    ruckus: '#9c27b0',
    unifi: '#0072c6',
  };

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

      <Sidebar deviceCount={devices.length} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Device Management</h1>
              <p className="page-subtitle">Add, edit, and remove network devices</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditDevice(null); setModalOpen(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Device
            </button>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" /><line x1="14" y1="10" x2="14" y2="14" /><circle cx="18" cy="12" r="1" />
              </svg>
            </div>
            <h3 className="empty-state-title">No Devices Configured</h3>
            <p className="empty-state-text">
              Add your network devices to start monitoring them. We support MikroTik, Ruijie, Ruckus, and UniFi.
            </p>
            <button className="btn btn-primary" onClick={() => { setEditDevice(null); setModalOpen(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add First Device
            </button>
          </div>
        ) : (
          <div className="device-table-container">
            <table className="device-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>IP Address</th>
                  <th>Brand</th>
                  <th>Status</th>
                  <th>Last Poll</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id}>
                    <td>
                      <div className="table-device-name">{device.name}</div>
                    </td>
                    <td>
                      <span className="table-device-ip">{device.ip}:{device.port}</span>
                    </td>
                    <td>
                      <span className="brand-tag" style={{ borderColor: brandColors[device.brand], color: brandColors[device.brand] }}>
                        {device.brand}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={device.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--steel-slate)', fontFamily: 'var(--font-mono)' }}>
                        {device.last_poll ? new Date(device.last_poll + 'Z').toLocaleString() : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-icon" title="Edit" onClick={() => handleEdit(device)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="btn btn-icon" title="Delete" style={{ color: 'var(--danger-coral)' }} onClick={() => handleDelete(device)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Toast */}
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
