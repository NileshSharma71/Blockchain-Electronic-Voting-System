import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { useCountdown } from '../hooks/useCountdown';

export default function ElectionCard({ election }) {
  const totalVotes = election.totalVotes || 0;
  const countdown = useCountdown(election.startTime, election.endTime, election.status);

  const countdownColor = election.status === 'active' && countdown.includes('m') && !countdown.includes('h')
    ? '#c00'   // less than 1 hour — red urgency
    : election.status === 'active' ? '#006400'
    : '#666';

  return (
    <Link to={`/election/${election._id}`} className="win-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="win-flex win-justify-between win-items-center win-mb-4">
        <span style={{ fontWeight: 700, fontSize: 13 }}>🗳️ {election.title}</span>
        <StatusBadge status={election.status} />
      </div>

      {election.description && (
        <p className="win-text-small" style={{ margin: '4px 0', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {election.description}
        </p>
      )}

      <div className="win-flex win-gap-8 win-mt-4" style={{ fontSize: 11, flexWrap: 'wrap' }}>
        <span style={{ color: '#444' }}>👥 {election.candidates?.length || 0} candidates</span>
        <span style={{ color: '#444' }}>📝 {totalVotes} votes</span>
        {countdown && (
          <span style={{ fontWeight: 700, color: countdownColor }}>
            ⏱ {countdown}
          </span>
        )}
      </div>
    </Link>
  );
}
