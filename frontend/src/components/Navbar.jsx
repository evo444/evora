import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackModal from './FeedbackModal';

const dropdownSpring = { type: 'spring', stiffness: 380, damping: 28 };
const dropIn = { initial: { opacity: 0, y: -6, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.96 }, transition: dropdownSpring, style: { willChange: 'transform, opacity' } };

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { darkMode, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [feedbackType, setFeedbackType] = useState(null); // 'bug' | 'suggestion' | null
  const settingsRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const handleLogout = () => { logout(); navigate('/'); setProfileOpen(false); };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/?search=${encodeURIComponent(searchInput.trim())}`);
    setSearchOpen(false);
    setSearchInput('');
  };

  const navLinks = [
    ...(user ? [] : []),
    ...(isAdmin() ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const activeClass = 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white';
  const inactiveClass = 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800';

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-200/60 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all">
              <span className="text-white dark:text-gray-900 font-black text-sm">E</span>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Evora</span>
            <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">Kerala</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${location.pathname === l.to && !location.search ? activeClass : inactiveClass}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">

            {/* Search icon + expandable input */}
            <div className="relative flex items-center" ref={searchRef}>
              <AnimatePresence>
                {searchOpen && (
                  <motion.form
                    onSubmit={handleSearch}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'min(220px, calc(100vw - 160px))', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    style={{ willChange: 'width, opacity' }}
                    className="overflow-hidden mr-1"
                  >
                    <input
                      ref={searchInputRef}
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search events..."
                      className="w-full px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                    />
                  </motion.form>
                )}
              </AnimatePresence>
              <button
                onClick={() => setSearchOpen(o => !o)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                title="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            </div>

            {/* Submit Event CTA — shown to logged-in regular users */}
            {user && user.role !== 'admin' && (
              <Link to="/submit-event"
                className="hidden sm:flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5 mr-1">
                <span className="font-bold text-base leading-none">+</span> Submit Event
              </Link>
            )}

            {/* User profile / Login */}
            {user ? (
              <div className="relative">
                <button onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user.name.split(' ')[0]}</span>
                  <span className="text-gray-400 text-xs">▾</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div {...dropIn}
                      className="absolute right-0 mt-2 w-48 card py-1 shadow-xl z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? '👑 Admin' : '👤 User'}</p>
                      </div>
                      {isAdmin() && <Link to="/admin" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Dashboard</Link>}

                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">Sign Out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Login</Link>
            )}

            {/* ⋮ Settings */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white group"
                title="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    {...dropIn}
                    className="absolute right-0 mt-2 w-52 card py-1 shadow-xl z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
                    </div>
                    <button
                      onClick={toggle}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span>{darkMode ? '☀️' : '🌙'}</span>
                        <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                      </span>
                      <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${darkMode ? 'bg-gray-900 justify-end' : 'bg-gray-200 justify-start'}`}>
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                    <button
                      onClick={() => { setSettingsOpen(false); setFeedbackType('bug'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span>🐛</span> Report a Bug
                    </button>

                    <button
                      onClick={() => { setSettingsOpen(false); setFeedbackType('suggestion'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span>💡</span> Suggest an Idea
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md px-4 pb-5 pt-3 space-y-1"
          >
            {/* Mobile search */}
            <form onSubmit={e => { e.preventDefault(); if (searchInput.trim()) { navigate(`/?search=${encodeURIComponent(searchInput.trim())}`); setMenuOpen(false); setSearchInput(''); }}} className="mb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="search"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search events..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </form>

            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                className={`flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors ${location.pathname === l.to ? activeClass : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {l.label}
              </Link>
            ))}

            {user && user.role !== 'admin' && (
              <Link to="/submit-event" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-accent hover:bg-accent/5 transition-colors">
                <span className="text-base font-bold">+</span> Submit Event
              </Link>
            )}

            {!user ? (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Login
              </Link>
            ) : (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                Sign Out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      {feedbackType && <FeedbackModal type={feedbackType} onClose={() => setFeedbackType(null)} />}
    </nav>
  );
}
