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
  Filter,
  Leaf,
  Drumstick,
  Coffee,
  Sparkles,
  Map as MapIcon,
  List,
  RefreshCw,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyFoodOSM } from '../services/overpass.js';
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
  html: `<div style="background:#ea580c;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;font-size:14px;">🍲</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function NearbyFoodPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [dietFilter, setDietFilter] = useState('all'); // 'all' | 'pure_veg' | 'non_veg' | 'cafe'
  const [searchTerm, setSearchTerm] = useState('');
  const [userLoc, setUserLoc] = useState(null);

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

  // Fetch real OSM food places with bundled fallback
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const osmPlaces = await fetchNearbyFoodOSM();
        if (alive && osmPlaces.length > 0) {
          setRestaurants(osmPlaces);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('OSM fetch fallback to bundled food facilities:', e);
      }

      // Fallback: Annadanam & food facilities from bundled JSON
      if (alive) {
        const bundledFood = fallbackFacilities
          .filter((f) => f.category === 'food' || f.name.includes('Annadanam') || f.name.includes('Prasadam'))
          .map((f) => ({
            id: f.id,
            osm_id: f.id,
            name: f.name,
            name_te: f.name_te,
            name_hi: f.name_hi,
            category: 'food',
            lat: f.lat,
            lng: f.lng,
            address: f.address,
            cuisine: 'Sacred Pushkaram Prasadam & Annadanam',
            diet: 'pure_veg',
            opening_hours: f.operating_hours || '06:00 - 22:00',
            phone: f.contact_number || '',
            data_source: 'official_gis',
            is_verified: 1,
            operational_status: 'operational',
          }));
        setRestaurants(bundledFood);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filteredPlaces = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return restaurants.filter((r) => {
      const matchSearch =
        !term ||
        r.name?.toLowerCase().includes(term) ||
        r.name_te?.toLowerCase().includes(term) ||
        r.address?.toLowerCase().includes(term) ||
        r.cuisine?.toLowerCase().includes(term);

      const matchDiet =
        dietFilter === 'all'
          ? true
          : dietFilter === 'cafe'
          ? r.cuisine?.toLowerCase().includes('cafe')
          : r.diet === dietFilter;

      return matchSearch && matchDiet;
    });
  }, [restaurants, searchTerm, dietFilter]);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#9a3412] via-[#ea580c] to-[#c2410c] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'వెనుకకు' : isHi ? 'पीछे' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-400 text-stone-900 font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {filteredPlaces.length} {isTe ? 'కేంద్రాలు' : 'Places'}
            </span>
            <div className="flex bg-white/20 p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'list' ? 'bg-white text-orange-900 shadow-xs' : 'text-white'
                }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'map' ? 'bg-white text-orange-900 shadow-xs' : 'text-white'
                }`}
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <UtensilsCrossed size={22} className="text-amber-300" />
            <span>
              {isTe
                ? 'రాజమండ్రి సమీప ఆహార & అన్నదాన కేంద్రాలు'
                : isHi
                ? 'राजमहेंद्रवरम निकटवर्ती भोजन एवं अन्नदान'
                : 'Nearby Food & Annadanam Centers'}
            </span>
          </h1>
          <p className="text-xs text-orange-100 mt-1">
            {isTe
              ? 'ఓపెన్‌స్ట్రీట్‌మ్యాప్ మరియు పుష్కర అన్నదాన సేవలు'
              : 'Real OpenStreetMap Restaurants & Sacred Pushkaram Annadanam'}
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
                  ? 'రెస్టారెంట్లు లేదా అన్నదానం వెతకండి...'
                  : 'Search restaurants, annadanam, food...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl text-xs sm:text-sm font-medium shadow-inner border border-orange-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: isTe ? 'అన్నీ' : 'All', icon: Sparkles },
          { id: 'pure_veg', label: isTe ? 'శాకాహారం (Pure Veg)' : 'Pure Veg', icon: Leaf },
          { id: 'non_veg', label: isTe ? 'మాంసాహారం (Non-Veg)' : 'Non-Veg', icon: Drumstick },
          { id: 'cafe', label: isTe ? 'కేఫ్‌లు & స్నాక్స్' : 'Cafes & Snacks', icon: Coffee },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = dietFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setDietFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                active
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="animate-spin text-orange-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-stone-500">
              {isTe ? 'లైవ్ ఓపెన్‌స్ట్రీట్‌మ్యాప్ డేటా లోడ్ అవుతోంది...' : 'Querying OpenStreetMap Food Registry...'}
            </p>
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div className="rounded-3xl overflow-hidden border border-orange-200 dark:border-stone-800 shadow-md h-[65vh]">
            <MapContainer
              center={userLoc || CITY_CENTRE}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url={
                  isDark
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
              />
              {filteredPlaces.map((p) => (
                <Marker key={p.id} position={[p.lat, p.lng]} icon={foodMarkerIcon}>
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      <h4 className="font-extrabold text-xs text-stone-900">{p.name}</h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">{p.address}</p>
                      <button
                        onClick={() =>
                          navigate(
                            `/navigate/${encodeURIComponent(p.id)}?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`
                          )
                        }
                        className="mt-2 w-full py-1 bg-orange-600 text-white rounded text-[11px] font-bold"
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
          /* Card Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredPlaces.map((item) => {
              const distKm = userLoc ? haversineDistKm(userLoc, [item.lat, item.lng]) : null;
              const isVeg = item.diet === 'pure_veg';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-amber-100 dark:border-stone-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isVeg
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300'
                            }`}
                          >
                            {isVeg ? '🌱 Pure Veg / Annadanam' : '🍗 Non-Veg / Multi'}
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
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                          {item.cuisine}
                        </p>
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
                      {item.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="shrink-0 text-stone-400" />
                          <a href={`tel:${item.phone}`} className="hover:underline text-stone-700 dark:text-stone-300">
                            {item.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigate Action Button */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/navigate/${encodeURIComponent(item.id)}?lat=${item.lat}&lng=${item.lng}&name=${encodeURIComponent(item.name)}`
                        )
                      }
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
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
