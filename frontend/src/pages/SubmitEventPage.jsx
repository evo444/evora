import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { eventService } from '../services/api';
import GlassSelect from '../components/GlassSelect';
import MapPicker from '../components/MapPicker';
import DisclaimerModal from '../components/DisclaimerModal';
import { useAuth } from '../contexts/AuthContext';

// ── AI helpers ────────────────────────────────────────────────────────────────
const DISTRICTS_LIST = ['Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam','Idukki','Ernakulam','Thrissur','Palakkad','Malappuram','Kozhikode','Wayanad','Kannur','Kasaragod'];

function guessCategory(text) {
  const t = text.toLowerCase();
  if (/festival|pooram|utsav|carnival|onam|vishu|celebration/.test(t)) return 'Festival';
  if (/music|concert|song|band|choir/.test(t)) return 'Music';
  if (/tech|hackathon|startup|ai|software|code/.test(t)) return 'Tech';
  if (/temple|cultural|dance|theyyam|heritage|ritual|folk/.test(t)) return 'Cultural';
  if (/sport|race|marathon|cricket|football|tournament/.test(t)) return 'Sports';
  if (/food|feast|cuisine|chef/.test(t)) return 'Food';
  if (/art|paint|sculpture|gallery/.test(t)) return 'Art';
  if (/education|seminar|workshop|conference/.test(t)) return 'Education';
  return 'Other';
}

function detectDistrict(addr) {
  const text = JSON.stringify(addr).toLowerCase();
  return DISTRICTS_LIST.find(d => text.includes(d.toLowerCase())) || '';
}

