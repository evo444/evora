import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackModal from './FeedbackModal';

const dropdownSpring = { type: 'spring', stiffness: 380, damping: 28 };
const dropIn = {
  initial:    { opacity: 0, y: -8, scale: 0.95 },
  animate:    { opacity: 1, y: 0,  scale: 1 },
  exit:       { opacity: 0, y: -8, scale: 0.95 },
  transition: dropdownSpring,
  style:      { willChange: 'transform, opacity' },
};

// Staggered children for the dropdown items
const itemVariants = {
  hidden: { opacity: 0, x: 8 },
  show:   (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.05, ...dropdownSpring } }),
};

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { darkMode, toggle } = useTheme();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);   // hamburger dropdown
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [feedbackType, setFeedbackType] = useState(null);  // 'bug' | 'suggestion' | null

  const searchRef  = useRef(null);
  const menuRef    = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (menuRef.current   && !menuRef.current.contains(e.target))   setMenuOpen(false);
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
    ...(isAdmin() ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const activeClass   = 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white';
  const inactiveClass = 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800';

  const menuItems = [
    {
      id: 'darkmode',
      icon: darkMode ? '☀️' : '🌙',
      label: darkMode ? 'Light Mode' : 'Dark Mode',
      action: () => { toggle(); },
      extra: (
        <span className={`ml-auto w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${darkMode ? 'bg-gray-900 dark:bg-white justify-end' : 'bg-gray-200 justify-start'}`}>
          <span className="w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow-sm" />
        </span>
      ),
    },
    {
      id: 'suggestion',
      icon: '💡',
      label: 'Send Suggestion',
      action: () => { setMenuOpen(false); setFeedbackType('suggestion'); },
    },
    {
      id: 'bug',
      icon: '🐛',
      label: 'Report a Bug',
      action: () => { setMenuOpen(false); setFeedbackType('bug'); },
    },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-200/60 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center group flex-shrink-0">
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Zzon</span>
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

            {/* Search */}
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
                      className="w-full px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
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

            {/* Submit Event CTA */}
            {user && user.role !== 'admin' && (
              <Link to="/submit-event"
                className="hidden sm:flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5 mr-1">
                <span className="font-bold text-base leading-none">+</span> Submit Event
              </Link>
            )}

            {/* User profile */}
            {user && (
              <div className="relative">
                <button onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold">
                      {user.name[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user.name.split(' ')[0]}</span>
                  <span className="text-gray-400 text-xs">▾</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div {...dropIn} className="absolute right-0 mt-2 w-48 card py-1 shadow-xl z-50">
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
            )}

            {/* Login button — logged out only */}
            {!user && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <Link to="/login"
                  className="flex items-center px-4 py-2 rounded-xl text-sm font-semibold
                    bg-gray-900 text-white hover:bg-black
                    dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100
                    transition-colors shadow-sm hover:shadow-md">
                  Login
                </Link>
              </motion.div>
            )}

            {/* ☰ Hamburger → settings dropdown */}
            <div className="relative" ref={menuRef}>
              <motion.button
                onClick={() => setMenuOpen(o => !o)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Options"
                aria-expanded={menuOpen}
                className={`p-2 rounded-xl transition-colors border
                  ${menuOpen
                    ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    {...dropIn}
                    className="absolute right-0 mt-2 w-56 card shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Options</p>
                    </div>

                    <div className="py-1">
                      {menuItems.map((item, i) => (
                        <motion.button
                          key={item.id}
                          custom={i}
                          variants={itemVariants}
                          initial="hidden"
                          animate="show"
                          onClick={item.action}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                          <span className="text-base w-5 text-center transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.extra}
                        </motion.button>
                      ))}
                    </div>

                    {/* Mobile-only: Login link at bottom if not logged in */}
                    {!user && (
                      <div className="sm:hidden border-t border-gray-100 dark:border-gray-800 py-1">
                        <Link to="/login" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <span className="text-base w-5 text-center">🔑</span>
                          <span>Login</span>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {feedbackType && <FeedbackModal type={feedbackType} onClose={() => setFeedbackType(null)} />}
    </nav>
  );
}
