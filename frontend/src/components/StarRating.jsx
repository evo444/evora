import React, { useState } from 'react';

export default function StarRating({ rating = 0, max = 5, size = 'md', interactive = false, onRate }) {
  const [hover, setHover] = useState(0);
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = interactive ? (hover || rating) > i : rating > i;
        return (
          <button
            key={i}
            disabled={!interactive}
            className={`${sizes[size]} transition-transform ${interactive ? 'cursor-pointer hover:scale-125 active:scale-110' : 'cursor-default'} leading-none`}
            onClick={() => interactive && onRate && onRate(i + 1)}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
          >
            <span className={filled ? 'star-filled' : 'star-empty'}>★</span>
          </button>
        );
      })}
    </div>
  );
}

export function StarDisplay({ rating, total }) {
  return (
    <div className="flex items-center gap-1.5">
      <StarRating rating={Math.round(rating)} size="sm" />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{rating?.toFixed(1) || '0.0'}</span>
      {total !== undefined && <span className="text-xs text-gray-400">({total})</span>}
    </div>
  );
}
