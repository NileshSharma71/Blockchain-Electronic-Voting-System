import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Attach JWT token to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('ev_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auth
export const login = (email, password) =>
  instance.post('/api/auth/login', { email, password }).then(r => r.data);

export const register = (username, email, password) =>
  instance.post('/api/auth/register', { username, email, password }).then(r => r.data);

export const getMe = () =>
  instance.get('/api/auth/me').then(r => r.data);

export const getMyBallots = () =>
  instance.get('/api/auth/my-ballots').then(r => r.data);

// Elections
export const getElections = (page = 1, status = '', q = '') =>
  instance.get('/api/elections', { params: { page, status: status || undefined, q: q || undefined } }).then(r => r.data);

export const getElection = (id) =>
  instance.get(`/api/elections/${id}`).then(r => r.data);

export const createElection = (data) =>
  instance.post('/api/elections', data).then(r => r.data);

export const closeElection = (id) =>
  instance.patch(`/api/elections/${id}/close`).then(r => r.data);

// Ballots
export const castBallot = (electionId, candidateId) =>
  instance.post('/api/ballots', { electionId, candidateId }).then(r => r.data);

export const checkVoted = (electionId) =>
  instance.get(`/api/ballots/check/${electionId}`).then(r => r.data);

export const getBallots = (electionId) =>
  instance.get(`/api/ballots/${electionId}`).then(r => r.data);

// Results
export const getResult = (electionId) =>
  instance.get(`/api/results/${electionId}`).then(r => r.data);

export const triggerTally = (electionId) =>
  instance.post(`/api/results/${electionId}/tally`).then(r => r.data);

// Admin
export const getAdminStats = () =>
  instance.get('/api/admin/stats').then(r => r.data);

export const getAdminUsers = (page = 1) =>
  instance.get('/api/admin/users', { params: { page } }).then(r => r.data);

export const getPendingUsers = () =>
  instance.get('/api/admin/pending-users').then(r => r.data);

export const verifyUser = (userId, note) =>
  instance.post(`/api/admin/verify-user/${userId}`, { note }).then(r => r.data);

export const rejectUser = (userId, reason) =>
  instance.post(`/api/admin/reject-user/${userId}`, { reason }).then(r => r.data);

// Blockchain
export const getBlockchainHealth = () =>
  instance.get('/api/blockchain/health').then(r => r.data);

export const getBlockchainStats = () =>
  instance.get('/api/blockchain/stats').then(r => r.data);
