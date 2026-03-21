import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CrowdBadge from './CrowdBadge';
import { StarDisplay } from './StarRating';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Shared spring config — feels snappy but natural
const spring = { type: 'spring', stiffness: 340, damping: 26 };

// Card entrance — staggered, translates only on Y + opacity (GPU composited)
const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { ...spring } },
};

export default function EventCard({ event, index = 0, onDelete, onToggleTrending }) {
  const { isAdmin } = useAuth();

  const imageUrl = event.images?.[0]
    ? (event.images[0].startsWith('http') ? event.images[0] : `${API_URL}${event.images[0]}`)
    : null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      transition={{ delay: Math.min(index * 0.055, 0.4) }} // cap max delay at 400 ms
      whileHover={{ y: -6, transition: { ...spring, stiffness: 400 } }}
      style={{ willChange: 'transform, opacity' }}
      className="card overflow-hidden group flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt={event.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onLoad={e => e.currentTarget.classList.add('img-loaded')}
            style={{ opacity: 0, transition: 'opacity 0.4s ease', willChange: 'transform' }}
            whileHover={{ scale: 1.07 }}
            transition={{ ...spring, stiffness: 260, damping: 22 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-30">🎉</span>
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
              className="badge bg-red-500 text-white"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              🔥 Trending
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
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg text-xs hover:bg-white dark:hover:bg-gray-800 transition-colors">
              {event.trending ? '⭐' : '☆'}
            </button>
            <Link to={`/admin/events/${event._id}/edit`}
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg text-xs hover:bg-white dark:hover:bg-gray-800 transition-colors">
              ✏️
            </Link>
            <button onClick={() => onDelete?.(event._id)} title="Delete"
              className="p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              🗑️
            </button>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-1 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
          {event.name}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {event.shortDescription || event.description}
        </p>

        {/* Meta */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>📅</span><span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>📍</span>
            <span className="line-clamp-1">{event.location?.district || event.location?.address}</span>
          </div>
          {event.attendees > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>👥</span><span>{event.attendees.toLocaleString()} attending</span>
            </div>
          )}
          {/* Added by */}
          {(event.submittedBy?.name || event.createdBy?.name) && (
            <div className="flex items-center gap-1.5 text-xs">
              {event.submittedBy?.name ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/30 font-medium">
                  👤 {event.submittedBy.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30 font-medium">
                  👑 Added by Admin
                </span>
              )}
            </div>
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
