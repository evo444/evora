import React from 'react';

const crowdConfig = {
  high: { label: 'High Crowd', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500', emoji: '🔴' },
  medium: { label: 'Medium Crowd', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500', emoji: '🟢' },
  low: { label: 'Low Crowd', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dot: 'bg-yellow-500', emoji: '🟡' },
};

export default function CrowdBadge({ crowd, showLabel = true }) {
  const cfg = crowdConfig[crowd] || crowdConfig.medium;
  return (
    <span className={`badge ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse-soft`}></span>
      {showLabel ? cfg.label : cfg.emoji}
    </span>
  );
}
