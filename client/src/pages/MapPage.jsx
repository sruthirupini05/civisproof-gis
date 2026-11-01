import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Crosshair,
  Navigation,
  Info,
  X,
  ArrowLeft,
  MapPin,
} from 'lucide-react';
import { facilitiesAPI } from '../services/api.js';
import { cacheAllFacilities, getCachedFacilities } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { useLanguageStore } from '../store/useStore.js';

const DEFAULT_CENTER = [16.9948, 81.7798]; // Rajahmundry Main Ghat

const CATEGORY_META = {
  toilet: { label: 'Toilets', teLabel: 'మరుగుదొడ్లు', hiLabel: 'शौचालय', icon: '🚻', color: '#991b1b', bg: '#fef2f2' },
  water: { label: 'Water', teLabel: 'త్రాగునీరు', hiLabel: 'पेयजल', icon: '💧', color: '#0284c7', bg: '#f0f9ff' },
  medical: { label: 'Medical', teLabel: 'వైద్యం', hiLabel: 'चिकित्सा', icon: '➕', color: '#dc2626', bg: '#fff1f2' },
  ghat: { label: 'Ghats', teLabel: 'ఘాట్లు', hiLabel: 'घाट', icon: '🌊', color: '#b45309', bg: '#fffbeb' },
  shelter: { label: 'Shelters', teLabel: 'విశ్రాంతి', hiLabel: 'विश्राम', icon: '🛏️', color: '#7c3aed', bg: '#faf5ff' },
  parking: { label: 'Parking', teLabel: 'పార్కింగ్', hiLabel: 'पार्किंग', icon: '🅿️', color: '#475569', bg: '#f8fafc' },
};

