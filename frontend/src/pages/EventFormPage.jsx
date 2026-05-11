import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { eventService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import GlassSelect from '../components/GlassSelect';
import MapPicker from '../components/MapPicker';

const CATEGORIES = ['Festival', 'Tech', 'Music', 'Cultural', 'Sports', 'Food', 'Art', 'Education', 'Other'];
const CATEGORY_OPTIONS = [{ value: '', label: 'Select Category' }, ...CATEGORIES.map(c => ({ value: c, label: c }))];
const DISTRICTS = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'];
const DISTRICT_OPTIONS = [{ value: '', label: 'Select district' }, ...DISTRICTS.map(d => ({ value: d, label: d }))];
const CROWD_OPTIONS = [
  { value: '', label: 'Select Crowd' },
  { value: 'low', label: 'Low', icon: '🟢' },
  { value: 'medium', label: 'Medium', icon: '🟡' },
  { value: 'high', label: 'High', icon: '🔴' },
];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Keyword → category guesser ──────────────────────────────────────────────
function guessCategory(text) {
  const t = text.toLowerCase();
  if (/festival|pooram|utsav|carnival|onam|vishu|pongal|celebration/.test(t)) return 'Festival';
  if (/music|concert|song|band|choir|orchestra/.test(t)) return 'Music';
  if (/tech|hackathon|startup|ai|software|code|digital/.test(t)) return 'Tech';
  if (/temple|cultural|art|dance|theyyam|krishnan|heritage|ritual|folk/.test(t)) return 'Cultural';
  if (/sport|race|marathon|cricket|football|tournament|match/.test(t)) return 'Sports';
  if (/food|feast|cuisine|taste|restaurant|chef/.test(t)) return 'Food';
  if (/art|paint|sculpture|gallery|exhibit/.test(t)) return 'Art';
  if (/education|seminar|workshop|training|conference|summit/.test(t)) return 'Education';
  return 'Other';
}

// ── Kerala district from Nominatim address ──────────────────────────────────
function detectDistrict(addr) {
  const text = JSON.stringify(addr).toLowerCase();
  return DISTRICTS.find(d => text.includes(d.toLowerCase())) || '';
}

// ── Wikipedia image picker (same keyword map as the batch script) ─────────
const IMAGE_MAP = [
  { keywords: ['guruvayur'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg' },
  { keywords: ['sabarimala'], url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Sabarimala_2.jpg' },
  { keywords: ['padmanabhaswamy', 'padmanabha'], url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Sree_Padmanabhaswamy_temple_01.jpg' },
  { keywords: ['attukal', 'pongala'], url: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Attukal_temple.jpg' },
  { keywords: ['thrissur pooram', 'pooram'], url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Kudamatom_at_thrissur_pooram_2013_7618.JPG' },
  { keywords: ['chottanikkara'], url: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Chottanikkara_Temple.jpg' },
  { keywords: ['vaikom'], url: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Pambady_Rajan_carrying_Idol_of_vaikom_mahadeva_temple.jpg' },
  { keywords: ['ettumanoor'], url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Ettumanoor_Temple_North_Gate_Entrance.JPG' },
  { keywords: ['ambalapuzha'], url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Ambalappuzha_Temple.JPG' },
  { keywords: ['tripunithura', 'poornathrayeesha', 'attachamayam'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Thrippunithura-Elephants8_crop.jpg' },
  { keywords: ['aranmula'], url: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Kerala_boatrace.jpg' },
  { keywords: ['nehru trophy', 'boat race', 'vallam kali'], url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Boat_race_chundan.jpg' },
  { keywords: ['muthappan', 'parassinikadavu'], url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Parassini.jpg' },
  { keywords: ['theyyam'], url: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Kathivanoor_Veeran_Chemmarathi_Thara-Eripuram.jpg' },
  { keywords: ['onam', 'thiruvonam'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Thrippunithura-Elephants8_crop.jpg' },
  { keywords: ['vishu'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg' },
  { keywords: ['beemapalli'], url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Beemapally.jpg' },
  { keywords: ['ayyappa', 'mandalam', 'makaravilakku'], url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Sabarimala_2.jpg' },
  { keywords: ['elephant', 'ekadasi', 'aanayoottu'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg' },
  { keywords: ['kerala', 'festival', 'utsavam', 'cultural', 'temple'], url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg' },
];

function pickWikiImage(name) {
  const lower = name.toLowerCase();
  for (const { keywords, url } of IMAGE_MAP) {
    if (keywords.some(k => lower.includes(k))) return url;
  }
  return null;
}

// ── Compress an image URL → File (canvas, max 800px, JPEG 80%) ─────────────
async function compressImageUrlToFile(url, fileName = 'ai-image.jpg') {
  // Try multiple CORS proxies in order
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url, // direct last-resort
  ];
  let blob = null;
  for (const src of proxies) {
    try {
      const res = await fetch(src);
      if (res.ok) { blob = await res.blob(); break; }
    } catch (_) {}
  }
  if (!blob) throw new Error('All proxies failed');

  const bmp  = await createImageBitmap(blob);
  const MAX = 800;
  let w = bmp.width, h = bmp.height;
  if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(new File([b], fileName, { type: 'image/jpeg' })) : reject(new Error('canvas empty')),
      'image/jpeg', 0.8
    );
  });
}

// ── AI Auto-fill: Wikipedia search + Nominatim geocoding ────────────────────
async function autoFillFromWikipedia(eventName) {
  const result = { description: '', shortDescription: '', category: '', location: null, district: '', imageUrl: '', extraImages: [] };

  // 1. Wikipedia search
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(eventName)}&format=json&origin=*&srlimit=3`;
    const sRes = await fetch(searchUrl);
    const sData = await sRes.json();
    const hits = sData?.query?.search || [];
    const pageId = hits[0]?.pageid;

    if (pageId) {
      // Fetch extract + primary image
      const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|images&exintro=true&explaintext=true&pithumbsize=1200&imlimit=10&pageids=${pageId}&format=json&origin=*`;
      const pRes = await fetch(summaryUrl);
      const pData = await pRes.json();
      const page = pData?.query?.pages?.[pageId];
      const extract = page?.extract || '';
      const wikiImg = page?.thumbnail?.source || '';

      if (extract) {
        const sentences = extract.split(/(?<=[.!?])\s+/);
        result.shortDescription = sentences[0] || '';
        result.description = sentences.slice(0, 6).join(' ').slice(0, 1800);
      }
      if (wikiImg) result.imageUrl = wikiImg;

      // Fetch additional Commons images via imageinfo
      const imgTitles = (page?.images || [])
        .map(i => i.title)
        .filter(t => /\.(jpg|jpeg|png|webp)$/i.test(t))
        .slice(0, 6);

      if (imgTitles.length > 0) {
        try {
          const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=${encodeURIComponent(imgTitles.join('|'))}&format=json&origin=*`;
          const iRes = await fetch(infoUrl);
          const iData = await iRes.json();
          const pages = Object.values(iData?.query?.pages || {});
          result.extraImages = pages
            .map(p => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
            .filter(Boolean)
            .filter(u => !/\.svg$/i.test(u));
        } catch (_) {}
      }
    }
  } catch (_) {}

  // 2. Fallback image from keyword map
  if (!result.imageUrl) {
    result.imageUrl = pickWikiImage(eventName) || '';
  }

  // 3. Combine images (primary + extras, deduplicated)
  const allImgs = [result.imageUrl, ...result.extraImages].filter(Boolean);
  result.allImages = [...new Set(allImgs)].slice(0, 5);

  // 4. Guess category
  result.category = guessCategory(eventName + ' ' + result.description);

  // 5. Geocode the event name with Nominatim (get lat/lng + district)
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(eventName + ' Kerala')}&format=json&limit=1&addressdetails=1`;
    const gRes = await fetch(geoUrl, { headers: { 'Accept-Language': 'en' } });
    const gData = await gRes.json();
    if (gData?.[0]) {
      const place = gData[0];
      result.location = {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name,
        district: detectDistrict(place.address),
        placeName: place.name || eventName,
      };
      result.district = result.location.district;
    }
  } catch (_) {}

  return result;
}

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [wikiImages, setWikiImages] = useState([]); // URLs from Wikipedia
  const [existingImages, setExistingImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', shortDescription: '',
    date: '', endDate: '', category: '', crowd: '',
    attendees: '', trending: false,
    district: '', tags: ''
  });

  const handleLocationChange = (loc) => { setLocation(loc); };

  useEffect(() => {
    if (!isAdmin()) navigate('/');
  }, []);

  useEffect(() => {
    if (isEdit) {
      eventService.getById(id).then(e => {
        setForm({
          name: e.name || '',
          description: e.description || '',
          shortDescription: e.shortDescription || '',
          date: e.date ? e.date.substring(0, 16) : '',
          endDate: e.endDate ? e.endDate.substring(0, 16) : '',
          category: e.category || 'Festival',
          crowd: e.crowd || 'medium',
          attendees: e.attendees || '',
          trending: e.trending || false,
          district: e.location?.district || '',
          tags: e.tags?.join(', ') || ''
        });
        const lat = e.location?.lat || e.location?.coordinates?.lat;
        const lng = e.location?.lng || e.location?.coordinates?.lng;
        if (lat && lng) {
          setLocation({ lat: parseFloat(lat), lng: parseFloat(lng), address: e.location?.address || '', district: e.location?.district || '', placeName: null });
        }
        setExistingImages(e.images || []);
      }).catch(() => navigate('/'));
    }
  }, [id]);

  // ── AI Auto-fill handler ─────────────────────────────────────────────────
  const handleAiAutoFill = async () => {
    if (!form.name.trim()) { toast.error('Enter an event name first'); return; }
    setAiLoading(true);
    const toastId = toast.loading('🔍 Searching Wikipedia & OpenStreetMap…');
    try {
      const data = await autoFillFromWikipedia(form.name);
      setForm(prev => ({
        ...prev,
        description: data.description || prev.description,
        shortDescription: data.shortDescription || prev.shortDescription,
        category: data.category || prev.category,
        district: data.district || prev.district,
      }));
      if (data.location) setLocation(data.location);

      // Use all collected Wikipedia images
      const imgs = data.allImages?.length > 0 ? data.allImages : (data.imageUrl ? [data.imageUrl] : []);
      if (imgs.length > 0) setWikiImages(imgs);

      // ── Auto-compress & upload the first image ──────────────────────────
      let imageAutoUploaded = false;
      if (imgs.length > 0) {
        toast.loading('📸 Compressing & uploading image…', { id: toastId });
        try {
          const file = await compressImageUrlToFile(imgs[0], `${form.name.slice(0,30).replace(/\s+/g,'-')}.jpg`);
          setImages([file]);
          imageAutoUploaded = true;
        } catch (_) {
          // compression failed — wiki URL fallback still in wikiImages
        }
      }

      const filled = [
        data.description && 'Description',
        data.category && 'Category',
        data.location && 'Location',
        data.district && 'District',
        imageAutoUploaded ? '📸 Image (compressed)' : (imgs.length > 0 && `${imgs.length} image URL${imgs.length > 1 ? 's' : ''}`),
      ].filter(Boolean);
      toast.success(`✅ Auto-filled: ${filled.join(', ')}`, { id: toastId, duration: 4000 });
    } catch (err) {
      toast.error('Auto-fill failed. Try a more specific event name.', { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.category || !form.crowd || !form.district) {
      toast.error('Please fill all required fields (Name, Description, Category, Crowd & District)'); return;
    }
    if (!location?.lat) {
      toast.error('Please pin the event location on the map'); return;
    }
    if (images.length === 0 && existingImages.length === 0 && wikiImages.length === 0) {
      toast.error('Please upload at least one event photo'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('shortDescription', form.shortDescription);
      // Use placeholder dates if not provided (admin can edit later)
      const now = new Date().toISOString().substring(0, 16);
      fd.append('date', form.date || now);
      fd.append('endDate', form.endDate || now);
      fd.append('category', form.category);
      fd.append('crowd', form.crowd);
      fd.append('attendees', form.attendees || 0);
      fd.append('trending', form.trending);
      fd.append('location', JSON.stringify({
        address: location.address || '',
        district: form.district,
        lat: location.lat,
        lng: location.lng,
        coordinates: { lat: location.lat, lng: location.lng },
      }));
      if (form.tags) fd.append('tags', form.tags.split(',').map(t => t.trim()).filter(Boolean).join(','));

      // Append local uploaded images
      images.forEach(f => fd.append('images', f));

      // Append Wikipedia image URLs as a special field
      if (wikiImages.length > 0 && images.length === 0 && existingImages.length === 0) {
        fd.append('imageUrls', JSON.stringify(wikiImages));
      }

      if (isEdit) {
        await eventService.update(id, fd);
        toast.success('Event updated! ✅');
      } else {
        await eventService.create(fd);
        toast.success('Event created! 🎉');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally { setLoading(false); }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm(prev => ({ ...prev, [key]: e.target.value })) });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
          {isEdit ? '✏️ Edit Event' : '🎉 Create New Event'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Type the event name then click the <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold text-xs">✨ AI Fill</span> button to auto-populate fields using Wikipedia &amp; Maps.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Event Name + AI Fill Button */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Event Name *</label>
            <div className="relative flex items-center">
              <input
                {...f('name')}
                placeholder="e.g., Thrissur Pooram 2025"
                className="input pr-10"
                required
              />
              {/* AI icon-only button — plain, no animation */}
              <button
                type="button"
                onClick={handleAiAutoFill}
                disabled={aiLoading || !form.name.trim()}
                title="AI Auto-fill from Wikipedia & Maps"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {aiLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 7.5 A7 7 0 1 0 15.4 15.5" />
                    <line x1="15.4" y1="15.5" x2="21" y2="21" />
                    <path d="M19 1 L20.1 4.3 L23 5.5 L20.1 6.7 L19 10 L17.9 6.7 L15 5.5 L17.9 4.3 Z" fill="currentColor" stroke="none" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* AI Fill Status Banner */}
          <AnimatePresence>
            {aiLoading && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 text-sm text-violet-700 dark:text-violet-300"
              >
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-lg">🔍</motion.span>
                <span>Searching Wikipedia &amp; OpenStreetMap for "<strong>{form.name}</strong>"…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Short Description</label>
            <input {...f('shortDescription')} placeholder="One-line teaser (shown on cards)" className="input" />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Description *</label>
            <textarea {...f('description')} rows={5} placeholder="Detailed event description..." className="input resize-none" required />
            <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000</p>
          </div>

          {/* Category & Crowd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Category *
                {form.category && <span className="ml-2 text-xs font-normal text-violet-500">✨ AI selected</span>}
              </label>
              <GlassSelect options={CATEGORY_OPTIONS} value={form.category} onChange={v => setForm(prev => ({ ...prev, category: v }))} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Crowd Level</label>
              <GlassSelect options={CROWD_OPTIONS} value={form.crowd} onChange={v => setForm(prev => ({ ...prev, crowd: v }))} />
            </div>
          </div>

          {/* Location — Interactive Map (AI-populated) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📍 Event Location <span className="text-red-500">*</span>
              {location?.lat && <span className="ml-2 text-xs font-normal text-violet-500">✨ AI mapped</span>}
            </label>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300 mb-3">
              🗺 <strong>Search</strong> for any place or paste a Google Maps link. Or click <strong>✨ AI Fill</strong> to auto-detect from event name.
            </div>
            <MapPicker value={location} onChange={handleLocationChange} />
            {!location?.lat && (
              <p className="text-xs text-amber-500 mt-1.5">⚠️ Location is required — pin it on the map or use AI Fill</p>
            )}
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              District <span className="text-red-500">*</span>
              {form.district && <span className="ml-2 text-xs font-normal text-violet-500">✨ AI detected</span>}
            </label>
            <GlassSelect
              options={DISTRICT_OPTIONS}
              value={form.district}
              onChange={v => setForm(prev => ({ ...prev, district: v }))}
              placeholder="Select district"
            />
            {!form.district && <p className="text-xs text-red-400 mt-1">Required — select a district</p>}
          </div>

          {/* Attendees & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Expected Attendees</label>
              <input {...f('attendees')} type="number" placeholder="e.g., 5000" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tags (comma-separated)</label>
              <input {...f('tags')} placeholder="temple, music, art..." className="input" />
            </div>
          </div>

          {/* Trending */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <input type="checkbox" id="trending" checked={form.trending} onChange={e => setForm(prev => ({ ...prev, trending: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
            <label htmlFor="trending" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">🔥 Mark as Trending</label>
          </div>

          {/* Image Upload + Wikipedia Images */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Event Image <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-400">(1 photo · upload or use AI Fill image)</span>
            </label>

            {/* Wikipedia auto-fetched images */}
            <AnimatePresence>
              {wikiImages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700/40"
                >
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1">
                    <span>✨</span> Wikipedia Images (auto-fetched)
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {wikiImages.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt="Wikipedia"
                          className="h-20 w-28 object-cover rounded-lg border-2 border-violet-300 dark:border-violet-600"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <span className="absolute top-1 left-1 text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-bold">Wiki</span>
                        <button
                          type="button"
                          onClick={() => setWikiImages(wikiImages.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center shadow"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-violet-500 mt-2">These Wikipedia images will be used if no local files are uploaded.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File upload — 1 photo only */}
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center hover:border-primary-400 transition-colors">
              <input type="file" accept="image/*" onChange={e => setImages(e.target.files[0] ? [e.target.files[0]] : [])}
                className="hidden" id="img-upload" />
              <label htmlFor="img-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Click to upload 1 event photo</div>
                <div className="text-xs text-gray-400 mt-1">Max 10MB · JPG, PNG, WebP</div>
              </label>
            </div>

            {images.length === 0 && existingImages.length === 0 && wikiImages.length === 0 && (
              <p className="text-xs text-amber-500 mt-1.5">⚠️ At least one photo is required (upload or use AI Fill)</p>
            )}

            {images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap items-center">
                {images.map((file, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="h-20 w-28 object-cover rounded-lg border-2 border-primary-300 dark:border-primary-600"
                    />
                    {file.name.endsWith('.jpg') && file.name !== file.name.toUpperCase() && (
                      <span className="absolute top-1 left-1 text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-bold">AI</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center shadow"
                    >✕</button>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[7rem]">{file.name}</p>
                  </div>
                ))}
              </div>
            )}

            {existingImages.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {existingImages.map((img, i) => {
                  const url = img.startsWith('http') ? img : `${API_URL}${img}`;
                  return <img key={i} src={url} alt="" className="w-16 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />;
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
              {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
