import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useState, useEffect } from 'react';
import { getAdminStats } from '../utils/api';

const DEMO_USERS = [
  { label: 'admin (Admin)', email: 'admin@evoting.local', pass: 'demo123' },
  { label: 'rahul_kumar', email: 'rahul@demo.local', pass: 'demo123' },
  { label: 'priya_sharma', email: 'priya@demo.local', pass: 'demo123' },
  { label: 'amit_singh', email: 'amit@demo.local', pass: 'demo123' },
  { label: 'neha_gupta', email: 'neha@demo.local', pass: 'demo123' },
  { label: 'arjun_verma', email: 'arjun@demo.local', pass: 'demo123' },
  { label: 'sneha_joshi', email: 'sneha@demo.local', pass: 'demo123' },
  { label: 'vikram_meena', email: 'vikram@demo.local', pass: 'demo123' },
  { label: 'ananya_das', email: 'ananya@demo.local', pass: 'demo123' },
  { label: 'rohit_patel', email: 'rohit@demo.local', pass: 'demo123' },
];

export default function Navbar() {
  const { user, switchUser } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [switching, setSwitching] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      getAdminStats().then(s => setPendingCount(s.pendingUsers || 0)).catch(() => { });
    }
  }, [user]);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  async function handleSwitch(e) {
    const val = e.target.value;
    if (!val) return;
    const u = DEMO_USERS.find(d => d.email === val);
    if (!u) return;
    setSwitching(true);
    try { await switchUser(u.email, u.pass); } catch { }
    setSwitching(false);
  }

  return (
    <div className="win-taskbar">
      <Link to="/" className="win-start-btn" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 14 }}>🗳️</span>
        <span>E-Vote</span>
      </Link>
      <div className="win-taskbar-divider" />
      <div className="win-taskbar-items">
        <Link to="/" className={`win-taskbar-item ${isActive('/')}`}>🏠 Home</Link>
        <Link to="/verify" className={`win-taskbar-item ${isActive('/verify')}`}>🔍 Verify</Link>
        {user?.role === 'admin' && (
          <Link to="/create" className={`win-taskbar-item ${isActive('/create')}`}>➕ Create</Link>
        )}
        {user && (
          <Link to="/profile" className={`win-taskbar-item ${isActive('/profile')}`}>👤 Account</Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" className={`win-taskbar-item ${isActive('/admin')}`} style={{ position: 'relative' }}>
            ⚙️ Admin
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#c00', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingCount}</span>
            )}
          </Link>
        )}
      </div>
      <div className="win-taskbar-divider" />
      <button className="win-btn" onClick={toggle} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 11 }}>
        {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
      </button>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select className="win-select" style={{ fontSize: 11, maxWidth: 140 }} value={user.email} onChange={handleSwitch} disabled={switching}>
            {DEMO_USERS.map(d => (<option key={d.email} value={d.email}>{d.label}</option>))}
          </select>
          <div className="win-inset" style={{ padding: '2px 8px', fontSize: 11, background: '#fff' }}>
            <span style={{ fontWeight: 700 }}>{user.role === 'admin' ? '🛡️' : '🗳️'} {user.username}</span>
          </div>
        </div>
      )}
      <div className="win-taskbar-clock">{time}</div>
    </div>
  );
}