async function aiAutoFill(eventName) {
  const result = { description: '', category: '', location: null, district: '', imageUrl: '', allImages: [] };
  try {
    const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(eventName)}&format=json&origin=*&srlimit=3`);
    const sData = await sRes.json();
    const pageId = sData?.query?.search?.[0]?.pageid;
    if (pageId) {
      const pRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|images&exintro=true&explaintext=true&pithumbsize=1200&imlimit=10&pageids=${pageId}&format=json&origin=*`);
      const pData = await pRes.json();
      const page = pData?.query?.pages?.[pageId];
      const extract = page?.extract || '';
      if (extract) {
        const sentences = extract.split(/(?<=[.!?])\s+/);
        result.description = sentences.slice(0, 6).join(' ').slice(0, 1800);
      }
      if (page?.thumbnail?.source) result.imageUrl = page.thumbnail.source;
      // Fetch extra images from Commons
      const imgTitles = (page?.images || [])
        .map(i => i.title)
        .filter(t => /\.(jpg|jpeg|png|webp)$/i.test(t))
        .slice(0, 6);
      if (imgTitles.length > 0) {
        try {
          const iRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=${encodeURIComponent(imgTitles.join('|'))}&format=json&origin=*`);
          const iData = await iRes.json();
          const extras = Object.values(iData?.query?.pages || {})
            .map(p => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
            .filter(u => u && !/\.svg$/i.test(u));
          result.allImages = [...new Set([result.imageUrl, ...extras].filter(Boolean))].slice(0, 5);
        } catch (_) {}
      }
    }
  } catch (_) {}
  if (result.allImages.length === 0 && result.imageUrl) result.allImages = [result.imageUrl];
  result.category = guessCategory(eventName + ' ' + result.description);
  try {
    const gRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(eventName + ' Kerala')}&format=json&limit=1&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
    const gData = await gRes.json();
    if (gData?.[0]) {
      const place = gData[0];
      result.location = { lat: parseFloat(place.lat), lng: parseFloat(place.lon), address: place.display_name, district: detectDistrict(place.address), placeName: place.name || eventName };
      result.district = result.location.district;
    }
  } catch (_) {}
  return result;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select Category', icon: '📋' },
  { value: 'Festival', label: 'Festival', icon: '🎪' },
  { value: 'Tech', label: 'Tech', icon: '💻' },
  { value: 'Music', label: 'Music', icon: '🎵' },
  { value: 'Cultural', label: 'Cultural', icon: '🎭' },
  { value: 'Sports', label: 'Sports', icon: '⚽' },
  { value: 'Food', label: 'Food', icon: '🍽' },
  { value: 'Art', label: 'Art', icon: '🎨' },
  { value: 'Education', label: 'Education', icon: '📚' },
  { value: 'Other', label: 'Other', icon: '✨' },
];

const CROWD_OPTIONS = [
  { value: '', label: 'Select Crowd', icon: '📊' },
  { value: 'low', label: 'Low (< 500)', icon: '🟢' },
  { value: 'medium', label: 'Medium (500–5000)', icon: '🟡' },
  { value: 'high', label: 'High (5000+)', icon: '🔴' },
];

const DISTRICTS = ['Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam','Idukki','Ernakulam','Thrissur','Palakkad','Malappuram','Kozhikode','Wayanad','Kannur','Kasaragod'];
const DISTRICT_OPTIONS = [{ value: '', label: 'Select District' }, ...DISTRICTS.map(d => ({ value: d, label: d }))];

const STEPS = ['Basic Info', 'Location', 'Media & Details', 'Review'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              current > i ? 'bg-accent text-white' :
              current === i ? 'bg-accent text-white ring-4 ring-accent/20' :
              'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              {current > i ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${current === i ? 'text-accent' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${current > i ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Image drag-drop upload zone
function ImageUploadZone({ images, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 1);
    onChange(valid);
  };

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current.click()}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-accent bg-green-50 dark:bg-green-900/20 scale-[1.01]'
            : 'border-gray-200 dark:border-gray-700 hover:border-accent hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <div className="text-4xl mb-2">{dragging ? '🎯' : '📸'}</div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {dragging ? 'Drop photo here!' : 'Drag & drop 1 event photo'}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse · 1 image only · JPG, PNG, WebP</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-video max-h-48">
              <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover rounded-xl border-2 border-gray-100 dark:border-gray-700" />
              <span className="absolute top-1 left-1 text-xs bg-accent text-white px-1.5 py-0.5 rounded-md font-bold">Cover</span>
              <button type="button" onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center shadow">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubmitEventPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [images, setImages] = useState([]);
  const [wikiImages, setWikiImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: '',
    crowd: '', attendees: '', tags: '', district: '',
    organizerName: '', organizerPhone: '', organizerEmail: '', website: '',
  });

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try { await loginWithGoogle(); }
    catch (err) { toast.error('Google sign-in failed'); }
    finally { setGoogleLoading(false); }
  };

  // Login gate
  if (!user) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center">
        <div className="card p-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Login Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Please login with Google to submit an event.</p>
          <motion.button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 mb-3"
          >
            {googleLoading ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.4 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4 5.2l6.2 5.2C41.4 35.2 44 30 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </motion.button>
          <Link to="/login" className="text-sm text-accent hover:underline font-medium">Or sign in with email →</Link>
        </div>
      </motion.div>
    </div>
  );


  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleLocationChange = (loc) => { setLocation(loc); };

  // AI auto-fill handler
  const handleAiAutoFill = async () => {
    if (!form.name.trim()) { toast.error('Enter an event name first'); return; }
    setAiLoading(true);
    const tid = toast.loading('🔍 Searching Wikipedia & OpenStreetMap…');
    try {
      const data = await aiAutoFill(form.name);
      setForm(prev => ({
        ...prev,
        description: data.description || prev.description,
        category:    data.category    || prev.category,
        district:    data.district    || prev.district,
      }));
      if (data.location) setLocation(data.location);
      const imgs = data.allImages?.length > 0 ? data.allImages : (data.imageUrl ? [data.imageUrl] : []);
      if (imgs.length > 0) setWikiImages(imgs);
      const filled = [
        data.description && 'Description',
        data.category && 'Category',
        data.location && 'Location',
        data.district && 'District',
        imgs.length > 0 && `${imgs.length} Image${imgs.length > 1 ? 's' : ''}`,
      ].filter(Boolean);
      toast.success(`✅ Auto-filled: ${filled.join(', ')}`, { id: tid, duration: 4000 });
    } catch { toast.error('Auto-fill failed. Try a more specific name.', { id: tid }); }
    finally { setAiLoading(false); }
  };

  // Step validation — no date required (admin sets dates)
  const canProceed0 = form.name && form.description && form.category && form.crowd;
  const canProceed1 = location?.lat && form.district;
  const canProceed2 = images.length > 0 || wikiImages.length > 0;

  const handleSubmit = async () => {
    if (!canProceed0) { toast.error('Fill in all required fields in Step 1'); return; }
    if (!canProceed1) { toast.error('Please pin the event location and select a district'); return; }
    if (!canProceed2) { toast.error('Please upload at least one event photo'); return; }
    if (!disclaimerAccepted) { toast.error('Please accept the disclaimer to continue'); return; }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('date', now);
      fd.append('endDate', now);
      fd.append('crowd', form.crowd);
      if (form.attendees) fd.append('attendees', form.attendees);
      fd.append('location', JSON.stringify({
        address: location.address || '',
        district: form.district || '',
        lat: location.lat,
        lng: location.lng,
        placeName: location.placeName || '',
      }));
      if (form.organizerName) fd.append('organizerName', form.organizerName);
      if (form.organizerPhone) fd.append('organizerPhone', form.organizerPhone);
      if (form.organizerEmail) fd.append('organizerEmail', form.organizerEmail);
      if (form.website) fd.append('website', form.website);
      if (form.tags) form.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags', t));
      images.forEach(img => fd.append('images', img));
      if (wikiImages.length > 0 && images.length === 0) fd.append('imageUrls', JSON.stringify(wikiImages));
      await eventService.submit(fd);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-green">
          <span className="text-5xl">🎉</span>
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Event Submitted!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Your event is now under review. Our team will check it within <strong>24–48 hours</strong> and it'll go live on Zzon!
        </p>
        <div className="text-left bg-gray-50 dark:bg-dark-surface rounded-2xl p-5 mb-6 space-y-4">
          {[
            { icon: '✅', label: 'Submitted', sub: 'Your event is in the queue', done: true },
            { icon: '🔍', label: 'Admin Review', sub: 'Usually within 24–48 hours', done: false },
            { icon: '🌍', label: 'Goes Live', sub: 'Visible to everyone on Zzon 🌴', done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold ${s.done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                {s.done ? '✓' : s.icon}
              </div>
              <div>
                <div className={`text-sm font-semibold ${s.done ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSubmitted(false); setStep(0); }} className="btn-secondary px-5 py-2 text-sm">Submit Another</button>
          <Link to="/" className="btn-primary px-5 py-2 text-sm">Browse Events 🌴</Link>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-5 transition-colors">
          ← Back to Events
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-green-700 flex items-center justify-center text-2xl shadow-green">🎪</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit an Event</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Admin reviews & approves before it goes live</p>
          </div>
        </div>
      </motion.div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        {/* ── STEP 0: Basic Info ── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📝</span>
              <h2 className="font-bold text-gray-900 dark:text-white">Basic Information</h2>
            </div>

            <div>
              <label className="form-label">Event Name <span className="text-red-400">*</span></label>
              <div className="relative flex items-center">
                <input className="input w-full pr-10" placeholder="e.g. Thrissur Pooram 2025" value={form.name} onChange={e => set('name', e.target.value)} required />
                <button type="button" onClick={handleAiAutoFill} disabled={aiLoading || !form.name.trim()}
                  title="AI Auto-fill from Wikipedia & Maps"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-transform">
                  {aiLoading
                    ? <span className="inline-block w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 7.5 A7 7 0 1 0 15.4 15.5" />
                        <line x1="15.4" y1="15.5" x2="21" y2="21" />
                        <path d="M19 1 L20.1 4.3 L23 5.5 L20.1 6.7 L19 10 L17.9 6.7 L15 5.5 L17.9 4.3 Z" fill="currentColor" stroke="none" />
                      </svg>
                  }
                </button>
              </div>
            </div>

            <AnimatePresence>
              {aiLoading && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 text-sm text-violet-700 dark:text-violet-300">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-lg">🔍</motion.span>
                  <span>Searching Wikipedia & OpenStreetMap for "<strong>{form.name}</strong>"…</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="form-label">Description <span className="text-red-400">*</span></label>
              <textarea className="input w-full resize-none" rows={4}
                placeholder="Tell people what to expect — highlights, performers, activities..."
                value={form.description} onChange={e => set('description', e.target.value)} required />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Category <span className="text-red-400">*</span></label>
                {form.category && <span className="ml-2 text-xs text-violet-500">✨ AI selected</span>}
                <GlassSelect options={CATEGORY_OPTIONS} value={form.category} onChange={v => set('category', v)} />
              </div>
              <div>
                <label className="form-label">Expected Crowd <span className="text-red-400">*</span></label>
                <GlassSelect options={CROWD_OPTIONS} value={form.crowd} onChange={v => set('crowd', v)} />
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/40 text-xs text-amber-700 dark:text-amber-300">
              📅 <strong>Note:</strong> Start & End dates will be set by the admin after review. No need to enter them now.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Expected Attendees</label>
                <input type="number" inputMode="numeric" className="input w-full" placeholder="e.g. 5000" value={form.attendees} onChange={e => set('attendees', e.target.value)} min={0} />
              </div>
              <div>
                <label className="form-label">Tags <span className="text-xs text-gray-400">(comma separated)</span></label>
                <input className="input w-full" placeholder="cultural, Kerala, folk" value={form.tags} onChange={e => set('tags', e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button type="button" disabled={!canProceed0} onClick={() => setStep(1)}
                className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                Next: Location →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Location ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📍</span>
              <h2 className="font-bold text-gray-900 dark:text-white">Event Location</h2>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300">
              🗺 <strong>Search</strong> for any location or paste a Google Maps link. Then <strong>click anywhere on the map</strong> or <strong>drag the marker</strong> to fine-tune the exact spot.
            </div>

            <MapPicker value={location} onChange={handleLocationChange} />

            {/* Coordinate confirmation */}
            {location?.lat && location?.lng ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl text-xs text-green-700 dark:text-green-300">
                <span className="text-base">✅</span>
                <span><strong>Location pinned</strong> — Exact coordinates: <span className="font-mono">{Number(location.lat).toFixed(6)}, {Number(location.lng).toFixed(6)}</span></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 dark:text-red-400">
                <span className="text-base">📌</span>
                <span><strong>No location pinned yet</strong> — Search for a place or click on the map to set the exact location. This is required.</span>
              </div>
            )}

            <div>
              <label className="form-label">District <span className="text-red-500">*</span></label>
              <GlassSelect options={DISTRICT_OPTIONS} value={form.district} onChange={v => set('district', v)} placeholder="Select District" />
              {!form.district && (
                <p className="text-xs text-amber-500 mt-1">⚠️ Required — select the district to continue</p>
              )}
            </div>

            <div>
              <label className="form-label">Venue / Hall Name</label>
              <input className="input w-full" placeholder="e.g. Thrissur Town Hall, Vadakkunnathan Temple" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            <div className="flex gap-3 justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary px-5 py-2.5 text-sm">← Back</button>
              <button type="button" disabled={!canProceed1} onClick={() => setStep(2)}
                className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                Next: Media →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Media & Organizer ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📸</span>
              <h2 className="font-bold text-gray-900 dark:text-white">Media & Organizer</h2>
            </div>

            <div>
              <label className="form-label">Event Photos <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(up to 5 · First is Cover)</span></label>

              <AnimatePresence>
                {wikiImages.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700/40">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1">✨ Wikipedia Images (auto-fetched)</p>
                    <div className="flex gap-2 flex-wrap">
                      {wikiImages.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="Wiki" className="h-20 w-28 object-cover rounded-lg border-2 border-violet-300 dark:border-violet-600" onError={e => { e.target.style.display='none'; }} />
                          <span className="absolute top-1 left-1 text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-bold">Wiki</span>
                          <button type="button" onClick={() => setWikiImages(wikiImages.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-violet-500 mt-2">These images will be used if no local files are uploaded.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <ImageUploadZone images={images} onChange={setImages} />
              {images.length === 0 && wikiImages.length === 0 && (
                <p className="text-xs text-amber-500 mt-1.5">⚠️ At least one photo is required (upload or use ✨ AI Fill)</p>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
              <label className="form-label mb-0">👤 Organizer Info <span className="text-xs text-gray-400">(optional but recommended)</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Organizer Name</label>
                  <input className="input w-full" placeholder="e.g. Kerala Tourism Board" value={form.organizerName} onChange={e => set('organizerName', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input type="tel" inputMode="tel" className="input w-full" placeholder="+91 9XXXXXXXXX" value={form.organizerPhone} onChange={e => set('organizerPhone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" inputMode="email" className="input w-full" placeholder="contact@event.com" value={form.organizerEmail} onChange={e => set('organizerEmail', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <input type="url" inputMode="url" className="input w-full" placeholder="https://event-site.com" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary px-5 py-2.5 text-sm">← Back</button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary px-6 py-2.5 text-sm">Review & Submit →</button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">✅</span>
              <h2 className="font-bold text-gray-900 dark:text-white">Review & Submit</h2>
            </div>

            <div className="space-y-3">
              {/* Summary card */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/30 space-y-2.5">
                <div className="flex gap-2 items-start">
                  <span className="text-lg">🎪</span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{form.name}</p>
                    <p className="text-xs text-gray-500">{form.category} · Free Entry</p>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap text-xs text-gray-600 dark:text-gray-300">
                  <span>📅 {form.date ? new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  <span>📍 {location?.address?.slice(0, 60)}...</span>
                  {form.district && <span>🗺 {form.district}</span>}
                  <span>📸 {images.length} photo{images.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-sm text-blue-700 dark:text-blue-300">
                ℹ️ Your event will be reviewed by our team. You'll be notified once it goes live. Make sure all information is accurate!
              </div>
            </div>

              {/* Disclaimer checkbox */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                disclaimerAccepted
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
                onClick={() => setDisclaimerAccepted(v => !v)}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${
                  disclaimerAccepted ? 'bg-green-500' : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500'
                }`}>
                  {disclaimerAccepted && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 select-none">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    I agree to the
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setShowDisclaimer(true); }}
                      className="ml-1 text-accent hover:underline font-semibold"
                    >
                      Disclaimer
                    </button>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Required to submit your event</p>
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary px-5 py-2.5 text-sm">← Back</button>
                <motion.button type="button" onClick={handleSubmit} disabled={loading || !disclaimerAccepted} whileTap={{ scale: 0.97 }}
                  className="btn-primary px-8 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2">
                  {loading ? (
                    <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />  Submitting...</>
                  ) : '🚀 Submit for Review'}
                </motion.button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
    </div>
  );
}
