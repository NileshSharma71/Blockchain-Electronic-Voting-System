import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElection, checkVoted } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useElectionSocket } from '../hooks/useElectionSocket';
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
  const [myBallotHash, setMyBallotHash] = useState(null);
  const [justVoted, setJustVoted] = useState(false);

  useEffect(() => {
    Promise.all([
      getElection(id),
      user ? checkVoted(id).catch(() => ({ hasVoted: false })) : Promise.resolve({ hasVoted: false }),
    ]).then(([electionData, voteData]) => {
      setElection(electionData);
      setHasVoted(voteData.hasVoted);
      setMyBallotHash(voteData.ballotHash);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, user]);

  // Real-time socket — only active for active elections
  const isActiveElection = election?.status === 'active';
  const { voteCounts, totalVotes, isLive } = useElectionSocket(
    isActiveElection ? id : null,
    election?.voteCounts || {},
    election?.totalVotes || 0
  );

  if (loading) return <div className="win-loading">⏳ Loading election...</div>;
  if (!election) return <div className="win-loading">Election not found.</div>;

  const now = new Date();
  const isActive = election.status === 'active';
  const isCompleted = election.status === 'completed' || now > new Date(election.endTime);

  // Merge live socket data with initial data
  const liveVoteCounts = isActiveElection ? voteCounts : (election.voteCounts || {});
  const liveTotalVotes = isActiveElection ? totalVotes : (election.totalVotes || 0);

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

          {/* Status row */}
          <div className="win-flex win-gap-4 win-items-center win-mb-8" style={{ flexWrap: 'wrap' }}>
            <StatusBadge status={election.status} />
            {isLive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#008000', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c853', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                LIVE
              </span>
            )}
            <span className="win-badge win-badge-pending">{liveTotalVotes} votes cast</span>
            <span className="win-badge win-badge-review">{election.candidates.length} candidates</span>
            {hasVoted && <span className="win-badge win-badge-true">✓ You voted</span>}
          </div>

          {/* Voting period */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Voting Period</span>
            <table className="win-table"><tbody>
              <tr><td style={{ fontWeight: 700 }}>Start</td><td>{new Date(election.startTime).toLocaleString()}</td></tr>
              <tr><td style={{ fontWeight: 700 }}>End</td>  <td>{new Date(election.endTime).toLocaleString()}</td></tr>
              <tr><td style={{ fontWeight: 700 }}>Status</td><td>{isActive ? '🟢 Voting is OPEN' : isCompleted ? '🔴 Voting has ENDED' : '🟡 Voting has NOT STARTED'}</td></tr>
            </tbody></table>
          </div>

          {/* Description */}
          {election.description && (
            <div className="win-group win-mb-8">
              <span className="win-group-label">Description</span>
              <p style={{ fontSize: 12, lineHeight: 1.6, padding: '4px 0' }}>{election.description}</p>
            </div>
          )}

          {/* Live results bar */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">
              {isLive ? '📡 Live Results' : '📊 Results'} ({liveTotalVotes} total votes)
            </span>
            <ResultsBar
              candidates={election.candidates}
              voteCounts={liveVoteCounts}
              totalVotes={liveTotalVotes}
            />
          </div>

          {/* Ballot panel — Render if they haven't voted OR if they just voted (so the receipt stays visible) */}
          {isActive && (!hasVoted || justVoted) && user && (
            <BallotPanel
              election={election}
              onVoted={(hash) => {
                setJustVoted(true);
                setMyBallotHash(hash);
                getElection(id).then(setElection);
              }}
            />
          )}

          {hasVoted && !justVoted && (
            <div style={{ padding: '8px 12px', background: 'rgba(0,128,0,0.08)', border: '1px solid #008000', borderRadius: 4, fontSize: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#005000', marginBottom: 4 }}>
                ✓ Your ballot has been cast and recorded on the blockchain. Thank you for voting!
              </div>
              {myBallotHash && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: '#fff', border: '1px solid #ccc', borderRadius: 3 }}>
                  <span style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Your Ballot Hash:</span>
                  <code style={{ userSelect: 'all', fontSize: 11, wordBreak: 'break-all', color: '#333' }}>{myBallotHash}</code>
                </div>
              )}
            </div>
          )}

          {!user && isActive && (
            <div style={{ padding: '8px 12px', background: 'rgba(128,128,0,0.08)', border: '1px solid #808000', borderRadius: 4, fontSize: 12, marginBottom: 8 }}>
              ⚠️ Please log in to cast your vote.
            </div>
          )}

          {/* Blockchain proof */}
          {election.onChainTxHash && (
            <div className="win-group win-mt-8">
              <span className="win-group-label">⛓️ Blockchain Proof</span>
              <table className="win-table"><tbody>
                <tr>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Result Hash</td>
                  <td className="win-text-small" style={{ wordBreak: 'break-all' }}>{election.resultProofHash}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Tx Hash</td>
                  <td>
                    <span className="win-text-small" style={{ wordBreak: 'break-all' }}>{election.onChainTxHash}</span>
                    {' '}
                    <a
                      href={`http://localhost:5174/explorer.html?hash=${election.onChainTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11 }}
                    >
                      🔗 View in Explorer →
                    </a>
                  </td>
                </tr>
              </tbody></table>
            </div>
          )}
        </div>

        <div className="win-statusbar">
          <div className="win-statusbar-section">ID: {election._id}</div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 120 }}>Status: {election.status}</div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
