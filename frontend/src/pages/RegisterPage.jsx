import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// 6-digit OTP input with auto-focus
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits];
      next[i] = '';
      onChange(next.join(''));
      if (i > 0) inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = val;
    onChange(next.join(''));
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, ''));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-4">
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          className="w-11 h-13 text-center text-xl font-black border-2 rounded-xl transition-all outline-none
            border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20"
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

// Eye toggle password input
function PasswordInput({ value, onChange, placeholder = '••••••••', autoFocus = false, className = '' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`input w-full pr-11 ${className}`}
        required
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors text-lg select-none"
        tabIndex={-1}
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [slowBackend, setSlowBackend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const u = await loginWithGoogle();
      toast.success(`Welcome to Zzon, ${u.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => {
      setResendTimer(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; });
    }, 1000);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    setSlowBackend(false);
    // Show a hint after 8s if backend is slow (Render free tier cold start)
    const slowTimer = setTimeout(() => setSlowBackend(true), 8000);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s max
      const res = await API.post('/api/auth/register/send-otp', {
        name: form.name, email: form.email, password: form.password
      }, { signal: controller.signal });
      clearTimeout(timeout);
      toast.success(`OTP sent to ${form.email}! Check your inbox 📧`);
      setStep(2);
      startResendTimer();
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        toast.error('Server is taking too long. Please try again in a moment.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP');
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowBackend(false);
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await API.post('/api/auth/register/verify-otp', { email: form.email, otp });
      const { token: t, user: u } = res.data;
      if (t) {
        localStorage.setItem('evora_token', t);
        API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      }
      toast.success(`Welcome to Zzon, ${u.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await API.post('/api/auth/register/send-otp', {
        name: form.name, email: form.email, password: form.password
      });
      toast.success('New OTP sent!');
      setOtp('');
      startResendTimer();
    } catch (err) {
      toast.error('Failed to resend');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900">
      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="w-full max-w-md">
        <div className="card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  step >= s ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>{step > s ? '✓' : s}</div>
                {s < 2 && <div className={`flex-1 h-0.5 rounded transition-all ${step > s ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
                <div className="text-center mb-6">
                  <img src="/zzon-icon.png" alt="Zzon" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" />
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">Create Account</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We'll send a verification OTP to your email</p>
                </div>

                {/* Google Sign-In — fast path */}
                <motion.button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 mb-4"
                >
                  {googleLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4 5.2l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
                  )}
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </motion.button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 font-medium">or register with email</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Your full name" className="input w-full" required />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="you@example.com" className="input w-full" required />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <PasswordInput
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirm Password</label>
                    <PasswordInput
                      value={form.confirm}
                      onChange={e => setForm({...form, confirm: e.target.value})}
                      placeholder="Repeat your password"
                      className={form.confirm && form.confirm !== form.password ? 'border-red-400' : ''}
                    />
                    {form.confirm && form.confirm !== form.password && (
                      <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
                    {loading ? (
                     <span className="flex items-center gap-2 justify-center">
                       <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                       </svg>
                       Sending OTP...
                     </span>
                   ) : '📧 Send Verification OTP'}
                  </button>
                  {slowBackend && loading && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2 animate-pulse">
                      ⏳ Server is waking up (free tier)... Please wait ~30 seconds
                    </p>
                  )}
                </form>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">📧</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">Verify Your Email</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    OTP sent to <span className="font-semibold text-accent">{form.email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP}>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-1">Enter the 6-digit code</p>
                  <OTPInput value={otp} onChange={setOtp} />
                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="btn-primary w-full py-3 disabled:opacity-60 mt-2">
                    {loading ? 'Verifying...' : '✅ Verify & Create Account'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button onClick={handleResend} disabled={resendTimer > 0}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-accent disabled:opacity-50 transition-colors">
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't get it? Resend OTP"}
                  </button>
                </div>
                <button onClick={() => setStep(1)} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  ← Change email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
