'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function Sidebar({ deviceCount, sidebarOpen, onClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: '/devices',
      label: 'Devices',
      count: deviceCount || 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <line x1="6" y1="10" x2="6" y2="14" />
          <line x1="10" y1="10" x2="10" y2="14" />
          <line x1="14" y1="10" x2="14" y2="14" />
          <circle cx="18" cy="12" r="1" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <div className="sidebar-logo-text">VoltPulse NOC</div>
            </div>
            <span className="sidebar-logo-badge">v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="sidebar-link-count">{item.count}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div style={{ padding: '0 8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--steel-slate)', marginBottom: '4px' }}>Logged in as</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--snow-white)' }}>{user.display_name || user.username}</div>
            </div>
          )}
          <button className="sidebar-logout" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
          <div className="sidebar-footer-text" style={{ marginTop: '12px' }}>
            <span className="sidebar-footer-dot" />
            <span>System Operational</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(5,5,7,0.6)',
            zIndex: 99, display: 'none',
          }}
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <style jsx>{`
        @media (max-width: 1024px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
