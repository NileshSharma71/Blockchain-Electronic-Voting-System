const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

export default function ResultsBar({ candidates, voteCounts, totalVotes }) {
  if (!candidates || candidates.length === 0) return null;

  return (
    <div style={{ padding: '8px 0' }}>
      {candidates.map((c, i) => {
        const count = voteCounts[c._id] || 0;
        const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
        const color = COLORS[i % COLORS.length];

        return (
          <div key={c._id} style={{ margin: '6px 0' }}>
            <div className="win-flex win-justify-between" style={{ fontSize: 12, marginBottom: 2 }}>
              <span style={{ fontWeight: 700 }}>{c.name} {c.party && <span style={{ color: '#888', fontWeight: 400 }}>({c.party})</span>}</span>
              <span>{count} votes ({pct}%)</span>
            </div>
            <div style={{ width: '100%', height: 16, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.5s ease', minWidth: count > 0 ? 2 : 0 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
