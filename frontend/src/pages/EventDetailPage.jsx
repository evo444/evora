import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const accentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { eventService, commentService, ratingService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CrowdBadge from '../components/CrowdBadge';
import StarRating, { StarDisplay } from '../components/StarRating';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// Socket connects to the same server as the API (no separate VITE_SOCKET_URL needed)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [ratingData, setRatingData] = useState({ average: 0, total: 0 });
  const [selectedImg, setSelectedImg] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [editComment, setEditComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const e = await eventService.getById(id);
        setEvent(e);
        const c = await commentService.getByEvent(id);
        setComments(c);
        const r = await ratingService.getByEvent(id);
        setRatingData(r);
        if (user) {
          const mine = await ratingService.getMyRating(id);
          setMyRating(mine.stars || 0);
        }
      } catch (err) {
        toast.error('Event not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  // Socket.io — real-time comment sync from other users
  // Uses the same URL as the REST API (Render backend)
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // polling first — works through Render's HTTP layer
      reconnectionAttempts: 3,
      timeout: 10000,
    });
    socketRef.current = socket;
    socket.emit('join_event', id);
    // Only add if not already shown (prevents duplicate from our own optimistic insert)
    socket.on('new_comment', (c) => setComments(prev => {
      if (prev.some(x => x._id === c._id)) return prev;
      return [c, ...prev];
    }));
    socket.on('delete_comment', ({ id: cid }) => setComments(prev => prev.filter(c => c._id !== cid)));
    return () => { socket.emit('leave_event', id); socket.disconnect(); };
  }, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Login to comment'); return; }
    const text = newComment.trim();
    if (!text) return;
    setSubmitting(true);
    // Optimistic: clear input immediately so it feels instant
    setNewComment('');
    try {
      const created = await commentService.create(id, text);
      // Add the comment directly to the list.
      // The socket may also broadcast it — deduplicate by _id.
      setComments(prev => {
        if (prev.some(c => c._id === created._id)) return prev;
        return [created, ...prev];
      });
    } catch (err) {
      // Restore text on failure so user doesn't lose it
      setNewComment(text);
      toast.error(err.response?.data?.message || 'Failed to post comment');
    } finally { setSubmitting(false); }
  };

  const deleteComment = async (cid) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentService.delete(cid);
    } catch { toast.error('Failed to delete'); }
  };

  const saveEdit = async (cid) => {
    try {
      await commentService.update(cid, editText);
      setComments(prev => prev.map(c => c._id === cid ? {...c, text: editText, edited: true} : c));
      setEditComment(null);
    } catch { toast.error('Failed to edit'); }
  };

  const handleRate = async (stars) => {
    if (!user) { toast.error('Login to rate'); return; }
    try {
      const res = await ratingService.rate(id, stars);
      setMyRating(stars);
      setRatingData(res);
      toast.success(`Rated ${stars} ⭐`);
    } catch { toast.error('Failed to rate'); }
  };

  const share = () => {
    if (navigator.share) navigator.share({ title: event.name, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-8 skeleton w-32 rounded-xl mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="aspect-video skeleton" />
          </div>
          <div className="card p-6 space-y-4">
            <div className="skeleton h-8 w-3/4 rounded-lg" />
            <div className="flex gap-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton h-4 w-4/6 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <div className="aspect-square skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!event) return null;

  const images = event.images?.length > 0 ? event.images : [];
  const mainImage = images[selectedImg]
    ? (images[selectedImg].startsWith('http') ? images[selectedImg] : `${API_URL}${images[selectedImg]}`)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            initial={false}
            animate={{ x: 0 }}
            whileHover={{ x: -3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </motion.svg>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Back to Events</span>
        </motion.div>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <motion.div className="card overflow-hidden" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={event.name}
                  loading="eager"
                  className="w-full h-full object-cover transition-opacity duration-500"
                  style={{ opacity: 0 }}
                  onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🎉</div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="badge bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 backdrop-blur shadow-sm">{event.category}</span>
                {event.trending && <span className="badge bg-red-500 text-white">🔥 Trending</span>}
              </div>
            </div>
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => {
                  const url = img.startsWith('http') ? img : `${API_URL}${img}`;
                  return (
                    <button key={i} onClick={() => setSelectedImg(i)}
                      className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === selectedImg ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Event Info */}
          <motion.div className="card p-6" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">{event.name}</h1>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <CrowdBadge crowd={event.crowd} />
              <StarDisplay rating={event.averageRating} total={event.totalRatings} />
              {event.attendees > 0 && <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">👥 {event.attendees.toLocaleString()} attending</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <span className="mt-0.5">📅</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{formatDate(event.date)}</div>
                  {event.endDate && <div className="text-xs">Until {formatDate(event.endDate)}</div>}
                  <div className="text-xs">{formatTime(event.date)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <span className="mt-0.5">📍</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{event.location?.address}</div>
                  {event.location?.district && <div className="text-xs">{event.location.district}, Kerala</div>}
                </div>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{event.description}</p>

            {/* Added by / Source badge */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {event.addedBy === 'AI' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                  🤖 AI Curated Event
                </span>
              ) : event.submittedBy?.name ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Submitted by {event.submittedBy.name}
                </span>
              ) : (event.addedBy === 'admin' || event.createdBy?.name) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                  👑 Added by Admin
                </span>
              ) : null}
            </div>


            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {event.tags.map(t => <span key={t} className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">#{t}</span>)}
              </div>
            )}

            <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={share} className="btn-secondary flex items-center gap-2 text-sm">
                🔗 Share
              </button>
            </div>
          </motion.div>

          {/* Map & Location */}
          <motion.div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}>
            {(() => {
              const rawLat = parseFloat(event.location?.lat ?? event.location?.coordinates?.lat ?? '');
              const rawLng = parseFloat(event.location?.lng ?? event.location?.coordinates?.lng ?? '');
              // Detect old hardcoded Thrissur schema defaults — treat as missing
              const isOldDefault = Math.abs(rawLat - 10.8505) < 0.001 && Math.abs(rawLng - 76.2711) < 0.001;
              const lat = (!isNaN(rawLat) && !isOldDefault) ? rawLat : NaN;
              const lng = (!isNaN(rawLng) && !isOldDefault) ? rawLng : NaN;
              const hasCoords = !isNaN(lat) && !isNaN(lng);
              const address = event.location?.address || '';
              const hasAddress = !!address;
              const encodedAddr = encodeURIComponent(address + (event.location?.district ? `, ${event.location.district}, Kerala` : ', Kerala'));

              return (
                <>
                  {/* Map display */}
                  {hasCoords ? (
                    <div style={{ height: 240 }}>
                      <MapContainer key={`${lat}-${lng}`} center={[lat, lng]} zoom={15}
                        style={{ width: '100%', height: '100%' }} zoomControl scrollWheelZoom={false}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[lat, lng]} icon={accentIcon} />
                      </MapContainer>
                    </div>
                  ) : hasAddress ? (
                    /* Fallback: Google Maps iframe by address */
                    <iframe
                      title="Event Location"
                      width="100%" height="240"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${encodedAddr}&output=embed`}
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm">
                      📍 Location not available
                    </div>
                  )}

                  {/* Location details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">📍</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{address || 'Address not available'}</p>
                        {event.location?.district && (
                          <p className="text-xs text-gray-400 mt-0.5">{event.location.district} District, Kerala</p>
                        )}
                        {hasCoords && (
                          <p className="text-xs font-mono text-gray-400 mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {(hasCoords || hasAddress) ? (
                      <div className="flex gap-2 flex-wrap">
                        <a href={hasCoords
                            ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                            : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}&travelmode=driving`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-primary text-sm flex items-center gap-2 px-4 py-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Get Directions
                        </a>
                        <a href={hasCoords
                            ? `https://www.google.com/maps?q=${lat},${lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodedAddr}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-secondary text-sm flex items-center gap-2 px-4 py-2">
                          🗺 Open in Google Maps
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-semibold">⚠️ No location data available.</p>
                    )}
                  </div>
                </>
              );
            })()}

          </motion.div>


          {/* ── Merged Rating + Comments ── */}
          <motion.div className="card p-5" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>

            {/* Rating row */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">⭐ Rate &amp; Comment</h2>
                <p className="text-xs text-gray-400 mt-0.5">{ratingData.total || 0} ratings · {comments.length} comments</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-gray-900 dark:text-white">{ratingData.average?.toFixed(1) || '0.0'}</div>
                <StarDisplay rating={ratingData.average} total={ratingData.total} />
              </div>
            </div>

            {/* User's star rating */}
            {user ? (
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Your rating:</span>
                <StarRating rating={myRating} max={5} size="lg" interactive onRate={handleRate} />
                {myRating > 0 && <span className="text-xs text-gray-400 ml-auto">{myRating}/5</span>}
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                <Link to="/login" className="font-medium text-gray-800 dark:text-gray-200 hover:underline">Login</Link> to rate and comment.
              </div>
            )}

            {/* Comment input */}
            {user && (
              <form onSubmit={submitComment} className="flex gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold flex-shrink-0 mt-0.5">
                  {user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="input flex-1"
                  />
                  <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary px-4 disabled:opacity-50">
                    {submitting ? '...' : 'Post'}
                  </button>
                </div>
              </form>
            )}

            {/* Comment list */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No comments yet. Be the first!</div>
              ) : comments.map(c => (
                <div key={c._id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-bold flex-shrink-0">
                    {c.user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.user?.name}</span>
                      <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      {c.edited && <span className="text-xs text-gray-400 italic">(edited)</span>}
                    </div>
                    {editComment === c._id ? (
                      <div className="flex gap-2">
                        <input value={editText} onChange={e => setEditText(e.target.value)} className="input text-sm py-1.5 flex-1" />
                        <button onClick={() => saveEdit(c._id)} className="btn-primary text-xs px-3">Save</button>
                        <button onClick={() => setEditComment(null)} className="btn-secondary text-xs px-3">Cancel</button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{c.text}</p>
                    )}
                  </div>
                  {user && (user._id === c.user?._id || user.role === 'admin') && editComment !== c._id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                      {user._id === c.user?._id && (
                        <button onClick={() => { setEditComment(c._id); setEditText(c.text); }} className="text-xs text-gray-400 hover:text-gray-600 p-1">✏️</button>
                      )}
                      <button onClick={() => deleteComment(c._id)} className="text-xs text-gray-400 hover:text-red-500 p-1">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Event Summary */}
          <motion.div className="card p-5 space-y-3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.2}}>
            <h3 className="font-bold text-gray-900 dark:text-white">Event Details</h3>
            <div className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between"><span>Category</span><span className="font-medium text-gray-900 dark:text-white">{event.category}</span></div>
              <div className="flex justify-between"><span>Crowd</span><CrowdBadge crowd={event.crowd} /></div>
              <div className="flex justify-between"><span>Attending</span><span className="font-medium text-gray-900 dark:text-white">{event.attendees?.toLocaleString() || 0}</span></div>
              {event.location?.district && <div className="flex justify-between"><span>District</span><span className="font-medium text-gray-900 dark:text-white">{event.location.district}</span></div>}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
