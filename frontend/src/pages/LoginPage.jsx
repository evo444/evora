import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Authentic Google "G" Logo SVG
function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4 5.2l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      toast.success(`Welcome, ${u.name}! 👋`);
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Card */}
        <div className="card p-10 text-center">

          {/* Logo / Brand */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow"
          >
            <span className="text-white font-black text-3xl">E</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-gray-900 dark:text-white mb-2"
          >
            Welcome to Evora
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 dark:text-gray-400 mb-8"
          >
            Use your Google account to continue
          </motion.p>

          {/* Google Sign-In Button */}
          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <GoogleLogo />
            )}
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs text-gray-400">secure · fast · free</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            By continuing, you agree to Evora's terms. Your Google account name and photo will be used on your profile.
          </p>
        </div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-5"
        >
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ← Back to events
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
