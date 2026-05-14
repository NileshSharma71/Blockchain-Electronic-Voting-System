import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    if (token) {
      getMe()
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => {
          localStorage.removeItem('ev_token');
          autoLogin();
        });
    } else {
      autoLogin();
    }
  }, []);

  async function autoLogin() {
    try {
      // Auto-login as admin for demo
      const data = await apiLogin('admin@evoting.local', 'demo123');
      localStorage.setItem('ev_token', data.token);
      setUser(data.user);
    } catch {
      // No users available yet — that's fine
    }
    setLoading(false);
  }

  const switchUser = useCallback(async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem('ev_token', data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ev_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user, logout, loading, switchUser, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
