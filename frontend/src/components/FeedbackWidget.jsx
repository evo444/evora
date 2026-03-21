import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { toast.error('Please write a message'); return; }
    setLoading(true);
    try {
      await API.post('/api/feedback', { type, message, email });
      setDone(true);
      setMessage('');
      setTimeout(() => { setDone(false); setOpen(false); }, 2500);
    } catch {
      toast.error('Failed to submit. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => { setOpen(o => !o); setDone(false); }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
        title="Report a bug or suggest a feature"
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-2xl shadow-xl flex items-center justify-center text-white text-xl"
        style={{
          width: 52, height: 52,
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
        }}
      >
        {open ? '✕' : '💬'}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(0,0,0,0.07)',
            }}
          >
            {/* Dark mode wrapper */}
            <div className="dark:bg-gray-900 dark:border-gray-700 rounded-2xl">

              {done ? (
                <div className="p-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                    className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎉</span>
                  </motion.div>
                  <p className="font-bold text-gray-900 dark:text-white">Thanks for your {type === 'bug' ? 'report' : 'idea'}!</p>
                  <p className="text-xs text-gray-400 mt-1">We'll look into it shortly.</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-black text-gray-900 dark:text-white text-sm">Report / Suggest</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Help us improve Evora 🌴</p>
                  </div>

                  <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    {/* Type toggle */}
                    <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      {[
                        { val: 'bug', icon: '🐛', label: 'Bug Report' },
                        { val: 'suggestion', icon: '💡', label: 'Suggestion' },
                      ].map(t => (
                        <button key={t.val} type="button" onClick={() => setType(t.val)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                            type === t.val
                              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                          }`}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Message */}
                    <div>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={type === 'bug'
                          ? 'What went wrong? Describe the issue...'
                          : 'What feature or improvement would you like?'}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                        required
                      />
                    </div>

                    {/* Email (optional if not logged in) */}
                    {!user && (
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Your email (optional)"
                        className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-accent transition-all"
                      />
                    )}

                    <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                      {loading ? 'Sending...' : type === 'bug' ? '🐛 Submit Bug Report' : '💡 Submit Suggestion'}
                    </motion.button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
