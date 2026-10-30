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
  Layers,
  Filter,
  CheckCircle,
  AlertTriangle,
  MapPin,
  X,
} from 'lucide-react';
import { facilitiesAPI } from '../services/api.js';
import { cacheAllFacilities, getCachedFacilities } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import StatusBadge from '../components/UI/StatusBadge.jsx';
import SafetyDisclaimer from '../components/UI/SafetyDisclaimer.jsx';
import { useMapStore, useLanguageStore } from '../store/useStore.js';

// Custom Map Marker Icons using Leaflet divIcon
const CATEGORY_COLORS = {
  ghat: '#2563eb', // Blue
  toilet: '#9333ea', // Purple
  water: '#0891b2', // Cyan
  medical: '#e11d48', // Red
  shelter: '#d97706', // Amber
};

function createCategoryIcon(category, isSelected = false) {
  const color = CATEGORY_COLORS[category] || '#475569';
  const size = isSelected ? 38 : 30;

  return L.divIcon({
    className: 'custom-facility-pin',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transition: transform 0.2s;
      ">
        <div style="
          transform: rotate(45deg);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const userLocationIcon = L.divIcon({
  className: 'user-location-pin',
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.3);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Map View Controller component
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLang } = useLanguageStore();

  const [facilities, setFacilities] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [mapCenter, setMapCenter] = useState([16.9995, 81.7785]); // Rajahmundry Ghat Area
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Load facilities from network or IndexedDB cache
  useEffect(() => {
    async function loadData() {
      try {
        let data = [];
        if (navigator.onLine) {
          try {
            data = await facilitiesAPI.list({});
            if (data && data.length > 0) {
              await cacheAllFacilities(data);
            }
          } catch (netErr) {
            console.warn('Network API fetch failed, falling back to cache:', netErr);
          }
        }
        if (!data || data.length === 0) {
          data = await getCachedFacilities();
        }
        if (!data || data.length === 0) {
          data = fallbackFacilities;
          await cacheAllFacilities(fallbackFacilities);
        }
        setFacilities(data);

        // Check if focused facility from URL params
        const focusId = searchParams.get('focus');
        const lat = parseFloat(searchParams.get('lat'));
        const lng = parseFloat(searchParams.get('lng'));

        if (focusId && !isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
          const found = data.find((f) => f.id === focusId);
          if (found) setSelectedFacility(found);
        }
      } catch (e) {
        console.warn('Failed to load facilities, loading from IndexedDB / Fallback:', e);
        const cached = await getCachedFacilities();
        setFacilities(cached && cached.length > 0 ? cached : fallbackFacilities);
      }
    }
    loadData();
  }, [searchParams]);

  function locateUser() {
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t('map.locationError'));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setLocating(false);
      },
      (err) => {
        setLocationError(t('map.locationDenied'));
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchCat = activeCategory === 'all' || f.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.name_te && f.name_te.includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [facilities, activeCategory, searchQuery]);

  function getFacilityDisplayName(f) {
    const lang = (currentLang || i18n.language || 'te').slice(0, 2);
    if (lang === 'te' && f.name_te) return f.name_te;
    if (lang === 'hi' && f.name_hi) return f.name_hi;
    return f.name;
  }

  const CATEGORIES = [
    { id: 'all', label: 'categories.all', count: facilities.length },
    { id: 'ghat', label: 'categories.ghat', count: facilities.filter((f) => f.category === 'ghat').length },
    { id: 'toilet', label: 'categories.toilet', count: facilities.filter((f) => f.category === 'toilet').length },
    { id: 'water', label: 'categories.water', count: facilities.filter((f) => f.category === 'water').length },
    { id: 'medical', label: 'categories.medical', count: facilities.filter((f) => f.category === 'medical').length },
    { id: 'shelter', label: 'categories.shelter', count: facilities.filter((f) => f.category === 'shelter').length },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Top Search & Filter Floating Bar */}
      <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-10 flex flex-col gap-2 max-w-lg pointer-events-auto">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 px-3.5 py-2.5">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('map.searchPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-xs transition flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{t(cat.label)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating GPS Location Button */}
      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-10 flex flex-col gap-2">
        <button
          onClick={locateUser}
          disabled={locating}
          title={t('map.yourLocation')}
          className="w-11 h-11 bg-white hover:bg-slate-50 text-[#1e3a5f] rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
        >
          <Crosshair size={20} className={locating ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Location warning banner if permission denied */}
      {locationError && (
        <div className="absolute top-24 left-4 right-4 sm:left-6 sm:max-w-md z-10 bg-amber-500 text-white text-xs p-2.5 rounded-xl shadow-md flex items-center justify-between">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="ml-2 font-bold">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Interactive Leaflet Map */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={mapCenter}
          zoom={14}
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController center={mapCenter} />

          {/* User GPS Pin */}
          {userLocation && (
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <div className="text-xs font-semibold">{t('map.yourLocation')}</div>
              </Popup>
            </Marker>
          )}

          {/* Facility Markers */}
          {filteredFacilities.map((f) => {
            const isSelected = selectedFacility?.id === f.id;
            return (
              <Marker
                key={f.id}
                position={[f.lat, f.lng]}
                icon={createCategoryIcon(f.category, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedFacility(f);
                    setMapCenter([f.lat, f.lng]);
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Selected Facility Detail Drawer */}
      {selectedFacility && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-6 sm:max-w-md sm:right-auto z-20 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t(`categories.${selectedFacility.category}`)}
              </span>
              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {getFacilityDisplayName(selectedFacility)}
              </h2>
              {selectedFacility.address && (
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedFacility.address}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedFacility(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <StatusBadge status={selectedFacility.status} />
            <StatusBadge status={selectedFacility.operational_status} />
            {selectedFacility.is_verified ? (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Verified
              </span>
            ) : (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Unverified
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => navigate(`/facility/${selectedFacility.qr_token}`)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Info size={14} />
              <span>Details & QR</span>
            </button>
            <button
              onClick={() => navigate(`/navigate/${selectedFacility.qr_token}`)}
              className="bg-[#1e3a5f] hover:bg-[#15294a] text-white rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Navigation size={14} />
              <span>{t('facility.navigate')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom compact notice on initial map */}
      {!selectedFacility && (
        <div className="absolute bottom-2 left-3 z-10 hidden sm:block max-w-sm pointer-events-none">
          <SafetyDisclaimer compact />
        </div>
      )}
    </div>
  );
}
