
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
} from 'lucide-react';
import { facilitiesAPI } from '../services/api.js';
import { cacheAllFacilities, getCachedFacilities } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import StatusBadge from '../components/UI/StatusBadge.jsx';
import SafetyDisclaimer from '../components/UI/SafetyDisclaimer.jsx';
import { useLanguageStore } from '../store/useStore.js';

const CATEGORY_COLORS = {
  ghat: '#2563eb',
  toilet: '#9333ea',
  water: '#0891b2',
  medical: '#e11d48',
  shelter: '#d97706',
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

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      center.every(Number.isFinite)
    ) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

function normalizeFacilities(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.facilities)) {
    return response.facilities;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.facilities)) {
    return response.data.facilities;
  }

  return [];
}

function isValidFacility(facility) {
  return (
    facility &&
    typeof facility === 'object' &&
    typeof facility.name === 'string' &&
    Number.isFinite(Number(facility.lat)) &&
    Number.isFinite(Number(facility.lng))
  );
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
  const [mapCenter, setMapCenter] = useState([16.9995, 81.7785]);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        let data = [];

        if (navigator.onLine) {
          try {
            const response = await facilitiesAPI.list({});
            data = normalizeFacilities(response).filter(isValidFacility);

            if (data.length > 0) {
              await cacheAllFacilities(data);
            }
          } catch (netErr) {
            console.warn(
              'Network API fetch failed, falling back to cache:',
              netErr
            );
          }
        }

        if (data.length === 0) {
          try {
            const cached = await getCachedFacilities();
            data = normalizeFacilities(cached).filter(isValidFacility);
          } catch (cacheErr) {
            console.warn('Failed to load cached facilities:', cacheErr);
          }
        }

        if (data.length === 0) {
          data = normalizeFacilities(fallbackFacilities).filter(
            isValidFacility
          );

          try {
            await cacheAllFacilities(data);
          } catch (cacheErr) {
            console.warn('Failed to cache fallback facilities:', cacheErr);
          }
        }

        if (cancelled) return;

        setFacilities(data);

        const focusId = searchParams.get('focus');
        const lat = parseFloat(searchParams.get('lat'));
        const lng = parseFloat(searchParams.get('lng'));

        if (focusId && Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapCenter([lat, lng]);

          const found = data.find(
            (facility) =>
              String(facility.id) === focusId ||
              String(facility.qr_token) === focusId
          );

          if (found) {
            setSelectedFacility(found);
          }
        }
      } catch (error) {
        console.warn('Failed to load facilities:', error);

        try {
          const cached = normalizeFacilities(
            await getCachedFacilities()
          ).filter(isValidFacility);

          if (!cancelled) {
            const fallback = normalizeFacilities(fallbackFacilities).filter(
              isValidFacility
            );

            setFacilities(cached.length > 0 ? cached : fallback);
          }
        } catch (fallbackError) {
          console.error('Unable to load facility data:', fallbackError);

          if (!cancelled) {
            setFacilities(
              normalizeFacilities(fallbackFacilities).filter(
                isValidFacility
              )
            );
          }
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
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
      (position) => {
        const coords = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setUserLocation(coords);
        setMapCenter(coords);
        setLocating(false);
      },
      () => {
        setLocationError(t('map.locationDenied'));
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  const filteredFacilities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return facilities.filter((facility) => {
      const matchCategory =
        activeCategory === 'all' ||
        facility.category === activeCategory;

      const name = facility.name || '';
      const nameTe = facility.name_te || '';
      const address = facility.address || '';

      const matchSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        nameTe.includes(query) ||
        address.toLowerCase().includes(query);

      return matchCategory && matchSearch;
    });
  }, [facilities, activeCategory, searchQuery]);

  function getFacilityDisplayName(facility) {
    const lang = (
      currentLang ||
      i18n.language ||
      'te'
    ).slice(0, 2);

    if (lang === 'te' && facility.name_te) {
      return facility.name_te;
    }

    if (lang === 'hi' && facility.name_hi) {
      return facility.name_hi;
    }

    return facility.name || 'Unnamed facility';
  }

  const categories = [
    { id: 'all', label: 'categories.all' },
    { id: 'ghat', label: 'categories.ghat' },
    { id: 'toilet', label: 'categories.toilet' },
    { id: 'water', label: 'categories.water' },
    { id: 'medical', label: 'categories.medical' },
    { id: 'shelter', label: 'categories.shelter' },
  ];

  const categoryCounts = useMemo(() => {
    const counts = { all: facilities.length };

    for (const facility of facilities) {
      if (facility.category) {
        counts[facility.category] =
          (counts[facility.category] || 0) + 1;
      }
    }

    return counts;
  }, [facilities]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-10 flex flex-col gap-2 max-w-lg pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 px-3.5 py-2.5">
          <Search size={18} className="text-slate-400 shrink-0" />

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('map.searchPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-xs transition flex items-center gap-1.5 ${
                activeCategory === category.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white/95 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{t(category.label)}</span>

              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {categoryCounts[category.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-10 flex flex-col gap-2">
        <button
          onClick={locateUser}
          disabled={locating}
          title={t('map.yourLocation')}
          aria-label={t('map.yourLocation')}
          className="w-11 h-11 bg-white hover:bg-slate-50 text-[#1e3a5f] rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
        >
          <Crosshair
            size={20}
            className={locating ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {locationError && (
        <div className="absolute top-24 left-4 right-4 sm:left-6 sm:max-w-md z-10 bg-amber-500 text-white text-xs p-2.5 rounded-xl shadow-md flex items-center justify-between">
          <span>{locationError}</span>

          <button
            onClick={() => setLocationError(null)}
            className="ml-2 font-bold"
            aria-label="Dismiss location warning"
          >
            <X size={14} />
          </button>
        </div>
      )}

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

          {userLocation && (
            <Marker
              position={userLocation}
              icon={userLocationIcon}
            >
              <Popup>
                <div className="text-xs font-semibold">
                  {t('map.yourLocation')}
                </div>
              </Popup>
            </Marker>
          )}

          {filteredFacilities.map((facility) => {
            const lat = Number(facility.lat);
            const lng = Number(facility.lng);
            const isSelected =
              String(selectedFacility?.id) === String(facility.id);

            return (
              <Marker
                key={facility.id ?? `${lat}-${lng}-${facility.name}`}
                position={[lat, lng]}
                icon={createCategoryIcon(
                  facility.category,
                  isSelected
                )}
                eventHandlers={{
                  click: () => {
                    setSelectedFacility(facility);
                    setMapCenter([lat, lng]);
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

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
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedFacility.address}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedFacility(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              aria-label="Close facility details"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <StatusBadge status={selectedFacility.status} />

            <StatusBadge
              status={selectedFacility.operational_status}
            />

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
              onClick={() =>
                navigate(
                  `/facility/${
                    selectedFacility.qr_token ??
                    selectedFacility.id
                  }`
                )
              }
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Info size={14} />
              <span>Details &amp; QR</span>
            </button>

            <button
              onClick={() =>
                navigate(
                  `/navigate/${
                    selectedFacility.qr_token ??
                    selectedFacility.id
                  }`
                )
              }
              className="bg-[#1e3a5f] hover:bg-[#15294a] text-white rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Navigation size={14} />
              <span>{t('facility.navigate')}</span>
            </button>
          </div>
        </div>
      )}

      {!selectedFacility && (
        <div className="absolute bottom-2 left-3 z-10 hidden sm:block max-w-sm pointer-events-none">
          <SafetyDisclaimer compact />
        </div>
      )}
    </div>
  );
}
