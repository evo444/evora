import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { auth, googleProvider } from '../firebase';
import {
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Key used to signal that a Google redirect login is in progress.
// Survives page reloads (unlike component state).
const REDIRECT_FLAG = 'evora_google_redirect';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('evora_token'));
  const [loading, setLoading] = useState(true);

  // Ref so the onAuthStateChanged handler is never stale
  const processingGoogle = useRef(false);

  // ── Shared: exchange Firebase idToken for our JWT ──────────────────────────
  const exchangeGoogleToken = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
    const res = await API.post('/api/auth/google', { idToken });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // ── Main auth state listener ───────────────────────────────────────────────
  useEffect(() => {
    const wasRedirecting = sessionStorage.getItem(REDIRECT_FLAG);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Case 1: Returning from Google redirect — process the new login
      if (firebaseUser && wasRedirecting && !processingGoogle.current) {
        processingGoogle.current = true;
        sessionStorage.removeItem(REDIRECT_FLAG);
        try {
          const u = await exchangeGoogleToken(firebaseUser);
          toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
        } catch (err) {
          console.error('[AuthContext] Google backend error:', err);
          toast.error(
            err?.response?.data?.message ||
            'Google sign-in failed — please try again.',
            { duration: 5000 }
          );
          // Sign out of Firebase so the user can retry cleanly
          try { await signOut(auth); } catch (_) {}
        } finally {
          setLoading(false);
        }
        return;
      }

      // Case 2: No Google redirect — just restore existing JWT session
      if (!wasRedirecting) {
        const saved = localStorage.getItem('evora_token');
        if (saved) {
          API.defaults.headers.common['Authorization'] = `Bearer ${saved}`;
          try {
            const res = await API.get('/api/auth/me');
            setUser(res.data);
          } catch {
            // JWT expired or invalid — clear it
            localStorage.removeItem('evora_token');
            setToken(null);
            setUser(null);
            delete API.defaults.headers.common['Authorization'];
          }
        }
        setLoading(false);
      }
    });

    // getRedirectResult as a safety net — catches cases where
    // onAuthStateChanged fires BEFORE the redirect result is available
    if (wasRedirecting) {
      getRedirectResult(auth)
        .then(async (result) => {
          // If onAuthStateChanged already handled this, skip
          if (result?.user && !processingGoogle.current) {
            processingGoogle.current = true;
            sessionStorage.removeItem(REDIRECT_FLAG);
            try {
              const u = await exchangeGoogleToken(result.user);
              toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Google sign-in failed.');
            } finally {
              setLoading(false);
            }
          }
        })
        .catch((err) => {
          const code = err?.code || '';
          if (code && code !== 'auth/null-user') {
            console.error('[AuthContext] getRedirectResult error:', code, err.message);
            toast.error('Google sign-in was interrupted. Please try again.');
            sessionStorage.removeItem(REDIRECT_FLAG);
            setLoading(false);
          }
        });
    }

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  // Mobile: redirect (popup blocked by mobile browsers & in-app WebViews)
  // Desktop: popup (better UX), falls back to redirect if blocked
  const loginWithGoogle = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      // Mark intent BEFORE redirecting so the listener knows to process it on return
      sessionStorage.setItem(REDIRECT_FLAG, '1');
      await signInWithRedirect(auth, googleProvider);
      return; // page navigates away
    }

    // Desktop: popup
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = await exchangeGoogleToken(result.user);
      return u;
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        // Fall back to redirect
        sessionStorage.setItem(REDIRECT_FLAG, '1');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
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
  const logout = async () => {
    localStorage.removeItem('evora_token');
    sessionStorage.removeItem(REDIRECT_FLAG);
    delete API.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    try { await signOut(auth); } catch (_) {}
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export { API };
