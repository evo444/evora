import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const accentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const KERALA_DISTRICTS = [
  'Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam',
  'Idukki','Ernakulam','Thrissur','Palakkad','Malappuram',
  'Kozhikode','Wayanad','Kannur','Kasaragod'
];

// ── Extract lat/lng from any Google Maps URL format ──
function extractCoordsFromGoogleUrl(url) {
  // @lat,lng,zoom (standard share link)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // ?q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  // /place/.../lat,lng (place URLs)
  const placeMatch = url.match(/\/place\/[^/]+\/@?(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

// Extract a human-readable place name from a Google Maps URL for Nominatim fallback
function extractPlaceFromGoogleUrl(url) {
  // /maps/place/Place+Name/ — most common after following a short link redirect
  const placeMatch = url.match(/\/maps\/place\/([^/?#]+)/);
  if (placeMatch) {
    const name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).split('\\').slice(0,2).join(', ').trim();
    if (name && name.length > 1) return name;
  }
  // ?q=query  (non-coordinate)
  const qMatch = url.match(/[?&]q=([^&]+)/);
  if (qMatch && !/^-?\d/.test(qMatch[1])) {
    return decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
  }
  return null;
}

// ── Resolve short URLs: extract coords from redirect chain + page HTML ──
async function resolveShortUrl(url) {
  const resp = await fetch(
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(12000) }
  );
  const data = await resp.json();
  const finalUrl = data?.status?.url || '';
  const contents = (data?.contents || '') + ' ' + finalUrl;

  // Try every possible coordinate pattern in both the URL and the page HTML
  const patterns = [
    // @lat,lng,zoom (standard Google Maps URL)
    /@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // {"lat":lat,"lng":lng} — JSON embedded in page
    /"lat"\s*:\s*(-?\d{1,3}\.\d{4,})\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d{4,})/,
    // ll=lat,lng — query param (URL encoded or plain)
    /ll=(-?\d{1,3}\.\d{4,})[,%2C]+(-?\d{1,3}\.\d{4,})/i,
    // !2d lng !3d lat — encoded in /data= segment
    /!2d(-?\d{1,3}\.\d{4,})!3d(-?\d{1,3}\.\d{4,})/,
    // center=lat,lng
    /center=(-?\d{1,3}\.\d{4,})[,%2C]+(-?\d{1,3}\.\d{4,})/i,
  ];

  for (const re of patterns) {
    const m = contents.match(re);
    if (m) {
      let lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      // !2d/!3d pattern has reversed order (lng, lat)
      if (re.source.includes('!2d')) { [lat, lng] = [lng, lat]; }
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  throw new Error('Could not find coordinates in resolved URL');
}

// ── Reverse geocode + auto-detect district ──
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const address = data.address || {};

    // Try to detect Kerala district from address components
    let district = '';
    const haystack = [
      address.county, address.state_district, address.city,
      address.town, address.municipality, data.display_name
    ].filter(Boolean).join(' ');

    for (const d of KERALA_DISTRICTS) {
      if (haystack.toLowerCase().includes(d.toLowerCase())) {
        district = d;
        break;
      }
    }

    // Build a clean short name: use name + city/town/county at most
    const nameParts = [
      data.name,
      address.suburb || address.neighbourhood || address.village || address.town || address.city,
      address.county || address.state_district,
    ].filter(Boolean);
    const placeName = nameParts.length > 0 ? nameParts.slice(0, 2).join(', ') : null;

    return {
      address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      placeName,
      district,
    };
  } catch {
    return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, placeName: null, district: '' };
  }
}

// ── Debounce hook ──
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Map sub-components ──
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ──────────────────────────────────────────────────────────────
export default function MapPicker({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debouncedQuery = useDebounce(query, 350);

  const coords = value?.lat ? value : null;
  const defaultCenter = { lat: 10.8505, lng: 76.2711 }; // Kerala

  // Close suggestions on outside click
  useEffect(() => {
    const h = (e) => {
      if (!suggestionsRef.current?.contains(e.target) && !inputRef.current?.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Autocomplete
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) { setSuggestions([]); return; }
    let cancelled = false;
    const run = async () => {
      setFetchingSuggestions(true);
      try {
        const q = /kerala|india/i.test(debouncedQuery) ? debouncedQuery : `${debouncedQuery}, Kerala, India`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&countrycodes=in`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (!cancelled) setSuggestions(data);
      } catch { if (!cancelled) setSuggestions([]); }
      finally { if (!cancelled) setFetchingSuggestions(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Apply location from any source
  const applyLocation = useCallback(async (lat, lng) => {
    const geo = await reverseGeocode(lat, lng);
    const loc = { lat, lng, address: geo.address, placeName: geo.placeName, district: geo.district };
    onChange(loc);
    setFlyTarget({ lat, lng });
    setError('');
  }, [onChange]);

  // Pick autocomplete suggestion
  const pickSuggestion = useCallback(async (item) => {
    const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
    // Use display_name but also try to get district from address object
    let district = '';
    const haystack = Object.values(item.address || {}).join(' ') + ' ' + item.display_name;
    for (const d of KERALA_DISTRICTS) {
      if (haystack.toLowerCase().includes(d.toLowerCase())) { district = d; break; }
    }
    const nameParts = [item.address?.amenity || item.address?.road || item.namedetails?.name,
      item.address?.suburb || item.address?.town || item.address?.city || item.address?.county
    ].filter(Boolean);
    const placeName = nameParts.length > 0 ? nameParts.slice(0, 2).join(', ') : item.display_name.split(',')[0];
    onChange({ lat, lng, address: item.display_name, placeName, district });
    setFlyTarget({ lat, lng });
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
  }, [onChange]);

  // Paste URL handler — 4-step resolution chain
  const handlePasteUrl = async () => {
    setError('');
    const raw = pasteUrl.trim();
    if (!raw) return;
    setResolving(true);
    try {
      let extracted = null;
      let finalUrl = null;

      // ── Step 1: direct coord extraction (full google.com/maps links) ──
      extracted = extractCoordsFromGoogleUrl(raw);

      // ── Step 2: backend resolver for short links (maps.app.goo.gl etc) ──
      if (!extracted && (raw.includes('goo.gl') || raw.includes('maps.app') || raw.includes('bit.ly'))) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/resolve-url?url=${encodeURIComponent(raw)}`);
          const data = await res.json();
          if (data.finalUrl) {
            finalUrl = data.finalUrl;
            // Try coords from the resolved full URL
            extracted = extractCoordsFromGoogleUrl(finalUrl);
          }
        } catch { /* backend unavailable */ }
      }

      // ── Step 3: AllOrigins CORS proxy fallback (multi-pattern search) ──
      if (!extracted && (raw.includes('goo.gl') || raw.includes('maps.app'))) {
        try {
          extracted = await resolveShortUrl(raw);
        } catch { /* proxy also failed */ }
      }

      // ── Step 4: place name extraction → Nominatim geocoding ──
      // Triggered when the resolved URL is /maps/place/PlaceName/ (no @lat,lng)
      if (!extracted) {
        const searchUrl = finalUrl || raw;
        const placeName = extractPlaceFromGoogleUrl(searchUrl);
        if (placeName) {
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geoRes.json();
            if (geoData.length > 0) {
              extracted = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
            }
          } catch { /* geocoding failed */ }
        }
      }

      if (extracted?.lat && extracted?.lng) {
        await applyLocation(extracted.lat, extracted.lng);
        setPasteUrl('');
      } else {
        setError('Could not find this location. Try copying a longer Google Maps link with the full address visible in the URL bar.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const handleMarkerDrag = useCallback(async (e) => {
    const { lat, lng } = e.target.getLatLng();
    await applyLocation(lat, lng);
  }, [applyLocation]);

  const shortLabel = (item) => item.display_name.split(',').slice(0, 3).join(', ');

  return (
    <div className="space-y-3">

      {/* ── Search bar ── */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#22262f] border border-gray-200 dark:border-[#2a2e38] rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent/50 transition-all">
          <span className="text-gray-400 flex-shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Search temple, venue, area, city…"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') setShowSuggestions(false);
              if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); pickSuggestion(suggestions[0]); }
            }}
            autoComplete="off"
          />
          {fetchingSuggestions && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionsRef}
            className="absolute z-[9999] left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-[#2a2e38] rounded-xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2a2e38]">
            {suggestions.map((item, i) => (
              <button key={i} type="button"
                onMouseDown={e => { e.preventDefault(); pickSuggestion(item); }}
                className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-[#22262f] transition-colors flex items-start gap-3 group">
                <span className="text-accent mt-0.5 flex-shrink-0">📍</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-accent transition-colors">{shortLabel(item)}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Paste Google Maps link ── */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#22262f] border border-gray-200 dark:border-[#2a2e38] rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40 transition-all">
          <span className="text-gray-400 flex-shrink-0 text-sm">🔗</span>
          <input
            type="url"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Or paste a Google Maps link (maps.app.goo.gl / maps.google.com)…"
            value={pasteUrl}
            onChange={e => { setPasteUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handlePasteUrl())}
          />
        </div>
        <button type="button" onClick={handlePasteUrl}
          disabled={!pasteUrl.trim() || resolving}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-60 whitespace-nowrap min-w-[70px]">
          {resolving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Wait</span>
            </span>
          ) : 'Set'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30">
          <span className="flex-shrink-0 text-red-500 text-sm">⚠️</span>
          <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Helper */}
      <p className="text-xs text-gray-400">
        💡 <strong>Click anywhere on the map</strong> to drop a pin · Drag the marker to adjust · Search or paste a link above
      </p>

      {/* ── Interactive Leaflet Map ── */}
      <div
        className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-[#2a2e38] shadow-sm"
        style={{ height: 'clamp(220px, 35vw, 300px)' }}
      >
        <MapContainer
          center={coords ? [coords.lat, coords.lng] : [defaultCenter.lat, defaultCenter.lng]}
          zoom={coords ? 15 : 8}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo center={flyTarget} />
          <MapClickHandler onMapClick={applyLocation} />
          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={accentIcon}
              draggable={true}
              eventHandlers={{ dragend: handleMarkerDrag }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Confirmed location card ── */}
      {coords ? (
        <div className="p-3.5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30 space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-green-500 flex-shrink-0 mt-0.5">📍</span>
            <div className="flex-1 min-w-0">
              {value.placeName && (
                <p className="text-sm font-bold text-green-800 dark:text-green-200 leading-tight">{value.placeName}</p>
              )}
              <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed mt-0.5">{value.address}</p>
              <p className="text-xs text-green-500 mt-1 font-mono">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                className="text-xs text-accent font-semibold hover:underline whitespace-nowrap">
                Open ↗
              </a>
              <button type="button" onClick={() => { onChange(null); setError(''); }}
                className="text-gray-400 hover:text-red-500 transition-colors text-sm leading-none">✕</button>
            </div>
          </div>
          {value.district && (
            <p className="text-xs text-green-600 dark:text-green-400 ml-6">
              🗺 Auto-detected district: <strong>{value.district}</strong>
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/20">
          <span className="text-amber-500 text-sm">📌</span>
          <p className="text-xs text-amber-700 dark:text-amber-400">No location set yet — search, paste a link, or click the map</p>
        </div>
      )}
    </div>
  );
}
