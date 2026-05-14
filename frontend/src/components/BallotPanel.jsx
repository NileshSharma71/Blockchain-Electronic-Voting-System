import { useState } from 'react';
import { castBallot } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function BallotPanel({ election, onVoted }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleVote() {
    if (!selected) { setError('Please select a candidate'); return; }
    setLoading(true);
    setError('');
    try {
      await castBallot(election._id, selected);
      onVoted();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;
  if (!user.isVerified) {
    return (
      <div className="win-group win-mb-8">
        <span className="win-group-label">Cast Your Ballot</span>
        <div style={{ padding: 8, fontSize: 12, color: '#c00' }}>⚠️ Your account must be verified before you can vote.</div>
      </div>
    );
  }

  return (
    <div className="win-group win-mb-8">
      <span className="win-group-label">Cast Your Ballot</span>
      <div style={{ padding: '8px 0' }}>
        {election.candidates.map(c => (
          <div
            key={c._id}
            onClick={() => setSelected(c._id)}
            style={{
              padding: '8px 12px',
              margin: '4px 0',
              border: selected === c._id ? '2px solid #008000' : '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              background: selected === c._id ? 'rgba(0,128,0,0.05)' : 'transparent',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
            {c.party && <div style={{ fontSize: 11, color: '#666' }}>{c.party}</div>}
            {c.description && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.description}</div>}
          </div>
        ))}
      </div>
      {error && <div className="win-text-error win-text-small win-mb-4">{error}</div>}
      <button className="win-btn win-btn-primary" onClick={handleVote} disabled={!selected || loading}>
        {loading ? '⏳ Casting...' : '🗳️ Cast Ballot'}
      </button>
    </div>
  );
}
