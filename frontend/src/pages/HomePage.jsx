import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, useAnimation } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import SkeletonCard from '../components/SkeletonCard';
import { eventService, adminService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

/* ── Premium Glass Dropdown (Portal-based — immune to overflow clipping) ── */
function GlassSelect({ icon, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const { darkMode } = useTheme();
  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position panel under the trigger button
  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: Math.max(r.width, 170) });
    }
    setOpen(o => !o);
  };

  const panel = open && ReactDOM.createPortal(
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        minWidth: pos.width,
        zIndex: 99999,
        background: darkMode ? 'rgba(30,32,38,0.97)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.6)',
        borderRadius: 16,
        boxShadow: darkMode
          ? '0 16px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 16px 48px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value ?? i}
          onClick={() => { onChange(opt.value); setOpen(false); }}
          className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center gap-2.5"
          style={{
            background: value === opt.value
              ? 'rgba(34,197,94,0.15)'
              : 'transparent',
            color: value === opt.value
              ? '#22c55e'
              : darkMode ? '#e5e7eb' : '#111318',
            borderBottom: i < options.length - 1
              ? darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)'
              : 'none',
          }}
          onMouseEnter={e => {
            if (value !== opt.value)
              e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={e => {
            if (value !== opt.value) e.currentTarget.style.background = 'transparent';
          }}
        >
          {value === opt.value
            ? <span className="text-green-500 text-xs font-bold">✓</span>
            : <span className="w-4" />}
          {opt.label}
        </button>
      ))}
    </motion.div>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-full text-xs font-semibold transition-all duration-200 select-none"
        style={{
          padding: '7px 14px 7px 12px',
          background: open ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'}`,
          boxShadow: open
            ? '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
            : '0 2px 12px rgba(0,0,0,0.07)',
          color: 'inherit',
        }}
      >
        <span>{icon}</span>
        <span style={{ opacity: value ? 1 : 0.7 }}>{selected ? selected.label : placeholder}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3 h-3 opacity-50"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      {panel}
    </div>
  );
}

function useCountdown(targetDate) {
  const calc = () => {
    const diff = new Date(targetDate) - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, diff };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
}

