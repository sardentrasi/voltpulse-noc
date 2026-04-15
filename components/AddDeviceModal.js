'use client';

import { useState, useEffect } from 'react';

const BRANDS = [
  { value: 'mikrotik', label: 'MikroTik' },
  { value: 'ruijie', label: 'Ruijie' },
  { value: 'ruckus', label: 'Ruckus' },
  { value: 'unifi', label: 'UniFi' },
];

export default function AddDeviceModal({ isOpen, onClose, onSubmit, editDevice }) {
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: 22,
    username: '',
    password: '',
    brand: 'mikrotik',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editDevice) {
      setFormData({
        name: editDevice.name || '',
        ip: editDevice.ip || '',
        port: editDevice.port || 22,
        username: editDevice.username || '',
        password: '',
        brand: editDevice.brand || 'mikrotik',
      });
    } else {
      setFormData({ name: '', ip: '', port: 22, username: '', password: '', brand: 'mikrotik' });
    }
  }, [editDevice, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSubmit(formData, editDevice?.id);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editDevice;
  const title = isEditing ? 'Edit Device' : 'Add New Device';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="device-name">Device Name</label>
              <input
                id="device-name"
                className="form-input"
                type="text"
                name="name"
                placeholder="e.g. Router Lantai 1"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="device-ip">IP Address</label>
                <input
                  id="device-ip"
                  className="form-input"
                  type="text"
                  name="ip"
                  placeholder="192.168.1.1"
                  value={formData.ip}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="device-port">SSH Port</label>
                <input
                  id="device-port"
                  className="form-input"
                  type="number"
                  name="port"
                  placeholder="22"
                  value={formData.port}
                  onChange={handleChange}
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="device-brand">Brand</label>
              <select
                id="device-brand"
                className="form-select"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
              >
                {BRANDS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="device-username">Username</label>
                <input
                  id="device-username"
                  className="form-input"
                  type="text"
                  name="username"
                  placeholder="admin"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="device-password">Password</label>
                <input
                  id="device-password"
                  className="form-input"
                  type="password"
                  name="password"
                  placeholder={isEditing ? '(unchanged)' : 'Enter password'}
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEditing}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isEditing ? (
                  <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>
                ) : (
                  <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                )}
              </svg>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
