import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('evora_token'));
  const [loading, setLoading] = useState(true);

  // ── Restore JWT session on page load ──────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('evora_token');
    if (saved) {
      API.defaults.headers.common['Authorization'] = `Bearer ${saved}`;
      API.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('evora_token');
          setToken(null);
          setUser(null);
          delete API.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Standard email/password login ─────────────────────────────────────────
  const login = async (email, password) => {
    const res = await API.post('/api/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // ── Register (OTP flow handled in RegisterPage directly) ───────────────────
  const register = async (name, email, password) => {
    const res = await API.post('/api/auth/register', { name, email, password });
    const { token: t, user: u } = res.data;
    if (t) {
      localStorage.setItem('evora_token', t);
      API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      setToken(t);
      setUser(u);
    }
    return res.data;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('evora_token');
    delete API.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export { API };