// ── Compact inline countdown pill for "This Week" cards ──
function Countdown({ date, light = false }) {
  const t = useCountdown(date);

  if (!t) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-green-500 dark:text-green-400 uppercase tracking-wider">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
      </span>
      Live Now
    </span>
  );

  const urgent = t.diff < 86400000 ? 'red' : t.diff < 259200000 ? 'amber' : 'none';

  const pillBg = urgent === 'red'
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
    : urgent === 'amber'
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
    : light
    ? 'bg-white/15 border-white/20'
    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/60';

  const numColor = urgent === 'red'
    ? 'text-red-600 dark:text-red-400'
    : urgent === 'amber'
    ? 'text-amber-600 dark:text-amber-400'
    : light ? 'text-white' : 'text-gray-900 dark:text-white';

  const dotColor = urgent === 'red'
    ? 'text-red-300 dark:text-red-700'
    : urgent === 'amber'
    ? 'text-amber-300 dark:text-amber-700'
    : 'text-gray-300 dark:text-gray-600';

  const Unit = ({ val, lbl }) => (
    <span className="flex flex-col items-center leading-none">
      <motion.span
        key={val}
        initial={{ y: -5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`font-black text-sm tabular-nums ${numColor}`}
      >
        {String(val).padStart(2, '0')}
      </motion.span>
      <span className={`${light ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'} text-[8px] font-bold uppercase tracking-widest mt-0.5`}>{lbl}</span>
    </span>
  );

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${pillBg}`}>
      {t.d > 0 && <><Unit val={t.d} lbl="d" /><span className={`${dotColor} text-xs font-bold`}>·</span></>}
      <Unit val={t.h} lbl="hr" />
      <span className={`${dotColor} text-xs font-bold`}>·</span>
      <Unit val={t.m} lbl="min" />
      <span className={`${dotColor} text-xs font-bold`}>·</span>
      <Unit val={t.s} lbl="sec" />
    </div>
  );
}

const QUICK_FILTERS = [
  { label: 'All',     value: 'All' },
  { label: 'Temple',  value: 'Cultural' },
  { label: 'Concert', value: 'Music' },
];
const CROWD_LEVELS = ['All', 'low', 'medium', 'high'];

// Stagger container — children animate in sequence
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUpItem = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
};

// Infinite marquee — no scroll needed

export default function HomePage() {
  const { isAdmin, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Show a welcome toast after Google redirect sign-in
  useEffect(() => {
    const name = sessionStorage.getItem('evora_welcome');
    if (name && user) {
      sessionStorage.removeItem('evora_welcome');
      toast.success(`Welcome, ${name}! 👋`);
    }
  }, [user]);
  const [events, setEvents] = useState([]);
  const [recentWeekEvents, setRecentWeekEvents] = useState([]);
  const [recentWeekLoading, setRecentWeekLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [slideIdx, setSlideIdx] = useState(0);
  const slideTimerRef = useRef(null);
  const slideHovered = useRef(false);
  const marqueeHovered = useRef(false);
  const marqueeControls = useAnimation();
  const marqueeScrollRef = useRef(null);

  const scrollMarquee = (dir) => {
    const el = marqueeScrollRef.current;
    if (!el) return;
    const inner = el.querySelector('[data-marquee]');
    if (inner) {
      // Stop the CSS animation and convert its translateX into scrollLeft.
      // (CSS transform and scrollLeft work in opposite directions and cancel
      //  each other out, making buttons appear to do nothing.)
      const transform = window.getComputedStyle(inner).transform;
      let tx = 0;
      if (transform && transform !== 'none') {
        // matrix(a,b,c,d,e,f) — e is translateX
        const parts = transform.match(/matrix\([^)]+\)/)?.[0]
          .replace('matrix(', '').replace(')', '').split(',');
        if (parts?.length >= 6) tx = parseFloat(parts[4]) || 0;
      }
      // Freeze animation and reset transform
      inner.style.animation = 'none';
      inner.style.transform = 'none';
      // Convert the animation's visual offset into scrollLeft
      if (tx < 0) el.scrollLeft = Math.max(0, -tx);
    }
    el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('All');
  const [crowd, setCrowd] = useState('All');
  const [minRating, setMinRating] = useState('');
  const [district, setDistrict] = useState('');

  // Sync search from URL params (navbar search)
  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearch(q);
    setSearchInput(q);
    setPage(1);
  }, [searchParams]);

  // Reset marquee scroll + animation override when filters change
  useEffect(() => {
    const el = marqueeScrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    const inner = el.querySelector('[data-marquee]');
    if (inner) { inner.style.animation = ''; inner.style.transform = ''; }
  }, [category, crowd, district, minRating]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        ...(search && { search }),
        ...(category !== 'All' && { category }),
        ...(crowd !== 'All' && { crowd }),
        ...(minRating && { minRating }),
        ...(district && { district }),
      };
      const data = await eventService.getAll(params);
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, crowd, minRating, district]);

  const fetchRecentWeek = async () => {
    setRecentWeekLoading(true);
    try {
      const data = await eventService.getAll({ recentWeek: true, limit: 10 });
      setRecentWeekEvents(data.events);
    } catch {} finally { setRecentWeekLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchRecentWeek(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await adminService.getUsers(); // small check - actually call delete
      await eventService.delete(id);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleTrending = async (event) => {
    try {
      await adminService.toggleTrending(event._id);
      toast.success(`${event.trending ? 'Removed from' : 'Added to'} trending`);
      fetchEvents();
    } catch { toast.error('Failed to update'); }
  };

  const resetFilters = () => {
    setSearch(''); setSearchInput(''); setCategory('All');
    setCrowd('All'); setMinRating(''); setDistrict(''); setPage(1);
  };

  const pages = Math.ceil(total / 12);

  // Filter This Week events by the same active filters
  const filteredWeekEvents = recentWeekEvents.filter(e => {
    if (category !== 'All' && e.category !== category) return false;
    if (district && e.location?.district !== district) return false;
    if (crowd !== 'All' && e.crowd !== crowd) return false;
    return true;
  });

  // Auto-advance slide carousel
  const slideTotal = filteredWeekEvents.length;
  const goSlide = useCallback((i) => setSlideIdx(((i % slideTotal) + slideTotal) % slideTotal), [slideTotal]);

  useEffect(() => {
    setSlideIdx(0);
  }, [category, district, crowd]);

  useEffect(() => {
    if (slideTotal === 0) return;
    slideTimerRef.current = setInterval(() => {
      if (!slideHovered.current) setSlideIdx(i => (i + 1) % slideTotal);
    }, 5000);
    return () => clearInterval(slideTimerRef.current);
  }, [slideTotal]);

  return (
    <div className="min-h-screen">
      {/* Hero — tighter on mobile */}
      <div className="hero-section py-4 sm:py-10">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} transition={{duration:0.45}}>
            <span className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 block">🌍 Discover Kerala</span>
            <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
              Every Event in Kerala
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-base mt-1.5 max-w-lg mx-auto hidden sm:block">
              Festivals, concerts, cultural shows, tech meetups — all in one place.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* ── Global Filter Bar ── */}
        <div className="filter-bar mb-4 sm:mb-6 p-2.5 sm:p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-card space-y-2">

          {/* Row 1: Category pills + Clear button */}
          <div className="flex gap-1.5 items-center">
            <div
              className="relative flex items-center rounded-full p-0.5 sm:p-1 flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.35)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
              data-glass-seg
            >
              {QUICK_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setCategory(f.value); setPage(1); }}
                  className="relative px-4 sm:px-6 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 focus:outline-none select-none"
                  style={{ minWidth: 52, textAlign: 'center' }}
                >
                  {category === f.value && (
                    <motion.div
                      layoutId="glass-seg-active"
                      transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.82)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                      }}
                    />
                  )}
                  <span
                    className="relative z-10"
                    style={{
                      color: category === f.value ? '#111318' : 'inherit',
                      opacity: category === f.value ? 1 : 0.6,
                    }}
                  >
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            {/* × Clear — sits right after the category pills */}
            {(search || category !== 'All' || crowd !== 'All' || minRating || district) && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={resetFilters}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
              >× Clear</motion.button>
            )}
          </div>

          {/* Row 2: Dropdowns — flex-wrap, no scroll */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* District / Place */}
            <GlassSelect
              icon="📍"
              placeholder="All Places"
              value={district}
              onChange={v => { setDistrict(v); setPage(1); }}
              options={[
                { value: '', label: 'All Places' },
                ...[...new Set(events.map(e => e.location?.district).filter(Boolean))].sort()
                  .map(d => ({ value: d, label: d })),
              ]}
            />

            {/* Crowd */}
            <GlassSelect
              icon="👥"
              placeholder="All Crowds"
              value={crowd}
              onChange={v => { setCrowd(v); setPage(1); }}
              options={CROWD_LEVELS.map(c => ({
                value: c,
                label: c === 'All' ? 'All Crowds' : c.charAt(0).toUpperCase() + c.slice(1),
              }))}
            />

            {/* Rating */}
            <GlassSelect
              icon="⭐"
              placeholder="Any Rating"
              value={minRating}
              onChange={v => { setMinRating(v); setPage(1); }}
              options={[
                { value: '', label: 'Any Rating' },
                { value: '3', label: '3+ Stars' },
                { value: '4', label: '4+ Stars' },
                { value: '4.5', label: '4.5+ Stars' },
              ]}
            />
          </div>
        </div>

        {/* This Week Section */}
        <section className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between mb-3 sm:mb-5 gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gray-900 dark:bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">This Week</h2>
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">Upcoming events near you</p>
              </div>
            </div>

            {/* Right: live count + scroll buttons */}
            {!recentWeekLoading && filteredWeekEvents.length > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2"
              >
                {/* Animated live count pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent/10 dark:bg-accent/20 border border-accent/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                  </span>
                  <span className="text-sm font-black text-accent tabular-nums">{filteredWeekEvents.length}</span>
                  <span className="text-xs font-semibold text-accent/80">events live</span>
                </div>
                {/* Scroll arrows */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollMarquee(-1)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-90"
                    title="Scroll left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scrollMarquee(1)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-90"
                    title="Scroll right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {recentWeekLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-52 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <div className="h-36 skeleton" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 skeleton rounded w-3/4" />
                    <div className="h-3 skeleton rounded w-1/2" />
                    <div className="h-3 skeleton rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredWeekEvents.length === 0 ? (
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 text-sm text-gray-400">
              <span className="text-3xl">{category !== 'All' ? '🔍' : '🗓️'}</span>
              <div>
                <p className="font-medium text-gray-500 dark:text-gray-400">
                  {category !== 'All' ? `No ${category} events this week` : 'No events this week'}
                </p>
                <p className="text-xs mt-0.5">Try a different category or check back soon!</p>
              </div>
            </div>
          ) : (
            <div
              ref={marqueeScrollRef}
              className="overflow-x-auto scroll-x pb-2"
              style={{
                cursor: filteredWeekEvents.length > 3 ? 'grab' : 'default',
                maskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 90%, transparent 100%)',
                scrollSnapType: 'x mandatory',
              }}
              onMouseEnter={e => {
                const inner = e.currentTarget.querySelector('[data-marquee]');
                if (inner) inner.style.animationPlayState = 'paused';
              }}
              onMouseLeave={e => {
                const inner = e.currentTarget.querySelector('[data-marquee]');
                if (inner) inner.style.animationPlayState = 'running';
              }}
            >
              <div
                data-marquee
                key={filteredWeekEvents.map(e => e._id).join('-')}
                className="flex gap-4 py-2"
                style={{
                  width: 'max-content',
                  animation: filteredWeekEvents.length > 3
                    ? `marquee-scroll ${filteredWeekEvents.length * 6}s linear infinite`
                    : 'none',
                }}
              >
                {(filteredWeekEvents.length > 3
                  ? [...filteredWeekEvents, ...filteredWeekEvents]
                  : filteredWeekEvents
                ).map((event, idx) => {
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  const img = event.images?.[0]
                    ? (event.images[0].startsWith('http') ? event.images[0] : `${API_URL}${event.images[0]}`)
                    : null;
                  return (
                    <Link
                      key={`${event._id}-${idx}`}
                      to={`/events/${event._id}`}
                      className="week-card flex-shrink-0 w-52 block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-card hover:shadow-card-hover transition-all duration-300 group"
                      style={{ textDecoration: 'none' }}
                    >
                      {/* Photo top */}
                      <div className="relative h-36 overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {img ? (
                          <img
                            src={img}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            draggable="false"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl opacity-20">🎉</span>
                          </div>
                        )}
                        {/* Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/10">
                            {event.category}
                          </span>
                          {event.trending && (
                            <motion.span
                              animate={{ scale: [1, 1.12, 1] }}
                              transition={{ repeat: Infinity, duration: 1.8 }}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white"
                            >🔥</motion.span>
                          )}
                        </div>
                      </div>

                      {/* Info panel below */}
                      <div className="p-3">
                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">
                          {event.name}
                        </p>
                        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs mb-2.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{event.location?.district || event.location?.address}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                          <Countdown date={event.date} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* All Events */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gray-900 dark:bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  {search ? `Results for "${search}"` : 'All Events'}
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                  {search ? 'Showing matches across Kerala' : 'Discover events around you'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!loading && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{total}</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">found</span>
                </div>
              )}
              {isAdmin() && (
                <Link to="/admin/events/new" className="btn-primary text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1">
                  + Add Event
                </Link>
              )}
            </div>
          </div>

          {/* Events Grid — 2 cols on mobile, 2 on sm, 3 on lg, 4 on xl */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({length: 8}).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No events found</h3>
              <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters</p>
              <button onClick={resetFilters} className="btn-primary text-sm">Clear Filters</button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              {events.map((event, i) => (
                <motion.div key={event._id} variants={fadeUpItem}>
                  <EventCard event={event} index={i} onDelete={handleDelete} onToggleTrending={handleToggleTrending} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.2 }}
              className="mt-8 flex justify-center gap-2"
            >
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary text-sm px-4 disabled:opacity-40">← Prev</button>
              <div className="flex gap-1">
                {Array.from({length: pages}, (_, i) => i+1).filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 py-1 text-gray-400">…</span>}
                    <button onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'btn-secondary'}`}>
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="btn-secondary text-sm px-4 disabled:opacity-40">Next →</button>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
