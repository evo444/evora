import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FeedbackModal({ type, onClose }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isBug = type === 'bug';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/feedback`, { type, message: message.trim(), email: email.trim() });
      setDone(true);
    } catch (err) {
      toast.error('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        key="feedback-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="card p-6 w-full max-w-md"
        >
          {done ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">{isBug ? '🐛' : '💡'}</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {isBug ? 'Bug Reported!' : 'Idea Submitted!'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {isBug
                  ? 'Thanks for reporting. Our admin will look into it.'
                  : "Great idea! We'll review your suggestion."}
              </p>
              <button onClick={onClose} className="btn-primary px-6">Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{isBug ? '🐛' : '💡'}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isBug ? 'Report a Bug' : 'Suggest an Idea'}
                  </h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors text-lg leading-none">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {isBug ? 'Describe the bug' : 'Describe your idea'} *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder={isBug
                      ? 'What went wrong? What did you expect to happen?'
                      : 'What feature or improvement would you like to see?'}
                    className="input resize-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Your email <span className="text-gray-400 font-normal">(optional, for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={loading || !message.trim()} className="btn-primary flex-1 disabled:opacity-60">
                    {loading ? 'Sending...' : isBug ? 'Report Bug' : 'Submit Idea'}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
