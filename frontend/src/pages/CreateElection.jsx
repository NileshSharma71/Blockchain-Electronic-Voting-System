import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createElection } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function CreateElection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
  });
  const [candidates, setCandidates] = useState([
    { name: '', description: '', party: '' },
    { name: '', description: '', party: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function updateCandidate(index, field, value) {
    setCandidates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addCandidate() {
    if (candidates.length >= 20) return;
    setCandidates(prev => [...prev, { name: '', description: '', party: '' }]);
  }

  function removeCandidate(index) {
    if (candidates.length <= 2) return;
    setCandidates(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.startTime || !form.endTime) { setError('Start and end times are required'); return; }
    if (candidates.some(c => !c.name.trim())) { setError('All candidates must have a name'); return; }

    setLoading(true);
    setError('');
    try {
      await createElection({
        ...form,
        candidates: candidates.filter(c => c.name.trim()),
      });
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="win-window">
        <div className="win-titlebar"><span className="win-titlebar-text">⚠️ Access Denied</span></div>
        <div className="win-content">
          <p>Only admins can create elections.</p>
          <button className="win-btn win-mt-8" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>

      <div className="win-window">
        <div className="win-titlebar">
          <span className="win-titlebar-text">🗳️ Create New Election</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          {user && (
            <div className="win-text-small win-mb-8" style={{ padding: '4px 8px', background: 'rgba(102,126,234,0.1)', borderRadius: 4 }}>
              Creating as: <b>{user.username}</b> (Admin)
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="win-mb-8">
              <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Title *</label>
              <input className="win-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Election title..." />
            </div>

            <div className="win-mb-8">
              <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Description</label>
              <textarea className="win-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this election about?" />
            </div>

            <div className="win-flex win-gap-8 win-mb-8" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Start Time *</label>
                <input className="win-input" type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>End Time *</label>
                <input className="win-input" type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>

            {/* Candidates */}
            <div className="win-group win-mb-8">
              <span className="win-group-label">Candidates ({candidates.length})</span>
              {candidates.map((c, i) => (
                <div key={i} className="win-flex win-gap-4 win-items-center win-mb-4" style={{ padding: '4px 0' }}>
                  <span className="win-text-small" style={{ fontWeight: 700, minWidth: 20 }}>#{i + 1}</span>
                  <input className="win-input" style={{ flex: 2 }} value={c.name} onChange={e => updateCandidate(i, 'name', e.target.value)} placeholder="Candidate name *" />
                  <input className="win-input" style={{ flex: 1 }} value={c.party} onChange={e => updateCandidate(i, 'party', e.target.value)} placeholder="Party (optional)" />
                  {candidates.length > 2 && (
                    <button type="button" className="win-btn win-btn-danger" style={{ minWidth: 30, padding: '2px 6px' }} onClick={() => removeCandidate(i)}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="win-btn win-mt-4" onClick={addCandidate} disabled={candidates.length >= 20}>
                + Add Candidate
              </button>
            </div>

            {error && <div className="win-text-error win-text-small win-mb-8">{error}</div>}

            <div className="win-flex win-gap-4 win-justify-between">
              <button type="button" className="win-btn" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="win-btn win-btn-primary" disabled={loading}>
                {loading ? '⏳ Creating...' : '🗳️ Create Election'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
