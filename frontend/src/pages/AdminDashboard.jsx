import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { adminService, eventService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { StarDisplay } from '../components/StarRating';
import CrowdBadge from '../components/CrowdBadge';
import toast from 'react-hot-toast';

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

const tabs = ['Overview', 'Events', 'Submissions', 'Users', 'Feedback', 'Database'];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Build a safe image URL — handles all storage formats:
// 1. Full URL: http://...  → use as-is
// 2. /uploads/file.jpg    → prepend API_BASE only  (most common — backend stores this format)
// 3. bare filename.jpg    → prepend API_BASE/uploads/
const imgUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/uploads/${path}`;
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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-6 overflow-y-auto modal-scroll">

          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }} transition={{ type:'spring', stiffness:300, damping:28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden mb-4 sm:mb-10">

            {/* ─── Image Gallery Header ─── */}
            <div className="relative bg-gray-900" style={{ minHeight: 180 }}>
              {images.length > 0 ? (
                <>
                  <img src={imgUrl(images[imgIndex])} alt=""
                    className="w-full object-cover cursor-zoom-in"
                    style={{ height: 'clamp(180px, 30vw, 280px)' }}
                    onClick={() => setLightbox(imgUrl(images[imgIndex]))} />
                  {/* Thumbnail strip */}
                  {images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-2 bg-gradient-to-t from-black/80 overflow-x-auto">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setImgIndex(i)}
                          className={`flex-shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-90'}`}>
                          <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
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

            {/* ─── Content ─── */}
            <div className="p-6 space-y-5">

              {/* Title + category + meta */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{sub.name}</h2>
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex-shrink-0 text-sm px-3 py-1">{sub.category}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 {fmtDate(sub.date)} {fmtTime(sub.date) && `· ${fmtTime(sub.date)}`}</span>
                  {sub.endDate && <span>→ {fmtDate(sub.endDate)} {fmtTime(sub.endDate) && `· ${fmtTime(sub.endDate)}`}</span>}
                  <CrowdBadge crowd={sub.crowd} size="sm" />
                  {sub.attendees > 0 && <span>👥 {Number(sub.attendees).toLocaleString()} expected</span>}
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>⏱ Submitted {timeAgo(sub.createdAt)}</span>
                  {sub.updatedAt !== sub.createdAt && <span>· Edited {timeAgo(sub.updatedAt)}</span>}
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
                          style={{ height: 260, width: '100%' }} scrollWheelZoom zoomControl>
                          <TileLayer attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <DraggableMarker pos={markerPos} setPos={setMarkerPos} />
                        </MapContainer>
                      ) : hasAddress ? (
                        <iframe
                          title="Event Location"
                          width="100%" height="260"
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
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
                        {/* Accuracy label */}
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                          🎯 Location is based on exact coordinates selected by the user
                        </p>

                        {loc.placeName && <p className="font-semibold text-gray-900 dark:text-white text-sm">🏛 {loc.placeName}</p>}
                        {addr && <p className="text-sm text-gray-700 dark:text-gray-300">📍 {addr}</p>}

                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">📌 {district ? `${district} District` : <em>No district</em>}</span>
                          {hasCoords && <span className="font-mono text-gray-900 dark:text-white font-bold">{lat.toFixed(6)}, {lng.toFixed(6)}</span>}
                        </div>

                        {/* Reset button when marker adjusted */}
                        {markerPos && hasCoords && (markerPos.lat.toFixed(6) !== lat.toFixed(6) || markerPos.lng.toFixed(6) !== lng.toFixed(6)) && (
                          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 gap-2">
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              ✏️ Adjusted to: {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
                            </span>
                            <button onClick={() => setMarkerPos({ lat, lng })}
                              className="text-xs font-bold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline flex-shrink-0">
                              ↺ Reset to user's location
                            </button>
                          </div>
                        )}

                        {/* Direction buttons */}
                        {(hasCoords || hasAddress) && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            <a href={gmapsDirections} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent text-white hover:bg-accent/90 transition-all">
                              🧭 Get Directions
                            </a>
                            <a href={gmapsOpen} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                              🗺 Open in Google Maps
                            </a>
                          </div>
                        )}

                        {!hasCoords && !hasAddress && (
                          <div className="text-xs text-red-600 font-semibold bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                            ❌ No location data — reject or ask user to resubmit.
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
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-sm flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">Submitted by: </span>
                  <span className="text-blue-600 dark:text-blue-400">{sub.submittedBy?.name || 'Unknown'}</span>
                  {sub.submittedBy?.email && <span className="text-blue-400 dark:text-blue-500"> · {sub.submittedBy.email}</span>}
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
                <span className="flex-shrink-0 text-base">🛡️</span>
                <span><strong>Admin reminder:</strong> Ensure location and details are accurate before approval to avoid user issues. Check the map marker, description, and date before approving.</span>
              </div>

              {/* ── Actions ── */}
              {sub.status === 'pending' && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex gap-3">
                    <button onClick={() => onApprove(sub._id)}
                      className="flex-1 btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
                      ✅ Approve Event
                    </button>
                    <button onClick={() => onReject(sub._id)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">
                      🗑️ Reject & Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">Rejection permanently deletes this submission.</p>
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

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Submission Preview Modal ── */}
      {previewSub && createPortal(
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">👑 Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage Evora</p>
        </div>
        <Link to="/admin/events/new" className="btn-primary flex items-center gap-2">
          <span>+</span> New Event
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t}
            {t === 'Submissions' && submissions.filter(s => s.status === 'pending').length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-orange-500 text-white text-xs font-bold px-1">
                {submissions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>

        ))}
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
                        <div className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden">
                          <img src={imgUrl(sub.images[0])} alt=""
                            className="w-full h-full object-cover" />
                          {sub.images.length > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">+{sub.images.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">🎪</div>
                      )}

                      {/* Content */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">{sub.name}</h3>
                          <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                            <span className={`badge text-xs ${sub.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                              {sub.status === 'pending' ? '⏳ Pending' : '✕ Rejected'}
                            </span>
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
                          <span>👤 {sub.submittedBy?.name || 'Unknown'}</span>
                        </div>
                        <button onClick={() => setPreviewSub(sub)}
                          className="w-full py-2 rounded-xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          Preview & Review
                        </button>

                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Events Tab */}
          {activeTab === 'Events' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {events.map(e => (
                      <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{e.name}</div>
                          <div className="text-xs text-gray-400">{e.location?.district}</div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell"><span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{e.category}</span></td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                          {new Date(e.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </td>
                        <td className="px-4 py-3"><StarDisplay rating={e.averageRating} total={e.totalRatings} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => toggleTrending(e._id)} title={e.trending ? 'Remove trending' : 'Set trending'}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors">
                              {e.trending ? '⭐' : '☆'}
                            </button>
                            <Link to={`/admin/events/${e._id}/edit`} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm transition-colors">✏️</Link>
                            <button onClick={() => deleteEvent(e._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'Users' && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${u.approved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {u.approved ? '✅ Approved' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            {!u.approved ? (
                              <button onClick={() => approveUser(u._id)} className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-medium">Approve</button>
                            ) : (
                              <button onClick={() => rejectUser(u._id)} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-lg hover:bg-yellow-100 transition-colors font-medium">Revoke</button>
                            )}
                            {u.role !== 'admin' && (
                              <button onClick={() => deleteUser(u._id)} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium">Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
