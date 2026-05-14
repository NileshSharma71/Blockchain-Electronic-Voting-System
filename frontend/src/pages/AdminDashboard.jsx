import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAdminStats, getAdminUsers, getPendingUsers, verifyUser, rejectUser } from '../utils/api';
import StatsCard from '../components/StatsCard';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadData();
  }, [user, tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'stats') { setStats(await getAdminStats()); }
      else if (tab === 'users') { const d = await getAdminUsers(); setUsers(d.users||[]); }
      else if (tab === 'pending') { const d = await getPendingUsers(); setPending(d.users||[]); }
    } catch {}
    setLoading(false);
  }

  async function handleVerify(id) { await verifyUser(id,'Admin verified'); loadData(); }
  async function handleReject(id) { await rejectUser(id,'Rejected by admin'); loadData(); }

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>
      <div className="win-window">
        <div className="win-titlebar">
          <span className="win-titlebar-text">⚙️ Admin Dashboard</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-tabs" style={{padding:'0 8px'}}>
          <button className={`win-tab ${tab==='stats'?'active':''}`} onClick={()=>setTab('stats')}>📊 Overview</button>
          <button className={`win-tab ${tab==='pending'?'active':''}`} onClick={()=>setTab('pending')}>🔒 Pending Voters</button>
          <button className={`win-tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>👥 All Users</button>
        </div>
        <div className="win-tab-content" style={{margin:'0 8px 8px'}}>
          {loading ? <div className="win-loading">⏳ Loading...</div> : (<>
            {tab === 'stats' && stats && (
              <div className="win-flex win-gap-8" style={{flexWrap:'wrap',padding:'8px 0'}}>
                <StatsCard icon="👥" label="Total Users" value={stats.totalUsers} />
                <StatsCard icon="🗳️" label="Total Elections" value={stats.totalElections} />
                <StatsCard icon="📝" label="Total Ballots" value={stats.totalBallots} />
                <StatsCard icon="✅" label="Active Elections" value={stats.activeElections} />
                <StatsCard icon="🔒" label="Pending Users" value={stats.pendingUsers} />
              </div>
            )}
            {tab === 'pending' && (
              pending.length===0 ? <div className="win-text-small" style={{padding:8}}>No pending users.</div> : (
                <table className="win-table"><thead><tr><th>Username</th><th>Email</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
                  {pending.map(u=>(
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td className="win-text-small">{u.email||'—'}</td>
                      <td className="win-text-small">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="win-flex win-gap-4">
                          <button className="win-btn" style={{padding:'2px 8px',fontSize:11}} onClick={()=>handleVerify(u._id)}>✓ Verify</button>
                          <button className="win-btn win-btn-danger" style={{padding:'2px 8px',fontSize:11}} onClick={()=>handleReject(u._id)}>✗ Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody></table>
              )
            )}
            {tab === 'users' && (
              <table className="win-table"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Verified</th></tr></thead><tbody>
                {users.map(u=>(
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td className="win-text-small">{u.email||'—'}</td>
                    <td>{u.role==='admin'?'🛡️ Admin':'🗳️ Voter'}</td>
                    <td>{u.isVerified?'✓':'⊘'}</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </>)}
        </div>
        <div className="win-statusbar">
          <div className="win-statusbar-section">Admin: {user?.username}</div>
        </div>
      </div>
    </div>
  );
}
