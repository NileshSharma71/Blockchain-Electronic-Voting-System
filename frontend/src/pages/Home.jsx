import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getElections } from '../utils/api';
import ElectionCard from '../components/ElectionCard';
import SearchBar from '../components/SearchBar';
import StatsCard from '../components/StatsCard';

const TABS = ['All', 'active', 'upcoming', 'completed'];

export default function Home() {
  const [searchParams] = useSearchParams();
  const [elections, setElections] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const qSearch = searchParams.get('q') || '';

  useEffect(() => {
    setLoading(true);
    getElections(page, statusFilter === 'All' ? '' : statusFilter, qSearch)
      .then(data => {
        setElections(prev => page === 1 ? data.elections : [...prev, ...data.elections]);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, statusFilter, qSearch]);

  useEffect(() => {
    setPage(1);
    setElections([]);
  }, [statusFilter, qSearch]);

  return (
    <div>
      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">🗳️ Blockchain Electronic Voting System</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn">_</span>
            <span className="win-titlebar-btn">□</span>
          </div>
        </div>
        <div className="win-content">
          {/* Stats */}
          <div className="win-flex win-gap-8 win-mb-8" style={{ flexWrap: 'wrap' }}>
            <StatsCard icon="🗳️" label="Total Elections" value={total} />
            <StatsCard icon="✅" label="Active" value={elections.filter(e => e.status === 'active').length} />
            <StatsCard icon="📅" label="Upcoming" value={elections.filter(e => e.status === 'upcoming').length} />
            <StatsCard icon="📊" label="Completed" value={elections.filter(e => e.status === 'completed').length} />
          </div>

          {/* Search */}
          <SearchBar />

          {/* Status tabs */}
          <div className="win-tabs win-mb-4">
            {TABS.map(s => (
              <button
                key={s}
                className={`win-tab ${(statusFilter || 'All') === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s === 'All' ? '' : s)}
              >
                {s === 'All' ? '📋 All' : s === 'active' ? '✅ Active' : s === 'upcoming' ? '📅 Upcoming' : '📊 Completed'}
              </button>
            ))}
          </div>

          {/* Election list */}
          <div className="win-tab-content">
            {loading && elections.length === 0 ? (
              <div className="win-loading">⏳ Loading elections...</div>
            ) : elections.length === 0 ? (
              <div className="win-loading">No elections found.</div>
            ) : (
              <div className="win-flex-col win-gap-4">
                {elections.map(election => (
                  <ElectionCard key={election._id} election={election} />
                ))}
              </div>
            )}

            {/* Load More */}
            {elections.length < total && (
              <div className="win-text-center win-mt-8">
                <button
                  className="win-btn win-btn-primary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                >
                  {loading ? '⏳ Loading...' : '📥 Load More'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="win-statusbar">
          <div className="win-statusbar-section">{total} elections total</div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 140 }}>
            Filter: {statusFilter || 'All'}
          </div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 100 }}>
            Page {page}
          </div>
        </div>
      </div>
    </div>
  );
}
