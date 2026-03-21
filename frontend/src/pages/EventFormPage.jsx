import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [location, setLocation] = useState(null); // {lat,lng,address,district,placeName}
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
        // Pre-populate map location from saved coords
        const lat = e.location?.lat || e.location?.coordinates?.lat;
        const lng = e.location?.lng || e.location?.coordinates?.lng;
        if (lat && lng) {
          setLocation({
            lat: parseFloat(lat), lng: parseFloat(lng),
            address: e.location?.address || '',
            district: e.location?.district || '',
            placeName: null,
          });
        }
        setExistingImages(e.images || []);
      }).catch(() => navigate('/'));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.date || !form.endDate || !form.category || !form.crowd || !form.district) {
      toast.error('Please fill all required fields (including Category, Crowd & District)'); return;
    }
    if (!location?.lat) {
      toast.error('Please pin the event location on the map'); return;
    }
    if (images.length === 0 && existingImages.length === 0) {
      toast.error('Please upload at least one event photo'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('shortDescription', form.shortDescription);
      fd.append('date', form.date);
      fd.append('endDate', form.endDate);
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
      images.forEach(f => fd.append('images', f));

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
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
          {isEdit ? '✏️ Edit Event' : '🎉 Create New Event'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Event Name *</label>
            <input {...f('name')} placeholder="e.g., Thrissur Pooram 2025" className="input" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Short Description</label>
            <input {...f('shortDescription')} placeholder="One-line teaser (shown on cards)" className="input" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Description *</label>
            <textarea {...f('description')} rows={5} placeholder="Detailed event description..." className="input resize-none" required />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date &amp; Time *</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input"
                  value={form.date ? form.date.substring(0, 10) : ''}
                  onChange={e => {
                    const t = form.date?.substring(11, 16) || '';
                    setForm(p => ({ ...p, date: e.target.value + (t ? 'T' + t : '') }));
                  }} required />
                <input type="time" className="input"
                  value={form.date?.includes('T') ? form.date.substring(11, 16) : ''}
                  onChange={e => {
                    const d = form.date?.substring(0, 10) || '';
                    if (d) setForm(p => ({ ...p, date: d + 'T' + e.target.value }));
                  }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">End Date &amp; Time <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input"
                  value={form.endDate ? form.endDate.substring(0, 10) : ''}
                  onChange={e => {
                    const t = form.endDate?.substring(11, 16) || '';
                    setForm(p => ({ ...p, endDate: e.target.value + (t ? 'T' + t : '') }));
                  }} required />
                <input type="time" className="input"
                  value={form.endDate?.includes('T') ? form.endDate.substring(11, 16) : ''}
                  onChange={e => {
                    const d = form.endDate?.substring(0, 10) || '';
                    if (d) setForm(p => ({ ...p, endDate: d + 'T' + e.target.value }));
                  }} />
              </div>
            </div>
          </div>

          {/* Category & Crowd */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
              <GlassSelect
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={v => setForm(prev => ({ ...prev, category: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Crowd Level</label>
              <GlassSelect
                options={CROWD_OPTIONS}
                value={form.crowd}
                onChange={v => setForm(prev => ({ ...prev, crowd: v }))}
              />
            </div>
          </div>

          {/* Location — Interactive Map */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📍 Event Location <span className="text-red-500">*</span>
            </label>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300 mb-3">
              🗺 <strong>Search</strong> for any place or paste a Google Maps link. Then <strong>click the map</strong> or <strong>drag the marker</strong> to fine-tune the exact spot.
            </div>
            <MapPicker value={location} onChange={handleLocationChange} />
            {!location?.lat && (
              <p className="text-xs text-amber-500 mt-1.5">⚠️ Location is required — pin it on the map above</p>
            )}
          </div>

          {/* District override */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              District <span className="text-red-500">*</span>
              {location?.district && form.district === location.district && (
                <span className="ml-2 text-xs font-normal text-green-500">✓ Auto-detected</span>
              )}
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
            <input type="checkbox" id="trending" checked={form.trending} onChange={e => setForm(prev => ({...prev, trending: e.target.checked}))} className="w-4 h-4 rounded accent-primary-600" />
            <label htmlFor="trending" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">🔥 Mark as Trending</label>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Event Images <span className="text-red-500">*</span></label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center hover:border-primary-400 transition-colors">
              <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files))}
                className="hidden" id="img-upload" />
              <label htmlFor="img-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Click to upload images</div>
                <div className="text-xs text-gray-400 mt-1">Max 10MB per image</div>
              </label>
            </div>
            {images.length === 0 && existingImages.length === 0 && (
              <p className="text-xs text-amber-500 mt-1.5">⚠️ At least one photo is required</p>
            )}

            {/* Selected files */}
            {images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {images.map((f, i) => (
                  <div key={i} className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg">{f.name}</div>
                ))}
              </div>
            )}

            {/* Existing images */}
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
