import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bed,
  MapPin,
  Clock,
  Phone,
  Navigation,
  ArrowLeft,
  Search,
  Star,
  Sparkles,
  Map as MapIcon,
  List,
  Info,
  DollarSign,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import rajahmundryAccommodations from '../data/rajahmundryAccommodations.json';
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

const hotelMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#7c3aed;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2.5px solid #ffffff;font-size:15px;">🛏️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function AccommodationsPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const baseAccommodations = useMemo(() => {
    const list = Array.isArray(rajahmundryAccommodations) && rajahmundryAccommodations.length > 0
      ? [...rajahmundryAccommodations]
      : [];
    const ids = new Set(list.map((a) => a.id));

    (fallbackFacilities || []).forEach((f) => {
      if (f.category === 'shelter' && !ids.has(f.id)) {
        list.push({
          id: f.id,
          qr_token: f.qr_token,
          name: f.name,
          name_te: f.name_te,
          name_hi: f.name_hi,
          category: 'shelter',
          property_type: 'pilgrim_choultry',
          rating: 4.6,
          reviews_count: 1400,
          price_level: 'Budget',
          price_range: '₹200 - ₹600 / day',
          lat: f.lat,
          lng: f.lng,
          address: f.address,
          capacity: f.capacity || 200,
          operating_hours: f.operating_hours || '24×7 Open',
          contact_number: f.contact_number || '',
          image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
          amenities: f.features || ['Clean Bathrooms', 'Safe Sleeping Halls'],
          description: f.description,
          features: f.features,
        });
      }
    });
    return list;
  }, []);

  const [places, setPlaces] = useState(baseAccommodations);
  const [viewMode, setViewMode] = useState('list');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'choultry' | 'budget' | 'luxury'
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

  const filteredPlaces = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return places
      .filter((p) => {
        const matchSearch =
          !term ||
          p.name?.toLowerCase().includes(term) ||
          p.name_te?.toLowerCase().includes(term) ||
          p.address?.toLowerCase().includes(term);

        if (!matchSearch) return false;

        if (typeFilter === 'choultry') {
          return (
            p.property_type === 'pilgrim_choultry' ||
            p.property_type === 'dharamshala' ||
            p.name?.includes('Choultry') ||
            p.name?.includes('Satram') ||
            p.name?.includes('TTD')
          );
        }
        if (typeFilter === 'budget') {
          return (
            p.price_level === 'Budget' ||
            p.price_level === 'Budget / Subsidized' ||
            p.price_level === 'Nominal / Free' ||
            p.price_level === '₹₹'
          );
        }
        if (typeFilter === 'luxury') {
          return p.price_level === '₹₹₹' || p.price_level === '₹₹₹₹' || p.property_type?.includes('hotel');
        }
        return true;
      })
      .sort((a, b) => {
        if (!userLoc) return 0;
        const distA = haversineDistKm(userLoc, [a.lat, a.lng]);
        const distB = haversineDistKm(userLoc, [b.lat, b.lng]);
        return distA - distB;
      });
  }, [places, searchTerm, typeFilter, userLoc]);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#581c87] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'వెనుకకు' : isHi ? 'पीछे' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-400 text-stone-900 font-black px-3 py-1 rounded-full shadow-xs">
              {filteredPlaces.length} {isTe ? 'వసతి గృహాలు' : isHi ? 'आवास' : 'Stays'}
            </span>
            <div className="flex bg-white/20 p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'list' ? 'bg-white text-purple-900 shadow-xs' : 'text-white'
                }`}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'map' ? 'bg-white text-purple-900 shadow-xs' : 'text-white'
                }`}
                title="Map View"
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Bed size={22} className="text-amber-300" />
            <span>
              {isTe
                ? 'రాజమహేంద్రవరం వసతి & యాత్రికుల సత్రాలు'
                : isHi
                ? 'राजमहेंद्रवरम के होटल एवं तीर्थयात्री सत्रम'
                : 'Accommodations & Pilgrim Choultries'}
            </span>
          </h1>
          <p className="text-xs text-purple-100 mt-1">
            {isTe
              ? 'టి.టి.డి కాంప్లెక్స్, రివర్ వ్యూ హోటళ్ళు, ధర్మశాలలు మరియు ప్రభుత్వ యాత్రి నివాస్'
              : 'Verified hotels, TTD complexes, dharamshalas & riverfront resorts across the city'}
          </p>

          {/* Search bar */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isTe
                  ? 'హోటల్ పేరు, TTD సత్రం, యాత్రి నివాస్, రివర్ బే వెతకండి...'
                  : 'Search by hotel name, TTD satram, yatri nivas, river bay...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl text-xs sm:text-sm font-medium shadow-inner border border-purple-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: isTe ? 'అన్నీ' : 'All Stays', icon: Sparkles },
          { id: 'choultry', label: isTe ? 'సత్రాలు & ధర్మశాలలు (Choultries)' : 'Choultries & Satrams', icon: CheckCircle2 },
          { id: 'budget', label: isTe ? 'బడ్జెట్ లాడ్జిలు (Budget)' : 'Budget Stays', icon: DollarSign },
          { id: 'luxury', label: isTe ? 'ప్రీమియం హోటళ్ళు (Hotels)' : 'Hotels & Resorts', icon: Building },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                active
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
              }`}
            >
              <Icon size={13} className={active ? 'text-amber-300' : 'text-stone-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-2">
        {viewMode === 'map' ? (
          <div className="rounded-3xl overflow-hidden border border-purple-200 dark:border-stone-800 shadow-md h-[70vh]">
            <MapContainer
              center={userLoc || CITY_CENTRE}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredPlaces.map((p) => (
                <Marker key={p.id} position={[p.lat, p.lng]} icon={hotelMarkerIcon}>
                  <Popup>
                    <div className="p-1 max-w-[220px]">
                      <h4 className="font-extrabold text-xs text-stone-900">{p.name}</h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">{p.address}</p>
                      <div className="text-[10px] font-bold text-purple-700 mt-1 flex items-center gap-1">
                        ⭐ {p.rating || 4.6} · {p.price_range || 'Budget'}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() =>
                            navigate(
                              `/navigate/${encodeURIComponent(p.qr_token || p.id)}?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`
                            )
                          }
                          className="flex-1 py-1 bg-purple-700 text-white rounded text-[10px] font-bold"
                        >
                          Navigate
                        </button>
                        <button
                          onClick={() => navigate(`/facility/${encodeURIComponent(p.qr_token || p.id)}`)}
                          className="flex-1 py-1 bg-stone-100 border text-stone-800 rounded text-[10px] font-bold"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlaces.map((item) => {
              const distKm = userLoc ? haversineDistKm(userLoc, [item.lat, item.lng]) : null;
              const distLabel = distKm != null ? (distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`) : null;

              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white dark:bg-stone-900 border border-purple-100 dark:border-stone-800 hover:border-purple-300 overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between"
                >
                  {/* Photo Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs bg-purple-700 text-white">
                        {item.property_type?.replace('_', ' ').toUpperCase() || 'PILGRIM STAY'}
                      </span>

                      {distLabel && (
                        <span className="text-[11px] font-extrabold bg-black/60 text-white px-2.5 py-1 rounded-full backdrop-blur-xs">
                          {distLabel}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-lg text-xs font-bold backdrop-blur-xs">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        <span>{item.rating || 4.7}</span>
                        <span className="text-stone-300 text-[10px]">({(item.reviews_count || 1200).toLocaleString()})</span>
                      </div>

                      <div className="text-xs font-extrabold text-amber-200 bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                        {item.price_range || 'Affordable Pilgrim Rates'}
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-white leading-snug">
                        {isTe && item.name_te ? item.name_te : item.name}
                      </h3>

                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>

                      {/* Amenities Pills */}
                      {Array.isArray(item.amenities) && item.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {item.amenities.slice(0, 3).map((am, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800"
                            >
                              {am}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="shrink-0 text-red-600" />
                          <span className="truncate">{item.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="shrink-0 text-emerald-600" />
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {item.operating_hours || '24×7 Check-in'}
                          </span>
                        </div>
                        {item.contact_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="shrink-0 text-stone-400" />
                            <a
                              href={`tel:${item.contact_number}`}
                              className="hover:underline text-stone-700 dark:text-stone-300"
                            >
                              {item.contact_number}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/navigate/${encodeURIComponent(item.qr_token || item.id)}?lat=${item.lat}&lng=${item.lng}&name=${encodeURIComponent(item.name)}`
                          )
                        }
                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                      >
                        <Navigation size={14} />
                        <span>{isTe ? 'రూట్ & నావిగేట్' : isHi ? 'मार्ग व नेविगेट' : 'Navigate'}</span>
                      </button>

                      <button
                        onClick={() => navigate(`/facility/${encodeURIComponent(item.qr_token || item.id)}`)}
                        className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-98 transition"
                      >
                        <Info size={14} className="text-purple-700" />
                        <span>{isTe ? 'వివరాలు' : isHi ? 'विवरण' : 'Details'}</span>
                      </button>
                    </div>
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
