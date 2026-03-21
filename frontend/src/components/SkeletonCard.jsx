import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="card overflow-hidden flex flex-col animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 skeleton relative overflow-hidden">
        {/* Gradient overlay like real cards */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        {/* Fake badge */}
        <div className="absolute top-3 left-3 skeleton h-5 w-16 rounded-full" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        {/* Title */}
        <div className="skeleton h-4 w-3/4 rounded-lg" />

        {/* Description lines */}
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
        </div>

        {/* Meta */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="skeleton h-3 w-3 rounded-full flex-shrink-0" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-3 w-3 rounded-full flex-shrink-0" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>

        {/* Rating + crowd */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton w-3 h-3 rounded-sm" />
            ))}
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>

        {/* Button */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
