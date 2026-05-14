import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElection, checkVoted } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import BallotPanel from '../components/BallotPanel';
import ResultsBar from '../components/ResultsBar';
import StatusBadge from '../components/StatusBadge';

export default function ElectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    Promise.all([
      getElection(id),
      user ? checkVoted(id).catch(() => ({ hasVoted: false })) : Promise.resolve({ hasVoted: false }),
    ]).then(([electionData, voteData]) => {
      setElection(electionData);
      setHasVoted(voteData.hasVoted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, user]);

  if (loading) return <div className="win-loading">⏳ Loading election...</div>;
  if (!election) return <div className="win-loading">Election not found.</div>;

  const now = new Date();
  const isActive = election.status === 'active' || (now >= new Date(election.startTime) && now <= new Date(election.endTime));
  const isCompleted = election.status === 'completed' || now > new Date(election.endTime);
  const totalVotes = election.totalVotes || 0;

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>

      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">🗳️ {election.title}</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          {/* Status & Meta */}
          <div className="win-flex win-gap-4 win-items-center win-mb-8" style={{ flexWrap: 'wrap' }}>
            <StatusBadge status={election.status} />
            <span className="win-badge win-badge-pending">{totalVotes} votes cast</span>
            <span className="win-badge win-badge-review">{election.candidates.length} candidates</span>
            {hasVoted && <span className="win-badge win-badge-true">✓ You voted</span>}
          </div>

          {/* Time info */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Voting Period</span>
            <table className="win-table"><tbody>
              <tr><td style={{fontWeight:700}}>Start</td><td>{new Date(election.startTime).toLocaleString()}</td></tr>
              <tr><td style={{fontWeight:700}}>End</td><td>{new Date(election.endTime).toLocaleString()}</td></tr>
              <tr><td style={{fontWeight:700}}>Status</td><td>{isActive ? '🟢 Voting is OPEN' : isCompleted ? '🔴 Voting has ENDED' : '🟡 Voting has NOT STARTED'}</td></tr>
            </tbody></table>
          </div>

          {/* Description */}
          {election.description && (
            <div className="win-group win-mb-8">
              <span className="win-group-label">Description</span>
              <p style={{ fontSize: 12, lineHeight: 1.5, padding: '4px 0' }}>{election.description}</p>
            </div>
          )}

          {/* Live Results */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Results ({totalVotes} total votes)</span>
            <ResultsBar candidates={election.candidates} voteCounts={election.voteCounts || {}} totalVotes={totalVotes} />
          </div>

          {/* Candidates & Voting */}
          {isActive && !hasVoted && user && (
            <BallotPanel
              election={election}
              onVoted={() => {
                setHasVoted(true);
                // Refresh election data
                getElection(id).then(setElection);
              }}
            />
          )}

          {hasVoted && (
            <div style={{ padding: '8px 12px', background: 'rgba(0,128,0,0.08)', border: '1px solid #008000', borderRadius: 4, fontSize: 12 }}>
              ✓ Your ballot has been cast and recorded on the blockchain. Thank you for voting!
            </div>
          )}

          {!user && isActive && (
            <div style={{ padding: '8px 12px', background: 'rgba(128,128,0,0.08)', border: '1px solid #808000', borderRadius: 4, fontSize: 12 }}>
              ⚠️ Please log in to cast your vote.
            </div>
          )}

          {/* On-chain proof */}
          {election.onChainTxHash && (
            <div className="win-group win-mt-8">
              <span className="win-group-label">Blockchain Proof</span>
              <table className="win-table"><tbody>
                <tr><td style={{fontWeight:700}}>Result Hash</td><td className="win-text-small">{election.resultProofHash}</td></tr>
                <tr><td style={{fontWeight:700}}>Tx Hash</td><td className="win-text-small">{election.onChainTxHash}</td></tr>
              </tbody></table>
            </div>
          )}
        </div>

        <div className="win-statusbar">
          <div className="win-statusbar-section">ID: {election._id}</div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 120 }}>Status: {election.status}</div>
        </div>
      </div>
    </div>
  );
}
