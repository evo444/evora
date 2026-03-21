import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('evora_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      API.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post('/api/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

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
