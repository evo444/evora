import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DisclaimerModal from './DisclaimerModal';

export default function Footer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <>
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">

            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white dark:text-gray-900 font-black text-sm">E</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-gray-900 dark:text-white text-sm">Evora</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">Discover Kerala Events</span>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-5 text-xs text-gray-400 dark:text-gray-500 flex-wrap justify-center">
              <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 font-medium">
                Home
              </Link>
              <Link to="/submit-event" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 font-medium">
                Submit Event
              </Link>
              <button
                onClick={() => setShowDisclaimer(true)}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 font-medium underline underline-offset-2 decoration-dotted focus-ring rounded"
              >
                Disclaimer
              </button>
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-right">
              © {new Date().getFullYear()} Evora · Community-driven
            </p>
          </div>
        </div>
      </footer>

      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
    </>
  );
}
