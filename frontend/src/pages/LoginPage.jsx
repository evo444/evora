import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// 6-digit OTP input
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.split('');
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits]; next[i] = '';
      onChange(next.join(''));
      if (i > 0) inputs.current[i - 1]?.focus();
    }
  };
  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = val;
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
        <input key={i} ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''} onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          autoFocus={i === 0}
          className="w-11 text-center text-xl font-black border-2 rounded-xl transition-all outline-none
            border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20"
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

// Reusable eye-toggle password input
function PasswordInput({ value, onChange, placeholder = '••••••••', autoFocus = false, className = '' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder={placeholder} autoFocus={autoFocus}
        className={`input w-full pr-11 ${className}`}
        required
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors text-lg select-none"
        title={show ? 'Hide password' : 'Show password'}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

// Google logo SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4 5.2l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const u = await loginWithGoogle();
      toast.success(`Welcome, ${u.name}! 👋`);
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(0); // 0=closed, 1=email, 2=otp, 3=newpw
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => setResendTimer(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}! 👋`);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const openForgot = () => { setForgotStep(1); setForgotEmail(form.email); setForgotOtp(''); setNewPw(''); setConfirmPw(''); };
  const closeForgot = () => setForgotStep(0);

  const handleSendForgotOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await API.post('/api/auth/forgot-password/send-otp', { email: forgotEmail });
      toast.success('OTP sent to your email! 📧');
      setForgotStep(2);
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send OTP');
    } finally { setForgotLoading(false); }
  };

  const handleVerifyForgotOTP = async (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setForgotStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setForgotLoading(true);
    try {
      const res = await API.post('/api/auth/forgot-password/reset', { email: forgotEmail, otp: forgotOtp, password: newPw });
      const { token: t, user: u } = res.data;
      if (t) {
        localStorage.setItem('evora_token', t);
        API.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      }
      toast.success('Password reset! You\'re logged in 🎉');
      closeForgot();
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
      setForgotStep(2);
    } finally { setForgotLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setForgotLoading(true);
    try {
      await API.post('/api/auth/forgot-password/send-otp', { email: forgotEmail });
      toast.success('New OTP sent!'); setForgotOtp(''); startResendTimer();
    } catch { toast.error('Failed to resend'); }
    finally { setForgotLoading(false); }
  };

  const forgotStepTitle = ['', 'Forgot Password?', 'Enter OTP', 'New Password'];
  const forgotStepSub = ['', 'Enter your email to receive a 6-digit OTP', `OTP sent to ${forgotEmail}`, 'Choose a strong new password'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900">
      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
              <span className="text-white font-black text-2xl">E</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Welcome Back</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your Evora account</p>
          </div>

          {/* Google Sign-In */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 mb-5"
          >
            {googleLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : <GoogleIcon />}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </motion.button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 font-medium">or use email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="you@example.com" className="input w-full" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <button type="button" onClick={openForgot}
                  className="text-xs text-accent hover:text-accent/80 font-semibold transition-colors">
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center py-3 disabled:opacity-60 mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Register</Link>
          </div>
        </div>
      </motion.div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {forgotStep > 0 && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={closeForgot} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

            <motion.div
              initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.95,y:20}}
              transition={{type:'spring',stiffness:300,damping:28}}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="card p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">{forgotStepTitle[forgotStep]}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{forgotStepSub[forgotStep]}</p>
                  </div>
                  <button onClick={closeForgot} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0 ml-2">✕</button>
                </div>

                <div className="flex gap-1.5 mb-5">
                  {[1,2,3].map(s => (
                    <div key={s} className={`h-1 rounded-full transition-all flex-1 ${forgotStep >= s ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {forgotStep === 1 && (
                    <motion.form key="f1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                      onSubmit={handleSendForgotOTP} className="space-y-4">
                      <div>
                        <label className="form-label">Email Address</label>
                        <input type="email" className="input w-full" placeholder="you@example.com"
                          value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                      </div>
                      <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                        {forgotLoading ? 'Sending...' : '📧 Send OTP to Email'}
                      </button>
                    </motion.form>
                  )}

                  {forgotStep === 2 && (
                    <motion.form key="f2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                      onSubmit={handleVerifyForgotOTP} className="space-y-2">
                      <OTPInput value={forgotOtp} onChange={setForgotOtp} />
                      <button type="submit" disabled={forgotOtp.length !== 6}
                        className="btn-primary w-full py-2.5 disabled:opacity-60">✅ Verify OTP</button>
                      <div className="text-center">
                        <button type="button" onClick={handleResend} disabled={resendTimer > 0 || forgotLoading}
                          className="text-xs text-gray-400 hover:text-accent disabled:opacity-50 transition-colors mt-1">
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {forgotStep === 3 && (
                    <motion.form key="f3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                      onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <label className="form-label">New Password</label>
                        <PasswordInput value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" autoFocus />
                      </div>
                      <div>
                        <label className="form-label">Confirm Password</label>
                        <PasswordInput value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password"
                          className={confirmPw && confirmPw !== newPw ? 'border-red-400' : ''} />
                        {confirmPw && confirmPw !== newPw && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
                      </div>
                      <button type="submit" disabled={forgotLoading || (confirmPw && confirmPw !== newPw)}
                        className="btn-primary w-full py-2.5 disabled:opacity-60">
                        {forgotLoading ? 'Resetting...' : '🔐 Reset Password'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