function hasValidCoordinates(lat, lng) {
  if (lat == null || lng == null || String(lat).trim() === '' || String(lng).trim() === '') return false;
  const latitude = Number(lat), longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function normalizeFacilities(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.facilities)) return response.facilities;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function createPushkaramPin(category, isSelected = false) {
  const meta = CATEGORY_META[category] || { icon: '📍', color: '#991b1b' };
  const size = isSelected ? 38 : 30;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isSelected ? '#991b1b' : meta.color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: transform 0.2s;
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
      ">
        ${meta.icon}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userBeaconIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;background:rgba(239,68,68,0.25);border-radius:50%;animation:pulse-ring 1.8s infinite;"></div>
      <div style="position:absolute;inset:4px;background:#dc2626;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && center.length === 2 && hasValidCoordinates(center[0], center[1])) {
      map.flyTo([Number(center[0]), Number(center[1])], zoom || 15, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const [facilities, setFacilities] = useState([]);
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  // Load facilities
  useEffect(() => {
    async function loadData() {
      let data = [];
      try {
        if (navigator.onLine) {
          try {
            const res = await facilitiesAPI.list({});
            data = normalizeFacilities(res);
            if (data.length > 0) await cacheAllFacilities(data);
          } catch {}
        }
        if (data.length === 0) {
          try {
            data = normalizeFacilities(await getCachedFacilities());
          } catch {}
        }
        if (data.length === 0) {
          data = normalizeFacilities(fallbackFacilities);
        }
      } catch {
        data = normalizeFacilities(fallbackFacilities);
      }
      setFacilities(data);

      const q = searchParams.get('q');
      if (q && data.length > 0) {
        const found = data.find((f) => f.name?.toLowerCase().includes(q.toLowerCase()));
        if (found && hasValidCoordinates(found.lat, found.lng)) {
          setSelectedFacility(found);
          setMapCenter([found.lat, found.lng]);
        }
      }
    }
    loadData();
  }, [searchParams]);

  const locateUser = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(pt);
        setMapCenter(pt);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const filteredFacilities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return facilities.filter((f) => {
      const matchCat = activeCategory === 'all' || f.category === activeCategory;
      const matchSearch =
        !query ||
        f.name?.toLowerCase().includes(query) ||
        f.name_te?.toLowerCase().includes(query) ||
        f.address?.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [facilities, activeCategory, searchQuery]);

  const mappableFacilities = useMemo(
    () => filteredFacilities.filter((f) => hasValidCoordinates(f.lat, f.lng)),
    [filteredFacilities]
  );

  const categories = [
    { id: 'all', label: isTe ? 'అన్నీ' : isHi ? 'सभी' : 'All' },
    { id: 'toilet', label: isTe ? 'మరుగుదొడ్లు' : isHi ? 'शौचालय' : 'Toilets' },
    { id: 'water', label: isTe ? 'త్రాగునీరు' : isHi ? 'पेयजल' : 'Water' },
    { id: 'medical', label: isTe ? 'వైద్యం' : isHi ? 'चिकित्सा' : 'Medical' },
    { id: 'ghat', label: isTe ? 'ఘాట్లు' : isHi ? 'घाट' : 'Ghats' },
    { id: 'shelter', label: isTe ? 'విశ్రాంతి' : isHi ? 'विश्राम' : 'Shelters' },
  ];

  const getDisplayName = (f) => {
    if (!f) return '';
    if (isTe && f.name_te) return f.name_te;
    if (isHi && f.name_hi) return f.name_hi;
    return f.name;
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-[#e5f2fb]">
      {/* ── Top Header Bar (Screen 3) ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs px-3 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-stone-700 flex items-center justify-center transition active:scale-95"
            aria-label="Back to Home"
          >
            <ArrowLeft size={17} />
          </button>
          <h1 className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
            {isTe ? 'సౌకర్యాల మ్యాప్' : isHi ? 'सुविधा नक्शा' : 'Facilities Map'}
          </h1>
        </div>

        {/* Search Input in Header */}
        <div className="flex-1 max-w-xs relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTe ? 'మ్యాప్‌లో వెతకండి...' : isHi ? 'नक्शे पर खोजें...' : 'Search on map...'}
            className="w-full pl-8 pr-7 py-1.5 bg-[#fefaf3] rounded-xl border border-amber-200/80 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#991b1b]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-stone-400 hover:text-stone-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Horizontal Category Filter Pills (Screen 3) ── */}
      <div className="absolute top-14 left-0 right-0 z-10 px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
        {categories.map((c) => {
          const isAct = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-xs transition flex items-center gap-1.5 ${
                isAct
                  ? 'bg-[#991b1b] text-white shadow-md scale-102'
                  : 'bg-white/95 text-stone-700 hover:bg-white border border-amber-200/80'
              }`}
            >
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Floating Locate Me Button ── */}
      <div className="absolute top-28 right-3 sm:right-4 z-10">
        <button
          onClick={locateUser}
          disabled={locating}
          title={isTe ? 'ప్రస్తుత స్థానం' : isHi ? 'वर्तमान स्थिति' : 'Current location'}
          className="w-10 h-10 bg-white hover:bg-slate-50 text-[#991b1b] rounded-2xl shadow-lg border border-amber-100 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
        >
          <Crosshair size={18} className={locating ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Leaflet Interactive Map ── */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController center={mapCenter} zoom={15} />

          {userLocation && (
            <Marker position={userLocation} icon={userBeaconIcon}>
              <Popup>
                <strong>{isTe ? 'మీరు ఇక్కడ ఉన్నారు' : isHi ? 'आप यहाँ हैं' : 'You are here'}</strong>
              </Popup>
            </Marker>
          )}

          {mappableFacilities.map((facility) => {
            const isSelected = selectedFacility?.id === facility.id;
            return (
              <Marker
                key={facility.id}
                position={[facility.lat, facility.lng]}
                icon={createPushkaramPin(facility.category, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedFacility(facility);
                    setMapCenter([facility.lat, facility.lng]);
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* ── Bottom Floating Facility Preview Card (Screen 3) ── */}
      {selectedFacility && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-20 bg-white rounded-3xl shadow-2xl border border-amber-200/80 p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-xs border border-black/5"
              style={{
                backgroundColor:
                  CATEGORY_META[selectedFacility.category]?.bg || '#fef2f2',
              }}
            >
              {CATEGORY_META[selectedFacility.category]?.icon || '📍'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm text-stone-900 leading-snug truncate">
                  {getDisplayName(selectedFacility)}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {isTe ? 'అందుబాటులో ఉంది' : isHi ? 'उपलब्ध' : 'Available'}
                </span>
              </div>

              {selectedFacility.address && (
                <p className="text-[11px] text-stone-500 mt-0.5 truncate flex items-center gap-1">
                  <MapPin size={11} className="text-stone-400 flex-shrink-0" />
                  <span>{selectedFacility.address}</span>
                </p>
              )}

              <p className="text-[11px] font-semibold text-stone-600 mt-1 flex items-center gap-2">
                <span>🚶 ~350 m</span>
                <span>•</span>
                <span>{isTe ? '3 నిమిషాల నడక' : isHi ? '3 मिनट पैदल' : '3 min walk'}</span>
              </p>
            </div>

            <button
              onClick={() => setSelectedFacility(null)}
              className="text-stone-400 hover:text-stone-600 p-1"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-stone-100">
            <button
              onClick={() =>
                navigate(
                  `/navigate/${selectedFacility.qr_token || selectedFacility.id}`
                )
              }
              className="py-2.5 px-3 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Navigation size={13} />
              <span>{isTe ? 'నావిగేట్' : isHi ? 'नेविगेट' : 'Navigate'}</span>
            </button>

            <button
              onClick={() =>
                navigate(
                  `/facility/${selectedFacility.qr_token || selectedFacility.id}`
                )
              }
              className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-amber-200/90 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Info size={13} className="text-[#991b1b]" />
              <span>{isTe ? 'వివరాలు చూడండి' : isHi ? 'विवरण देखें' : 'View Details'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
