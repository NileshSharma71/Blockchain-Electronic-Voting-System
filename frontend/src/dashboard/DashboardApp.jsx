import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const f = (url) => fetch(`${API}${url}`, { credentials: 'include' }).then(r => r.json()).catch(() => null);

export default function DashboardApp() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [elections, setElections] = useState([]);
  const [ballots, setBallots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      f('/api/blockchain/stats'),
      f('/api/blockchain/dashboard-dump'),
    ]).then(([chainStats, dumpData]) => {
      if (dumpData) {
        setUsers(dumpData.users || []);
        setElections(dumpData.elections || []);
        setBallots(dumpData.ballots || []);

        const activeElections = (dumpData.elections || []).filter(e => e.status === 'active').length;
        const pendingUsers = (dumpData.users || []).filter(u => !u.isVerified).length;
        
        setStats({
          chain: chainStats,
          admin: {
            totalUsers: (dumpData.users || []).length,
            pendingUsers,
            totalElections: (dumpData.elections || []).length,
            activeElections,
            totalBallots: (dumpData.ballots || []).length,
          },
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Tab switching no longer requires individual fetches since we have the full dump
    setSelected(null);
  }, [tab]);


  const sel = selected ? users.find(u => u._id === selected) : null;

  function statusColor(s) {
    return s === 'active' ? 'win-badge-true' : s === 'upcoming' ? 'win-badge-review' : 'win-badge-pending';
  }

  return (
    <div className="win-desktop">
      <div className="win-taskbar">
        <div className="win-start-btn">
          <span style={{ fontSize: 14 }}>🗄️</span>
          <span>E-Vote DB</span>
        </div>
        <div className="win-taskbar-divider" />
        <div className="win-taskbar-items">
          <span className={`win-taskbar-item ${tab === 'overview'   ? 'active' : ''}`} onClick={() => setTab('overview')}>📊 Overview</span>
          <span className={`win-taskbar-item ${tab === 'elections'  ? 'active' : ''}`} onClick={() => setTab('elections')}>🗳️ Elections</span>
          <span className={`win-taskbar-item ${tab === 'users'      ? 'active' : ''}`} onClick={() => setTab('users')}>👥 Voters</span>
          <span className={`win-taskbar-item ${tab === 'ballots'    ? 'active' : ''}`} onClick={() => setTab('ballots')}>🧾 Ballots</span>
        </div>
        <button className="win-btn" onClick={toggle} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 11 }}>
          {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
        </button>
        <div className="win-taskbar-clock">Port 5175</div>
      </div>

      <div className="app-container">
        <div className="win-window">
          <div className="win-titlebar">
            <span className="win-titlebar-text">🗄️ Off-Chain Storage — MongoDB E-Voting Database</span>
          </div>
          <div className="win-content">
            {loading ? <div className="win-loading">⏳ Loading database...</div> : (<>

              {/* Overview */}
              {tab === 'overview' && (
                <div>
                  <div className="win-group win-mb-8">
                    <span className="win-group-label">Database Info</span>
                    <table className="win-table"><tbody>
                      <tr><td style={{ fontWeight: 700 }}>Engine</td>    <td>MongoDB (localhost:27017/evoting)</td></tr>
                      <tr><td style={{ fontWeight: 700 }}>Collections</td><td>users, elections, ballots, electionresults</td></tr>
                      <tr><td style={{ fontWeight: 700 }}>Status</td>     <td><span className="win-text-success">● Connected</span></td></tr>
                    </tbody></table>
                  </div>

                  <div className="win-group win-mb-8">
                    <span className="win-group-label">Collection Counts</span>
                    <div className="win-flex win-gap-8" style={{ padding: '8px 0', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total Users',      val: stats?.admin?.totalUsers       || 0, icon: '👥' },
                        { label: 'Total Elections',  val: stats?.admin?.totalElections   || 0, icon: '🗳️' },
                        { label: 'Total Ballots',    val: stats?.admin?.totalBallots     || 0, icon: '🧾' },
                        { label: 'Active Elections', val: stats?.admin?.activeElections  || 0, icon: '✅' },
                        { label: 'Pending Voters',  val: stats?.admin?.pendingUsers      || 0, icon: '🔒' },
                        { label: 'On-Chain Ballots',val: stats?.chain?.totalBallots      || 0, icon: '⛓️' },
                      ].map(c => (
                        <div key={c.label} className="win-group" style={{ flex: 1, textAlign: 'center', minWidth: 100 }}>
                          <span className="win-group-label">{c.label}</span>
                          <div style={{ fontSize: 24, fontWeight: 900, padding: '8px 0' }}>{c.icon} {c.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="win-group">
                    <span className="win-group-label">Data Architecture</span>
                    <div style={{ fontSize: 12, lineHeight: 1.7, padding: '4px 0' }}>
                      <p style={{ margin: '4px 0' }}>💾 <strong>MongoDB</strong> stores all raw data: user accounts, elections, ballots, and results.</p>
                      <p style={{ margin: '4px 0' }}>⛓️ <strong>Blockchain</strong> stores only cryptographic hashes — used to verify data was not tampered with.</p>
                      <p style={{ margin: '4px 0' }}>🔒 <strong>Voter identity</strong> is hashed before being stored anywhere — even MongoDB only stores internal IDs.</p>
                      <p style={{ margin: '4px 0' }}>📋 <strong>Ballot collection</strong>: each document has electionId, voterId, candidateId, ballotHash, nonce, voterIpHash, onChainTxHash.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Elections */}
              {tab === 'elections' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>Elections Collection ({elections.length} documents)</div>
                  {elections.length === 0
                    ? <div className="win-text-small" style={{ color: '#888', padding: 8 }}>No elections yet.</div>
                    : (
                      <table className="win-table">
                        <thead><tr><th>Title</th><th>Status</th><th>Candidates</th><th>Votes</th><th>Start</th><th>End</th></tr></thead>
                        <tbody>
                          {elections.map(e => (
                            <tr key={e._id}>
                              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</td>
                              <td><span className={`win-badge ${statusColor(e.status)}`}>{e.status}</span></td>
                              <td style={{ textAlign: 'right' }}>{e.candidates?.length || 0}</td>
                              <td style={{ textAlign: 'right' }}>{e.totalVotes || 0}</td>
                              <td style={{ fontSize: 11 }}>{new Date(e.startTime).toLocaleString()}</td>
                              <td style={{ fontSize: 11 }}>{new Date(e.endTime).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  }
                </div>
              )}

              {/* Voters */}
              {tab === 'users' && (
                <div className="win-flex win-gap-8" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>Users Collection ({users.length} documents)</div>
                    <table className="win-table">
                      <thead><tr><th>Username</th><th>Role</th><th>Verified</th><th>Status</th><th>Votes Cast</th><th>Joined</th></tr></thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id} style={{ cursor: 'pointer', background: selected === u._id ? 'rgba(0,0,128,0.05)' : '' }}
                            onClick={() => setSelected(u._id)}>
                            <td style={{ fontWeight: selected === u._id ? 700 : 400 }}>{u.username}</td>
                            <td>{u.role === 'admin' ? '🛡️ Admin' : '🗳️ Voter'}</td>
                            <td>{u.isVerified ? '✓ Yes' : '⊘ No'}</td>
                            <td>
                              <span className={`win-badge ${u.verificationStatus === 'verified' ? 'win-badge-true' : u.verificationStatus === 'rejected' ? 'win-badge-false' : 'win-badge-pending'}`}>
                                {u.verificationStatus || 'pending'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{u.votedIn?.length || 0}</td>
                            <td style={{ fontSize: 11 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sel && (
                    <div style={{ width: 240, flexShrink: 0 }}>
                      <div className="win-window">
                        <div className="win-titlebar">
                          <span className="win-titlebar-text">👤 {sel.username}</span>
                          <div className="win-titlebar-buttons">
                            <span className="win-titlebar-btn" onClick={() => setSelected(null)}>✕</span>
                          </div>
                        </div>
                        <div className="win-content">
                          <table className="win-table"><tbody>
                            <tr><td style={{ fontWeight: 700 }}>ID</td><td style={{ fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>{sel._id}</td></tr>
                            <tr><td style={{ fontWeight: 700 }}>Role</td><td>{sel.role}</td></tr>
                            <tr><td style={{ fontWeight: 700 }}>Verified</td><td>{sel.isVerified ? '✓ Yes' : '⊘ No'}</td></tr>
                            <tr><td style={{ fontWeight: 700 }}>Status</td><td>{sel.verificationStatus || 'pending'}</td></tr>
                            <tr><td style={{ fontWeight: 700 }}>Votes Cast</td><td>{sel.votedIn?.length || 0}</td></tr>
                            <tr><td style={{ fontWeight: 700 }}>Joined</td><td>{new Date(sel.createdAt).toLocaleDateString()}</td></tr>
                          </tbody></table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ballots */}
              {tab === 'ballots' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>Ballots Collection (showing up to 50 recent)</div>
                  <div className="win-text-small win-mb-4" style={{ color: '#666' }}>
                    Voter identity is never stored in plain text. candidateId and ballotHash allow cross-referencing with the blockchain.
                  </div>
                  {ballots.length === 0
                    ? <div className="win-text-small" style={{ color: '#888', padding: 8 }}>No ballots yet. Cast a vote first!</div>
                    : (
                      <table className="win-table">
                        <thead><tr>
                          <th>Election</th>
                          <th>Ballot Hash</th>
                          <th>On-Chain Tx</th>
                          <th>Cast At</th>
                        </tr></thead>
                        <tbody>
                          {ballots.map((b, i) => (
                            <tr key={i}>
                              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                                {b.electionTitle}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 10 }} title={b.ballotHash}>
                                {b.ballotHash?.slice(0, 12)}...{b.ballotHash?.slice(-6)}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 10 }}>
                                {b.onChainTxHash
                                  ? <span style={{ color: '#005000' }}>{b.onChainTxHash.slice(0, 10)}...</span>
                                  : <span style={{ color: '#888' }}>Off-chain only</span>
                                }
                              </td>
                              <td style={{ fontSize: 11 }}>{new Date(b.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  }
                </div>
              )}

            </>)}
          </div>
          <div className="win-statusbar">
            <div className="win-statusbar-section">● Connected to MongoDB</div>
            <div className="win-statusbar-section" style={{ flex: 0, minWidth: 120 }}>Tab: {tab}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
