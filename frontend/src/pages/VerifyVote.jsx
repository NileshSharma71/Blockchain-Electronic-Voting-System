import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBallots, getElections } from '../utils/api';

export default function VerifyVote() {
  const navigate = useNavigate();
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { found, ballot, election }
  const [error, setError] = useState('');

  async function handleVerify(e) {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Search through elections to find a ballot with this hash
      const { elections } = await getElections(1, '', '');
      let found = null;
      let foundElection = null;

      for (const election of elections) {
        const { ballots } = await getBallots(election._id);
        const match = ballots.find(b => b.ballotHash === hash.trim());
        if (match) {
          found = match;
          foundElection = election;
          break;
        }
      }

      if (found) {
        setResult({ found: true, ballot: found, election: foundElection });
      } else {
        setResult({ found: false });
      }
    } catch (e) {
      setError('Could not complete verification. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>
      <div className="win-window">
        <div className="win-titlebar">
          <span className="win-titlebar-text">🔍 Public Ballot Verifier</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">

          {/* Explanation */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">How Blockchain Verification Works</span>
            <div style={{ fontSize: 12, lineHeight: 1.7, padding: '4px 0', color: '#333' }}>
              <p style={{ margin: '4px 0' }}>📌 When you cast a ballot, a unique <strong>Ballot Hash</strong> is generated from your identity + your choice + a random nonce.</p>
              <p style={{ margin: '4px 0' }}>⛓️ This hash is <strong>permanently recorded on the blockchain</strong> — it cannot be deleted or changed by anyone, including the admin.</p>
              <p style={{ margin: '4px 0' }}>✅ <strong>Anyone</strong> can paste any ballot hash below and verify whether it was truly recorded. No login required.</p>
              <p style={{ margin: '4px 0' }}>🔒 Your identity remains private — only the hash is stored on-chain, not who you are or who you voted for.</p>
            </div>
          </div>

          {/* Verifier form */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Enter Ballot Hash</span>
            <form onSubmit={handleVerify}>
              <div className="win-flex win-gap-4 win-items-center" style={{ padding: '8px 0' }}>
                <input
                  className="win-input"
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                  value={hash}
                  onChange={e => setHash(e.target.value)}
                  placeholder="Paste your ballot hash here (64 hex characters)..."
                />
                <button type="submit" className="win-btn win-btn-primary" disabled={!hash.trim() || loading}>
                  {loading ? '⏳ Checking...' : '🔍 Verify'}
                </button>
              </div>
            </form>
            {error && <div className="win-text-error win-text-small">{error}</div>}
          </div>

          {/* Result */}
          {result && (
            <div className="win-group">
              <span className="win-group-label">Verification Result</span>
              {result.found ? (
                <div>
                  <div style={{
                    padding: '10px 14px', background: 'rgba(0,128,0,0.08)',
                    border: '2px solid #008000', borderRadius: 4, marginBottom: 12,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#005000', marginBottom: 4 }}>
                      ✅ AUTHENTIC — This ballot exists and is verified
                    </div>
                    <div style={{ fontSize: 12, color: '#333' }}>
                      This ballot hash was found in our records. If it matches your on-chain transaction, the vote is genuine.
                    </div>
                  </div>
                  <table className="win-table"><tbody>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Election</td>
                      <td>{result.election?.title || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Ballot Hash</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{result.ballot.ballotHash}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>On-Chain Tx</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {result.ballot.onChainTxHash
                          ? <span style={{ color: '#005000' }}>{result.ballot.onChainTxHash}</span>
                          : <span style={{ color: '#888' }}>Pending blockchain confirmation</span>
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Recorded At</td>
                      <td>{new Date(result.ballot.createdAt).toLocaleString()}</td>
                    </tr>
                  </tbody></table>
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px', background: 'rgba(192,0,0,0.06)',
                  border: '2px solid #c00', borderRadius: 4,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#800', marginBottom: 4 }}>
                    ❌ NOT FOUND — This hash could not be verified
                  </div>
                  <div style={{ fontSize: 12, color: '#333' }}>
                    No ballot with this hash exists in our system. Either the hash is incorrect, or this ballot was never recorded.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="win-statusbar">
          <div className="win-statusbar-section">Public — No login required</div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 200 }}>Anyone can verify any ballot</div>
        </div>
      </div>
    </div>
  );
}
