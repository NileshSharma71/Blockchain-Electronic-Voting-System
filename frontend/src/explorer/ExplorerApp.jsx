import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const f = (url) => fetch(`${API}${url}`).then(r => r.json()).catch(() => null);

// Removed shortHash to allow full visibility of hashes

export default function ExplorerApp() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState('overview');
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [ballotEvents, setBallotEvents] = useState([]);
  const [resultEvents, setResultEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification state
  const [verifyInput, setVerifyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { type: 'ballot'|'result', hash, data, error }

  const handleVerify = async (e) => {
    e.preventDefault();
    const h = verifyInput.trim();
    if (!h) return;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      // 1. Check if it's a Ballot Hash
      const bMatch = ballotEvents.find(ev => ev.ballotHash === h);
      if (bMatch) {
        // Fetch DB to find election title and cast time
        const dump = await f('/api/blockchain/dashboard-dump');
        const ballot = dump?.ballots?.find(b => b.ballotHash === h);
        const election = dump?.elections?.find(e => e._id === ballot?.electionId);
        
        setVerifyResult({
          type: 'ballot',
          hash: h,
          block: bMatch.blockNumber,
          timestamp: bMatch.timestamp,
          db: ballot ? {
            electionTitle: election?.title || 'Unknown Election',
            castAt: ballot.createdAt
          } : null
        });
        setIsVerifying(false);
        return;
      }

      // 2. Check if it's a Result Hash
      const rMatch = resultEvents.find(ev => ev.resultHash === h);
      if (rMatch) {
        // Fetch DB to find election details and results
        const [dump, resultsData] = await Promise.all([
          f('/api/blockchain/dashboard-dump'),
          f('/api/results?limit=100') // Public results endpoint
        ]);
        
        const resultDoc = resultsData?.results?.find(r => r.resultProofHash === h);
        const election = dump?.elections?.find(e => e._id === resultDoc?.electionId?._id || e._id === resultDoc?.electionId);

        setVerifyResult({
          type: 'result',
          hash: h,
          block: rMatch.blockNumber,
          timestamp: rMatch.timestamp,
          db: resultDoc ? {
            electionTitle: election?.title || resultDoc.electionId?.title || 'Unknown Election',
            winner: resultDoc.winnerName || 'Tie / None',
            totalVotes: resultDoc.totalVotes,
            tally: resultDoc.results
          } : null
        });
        setIsVerifying(false);
        return;
      }

      // 3. Not found
      setVerifyResult({ error: 'Hash not found in on-chain audit logs.' });
    } catch (e) {
      setVerifyResult({ error: 'Verification failed due to a network error.' });
    }
    setIsVerifying(false);
  };

  const loadData = useCallback(async () => {
    try {
      const [h, s, be, re] = await Promise.all([
        f('/api/blockchain/health'),
        f('/api/blockchain/stats'),
        f('/api/blockchain/ballots?limit=25'),
        f('/api/blockchain/results?limit=25'),
      ]);
      setHealth(h);
      setStats(s);
      setBallotEvents(be?.items || []);
      setResultEvents(re?.items || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  return (
    <div className="win-desktop">
      <div className="win-taskbar">
        <div className="win-start-btn">
          <span style={{ fontSize: 14 }}>⛓️</span>
          <span>E-Vote Explorer</span>
        </div>
        <div className="win-taskbar-divider" />
        <div className="win-taskbar-items">
          <span className={`win-taskbar-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            📊 Overview
          </span>
          <span className={`win-taskbar-item ${tab === 'ballots' ? 'active' : ''}`} onClick={() => setTab('ballots')}>
            🗳️ Ballot Audit Log
          </span>
          <span className={`win-taskbar-item ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>
            📋 Result Proofs
          </span>
          <span className={`win-taskbar-item ${tab === 'verify' ? 'active' : ''}`} onClick={() => setTab('verify')}>
            🔍 Verify Hash
          </span>
        </div>
        <button className="win-btn" onClick={toggle} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 11 }}>
          {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
        </button>
        <div className="win-taskbar-clock">Port 5174</div>
      </div>

      <div className="app-container">
        <div className="win-window">
          <div className="win-titlebar">
            <span className="win-titlebar-text">⛓️ Blockchain E-Voting Audit Explorer — BallotAuditRegistry</span>
          </div>
          <div className="win-content">
            {loading ? (
              <div className="win-loading">⏳ Connecting to blockchain...</div>
            ) : (<>

              {/* Overview Tab */}
              {tab === 'overview' && (
                <div>
                  <div className="win-group win-mb-8">
                    <span className="win-group-label">Network Status</span>
                    <table className="win-table"><tbody>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Status</td>
                        <td>{health?.connected
                          ? <span className="win-text-success">● Connected to Hardhat</span>
                          : <span className="win-text-error">● Disconnected</span>}
                        </td>
                      </tr>
                      <tr><td style={{ fontWeight: 700 }}>RPC URL</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{health?.rpcUrl || '—'}</td></tr>
                      <tr><td style={{ fontWeight: 700 }}>Chain ID</td><td>{health?.chainId || '—'}</td></tr>
                      <tr><td style={{ fontWeight: 700 }}>Contract</td><td style={{ fontFamily: 'monospace', fontSize: 11 }}>{health?.contractAddress || 'Not deployed yet'}</td></tr>
                      <tr><td style={{ fontWeight: 700 }}>Block Height</td><td>{stats?.blockNumber || 0}</td></tr>
                    </tbody></table>
                  </div>

                  <div className="win-group win-mb-8">
                    <span className="win-group-label">Audit Counts</span>
                    <div className="win-flex win-gap-8" style={{ padding: '8px 0', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Ballots On-Chain',        val: stats?.totalBallots   || 0, icon: '🗳️' },
                        { label: 'Results On-Chain',        val: stats?.totalResults   || 0, icon: '📋' },
                        { label: 'Off-Chain Ballots (DB)',  val: stats?.totalOffChainBallots || 0, icon: '💾' },
                      ].map(card => (
                        <div key={card.label} className="win-group" style={{ flex: 1, textAlign: 'center', minWidth: 120 }}>
                          <span className="win-group-label">{card.label}</span>
                          <div style={{ fontSize: 28, fontWeight: 900, padding: '8px 0' }}>{card.icon} {card.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="win-group">
                    <span className="win-group-label">How This Works</span>
                    <div style={{ fontSize: 12, lineHeight: 1.7, padding: '4px 0' }}>
                      <p style={{ margin: '4px 0' }}>📌 Every ballot cast generates a <strong>SHA-256 hash</strong> of (voterIdHash + ballotHash + electionIdHash).</p>
                      <p style={{ margin: '4px 0' }}>⛓️ This hash is logged to the <strong>BallotAuditRegistry</strong> smart contract — permanently, immutably, on-chain.</p>
                      <p style={{ margin: '4px 0' }}>🔍 When an election ends, the final tally is also hashed and recorded as a <strong>Result Proof</strong>.</p>
                      <p style={{ margin: '4px 0' }}>✅ Anyone can verify any ballot by comparing its hash here with the off-chain MongoDB record.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ballot Audit Log Tab */}
              {tab === 'ballots' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>
                    On-Chain Ballot Audit Log ({ballotEvents.length} shown)
                  </div>
                  <div className="win-text-small win-mb-4" style={{ color: '#666' }}>
                    Each row is an immutable blockchain record. Voter identity is hashed — fully anonymous.
                  </div>
                  {ballotEvents.length === 0 ? (
                    <div className="win-text-small" style={{ padding: 8, color: '#888' }}>
                      No on-chain ballot events yet. Blockchain may not be running or no votes cast.
                    </div>
                  ) : (
                    <table className="win-table">
                      <thead><tr>
                        <th>Tx Hash</th>
                        <th>Ballot Hash</th>
                        <th>Election Hash</th>
                        <th>Block</th>
                        <th>Time</th>
                      </tr></thead>
                      <tbody>
                        {ballotEvents.map((ev, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.txHash || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.ballotHash || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.electionIdHash || '—'}</td>
                            <td>{ev.blockNumber || '—'}</td>
                            <td style={{ fontSize: 11 }}>{ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Result Proofs Tab */}
              {tab === 'results' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>
                    On-Chain Election Result Proofs ({resultEvents.length} shown)
                  </div>
                  <div className="win-text-small win-mb-4" style={{ color: '#666' }}>
                    Final tally hashes stored on-chain. Proves election results were not altered after closing.
                  </div>
                  {resultEvents.length === 0 ? (
                    <div className="win-text-small" style={{ padding: 8, color: '#888' }}>
                      No result proofs yet. Results are logged when an election is finalized.
                    </div>
                  ) : (
                    <table className="win-table">
                      <thead><tr>
                        <th>Tx Hash</th>
                        <th>Result Proof Hash</th>
                        <th>Election Hash</th>
                        <th>Block</th>
                        <th>Time</th>
                      </tr></thead>
                      <tbody>
                        {resultEvents.map((ev, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.txHash || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.resultHash || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', paddingRight: 16, userSelect: 'all' }}>{ev.electionIdHash || '—'}</td>
                            <td>{ev.blockNumber || '—'}</td>
                            <td style={{ fontSize: 11 }}>{ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Verify Hash Tab */}
              {tab === 'verify' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>
                    Universal Blockchain Verifier
                  </div>
                  <div className="win-text-small win-mb-8" style={{ color: '#666' }}>
                    Paste any Ballot Hash or Result Hash to independently verify its existence on the blockchain and view the associated public off-chain data.
                  </div>

                  <div className="win-group win-mb-8">
                    <span className="win-group-label">Input Hash</span>
                    <form onSubmit={handleVerify}>
                      <div className="win-flex win-gap-4 win-items-center" style={{ padding: '8px 0' }}>
                        <input
                          className="win-input"
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
                          value={verifyInput}
                          onChange={e => setVerifyInput(e.target.value)}
                          placeholder="Paste 64-character hash here..."
                        />
                        <button type="submit" className="win-btn win-btn-primary" disabled={!verifyInput.trim() || isVerifying}>
                          {isVerifying ? '⏳ Checking...' : '🔍 Verify'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {verifyResult && (
                    <div className="win-group">
                      <span className="win-group-label">Verification Result</span>
                      
                      {verifyResult.error ? (
                        <div style={{ padding: '10px 14px', background: 'rgba(192,0,0,0.06)', border: '2px solid #c00', borderRadius: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#800', marginBottom: 4 }}>
                            ❌ NOT FOUND
                          </div>
                          <div style={{ fontSize: 12, color: '#333' }}>{verifyResult.error}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ padding: '10px 14px', background: 'rgba(0,128,0,0.08)', border: '2px solid #008000', borderRadius: 4, marginBottom: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#005000', marginBottom: 4 }}>
                              ✅ AUTHENTIC ON-CHAIN RECORD
                            </div>
                            <div style={{ fontSize: 12, color: '#333' }}>
                              This {verifyResult.type} hash is permanently recorded on the blockchain at Block {verifyResult.block}. The off-chain data below matches this cryptographic proof.
                            </div>
                          </div>
                          
                          <table className="win-table"><tbody>
                            <tr>
                              <td style={{ fontWeight: 700 }}>Record Type</td>
                              <td>{verifyResult.type === 'ballot' ? '🗳️ Individual Ballot' : '📋 Final Election Result'}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 700 }}>Election</td>
                              <td>{verifyResult.db?.electionTitle || '—'}</td>
                            </tr>
                            
                            {verifyResult.type === 'ballot' && (
                              <tr>
                                <td style={{ fontWeight: 700 }}>Cast At</td>
                                <td>{verifyResult.db?.castAt ? new Date(verifyResult.db.castAt).toLocaleString() : '—'}</td>
                              </tr>
                            )}

                            {verifyResult.type === 'result' && (<>
                              <tr>
                                <td style={{ fontWeight: 700 }}>Winner</td>
                                <td style={{ fontWeight: 700, color: '#000080' }}>{verifyResult.db?.winner || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 700 }}>Total Votes</td>
                                <td>{verifyResult.db?.totalVotes || 0}</td>
                              </tr>
                              {verifyResult.db?.tally && verifyResult.db.tally.length > 0 && (
                                <tr>
                                  <td style={{ fontWeight: 700, verticalAlign: 'top' }}>Tally Breakdown</td>
                                  <td>
                                    {verifyResult.db.tally.map(t => (
                                      <div key={t.candidateId} style={{ marginBottom: 4 }}>
                                        {t.candidateName}: <strong>{t.voteCount}</strong>
                                      </div>
                                    ))}
                                  </td>
                                </tr>
                              )}
                            </>)}

                            <tr>
                              <td style={{ fontWeight: 700, verticalAlign: 'top' }}>Verified Hash</td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{verifyResult.hash}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 700 }}>Mined Time</td>
                              <td>{verifyResult.timestamp ? new Date(verifyResult.timestamp * 1000).toLocaleString() : '—'}</td>
                            </tr>
                          </tbody></table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </>)}
          </div>

          <div className="win-statusbar">
            <div className="win-statusbar-section">{health?.connected ? '● Connected' : '● Disconnected'}</div>
            <div className="win-statusbar-section" style={{ flex: 0, minWidth: 160 }}>Ballots on-chain: {stats?.totalBallots || 0}</div>
            <div className="win-statusbar-section" style={{ flex: 0, minWidth: 160 }}>Results on-chain: {stats?.totalResults || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
