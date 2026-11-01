import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fuel,
  MapPin,
  Clock,
  Navigation,
  ArrowLeft,
  Search,
  Sparkles,
  Map as MapIcon,
  List,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPetrolStationsOSM } from '../services/overpass.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { useLanguageStore, useThemeStore } from '../store/useStore.js';

const CITY_CENTRE = [16.9948, 81.7798];

function haversineDistKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const fuelMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#0284c7;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;font-size:14px;">⛽</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function PetrolStationsPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [brandFilter, setBrandFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(CITY_CENTRE),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setUserLoc(CITY_CENTRE);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const osmStations = await fetchPetrolStationsOSM();
        if (alive && osmStations.length > 0) {
          setStations(osmStations);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('OSM fuel stations fallback to bundled data:', e);
      }

      if (alive) {
        const bundledFuel = fallbackFacilities
          .filter((f) => f.category === 'petrol' || f.category === 'ev_charging')
          .map((f) => ({
            id: f.id,
            osm_id: f.id,
            name: f.name,
            name_te: f.name_te,
            name_hi: f.name_hi,
            category: f.category,
            lat: f.lat,
            lng: f.lng,
            address: f.address,
            brand: f.name.includes('HP') ? 'HP' : f.name.includes('Indian Oil') ? 'Indian Oil' : 'Bharat Petroleum',
            opening_hours: f.operating_hours || '24x7 Open',
            data_source: 'official_gis',
            is_verified: 1,
            operational_status: 'operational',
          }));
        setStations(bundledFuel);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stations.filter((s) => {
      const matchSearch =
        !term ||
        s.name?.toLowerCase().includes(term) ||
        s.address?.toLowerCase().includes(term) ||
        s.brand?.toLowerCase().includes(term);

      const matchBrand =
        brandFilter === 'all'
          ? true
          : s.brand?.toLowerCase().includes(brandFilter.toLowerCase()) ||
            s.name?.toLowerCase().includes(brandFilter.toLowerCase());

      return matchSearch && matchBrand;
    });
  }, [stations, searchTerm, brandFilter]);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#075985] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'వెనుకకు' : isHi ? 'पीछे' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-sky-300 text-stone-900 font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {filteredStations.length} {isTe ? 'బంకులు' : 'Stations'}
            </span>
            <div className="flex bg-white/20 p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'list' ? 'bg-white text-sky-900 shadow-xs' : 'text-white'
                }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'map' ? 'bg-white text-sky-900 shadow-xs' : 'text-white'
                }`}
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Fuel size={22} className="text-sky-300" />
            <span>
              {isTe
                ? 'రాజమండ్రి పెట్రోల్ బంకులు & ఇంధన కేంద్రాలు'
                : isHi
                ? 'राजमहेंद्रवरम पेट्रोल पंप एवं ईंधन केंद्र'
                : 'All Petrol Pumps & Fuel Stations'}
            </span>
          </h1>
          <p className="text-xs text-sky-100 mt-1">
            {isTe
              ? 'ఇండియన్ ఆయిల్, హెచ్‌పీ, భారత్ పెట్రోలియం మరియు ఈవీ కేంద్రాలు'
              : 'IndianOil, HPCL, BPCL, Shell & EV Fast Chargers Registry'}
          </p>

          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isTe ? 'పెట్రోల్ బంక్ పేరు లేదా ప్రాంతం వెతకండి...' : 'Search fuel station or locality...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl text-xs sm:text-sm font-medium shadow-inner border border-sky-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: isTe ? 'అన్నీ' : 'All' },
          { id: 'Indian Oil', label: 'Indian Oil (IOCL)' },
          { id: 'HP', label: 'HP (HPCL)' },
          { id: 'Bharat', label: 'Bharat Petroleum (BPCL)' },
          { id: 'EV', label: isTe ? 'ఈవీ చార్జింగ్' : 'EV Charging' },
        ].map((tab) => {
          const active = brandFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setBrandFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                active
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="animate-spin text-sky-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-stone-500">
              {isTe ? 'ఇంధన కేంద్రాలు లోడ్ అవుతున్నాయి...' : 'Fetching Live OpenStreetMap Petrol Stations...'}
            </p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="rounded-3xl overflow-hidden border border-sky-200 dark:border-stone-800 shadow-md h-[65vh]">
            <MapContainer
              center={userLoc || CITY_CENTRE}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredStations.map((s) => (
                <Marker key={s.id} position={[s.lat, s.lng]} icon={fuelMarkerIcon}>
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      <h4 className="font-extrabold text-xs text-stone-900">{s.name}</h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">{s.address}</p>
                      <button
                        onClick={() =>
                          navigate(
                            `/navigate/${encodeURIComponent(s.id)}?lat=${s.lat}&lng=${s.lng}&name=${encodeURIComponent(s.name)}`
                          )
                        }
                        className="mt-2 w-full py-1 bg-sky-600 text-white rounded text-[11px] font-bold"
                      >
                        Navigate
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredStations.map((item) => {
              const distKm = userLoc ? haversineDistKm(userLoc, [item.lat, item.lng]) : null;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-sky-100 dark:border-stone-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200">
                            ⛽ {item.brand || 'Fuel Station'}
                          </span>
                          {distKm != null && (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                              {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-white mt-1.5 line-clamp-1">
                          {isTe && item.name_te ? item.name_te : item.name}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0 text-stone-400" />
                        <span className="truncate">{item.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="shrink-0 text-stone-400" />
                        <span>{item.opening_hours}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() =>
                        navigate(
                          `/navigate/${encodeURIComponent(item.id)}?lat=${item.lat}&lng=${item.lng}&name=${encodeURIComponent(item.name)}`
                        )
                      }
                      className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                    >
                      <Navigation size={14} />
                      <span>{isTe ? 'రూట్ & నావిగేట్' : isHi ? 'मार्ग व नेविगेट' : 'Navigate Here'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
