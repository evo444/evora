import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM, { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { adminService, eventService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { StarDisplay } from '../components/StarRating';
import CrowdBadge from '../components/CrowdBadge';
import toast from 'react-hot-toast';
import { Bot, Calendar, MapPin, Users, Star, Pencil, Trash2, Image as ImageIcon, Trophy, BarChart2, RefreshCw, Clock, CheckCircle, XCircle, Inbox, Crown, User, Flame, Eye } from 'lucide-react';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41],
});

const tabs = ['Submissions', 'Overview', 'Events', 'Duplicates', 'Users', 'Feedback', 'Database'];

/* ── Premium Glass Dropdown (Portal-based) ── */
function GlassSelect({ icon, value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const { darkMode } = useTheme();
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: Math.max(r.width, 180) });
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
      className="fixed z-[200] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-3xl"
      style={{
        top: pos.top - window.scrollY,
        left: pos.left,
        minWidth: pos.width,
        backgroundColor: darkMode ? 'rgba(30,32,38,0.96)' : 'rgba(255,255,255,0.95)',
        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => { onChange(opt.value); setOpen(false); }}
          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-between group ${
            value === opt.value 
              ? 'text-green-500 bg-green-500/10' 
              : darkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-black/5'
          }`}
          style={{ borderBottom: i < options.length - 1 ? (darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)') : 'none' }}
        >
          <span>{opt.label}</span>
          {value === opt.value ? <span className="text-xs">✓</span> : opt.count > 0 && (
            <span className="min-w-[1.2rem] h-[1.2rem] rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center px-1 font-bold">
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </motion.div>,
    document.body
  );

  return (
    <div className={`relative ${className}`}>
      <button ref={btnRef} onClick={handleOpen} className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-bold ${
        open ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300'
      }`}>
        <span className="flex-1 text-left">{selected ? selected.label : placeholder}</span>
        {selected?.count > 0 && !open && (
           <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">{selected.count}</span>
        )}
        <motion.svg animate={{ rotate: open ? 180 : 0 }} className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      {panel}
    </div>
  );
}
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Build a safe image URL — handles all storage formats AND proxies wikimedia images
// 1. Wikimedia/Wikipedia → proxy through backend to avoid CORS/hotlink blocking
// 2. Full URL: http://...  → use as-is
// 3. /uploads/file.jpg    → prepend API_BASE
// 4. bare filename.jpg    → prepend API_BASE/uploads/
const imgUrl = (rawPath) => {
  if (!rawPath) return '';
  // Return Wikimedia URLs as-is — img tags use referrerPolicy="no-referrer" to bypass hotlink check
  if (rawPath.startsWith('http')) return rawPath;
  if (rawPath.startsWith('/')) return `${API_BASE}${rawPath}`;
  return `${API_BASE}/uploads/${rawPath}`;
};

/* ── Draggable Marker helper ── */
function DraggableMarker({ pos, setPos }) {
  const markerRef = React.useRef(null);
  const eventHandlers = React.useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) setPos(m.getLatLng());
    },
  }), [setPos]);
  return <Marker draggable position={pos} icon={greenIcon} eventHandlers={eventHandlers} ref={markerRef}>
    <Popup>Drag to adjust · {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</Popup>
  </Marker>;
}

/* ── Map auto-flyTo when markerPos changes ── */
function MapFly({ pos }) {
  const map = React.useRef(null);
  // Use the useMap hook inside MapContainer context
  return null; // flyTo handled via key prop remount
}

