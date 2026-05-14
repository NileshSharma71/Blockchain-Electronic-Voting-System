import { useState } from 'react';
import { castBallot } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../hooks/useToast';

export default function BallotPanel({ election, onVoted }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null); // holds ballot hash after voting

  async function handleVote() {
    if (!selected) { setError('Please select a candidate first'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await castBallot(election._id, selected);
      setReceipt(data.ballot); // save the full receipt
      showToast('✅ Ballot cast and recorded!', 'success');
      onVoted(data.ballot.ballotHash);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  if (!user.isVerified) {
    return (
      <div className="win-group win-mb-8">
        <span className="win-group-label">Cast Your Ballot</span>
        <div style={{ padding: 8, fontSize: 12, color: '#c00' }}>
          ⚠️ Your account must be verified by an admin before you can vote.
        </div>
      </div>
    );
  }

  // Show receipt after voting — with the ballot hash to save
  if (receipt) {
    return (
      <div className="win-group win-mb-8">
        <span className="win-group-label">🧾 Your Ballot Receipt</span>
        <div style={{ padding: '10px 14px', background: 'rgba(0,128,0,0.06)', border: '1px solid #008000', borderRadius: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#005000' }}>
            ✅ Vote cast for: <span style={{ color: '#000' }}>{receipt.candidateName}</span>
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ fontWeight: 700, paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'top' }}>Ballot Hash</td>
              <td style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#333' }}>{receipt.ballotHash}</td>
            </tr>
            {receipt.onChainTxHash && (
              <tr>
                <td style={{ fontWeight: 700, paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'top' }}>Tx Hash</td>
                <td style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#333' }}>{receipt.onChainTxHash}</td>
              </tr>
            )}
            <tr>
              <td style={{ fontWeight: 700, paddingRight: 8 }}>Recorded At</td>
              <td>{new Date(receipt.createdAt).toLocaleString()}</td>
            </tr>
          </tbody></table>
          <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(255,200,0,0.15)', border: '1px solid #c8a000', borderRadius: 3, fontSize: 11 }}>
            💾 <strong>Save your Ballot Hash</strong> — paste it in the 🔍 Verify page at any time to confirm your vote is authentic.
          </div>
          {!receipt.onChainTxHash && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
              ⚠️ On-chain logging is unavailable (blockchain not deployed). Your vote is recorded in the database.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="win-group win-mb-8">
      <span className="win-group-label">🗳️ Cast Your Ballot</span>
      <div style={{ padding: '8px 0' }}>
        {election.candidates.map(c => (
          <div
            key={c._id}
            onClick={() => setSelected(c._id)}
            style={{
              padding: '10px 14px',
              margin: '6px 0',
              border: selected === c._id ? '2px solid #008000' : '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              background: selected === c._id ? 'rgba(0,128,0,0.06)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: selected === c._id ? '5px solid #008000' : '2px solid #999',
                flexShrink: 0, transition: 'all 0.15s ease',
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                {c.party && <div style={{ fontSize: 11, color: '#666' }}>🏛 {c.party}</div>}
                {c.description && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.description}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="win-text-error win-text-small win-mb-4">{error}</div>}

      <button
        className="win-btn win-btn-primary"
        onClick={handleVote}
        disabled={!selected || loading}
        style={{ marginTop: 4 }}
      >
        {loading ? '⏳ Recording on blockchain...' : '🗳️ Cast Ballot'}
      </button>
    </div>
  );
}
