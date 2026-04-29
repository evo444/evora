import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { auth, googleProvider, getRedirectResult } from '../firebase';
import { signInWithRedirect, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('evora_token'));
  const [loading, setLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(false);

  const processingRedirect = useRef(false);

  // Handle redirect result from Google Sign-In (fires after Google redirects back)
  useEffect(() => {
    // Guard: only run once to avoid double-processing on StrictMode double-invoke
    if (processingRedirect.current) return;
    processingRedirect.current = true;

    setRedirectLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          try {
            const idToken = await result.user.getIdToken();
            const res = await API.post('/api/auth/google', { idToken });
            const { token: t, user: u } = res.data;
            localStorage.setItem('evora_token', t);
            API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
            setToken(t);
            setUser(u);
            // Show welcome toast immediately after redirect login
            toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
          } catch (err) {
            console.error('Google redirect backend error:', err);
            toast.error(err?.response?.data?.message || 'Google sign-in failed. Please try again.');
          }
        }
      })
      .catch((err) => {
        const code = err?.code || '';
        if (code !== 'auth/null-user' && code !== '') {
          console.error('Google redirect sign-in error:', code, err.message);
        }
      })
      .finally(() => {
        setRedirectLoading(false);
      });
  }, []);

  // Restore session from JWT on page load
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

  // Standard email/password login
  const login = async (email, password) => {
    const res = await API.post('/api/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // Google Sign-In — uses redirect on mobile (popup gets blocked),
  // popup on desktop for a smoother UX.
  const loginWithGoogle = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    // Force account selection every time (prevents auto-selecting wrong account)
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    if (isMobile) {
      // On mobile: use redirect (popup is blocked by mobile browsers)
      await signInWithRedirect(auth, googleProvider);
      // Page navigates away — result handled in the useEffect above on return
      return;
    }

    // On desktop: try popup first (better UX — no full-page redirect)
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await API.post('/api/auth/google', { idToken });
      const { token: t, user: u } = res.data;
      localStorage.setItem('evora_token', t);
      API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      setToken(t);
      setUser(u);
      return u;
    } catch (err) {
      const code = err?.code || '';
      // Popup was blocked or closed — fall back to redirect
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err; // re-throw other errors for LoginPage to handle
    }
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

  const logout = async () => {
    localStorage.removeItem('evora_token');
    delete API.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    // Also sign out of Firebase (if signed in via Google)
    try { await signOut(auth); } catch (_) {}
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading: loading || redirectLoading, login, loginWithGoogle, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export { API };
