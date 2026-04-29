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

// Use localStorage — survives iOS Safari clearing sessionStorage during cross-origin redirects
const REDIRECT_FLAG = 'evora_google_redirect';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('evora_token'));
  const [loading, setLoading] = useState(true);

  const googleProcessed = useRef(false); // prevent double-processing

  // ── Exchange Firebase idToken for our JWT ─────────────────────────────────
  const exchangeGoogleToken = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken(true);
    const res = await API.post('/api/auth/google', { idToken });
    const { token: t, user: u } = res.data;
    localStorage.setItem('evora_token', t);
    localStorage.removeItem(REDIRECT_FLAG);
    API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  // ── Auth state + redirect result on mount ─────────────────────────────────
  useEffect(() => {
    const wasRedirecting = localStorage.getItem(REDIRECT_FLAG) === '1';

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && wasRedirecting && !googleProcessed.current) {
        // User just came back from Google redirect — exchange for our JWT
        googleProcessed.current = true;
        try {
          const u = await exchangeGoogleToken(firebaseUser);
          toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
        } catch (err) {
          console.error('[Auth] Google backend error:', err);
          localStorage.removeItem(REDIRECT_FLAG);
          toast.error(
            err?.response?.data?.message || 'Sign-in failed. Please try again.',
            { duration: 5000 }
          );
          try { await signOut(auth); } catch (_) {}
        } finally {
          setLoading(false);
        }
        return;
      }

      // Normal page load — restore JWT session if present
      if (!wasRedirecting) {
        const saved = localStorage.getItem('evora_token');
        if (saved) {
          API.defaults.headers.common['Authorization'] = `Bearer ${saved}`;
          try {
            const res = await API.get('/api/auth/me');
            setUser(res.data);
          } catch {
            localStorage.removeItem('evora_token');
            setToken(null);
            setUser(null);
            delete API.defaults.headers.common['Authorization'];
          }
        }
        setLoading(false);
      }
    });

    // getRedirectResult as safety net — catches cases where onAuthStateChanged
    // fires before the redirect state is fully available
    if (wasRedirecting) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user && !googleProcessed.current) {
            googleProcessed.current = true;
            try {
              const u = await exchangeGoogleToken(result.user);
              toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
            } catch (err) {
              localStorage.removeItem(REDIRECT_FLAG);
              toast.error(err?.response?.data?.message || 'Sign-in failed. Please try again.');
            } finally {
              setLoading(false);
            }
          } else if (!result) {
            // Redirect result is null — flag cleanup to avoid infinite loading
            localStorage.removeItem(REDIRECT_FLAG);
            setLoading(false);
          }
        })
        .catch((err) => {
          const code = err?.code || '';
          console.error('[Auth] getRedirectResult error:', code, err.message);
          localStorage.removeItem(REDIRECT_FLAG);
          if (code && code !== 'auth/null-user') {
            toast.error('Google sign-in was interrupted. Please try again.');
          }
          setLoading(false);
        });
    }

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  // Strategy: ALWAYS try popup first (works on modern mobile Chrome + Safari).
  // Only fall back to redirect if popup is genuinely blocked.
  // This avoids the iOS Safari sessionStorage wipe problem entirely.
  const loginWithGoogle = async () => {
    try {
      // signInWithPopup works on: desktop Chrome/Firefox/Safari, Android Chrome,
      // iOS Safari 16.4+, iOS Chrome — as long as triggered by a user gesture.
      const result = await signInWithPopup(auth, googleProvider);
      const u = await exchangeGoogleToken(result.user);
      toast.success(`Welcome, ${u.name?.split(' ')[0] || 'back'} 👋`, { duration: 3000 });
      return u;
    } catch (err) {
      const code = err?.code || '';

      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        // Popup was blocked or dismissed — fall back to redirect
        // Use localStorage so the flag survives the redirect on all mobile browsers
        localStorage.setItem(REDIRECT_FLAG, '1');
        await signInWithRedirect(auth, googleProvider);
        return; // page navigates away
      }

      // Any other error — surface it
      const msg =
        code === 'auth/unauthorized-domain'
          ? 'This domain is not authorized for Google Sign-In. Contact the admin.'
          : err?.response?.data?.message || err?.message || 'Google sign-in failed. Try again.';
      throw new Error(msg);
    }
  };

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
    localStorage.removeItem(REDIRECT_FLAG);
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
