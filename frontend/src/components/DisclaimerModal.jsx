import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SECTIONS = [
  {
    text: "Evora is built with the intention of bringing people closer to the vibrant events happening across Kerala. It is a community-driven platform where information is shared by users to help others discover experiences, cultures, and gatherings.",
  },
  {
    highlight: true,
    text: "While we aim to keep the platform useful and updated, the event details such as date, time, location, and descriptions are provided by contributors. Evora does not guarantee complete accuracy or reliability of this information at all times.",
  },
  {
    text: "Every event listed here is reviewed at a basic level, but approval does not mean verification or endorsement. Situations may change, events may be modified or cancelled, and details may vary.",
  },
  {
    highlight: true,
    text: "We encourage all users to double-check event information from official sources before making plans or attending any event.",
  },
  {
    text: "Evora is not responsible for any inconvenience, loss, damage, or issues that may arise from participating in events listed on this platform.",
  },
  {
    text: "This space is created for the community, by the community. Every interaction, comment, and submission reflects the responsibility of the individual user behind it.",
  },
  {
    text: "By using Evora, you acknowledge that it serves as an informational bridge, not as an organizer, authority, or controller of any event.",
  },
  {
    italic: true,
    text: "Let Evora guide you — but let your judgment lead you.",
  },
];

export default function DisclaimerModal({ onClose }) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative px-7 pt-7 pb-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 font-black text-sm">E</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Disclaimer</h2>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">Evora · Community Event Platform · Kerala</p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-4">
            {SECTIONS.map((s, i) => (
              <p
                key={i}
                className={[
                  'text-sm leading-relaxed',
                  s.highlight
                    ? 'font-semibold text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 px-4 py-3 rounded-r-xl'
                    : s.italic
                    ? 'italic text-gray-500 dark:text-gray-400 text-center text-base border-t border-dashed border-gray-200 dark:border-gray-700 pt-4 mt-2'
                    : 'text-gray-600 dark:text-gray-300',
                ].join(' ')}
              >
                {s.text}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div className="px-7 py-5 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-400 dark:text-gray-500">Last updated: March 2026</p>
            <button
              onClick={onClose}
              className="btn-primary px-6 py-2 text-sm"
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
