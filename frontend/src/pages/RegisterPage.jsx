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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = fill form, 2 = OTP
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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
    try {
      await API.post('/api/auth/register/send-otp', {
        name: form.name, email: form.email, password: form.password
      });
      toast.success(`OTP sent to ${form.email}! Check your inbox 📧`);
      setStep(2);
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
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
      toast.success(`Welcome to Evora, ${u.name}! 🎉`);
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
                  <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow">
                    <span className="text-white font-black text-2xl">E</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">Create Account</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We'll send a verification OTP to your email</p>
                </div>

                <div className="p-3 mb-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">✅ Free to join — instant access after email verification</p>
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
                    {loading ? 'Sending OTP...' : '📧 Send Verification OTP'}
                  </button>
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
