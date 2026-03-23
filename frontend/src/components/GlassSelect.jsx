import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlassSelect({ value, onChange, options = [], placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value || o.label === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt) => { onChange(opt.value ?? opt.label); setOpen(false); };

  return (
    <div ref={ref} className={`relative ${className}`}>

      {/* ── Trigger Button ── */}
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-left outline-none"
        style={{
          /* Core liquid glass */
          background: open
            ? 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: open
            ? '1.5px solid rgba(34,197,94,0.55)'
            : '1.5px solid rgba(255,255,255,0.35)',
          boxShadow: open
            ? '0 8px 32px rgba(34,197,94,0.15), 0 0 0 3px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.04)'
            : '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.03)',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          color: selected ? 'inherit' : '#9ca3af',
        }}
      >
        {/* Inner highlight streak */}
        <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <span className="absolute top-0 left-3 right-3 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
        </span>

        <span className="flex items-center gap-2 relative z-10">
          {selected?.icon && <span>{selected.icon}</span>}
          <span>{selected ? selected.label : placeholder}</span>
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10 flex-shrink-0 ml-2"
          style={{ color: open ? 'rgba(34,197,94,0.8)' : 'rgba(156,163,175,0.8)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.span>
      </motion.button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96, rotateX: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, rotateX: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute z-[9999] w-full mt-2 rounded-2xl overflow-hidden"
            style={{
              /* Deep liquid glass panel */
              background: 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)',
              backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
              border: '1.5px solid rgba(255,255,255,0.40)',
              boxShadow: [
                '0 20px 60px rgba(0,0,0,0.18)',
                '0 4px 16px rgba(0,0,0,0.10)',
                'inset 0 1px 0 rgba(255,255,255,0.65)',
                'inset 0 -1px 0 rgba(0,0,0,0.05)',
                'inset 1px 0 0 rgba(255,255,255,0.25)',
                'inset -1px 0 0 rgba(255,255,255,0.10)',
              ].join(', '),
              transformOrigin: 'top center',
            }}
          >
            {/* Top highlight */}
            <div className="absolute top-0 left-4 right-4 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }} />

            {/* Diagonal shimmer */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
              <div className="absolute -top-full left-0 w-1/2 h-[300%] opacity-20"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
                  animation: 'none',
                }} />
            </div>

            <div className="relative py-1.5 max-h-56 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}>
              {options.map((opt, i) => {
                const isSelected = (opt.value ?? opt.label) === value;
                const isHovered = hovered === i;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 relative"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.10) 100%)'
                        : isHovered
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)'
                          : 'transparent',
                      color: isSelected ? '#16a34a' : 'inherit',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.15s ease',
                      borderBottom: i < options.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                    }}
                  >
                    {/* Selected row inner glow */}
                    {isSelected && (
                      <span className="absolute inset-0 rounded-none pointer-events-none"
                        style={{ boxShadow: 'inset 2px 0 0 rgba(34,197,94,0.5)' }} />
                    )}
                    {opt.icon && <span className="text-base">{opt.icon}</span>}
                    <span className="flex-1">{opt.label}</span>
                    {isSelected && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="text-accent text-xs font-bold">✓</motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Bottom reflection */}
            <div className="absolute bottom-0 left-4 right-4 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
