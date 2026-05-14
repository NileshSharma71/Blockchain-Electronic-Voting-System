export default function StatusBadge({ status }) {
  const styles = {
    active: { cls: 'win-badge-true', label: '✅ Active' },
    upcoming: { cls: 'win-badge-review', label: '📅 Upcoming' },
    completed: { cls: 'win-badge-pending', label: '📊 Completed' },
  };
  const s = styles[status] || { cls: 'win-badge-uncertain', label: status };
  return <span className={`win-badge ${s.cls}`}>{s.label}</span>;
}
