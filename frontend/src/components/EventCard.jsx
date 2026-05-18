import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Flame, Star, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import CrowdBadge from './CrowdBadge';
import { StarDisplay } from './StarRating';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Resolve any image path to a full URL — Wikimedia served directly with referrerPolicy="no-referrer"
function resolveImage(raw) {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('/')) return `${API_URL}${raw}`;
  return `${API_URL}/uploads/${raw}`;
}

// Returns ms remaining until targetDate, or null if already passed
function useIsLive(startDate, endDate) {
  const check = () => {
    const now = Date.now();
    const started = startDate && now >= new Date(startDate).getTime();
    const ended   = endDate   && now >= new Date(endDate).getTime();
    return started && !ended;
  };
  const [live, setLive] = useState(check);
  useEffect(() => {
    const id = setInterval(() => setLive(check()), 10000);
    return () => clearInterval(id);
  }, [startDate, endDate]);
  return live;
}

const categoryColors = {
  Festival:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Tech:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Music:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Cultural:  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Sports:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Food:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Art:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  Education: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  Other:     'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const spring = { type: 'spring', stiffness: 340, damping: 26 };

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { ...spring } },
};

export default function EventCard({ event, index = 0, onDelete, onToggleTrending }) {
  const { isAdmin } = useAuth();
  const isLive = useIsLive(event.date, event.endDate);
  const [imgError, setImgError] = useState(false);
  const imageUrl = resolveImage(event.images?.[0]);

  const addedByName = event.addedBy === 'AI'
    ? 'AI'
    : event.submittedBy?.name
      ? event.submittedBy.name
      : event.createdBy?.name
        ? event.createdBy.name
        : 'Admin';

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      transition={{ delay: Math.min(index * 0.055, 0.4) }}
      whileHover={{ y: -6, transition: { ...spring, stiffness: 400 } }}
      style={{ willChange: 'transform, opacity' }}
      className="card overflow-hidden group flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
        {imageUrl && !imgError ? (
          <motion.img
            src={imageUrl}
            alt={event.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onLoad={e => { e.currentTarget.style.opacity = '1'; }}
            onError={() => setImgError(true)}
            style={{ opacity: 0, transition: 'opacity 0.4s ease', willChange: 'transform' }}
            whileHover={{ scale: 1.07 }}
            transition={{ ...spring, stiffness: 260, damping: 22 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Image placeholder — black icon, no emoji */}
            <ImageIcon className="w-12 h-12 text-gray-900 dark:text-white opacity-20" strokeWidth={1.2} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className={`badge ${categoryColors[event.category] || categoryColors.Other} backdrop-blur-sm`}>
            {event.category}
          </span>
          {event.trending && (
            <motion.span
              className="badge bg-red-500 text-white flex items-center gap-1"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              <Flame className="w-3 h-3" strokeWidth={2} />
              Trending
            </motion.span>
          )}
        </div>

        {/* Admin controls */}
        {isAdmin() && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <button onClick={() => onToggleTrending?.(event)} title="Toggle Trending"
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
              <Star className={`w-3.5 h-3.5 ${event.trending ? 'fill-amber-400 text-amber-400' : 'text-gray-600 dark:text-gray-300'}`} strokeWidth={2} />
            </button>
            <Link to={`/admin/events/${event._id}/edit`}
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
              <Pencil className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" strokeWidth={2} />
            </Link>
            <button onClick={() => onDelete?.(event._id)} title="Delete"
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-1 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
          {event.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
          {event.description || event.shortDescription}
        </p>

        {/* Live Now indicator */}
        {isLive && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400">
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500" />
              </span>
              Live Now
            </span>
          </div>
        )}

        {/* Date · Location · Added by — ALL on one line */}
        <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {/* Date range */}
          <span className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3 h-3 text-gray-900 dark:text-white" strokeWidth={2} />
            <span>
              {formatDate(event.date)}
              {event.endDate && (
                <> → {formatDate(event.endDate)}</>
              )}
            </span>
          </span>

          {(event.location?.district || event.location?.address) && (
            <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
          )}

          {/* Location */}
          {(event.location?.district || event.location?.address) && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <MapPin className="w-3 h-3 text-gray-900 dark:text-white" strokeWidth={2} />
              <span className="truncate max-w-[80px] sm:max-w-[100px]">{event.location?.district || event.location?.address}</span>
            </span>
          )}

          {addedByName && (
            <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
          )}

          {/* Added by */}
          {addedByName && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <span className="text-gray-400 dark:text-gray-500">Added by</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">{addedByName}</span>
            </span>
          )}
        </div>

        {/* Rating & Crowd */}
        <div className="flex items-center justify-between mb-3">
          <StarDisplay rating={event.averageRating} total={event.totalRatings} />
          <CrowdBadge crowd={event.crowd} />
        </div>

        {/* CTA */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
            <Link to={`/events/${event._id}`}
              className="block w-full text-center text-sm font-semibold py-2.5 px-5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
            >
              View Details
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
