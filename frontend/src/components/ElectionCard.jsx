import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ElectionCard({ election }) {
  const totalVotes = election.totalVotes || 0;
  const now = new Date();
  const end = new Date(election.endTime);
  const start = new Date(election.startTime);
  const timeLeft = election.status === 'active' ? Math.max(0, Math.round((end - now) / (1000*60*60))) : null;

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
      <div className="win-flex win-gap-8 win-mt-4" style={{ fontSize: 11, color: '#666' }}>
        <span>👥 {election.candidates?.length || 0} candidates</span>
        <span>📝 {totalVotes} votes</span>
        {timeLeft !== null && <span>⏰ {timeLeft}h left</span>}
        {election.status === 'upcoming' && <span>📅 Starts {start.toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}
