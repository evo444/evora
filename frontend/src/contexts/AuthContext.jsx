import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

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

  // ── Google Sign-In (Firebase → backend) ───────────────────────────────────
  const loginWithGoogle = async () => {
    const result  = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const res     = await API.post('/api/auth/google', { idToken });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // ── Email/password login (kept for admin CLI use) ──────────────────────────
  const login = async (email, password) => {
    const res = await API.post('/api/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // ── Register ───────────────────────────────────────────────────────────────
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
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export { API };
