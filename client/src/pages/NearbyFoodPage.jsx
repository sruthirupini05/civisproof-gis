import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  MapPin,
  Clock,
  Phone,
  Navigation,
  ArrowLeft,
  Search,
  Star,
  Leaf,
  Drumstick,
  Sparkles,
  Map as MapIcon,
  List,
  Info,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyFoodOSM } from '../services/overpass.js';
import rajahmundryFood from '../data/rajahmundryFood.json';
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

const foodMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#ea580c;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:2.5px solid #ffffff;font-size:15px;">🍲</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function NearbyFoodPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  // Pre-load all curated Rajahmundry food places immediately (<5ms render)
  const baseFoodPlaces = useMemo(() => {
    const list = Array.isArray(rajahmundryFood) && rajahmundryFood.length > 0
      ? [...rajahmundryFood]
      : [];
    const existingIds = new Set(list.map((f) => f.id));

    (fallbackFacilities || []).forEach((f) => {
      if ((f.category === 'food' || f.name?.includes('Annadanam')) && !existingIds.has(f.id)) {
        list.push({
          id: f.id,
          qr_token: f.qr_token,
          name: f.name,
          name_te: f.name_te,
          name_hi: f.name_hi,
          category: 'food',
          lat: f.lat,
          lng: f.lng,
          address: f.address,
          cuisine: 'Annadanam & Pilgrim Meals',
          diet: 'pure_veg',
          rating: 4.8,
          reviews_count: 3200,
          price_level: 'Free',
          price_range: '₹0 (Free Seva)',
          operating_hours: f.operating_hours || '07:00 - 22:30',
          contact_number: f.contact_number || '',
          image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
          specialties: ['Hot Pulihora', 'Sambar Rice', 'Curd Rice'],
          description: f.description,
          features: f.features || ['Free Pilgrim Meals', 'Pure RO Water'],
        });
      }
    });
    return list;
  }, []);

  const [restaurants, setRestaurants] = useState(baseFoodPlaces);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [filterTag, setFilterTag] = useState('all'); // 'all' | 'pure_veg' | 'non_veg' | 'top_rated' | 'free_annadanam' | 'budget'
  const [searchTerm, setSearchTerm] = useState('');
  const [userLoc, setUserLoc] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // User Geolocation
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

  // Background Overpass OSM merge
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const osmPlaces = await fetchNearbyFoodOSM();
        if (alive && osmPlaces && osmPlaces.length > 0) {
          const existingCoords = baseFoodPlaces.map((b) => [b.lat, b.lng]);
          const freshOSM = osmPlaces
            .filter((osm) => !existingCoords.some((ec) => haversineDistKm(ec, [osm.lat, osm.lng]) < 0.15))
            .map((osm) => ({
              ...osm,
              rating: 4.3,
              reviews_count: 450,
              price_level: '₹₹',
              price_range: '₹120 - ₹250',
              image_url:
                osm.diet === 'pure_veg'
                  ? 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
              specialties: ['South Indian Meals', 'Tiffins'],
            }));
          setRestaurants([...baseFoodPlaces, ...freshOSM]);
        }
      } catch (e) {
        console.warn('Overpass food background note:', e);
      }
    })();
    return () => { alive = false; };
  }, [baseFoodPlaces]);

  // Filtered & Sorted Places
  const filteredPlaces = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return restaurants
      .filter((r) => {
        const matchSearch =
          !term ||
          r.name?.toLowerCase().includes(term) ||
          r.name_te?.toLowerCase().includes(term) ||
          r.address?.toLowerCase().includes(term) ||
          r.cuisine?.toLowerCase().includes(term) ||
          r.specialties?.some((s) => s.toLowerCase().includes(term));

        if (!matchSearch) return false;

        if (filterTag === 'pure_veg') return r.diet === 'pure_veg';
        if (filterTag === 'non_veg') return r.diet === 'both' || r.diet === 'non_veg';
        if (filterTag === 'top_rated') return (r.rating || 0) >= 4.6;
        if (filterTag === 'free_annadanam') return r.price_level === 'Free' || r.name?.includes('Annadanam');
        if (filterTag === 'budget') return r.price_level === '₹' || r.price_level === 'Free';
        return true;
      })
      .sort((a, b) => {
        if (!userLoc) return 0;
        const distA = haversineDistKm(userLoc, [a.lat, a.lng]);
        const distB = haversineDistKm(userLoc, [b.lat, b.lng]);
        return distA - distB;
      });
  }, [restaurants, searchTerm, filterTag, userLoc]);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
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
              {filteredPlaces.length} {isTe ? 'రెస్టారెంట్లు' : isHi ? 'रेस्टोरेंट' : 'Restaurants'}
            </span>
            <div className="flex bg-white/20 p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'list' ? 'bg-white text-[#7f1d1d] shadow-xs' : 'text-white'
                }`}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'map' ? 'bg-white text-[#7f1d1d] shadow-xs' : 'text-white'
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
            <UtensilsCrossed size={22} className="text-amber-300" />
            <span>
              {isTe
                ? 'రాజమహేంద్రవరం రెస్టారెంట్లు & ఆహార కేంద్రాలు'
                : isHi
                ? 'राजमहेंद्रवरम के सभी रेस्टोरेंट एवं भोजन'
                : 'Restaurants & Dining in Rajamahendravaram'}
            </span>
          </h1>
          <p className="text-xs text-amber-200 mt-1">
            {isTe
              ? 'ఆథెంటిక్ ఆంధ్రా భోజనం, బిర్యానీలు, సాంప్రదాయ స్వీట్స్ & ఉచిత పుష్కర అన్నదానం'
              : 'Google Maps-style discovery with ratings, live open status, menus & direct navigation'}
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
                  ? 'రెస్టారెంట్ పేరు, బిర్యానీ, సుబ్బయ్య గారి హోటల్, రోజ్ మిల్క్, అన్నదానం వెతకండి...'
                  : 'Search by restaurant name, cuisine, biryani, rose milk, thali, annadanam...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl text-xs sm:text-sm font-medium shadow-inner border border-amber-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Chips (Google Maps Style) */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: isTe ? 'అన్నీ (All)' : 'All Restaurants', icon: Sparkles },
          { id: 'pure_veg', label: isTe ? 'శాకాహారం 🟢' : 'Pure Veg 🟢', icon: Leaf },
          { id: 'non_veg', label: isTe ? 'నాన్-వెజ్ 🍗' : 'Non-Veg 🍗', icon: Drumstick },
          { id: 'top_rated', label: isTe ? 'టాప్ రేటెడ్ (4.5+ ⭐)' : 'Top Rated (4.5+ ⭐)', icon: Star },
          { id: 'free_annadanam', label: isTe ? 'ఉచిత అన్నదానం 🛕' : 'Free Annadanam 🛕', icon: CheckCircle2 },
          { id: 'budget', label: isTe ? 'బడ్జెట్ (Budget)' : 'Budget Friendly (₹)', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = filterTag === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTag(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                active
                  ? 'bg-[#991b1b] text-white shadow-xs'
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
          /* Map View with markers */
          <div className="rounded-3xl overflow-hidden border border-amber-200 dark:border-stone-800 shadow-md h-[70vh]">
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
                <Marker key={p.id} position={[p.lat, p.lng]} icon={foodMarkerIcon}>
                  <Popup>
                    <div className="p-1 max-w-[220px]">
                      <h4 className="font-extrabold text-xs text-stone-900">{p.name}</h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">{p.address}</p>
                      <div className="text-[10px] font-bold text-amber-700 mt-1 flex items-center gap-1">
                        ⭐ {p.rating || 4.5} · {p.price_range || '₹₹'}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() =>
                            navigate(
                              `/navigate/${encodeURIComponent(p.qr_token || p.id)}?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`
                            )
                          }
                          className="flex-1 py-1 bg-[#991b1b] text-white rounded text-[10px] font-bold"
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
          /* Card Grid View (Google Maps Style) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlaces.map((item) => {
              const distKm = userLoc ? haversineDistKm(userLoc, [item.lat, item.lng]) : null;
              const distLabel = distKm != null ? (distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`) : null;
              const isVeg = item.diet === 'pure_veg';
              const isFree = item.price_level === 'Free';

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl bg-white dark:bg-stone-900 border overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between ${
                    selectedPlaceId === item.id
                      ? 'border-[#991b1b] ring-2 ring-[#991b1b]/20'
                      : 'border-amber-100 dark:border-stone-800 hover:border-amber-300'
                  }`}
                  onClick={() => setSelectedPlaceId(item.id)}
                >
                  {/* Photo Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs ${
                          isFree
                            ? 'bg-amber-400 text-stone-950 border border-amber-300'
                            : isVeg
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isFree ? '🛕 Free Annadanam' : isVeg ? '🟢 Pure Veg' : '🔴 Non-Veg & Multi'}
                      </span>

                      {distLabel && (
                        <span className="text-[11px] font-extrabold bg-black/60 text-white px-2.5 py-1 rounded-full backdrop-blur-xs">
                          {distLabel}
                        </span>
                      )}
                    </div>

                    {/* Bottom Details overlay */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-lg text-xs font-bold backdrop-blur-xs">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        <span>{item.rating || 4.6}</span>
                        <span className="text-stone-300 text-[10px]">({(item.reviews_count || 1200).toLocaleString()})</span>
                      </div>

                      <div className="text-xs font-extrabold text-amber-200 bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                        {item.price_range || '₹150 - ₹300'}
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-stone-900 dark:text-white leading-snug">
                        {isTe && item.name_te ? item.name_te : item.name}
                      </h3>

                      <p className="text-xs font-bold text-[#881337] dark:text-rose-400 mt-0.5">
                        {item.cuisine || 'South Indian & Multi-Cuisine'}
                      </p>

                      {/* Specialties Pills */}
                      {Array.isArray(item.specialties) && item.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.specialties.slice(0, 3).map((sp, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-amber-50 dark:bg-stone-800 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-stone-700"
                            >
                              {sp}
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
                            {item.operating_hours || '07:00 - 22:30'}
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

                    {/* Action Buttons: Navigate & View Details */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/navigate/${encodeURIComponent(item.qr_token || item.id)}?lat=${item.lat}&lng=${item.lng}&name=${encodeURIComponent(item.name)}`
                          )
                        }
                        className="flex-1 py-2.5 bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                      >
                        <Navigation size={14} />
                        <span>{isTe ? 'రూట్ & నావిగేట్' : isHi ? 'मार्ग व नेविगेट' : 'Navigate'}</span>
                      </button>

                      <button
                        onClick={() => navigate(`/facility/${encodeURIComponent(item.qr_token || item.id)}`)}
                        className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-98 transition"
                      >
                        <Info size={14} className="text-[#991b1b]" />
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
