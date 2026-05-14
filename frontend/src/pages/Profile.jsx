import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyBallots } from '../utils/api';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ballots, setBallots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyBallots().then(setBallots).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="win-loading">Loading...</div>;

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>
      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">👤 {user.username}</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          <div className="win-group win-mb-8">
            <span className="win-group-label">Account Info</span>
            <table className="win-table"><tbody>
              <tr><td style={{fontWeight:700}}>Username</td><td>{user.username}</td></tr>
              <tr><td style={{fontWeight:700}}>Email</td><td>{user.email||'—'}</td></tr>
              <tr><td style={{fontWeight:700}}>Verified</td><td>{user.isVerified?<span className="win-text-success">✓ Verified</span>:<span className="win-text-error">⊘ Pending</span>}</td></tr>
              <tr><td style={{fontWeight:700}}>Role</td><td>{user.role==='admin'?'🛡️ Admin':'🗳️ Voter'}</td></tr>
              <tr><td style={{fontWeight:700}}>Elections Voted</td><td>{user.votedIn?.length||0}</td></tr>
            </tbody></table>
          </div>
          <div className="win-group">
            <span className="win-group-label">🗳️ Ballot History ({ballots.length})</span>
            {loading ? <div className="win-loading">⏳</div> : ballots.length===0 ? (
              <div className="win-text-small" style={{padding:8}}>No ballots cast yet.</div>
            ) : (
              <table className="win-table"><thead><tr><th>Election</th><th>Status</th><th>Date</th></tr></thead><tbody>
                {ballots.map((b,i)=>(
                  <tr key={i} style={{cursor:'pointer',fontSize:12}} onClick={()=>b.electionId?._id&&navigate(`/election/${b.electionId._id}`)}>
                    <td>{b.electionId?.title||'—'}</td>
                    <td>{b.electionId?.status||'—'}</td>
                    <td style={{fontSize:11}}>{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
          <button className="win-btn win-mt-8" onClick={()=>navigate('/')}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}