/* ── Full Submission Preview Modal ── */
function SubmissionPreviewModal({ sub, onClose, onApprove, onReject, onDeleteDuplicate, allSubs = [], dismissedDuplicates = [], onDismissDuplicate }) {
  const [imgIndex,     setImgIndex]  = useState(0);
  const [lightbox,     setLightbox]  = useState(null);
  const [markerPos,    setMarkerPos] = useState(null);

  const images = sub?.images || [];
  const loc    = sub?.location || {};

  // Resolve coordinates from both flat and nested formats
  const rawLat = parseFloat(loc.lat ?? loc.coordinates?.lat ?? '');
  const rawLng = parseFloat(loc.lng ?? loc.coordinates?.lng ?? '');
  // Detect old hardcoded Thrissur defaults (10.8505, 76.2711) — treat as missing coordinates
  const isOldDefault = Math.abs(rawLat - 10.8505) < 0.001 && Math.abs(rawLng - 76.2711) < 0.001;
  const lat = (!isNaN(rawLat) && !isOldDefault) ? rawLat : NaN;
  const lng = (!isNaN(rawLng) && !isOldDefault) ? rawLng : NaN;
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  // Init draggable marker position
  useEffect(() => {
    if (hasCoords) setMarkerPos({ lat, lng });
  }, [sub?._id]);

  if (!sub) return null;

  /* — Validation warnings — */
  const warnings = [];

  if (!loc.address)                           warnings.push({ type: 'error',   msg: '⚠️ Location address is missing.' });
  if (sub.description?.length < 80)          warnings.push({ type: 'warn',    msg: '⚠️ Description is very short (< 80 chars) — may confuse attendees.' });
  if (sub.date && new Date(sub.date) < new Date()) warnings.push({ type: 'warn', msg: '⚠️ Event start date is in the past.' });
  if (!images.length)                         warnings.push({ type: 'info',    msg: 'ℹ️ No photos uploaded — events with images get 3× more views.' });

  /* — Duplicate detection — */
  const duplicates = allSubs.filter(s =>
    s._id !== sub._id &&
    !dismissedDuplicates.includes(s._id) &&
    s.name?.toLowerCase().trim() === sub.name?.toLowerCase().trim() &&
    Math.abs(new Date(s.date) - new Date(sub.date)) < 86400000 * 7  // within 7 days
  );

  /* — Helpers — */
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' }) : '—';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';
  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  };

  const wBg = { error:'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300', warn:'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300', info:'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-300' };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20">✕</button>
        </div>
      )}

      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-start justify-center sm:p-4 sm:pt-6 overflow-hidden">

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30 }} transition={{ type:'spring', stiffness:320, damping:30 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col mx-auto"
            style={{ maxHeight: '92dvh' }}>

            {/* ─── Image Gallery Header ─── */}
            <div className="relative bg-gray-900 flex-shrink-0" style={{ minHeight: 140 }}>
              {images.length > 0 ? (
                <>
                  <img src={imgUrl(images[imgIndex])} alt=""
                    referrerPolicy="no-referrer"
                    className="w-full object-cover cursor-zoom-in"
                    style={{ height: 'clamp(160px, 28vw, 260px)' }}
                    onClick={() => setLightbox(imgUrl(images[imgIndex]))} />
                  {/* Thumbnail strip */}
                  {images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-2 bg-gradient-to-t from-black/80 overflow-x-auto">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setImgIndex(i)}
                          className={`flex-shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-90'}`}>
                          <img src={imgUrl(img)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="absolute top-3 right-12 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
                    {imgIndex + 1}/{images.length} · Click to zoom
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center text-gray-500" style={{ height: 180 }}>
                  <div className="text-center"><div className="text-5xl mb-2">🎪</div><p className="text-sm">No images uploaded</p></div>
                </div>
              )}
              {/* Status badge */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  sub.status === 'pending' ? 'bg-orange-500 text-white' : sub.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {sub.status === 'pending' ? '⏳ Pending Review' : sub.status === 'approved' ? '✅ Approved' : '✕ Rejected'}
                </span>
                {sub.trending && <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">🔥 Trending</span>}
              </div>
              <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 text-lg">✕</button>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
            <div className="p-4 sm:p-6 space-y-4">

              {/* Title + category + meta */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{sub.name}</h2>
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex-shrink-0 text-xs px-2 py-0.5">{sub.category}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 {fmtDate(sub.date)} {fmtTime(sub.date) && `· ${fmtTime(sub.date)}`}</span>
                  {sub.endDate && <span>→ {fmtDate(sub.endDate)} {fmtTime(sub.endDate) && `· ${fmtTime(sub.endDate)}`}  <CrowdBadge crowd={sub.crowd} size="sm" /></span>}
                  {sub.attendees > 0 && <span>👥 {Number(sub.attendees).toLocaleString()} expected</span>}
                  <span className="text-xs text-gray-400">⏱ Submitted {timeAgo(sub.createdAt)}</span>
                </div>
              </div>

              {/* ── Validation Warnings ── */}
              {(warnings.length > 0 || duplicates.length > 0) && (
                <div className="space-y-2">
                  {duplicates.map(dup => (
                    <div key={dup._id} className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
                      <div className="flex gap-2 p-3 text-sm text-purple-700 dark:text-purple-300">
                        <span className="flex-shrink-0 text-base">🔁</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">Possible duplicate detected</p>
                          <p className="text-xs mt-0.5 opacity-80">Another submission with the same name exists: <strong>"{dup.name}"</strong> on {new Date(dup.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} by {dup.submittedBy?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex border-t border-purple-200 dark:border-purple-800/50">
                        <button
                          onClick={() => onDeleteDuplicate && onDeleteDuplicate(dup._id)}
                          className="flex-1 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          🗑️ Delete that duplicate
                        </button>
                        <div className="w-px bg-purple-200 dark:bg-purple-800/50" />
                        <button
                          onClick={() => onDismissDuplicate && onDismissDuplicate(dup._id)}
                          className="flex-1 py-2 text-xs font-bold text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all flex items-center justify-center gap-1.5"
                        >
                          ✓ Not a duplicate
                        </button>
                      </div>
                    </div>
                  ))}
                  {warnings.map((w, i) => (
                    <div key={i} className={`flex gap-2 p-3 rounded-xl border text-sm ${wBg[w.type]}`}>
                      <span>{w.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Description ── */}
              <div>
                <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1.5">Description</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-800 rounded-xl p-4">{sub.description || <em className="text-gray-400">No description</em>}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">{sub.description?.length || 0} characters</p>
              </div>

              {/* ── Location — Interactive Map ── */}
              <div>
                {(() => {
                  const addr = loc.address || '';
                  const hasAddress = !!addr;
                  const district = loc.district || '';
                  const encodedAddr = encodeURIComponent(addr + (district ? `, ${district}, Kerala` : ', Kerala'));
                  const gmapsDirections = hasCoords
                    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}&travelmode=driving`;
                  const gmapsOpen = hasCoords
                    ? `https://www.google.com/maps?q=${lat},${lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodedAddr}`;

                  return (
                    <div className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      {/* Map area */}
                      {hasCoords && markerPos ? (
                        <MapContainer key={`${lat}-${lng}`} center={[lat, lng]} zoom={15}
                          style={{ height: 200, width: '100%' }} scrollWheelZoom={false} zoomControl>
                          <TileLayer attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <DraggableMarker pos={markerPos} setPos={setMarkerPos} />
                        </MapContainer>
                      ) : hasAddress ? (
                        <iframe
                          title="Event Location"
                          width="100%" height="200"
                          style={{ border: 0, display: 'block' }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://maps.google.com/maps?q=${encodedAddr}&output=embed`}
                        />
                      ) : (
                        <div className="h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm">
                          📍 No location data available
                        </div>
                      )}

                      {/* Details panel */}
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 space-y-2">
                        {loc.placeName && <p className="font-semibold text-gray-900 dark:text-white text-sm">🏛 {loc.placeName}</p>}
                        {addr && <p className="text-sm text-gray-600 dark:text-gray-300">📍 {addr}</p>}
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="text-gray-500">{district ? `${district} District` : ''}</span>
                          {hasCoords && <span className="font-mono text-gray-600 dark:text-gray-300">{lat.toFixed(5)}, {lng.toFixed(5)}</span>}
                        </div>
                        {(hasCoords || hasAddress) && (
                          <div className="flex gap-2 pt-1">
                            <a href={gmapsDirections} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent text-white">
                              🧭 Get Directions
                            </a>
                            <a href={gmapsOpen} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              🗺 Maps
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>



              {/* ── Tags ── */}
              {sub.tags?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1.5">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.tags.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Organizer ── */}
              {(sub.organizerName || sub.organizerEmail || sub.organizerPhone || sub.website) && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1.5">Organizer</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm space-y-1">
                    {sub.organizerName  && <p className="font-semibold text-gray-900 dark:text-white">👤 {sub.organizerName}</p>}
                    {sub.organizerEmail && <p className="text-gray-500 dark:text-gray-400">✉️ {sub.organizerEmail}</p>}
                    {sub.organizerPhone && <p className="text-gray-500 dark:text-gray-400">📞 {sub.organizerPhone}</p>}
                    {sub.website        && <a href={sub.website} target="_blank" rel="noreferrer" className="text-accent text-xs hover:underline">🌐 {sub.website}</a>}
                  </div>
                </div>
              )}

              {/* ── Submitted by + timestamps ── */}
              <div className={`p-3 rounded-xl border text-sm flex items-center justify-between flex-wrap gap-2 ${
                sub.addedBy === 'AI'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30'
              }`}>
                <div>
                  {sub.addedBy === 'AI' ? (
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">🤖 Added by AI — auto-fetched by weekly scheduler</span>
                  ) : (
                    <>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Submitted by: </span>
                      <span className="text-blue-600 dark:text-blue-400">{sub.submittedBy?.name || 'Unknown'}</span>
                      {sub.submittedBy?.email && <span className="text-blue-400 dark:text-blue-500"> · {sub.submittedBy.email}</span>}
                    </>
                  )}
                </div>
                <span className="text-blue-400 dark:text-blue-500 text-xs">{timeAgo(sub.createdAt)}</span>
              </div>

              {/* ── Rejection reason (if rejected) ── */}
              {sub.rejectionReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                  <strong>Rejection reason:</strong> {sub.rejectionReason}
                </div>
              )}

              {/* ── Safety note ── */}
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-xs text-amber-700 dark:text-amber-400">
                <span className="flex-shrink-0">🛡️</span>
                <span><strong>Admin reminder:</strong> Verify map location, description, and date before approving.</span>
              </div>

            </div>
            </div>

            {/* ── Sticky Action Bar ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {sub.status === 'pending' ? (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(sub._id)}
                      className="flex-1 btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
                      ✅ Approve
                    </button>
                    <Link
                      to={`/admin/events/${sub._id}/edit`}
                      onClick={onClose}
                      className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all flex items-center gap-1.5"
                    >
                      ✏️ Edit
                    </Link>
                    <button onClick={() => onReject(sub._id)}
                      className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">
                      🗑️
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1.5">Edit before approving · 🗑️ permanently deletes</p>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to={`/admin/events/${sub._id}/edit`}
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    ✏️ Edit Event
                  </Link>
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Duplicates Tab Component ──────────────────────────────────────────────────
function DuplicatesTab() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null);  // groupId being merged
  const [dismissed, setDismissed] = useState(new Set());
  const [mergeModal, setMergeModal] = useState(null); // { group }
  const [keepId, setKeepId] = useState('');

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('evora_token');
      const res = await axios.get(`${API_URL}/api/admin/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data.groups || []);
    } catch { toast.error('Failed to load duplicates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDuplicates(); }, []);

  const handleMerge = async (group) => {
    const deleteId = group.events.find(e => e._id !== keepId)?._id;
    if (!keepId || !deleteId) { toast.error('Select which event to keep'); return; }
    setMerging(group.id);
    try {
      const token = localStorage.getItem('evora_token');
      const res = await axios.post(`${API_URL}/api/admin/merge`,
        { keepId, deleteId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      setMergeModal(null);
      setKeepId('');
      fetchDuplicates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Merge failed');
    } finally { setMerging(null); }
  };

  const visibleGroups = groups.filter(g => !dismissed.has(g.id));

  const scoreColor = (score) =>
    score >= 90 ? 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
    : score >= 75 ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'
    : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40';

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-40 skeleton" />)}
    </div>
  );

  return (
    <>
      {/* Merge Modal — rendered via portal so position:fixed escapes the motion.div stacking context */}
      {mergeModal && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setMergeModal(null); setKeepId(''); }}
        >
          <motion.div
            initial={{ opacity:0, scale:0.95, y:20 }}
            animate={{ opacity:1, scale:1, y:0 }}
            transition={{ type:'spring', stiffness:340, damping:28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">🧠 Smart Merge</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Choose which event to <strong>keep</strong>. The other will be merged into it and deleted. Combined tags, images, and descriptions are preserved automatically.</p>
            </div>
            <div className="p-5 space-y-3">
              {mergeModal.group.events.map(ev => (
                <button
                  key={String(ev._id)}
                  onClick={() => setKeepId(String(ev._id))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    keepId === String(ev._id)
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      keepId === String(ev._id) ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {keepId === String(ev._id) && <span className="text-white text-xs">✓</span>}
                    </span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{ev.name}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      ev.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>{ev.status}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500 ml-7">
                    <span>📅 {fmtDate(ev.date)}</span>
                    <span>📍 {ev.location?.district || '—'}</span>
                    <span>🖼 {ev.images?.length || 0} photos</span>
                    <span>🏷 {ev.tags?.length || 0} tags</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => handleMerge(mergeModal.group)}
                disabled={!keepId || merging === mergeModal.group.id}
                className="flex-1 btn-primary py-3 text-sm font-bold disabled:opacity-40"
              >
                {merging === mergeModal.group.id ? '⏳ Merging...' : '🧠 Merge & Delete Duplicate'}
              </button>
              <button onClick={() => { setMergeModal(null); setKeepId(''); }} className="px-5 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">🔄 Duplicate Detection</h2>
          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">AI-powered scan of all events — scored by similarity</p>
        </div>
        <button onClick={fetchDuplicates} className="btn-secondary text-sm flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Re-scan
        </button>
      </div>

      {/* Summary pill */}
      {visibleGroups.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{visibleGroups.length} potential duplicate group{visibleGroups.length > 1 ? 's' : ''} found</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">Review and merge or dismiss each group below.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {visibleGroups.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No duplicates detected</p>
          <p className="text-xs text-gray-400 mt-1">All events appear to be unique. Click Re-scan to check again.</p>
        </div>
      )}

      {/* Duplicate groups */}
      {visibleGroups.map(group => (
        <div key={group.id} className="card overflow-hidden">
          {/* Group header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔁</span>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{group.events[0].name}</p>
                <p className="text-xs text-gray-400">Group of {group.events.length} similar events</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${scoreColor(group.score)}`}>
                {group.score}% match
              </span>
            </div>
          </div>

          {/* Side-by-side event comparison */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {group.events.map((ev) => (
              <div key={String(ev._id)} className="p-4 flex gap-4">
                {ev.images?.[0] ? (
                  <img src={ev.images[0]} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">🎪</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{ev.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      ev.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>{ev.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {fmtDate(ev.date)}</span>
                    {ev.location?.district && <span>📍 {ev.location.district}</span>}
                    <span>🗂 {ev.category}</span>
                    <span>🖼 {ev.images?.length || 0} photos</span>
                    <span>🏷 {(ev.tags || []).slice(0,3).join(', ')}{(ev.tags?.length > 3) ? '…' : ''}</span>
                    {ev.addedBy === 'AI' && <span className="text-indigo-500">🤖 AI</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-1">{ev.description?.slice(0, 120)}…</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setMergeModal({ group }); setKeepId(''); }}
              className="flex-1 py-3 text-sm font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex items-center justify-center gap-1.5"
            >
              🧠 Edit &amp; Merge
            </button>
            <div className="w-px bg-gray-100 dark:border-gray-800" />
            <button
              onClick={() => { setDismissed(prev => new Set([...prev, group.id])); toast.success('Dismissed — not a duplicate'); }}
              className="flex-1 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all flex items-center justify-center gap-1.5"
            >
              ✓ Not a Duplicate
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('Submissions');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rejectReason, setRejectReason] = useState({});
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewSub, setPreviewSub] = useState(null);
  const [dismissedDuplicates, setDismissedDuplicates] = useState([]);

  if (!isAdmin()) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4">🚫</div><h2 className="text-xl font-bold text-gray-800 dark:text-white">Admin Access Only</h2></div>
    </div>
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use 'evora_token' — the correct key used throughout the app
      const token = localStorage.getItem('evora_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [a, u, e, fb, subs] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getUsers(),
        eventService.getAll({ limit: 50 }),
        axios.get(`${API_URL}/api/feedback`, { headers }),
        eventService.getSubmissions().catch(() => []),
      ]);
      setAnalytics(a);
      setUsers(u);
      setEvents(e.events);
      setFeedback(fb.data);
      setSubmissions(Array.isArray(subs) ? subs : []);
      // Database stats
      const token2 = localStorage.getItem('evora_token');
      const dbRes = await axios.get(`${API_URL}/api/admin/dbstats`, { headers: { Authorization: `Bearer ${token2}` } });
      setDbStats(dbRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approveUser = async (id) => {
    try { await adminService.approveUser(id); toast.success('User approved!'); fetchData(); }
    catch { toast.error('Failed'); }
  };
  const rejectUser = async (id) => {
    try { await adminService.rejectUser(id); toast.success('User unapproved'); fetchData(); }
    catch { toast.error('Failed'); }
  };
  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await adminService.deleteUser(id); toast.success('User deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };
  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await eventService.delete(id); toast.success('Event deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };
  const toggleTrending = async (id) => {
    try { await adminService.toggleTrending(id); fetchData(); }
    catch { toast.error('Failed'); }
  };

  // ── Manual AI event fetch trigger ──
  const [aiFetching, setAiFetching] = React.useState(false);
  const triggerAiFetch = async () => {
    if (aiFetching) return;
    setAiFetching(true);
    try {
      const token = localStorage.getItem('evora_token');
      const res = await axios.post(`${API_URL}/api/admin/trigger-ai-fetch`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { eventsQueued, message } = res.data;
      if (eventsQueued > 0) {
        toast.success(`🤖 ${message} Check Submissions tab.`);
        fetchData();
      } else {
        toast(`ℹ️ ${message}`, { icon: '📅' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI fetch failed');
    } finally {
      setAiFetching(false);
    }
  };

  const approveSubmission = async (id) => {
    try { await eventService.approveSubmission(id); toast.success('Event approved! 🎉'); setPreviewSub(null); fetchData(); }
    catch { toast.error('Failed to approve'); }
  };
  const rejectSubmission = async (id) => {
    if (!window.confirm('Permanently delete this submission? This cannot be undone.')) return;
    try { await eventService.rejectSubmission(id); toast.success('Submission deleted permanently 🗑️'); setPreviewSub(null); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  const updateFeedbackStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('evora_token');
      await axios.patch(`${API_URL}/api/feedback/${id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      setFeedback(prev => prev.map(f => f._id === id ? { ...f, status } : f));
    } catch { toast.error('Failed to update'); }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      const token = localStorage.getItem('evora_token');
      await axios.delete(`${API_URL}/api/feedback/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setFeedback(prev => prev.filter(f => f._id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const deleteDuplicate = async (id) => {
    if (!window.confirm('Delete this duplicate submission permanently?')) return;
    try { await eventService.rejectSubmission(id); toast.success('Duplicate deleted 🗑️'); fetchData(); }
    catch { toast.error('Failed to delete duplicate'); }
  };
  const dismissDuplicate = (id) => {
    setDismissedDuplicates(prev => [...prev, id]);
    toast.success('Marked as not a duplicate ✓');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">

      {/* ── Submission Preview Modal ── */}
      {previewSub && ReactDOM.createPortal(
        <SubmissionPreviewModal
          sub={previewSub}
          onClose={() => setPreviewSub(null)}
          onApprove={approveSubmission}
          onReject={rejectSubmission}
          onDeleteDuplicate={deleteDuplicate}
          onDismissDuplicate={dismissDuplicate}
          dismissedDuplicates={dismissedDuplicates}
          allSubs={submissions}
        />,
        document.body
      )}

      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2} /> Admin
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Manage Zzon</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Fetch trigger */}
          <button onClick={triggerAiFetch} disabled={aiFetching}
            title="Manually fetch this week's Kerala temple events"
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              aiFetching
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-400 cursor-not-allowed'
                : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
            }`}>
            {aiFetching ? (
              <div className="animate-spin"><RefreshCw className="w-3.5 h-3.5" /></div>
            ) : <Bot className="w-3.5 h-3.5" strokeWidth={2} />}
            <span className="hidden sm:inline">{aiFetching ? 'Fetching...' : 'Run AI Fetch'}</span>
          </button>
          {/* New event (hidden on netlify) */}
          {!window.location.hostname.includes('netlify.app') && (
            <Link to="/admin/events/new" className="btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
              <span>+</span> New
            </Link>
          )}
        </div>
      </div>

      {/* Tabs as GlassSelect */}
      <div className="mb-6">
        <GlassSelect 
          value={activeTab}
          onChange={setActiveTab}
          options={tabs.map(t => ({
            label: t,
            value: t,
            count: t === 'Submissions' ? submissions.filter(s => s.status === 'pending').length : 0
          }))}
          placeholder="Select Section"
          className="w-full sm:max-w-[240px]"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 skeleton" />)}
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'Overview' && analytics && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Events', value: analytics.totalEvents, icon: '🎉', color: 'from-blue-400 to-blue-600' },
                  { label: 'Total Users', value: analytics.totalUsers, icon: '👥', color: 'from-green-400 to-green-600' },
                  { label: 'Pending Users', value: analytics.pendingUsers, icon: '⏳', color: 'from-yellow-400 to-orange-500' },
                  { label: 'Categories', value: analytics.byCategory?.length, icon: '🗃️', color: 'from-purple-400 to-purple-600' },
                ].map(stat => (
                  <div key={stat.label} className={`card p-5 bg-gradient-to-br ${stat.color} text-white border-0`}>
                    <div className="text-3xl mb-1">{stat.icon}</div>
                    <div className="text-2xl font-black">{stat.value || 0}</div>
                    <div className="text-sm opacity-80">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Top Events */}
              <div className="card p-5">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">🏆 Top Events</h2>
                <div className="space-y-3">
                  {analytics.topEvents?.map((e, i) => (
                    <div key={e._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <span className="text-lg font-black text-gray-400 w-6">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{e.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarDisplay rating={e.averageRating} total={e.totalRatings} />
                          <CrowdBadge crowd={e.crowd} />
                        </div>
                      </div>
                      <Link to={`/events/${e._id}`} className="text-xs text-primary-500 hover:underline">View</Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="card p-5">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">📊 Events by Category</h2>
                <div className="space-y-2">
                  {analytics.byCategory?.map(c => (
                    <div key={c._id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24">{c._id}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-primary-500 rounded-full transition-all"
                          style={{ width: `${(c.count / (analytics.totalEvents || 1)) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-6">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {/* Submissions Tab */}
          {activeTab === 'Submissions' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Pending Review', value: submissions.filter(s => s.status === 'pending').length, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                  { label: 'Total Submissions', value: submissions.length, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-50 dark:bg-gray-800' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {submissions.length === 0 ? (
                <div className="card p-14 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No event submissions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Event submissions from users will appear here</p>
                </div>
              ) : submissions.map(sub => {
                const hasImg = sub.images?.length > 0;
                return (
                  <div key={sub._id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="flex gap-0">
                      {/* Thumbnail */}
                      {hasImg ? (
                        <div className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden h-28 sm:h-32">
                          <img
                            src={imgUrl(sub.images[0])}
                            alt=""
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display='flex'); }}
                          />
                          <div className="absolute inset-0 items-center justify-center hidden">
                            <ImageIcon className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                          </div>
                          {sub.images.length > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">+{sub.images.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-28 sm:w-36 flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center" style={{ minHeight: 120 }}>
                          <ImageIcon className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">{sub.name}</h3>
                          <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                            <span className={`badge text-xs ${sub.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                              {sub.status === 'pending' ? '⏳ Pending' : '✕ Rejected'}
                            </span>
                            {sub.addedBy === 'AI' && (
                              <span className="badge text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">🤖 Added by AI</span>
                            )}
                            {submissions.some(s =>
                              s._id !== sub._id &&
                              !dismissedDuplicates.includes(s._id) &&
                              s.name?.toLowerCase().trim() === sub.name?.toLowerCase().trim() &&
                              Math.abs(new Date(s.date) - new Date(sub.date)) < 86400000 * 7
                            ) && (
                              <span className="badge text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">🔁 Duplicate</span>
                            )}
                          </div>
                         </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{sub.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mb-3">
                          <span>🗂 {sub.category}</span>
                          <span>📅 {new Date(sub.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                          {sub.location?.district && <span>📍 {sub.location.district}</span>}
                          <span>{sub.addedBy === 'AI' ? '🤖 Added by AI' : `👤 ${sub.submittedBy?.name || 'Unknown'}`}</span>
                        </div>
                        <button onClick={() => setPreviewSub(sub)}
                          className="w-full py-2 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4" strokeWidth={2} />
                          Preview &amp; Review
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Duplicates Tab */}
          {activeTab === 'Duplicates' && <DuplicatesTab />}

          {/* Events Tab — Mobile Card Layout */}
          {activeTab === 'Events' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-2">
              {events.map(e => (
                <div key={e._id} className="card p-3 flex items-center gap-3">
                  {/* Thumbnail or icon */}
                  {e.images?.[0] ? (
                    <img src={imgUrl(e.images[0])} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">🎪</div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-1">{e.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-gray-400">{e.location?.district}</span>
                      <span className="badge text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-0">{e.category}</span>
                      <StarDisplay rating={e.averageRating} total={e.totalRatings} />
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleTrending(e._id)} title={e.trending ? 'Remove trending' : 'Set trending'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Flame className={`w-4 h-4 ${e.trending ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} strokeWidth={e.trending ? 0 : 2} />
                    </button>
                    <Link to={`/admin/events/${e._id}/edit`} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-300" strokeWidth={2} />
                    </Link>
                    <button onClick={() => deleteEvent(e._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="card p-12 text-center">
                  <div className="text-4xl mb-2">🎪</div>
                  <p className="text-gray-400 text-sm">No events found</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Users Tab — Mobile Card Layout */}
          {activeTab === 'Users' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-2">
              {users.map(u => (
                <div key={u._id} className="card p-3 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className={`badge text-[10px] py-0 ${ u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                      <span className={`badge text-[10px] py-0 ${ u.approved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {u.approved ? '✅' : '⏳'}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!u.approved ? (
                      <button onClick={() => approveUser(u._id)} className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg font-medium">✓ Approve</button>
                    ) : (
                      <button onClick={() => rejectUser(u._id)} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 px-2 py-1 rounded-lg font-medium">Revoke</button>
                    )}
                    {u.role !== 'admin' && (
                      <button onClick={() => deleteUser(u._id)} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-500 px-2 py-1 rounded-lg font-medium">Delete</button>
                    )}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="card p-12 text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-gray-400 text-sm">No users found</p>
                </div>
              )}
            </motion.div>
          )}
          {/* Feedback Tab */}
          {activeTab === 'Feedback' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {['all', 'new', 'seen', 'resolved'].map(f => (
                  <button key={f} onClick={() => setFeedbackFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                      feedbackFilter === f ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                    {f === 'all' ? '📋 All' : f === 'new' ? '🔴 New' : f === 'seen' ? '👁️ Seen' : '✅ Resolved'}
                    {f !== 'all' && <span className="ml-1">({feedback.filter(fb => fb.status === f).length})</span>}
                  </button>
                ))}
                <span className="ml-auto text-sm text-gray-400">{feedback.length} total</span>
              </div>

              {feedback
                .filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter)
                .map(fb => (
                  <div key={fb._id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-xs ${
                          fb.type === 'bug' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {fb.type === 'bug' ? '🐛 Bug' : '💡 Idea'}
                        </span>
                        <span className={`badge text-xs ${
                          fb.status === 'new' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                          fb.status === 'seen' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                          'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {fb.status}
                        </span>
                        {fb.user?.name && <span className="text-xs text-gray-400">by {fb.user.name}</span>}
                        {fb.email && <span className="text-xs text-gray-400">· {fb.email}</span>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(fb.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {fb.status !== 'seen' && (
                        <button onClick={() => updateFeedbackStatus(fb._id, 'seen')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Mark Seen</button>
                      )}
                      {fb.status !== 'resolved' && (
                        <button onClick={() => updateFeedbackStatus(fb._id, 'resolved')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors">Resolve</button>
                      )}
                      <button onClick={() => deleteFeedback(fb._id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors ml-auto">Delete</button>
                    </div>
                  </div>
                ))
              }
              {feedback.filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No feedback yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Database Tab ── */}
          {activeTab === 'Database' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
              {!dbStats ? (
                <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">⏳</div><p>Loading database stats...</p></div>
              ) : (
                dbStats.collections.map(col => {
                  const colorMap = {
                    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800/30', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-800/30', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800/30', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
                  };
                  const c = colorMap[col.color];
                  return (
                    <div key={col.name} className={`card p-5 border ${c.border}`}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-xl`}>{col.icon}</div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white">{col.name}</h3>
                            <p className="text-xs text-gray-400">Collection</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-black ${c.text}`}>{col.total}</div>
                          <div className="text-xs text-gray-400">total records</div>
                        </div>
                      </div>

                      {/* Stats pills */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {col.stats.map(s => (
                          <div key={s.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${c.badge}`}>
                            <span className="font-black">{s.value}</span> {s.label}
                          </div>
                        ))}
                      </div>

                      {/* Recent records */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">5 Most Recent</p>
                        <div className="space-y-1.5">
                          {col.recent.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No records yet</p>
                          ) : col.recent.map((record, i) => (
                            <div key={record._id || i} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">
                                  {record.name || record.message?.slice(0, 40) || record.email || '—'}
                                </span>
                                {record.status && (
                                  <span className={`badge text-xs flex-shrink-0 ${
                                    record.status === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                    record.status === 'pending' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                    record.status === 'new' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>{record.status}</span>
                                )}
                                {record.role && (
                                  <span className="badge text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex-shrink-0">{record.role}</span>
                                )}
                                {record.type && (
                                  <span className="badge text-xs flex-shrink-0">{record.type === 'bug' ? '🐛' : '💡'} {record.type}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {new Date(record.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <button onClick={fetchData}
                className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                🔄 Refresh Database Stats
              </button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
