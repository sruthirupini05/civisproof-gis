import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  MapPin,
  Navigation,
  Compass,
  ArrowRight,
  Filter,
  X,
  SlidersHorizontal,
  LayoutGrid,
  Map as MapIcon,
  Sparkles,
  Clock,
  Heart,
  ChevronRight,
} from 'lucide-react';
import destinations from '../data/destinations.json';
import { useLanguageStore, useThemeStore } from '../store/useStore.js';

const RAJAHMUNDRY_CENTRE = [16.9948, 81.7798];

function haversineKm([la1, lo1], [la2, lo2]) {
  const R = 6371, r = Math.PI / 180;
  const dlat = (la2 - la1) * r, dlng = (lo2 - lo1) * r;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORIES = [
  { id: 'all', en: 'All Places', te: 'అన్ని ప్రదేశాలు', hi: 'सभी स्थल', icon: '✨' },
  { id: 'spiritual', en: 'Spiritual & Religious', te: 'ఆధ్యాత్మిక క్షేత్రాలు', hi: 'आध्यात्मिक स्थल', icon: '🛕' },
  { id: 'mythological_and_historical', en: 'Mythological & History', te: 'పౌరాణిక & చరిత్ర', hi: 'पौराणिक व ऐतिहासिक', icon: '📜' },
  { id: 'famous_temples', en: 'Famous Temples', te: 'ప్రసిద్ధ ఆలయాలు', hi: 'प्रसिद्ध मंदिर', icon: '🕉️' },
  { id: 'entertainment', en: 'Entertainment & Fun', te: 'వినోదం & సరదా', hi: 'मनोरंजन व पार्क', icon: '🎡' },
  { id: 'nature_and_scenic', en: 'Nature & Scenic', te: 'ప్రకృతి దృశ్యాలు', hi: 'प्राकृतिक स्थल', icon: '🌿' },
  { id: 'shopping', en: 'Shopping & Markets', te: 'చేనేత & షాపింగ్', hi: 'खरीदारी व बाजार', icon: '🛍️' },
  { id: 'tourist_attractions', en: 'Tourist Attractions', te: 'దర్శనీయ స్థలాలు', hi: 'पर्यटक आकर्षण', icon: '🏛️' },
  { id: 'food', en: 'Food Experiences', te: 'ప్రసిద్ధ రుచులు', hi: 'खानपान व स्वाद', icon: '🍽️' },
  { id: 'nearby_day_trips', en: 'Nearby Day Trips', te: 'డే ట్రిప్ యాత్రలు', hi: 'दिन-यात्राएं', icon: '🚗' },
];

const customPinIcon = (color = '#991b1b', icon = '📍', isSelected = false) => {
  const size = isSelected ? 38 : 30;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${isSelected ? '#991b1b' : color};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        font-size: ${isSelected ? '18px' : '14px'};
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s;
      ">${icon}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [selectedCats, setSelectedCats] = useState(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'az' | 'daytrips'
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterInCityOnly, setFilterInCityOnly] = useState(false);

  const [userLoc, setUserLoc] = useState(null);
  const [selectedDest, setSelectedDest] = useState(null);

  // Request user location for distance calculations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(null),
        { timeout: 8000 }
      );
    }
  }, []);

  const refPoint = userLoc || RAJAHMUNDRY_CENTRE;

  // Toggle category filters (supports multi-select or 'all')
  const handleCatToggle = (catId) => {
    if (catId === 'all') {
      setSelectedCats(['all']);
      return;
    }
    let updated = selectedCats.filter((c) => c !== 'all');
    if (updated.includes(catId)) {
      updated = updated.filter((c) => c !== catId);
    } else {
      updated.push(catId);
    }
    if (updated.length === 0) updated = ['all'];
    setSelectedCats(updated);
  };

  const clearAllFilters = () => {
    setSelectedCats(['all']);
    setSearchQuery('');
    setFilterFreeOnly(false);
    setFilterInCityOnly(false);
    setSortBy('nearest');
  };

  // Filtered & sorted destinations
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = destinations.filter((dest) => {
      // Category filter
      const matchesCategory =
        selectedCats.includes('all') ||
        selectedCats.some(
          (c) => dest.category === c || (dest.sub_categories && dest.sub_categories.includes(c))
        );

      // Search filter
      const matchesSearch =
        !q ||
        dest.name.toLowerCase().includes(q) ||
        (dest.name_te && dest.name_te.toLowerCase().includes(q)) ||
        (dest.name_hi && dest.name_hi.toLowerCase().includes(q)) ||
        dest.locality.toLowerCase().includes(q) ||
        (dest.famous_for && dest.famous_for.toLowerCase().includes(q)) ||
        (dest.tags && dest.tags.some((t) => t.toLowerCase().includes(q)));

      // Free Entry Filter
      const matchesFree = !filterFreeOnly || dest.entry_fee.toLowerCase().includes('free');

      // In-City Filter
      const matchesInCity = !filterInCityOnly || dest.is_in_city;

      return matchesCategory && matchesSearch && matchesFree && matchesInCity;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      const distA = haversineKm(refPoint, [a.lat, a.lng]);
      const distB = haversineKm(refPoint, [b.lat, b.lng]);

      if (sortBy === 'nearest') return distA - distB;
      if (sortBy === 'az') return a.name.localeCompare(b.name);
      if (sortBy === 'daytrips') return (b.is_in_city ? 0 : 1) - (a.is_in_city ? 0 : 1);
      return 0;
    });

    return list;
  }, [selectedCats, searchQuery, filterFreeOnly, filterInCityOnly, sortBy, refPoint]);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const hasActiveFilters =
    !selectedCats.includes('all') ||
    searchQuery.trim() !== '' ||
    filterFreeOnly ||
    filterInCityOnly;

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white pt-6 pb-8 px-4 shadow-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-300/30 rounded-full text-amber-300 text-xs font-bold mb-2">
            <Compass size={13} />
            <span>
              {isTe
                ? 'రాజమండ్రి & పరిసరాల పర్యాటక దర్శిని'
                : isHi
                ? 'राजमहेंद्रवरम पर्यटन एवं दर्शनीय स्थल'
                : 'Rajahmundry Tourism & Heritage Guide'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            {isTe
              ? 'సమీపంలోని పర్యాటక ప్రదేశాలు'
              : isHi
              ? 'आस-पास के दर्शनीय स्थल'
              : 'Explore Nearby Destinations'}
          </h1>
          <p className="text-amber-100/90 text-xs sm:text-sm max-w-2xl mx-auto">
            {isTe
              ? 'పురాతన దేవాలయాలు, పౌరాణిక క్షేత్రాలు, హేవ్‌లాక్ బ్రిడ్జి, గోదావరి సూర్యాస్తమయాలు మరియు ప్రసిద్ధ కోటగుమ్మం రోజ్ మిల్క్ రుచులను అన్వేషించండి.'
              : isHi
              ? 'प्राचीन मंदिर, पौराणिक धरोहर, हैवलॉक ब्रिज, गोदावरी नदी तट, और प्रसिद्ध खानपान का अनुभव करें।'
              : 'Discover historic temples, Godavari riverfront walks, Cotton Barrage, Kadiam nurseries, and legendary regional cuisine.'}
          </p>

          {/* Reference point badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-200 bg-black/25 px-3 py-1 rounded-full border border-amber-300/20">
            <MapPin size={11} className="text-amber-400" />
            <span>
              {userLoc
                ? (isTe ? 'దూరం మీ ప్రస్తుత స్థానం నుండి లెక్కించబడింది' : isHi ? 'दूरी आपके वर्तमान स्थान से आंकी गई है' : 'Distances calculated from your current location')
                : (isTe ? 'దూరం రాజమండ్రి నగర కేంద్రం నుండి లెక్కించబడింది (16.9948, 81.7798)' : isHi ? 'दूरी राजमहेंद्रवरम नगर केंद्र से आंकी गई है' : 'Distances from Rajahmundry city centre')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Container ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-3">
        {/* Search & View Switcher Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-lg shadow-amber-950/5 border border-amber-100 dark:border-slate-800 mb-4 transition-colors">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-stone-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isTe
                    ? 'ఆలయాలు, మ్యూజియంలు, నర్సరీలు, లేదా ప్రదేశం పేరుతో వెతకండి...'
                    : isHi
                    ? 'मंदिर, संग्रहालय, पार्क या स्थान खोजें...'
                    : 'Search places, temples, museums, foods (e.g. ISKCON, Rose Milk)...'
                }
                className="w-full pl-9 pr-8 py-2 bg-[#fefaf3] dark:bg-slate-800/80 rounded-xl border border-amber-200/80 dark:border-slate-700 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#991b1b]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Toggle (Grid vs Map) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-[#991b1b] dark:text-rose-400 shadow-2xs'
                    : 'text-stone-500 dark:text-slate-400'
                }`}
              >
                <LayoutGrid size={14} />
                <span>{isTe ? 'కార్డులు' : isHi ? 'कार्ड्स' : 'Cards'}</span>
              </button>

              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-700 text-[#991b1b] dark:text-rose-400 shadow-2xs'
                    : 'text-stone-500 dark:text-slate-400'
                }`}
              >
                <MapIcon size={14} />
                <span>{isTe ? 'మ్యాప్' : isHi ? 'नक्शा' : 'Map'}</span>
              </button>
            </div>
          </div>

          {/* Quick Filters & Sorting Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-stone-400 font-bold uppercase text-[10px] mr-1">
                {isTe ? 'వడపోత:' : isHi ? 'फिल्टर:' : 'Filter:'}
              </span>

              <button
                onClick={() => setFilterFreeOnly(!filterFreeOnly)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                  filterFreeOnly
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-200 dark:border-slate-700'
                }`}
              >
                ✓ {isTe ? 'ఉచిత ప్రవేశం' : isHi ? 'निःशुल्क प्रवेश' : 'Free Entry'}
              </button>

              <button
                onClick={() => setFilterInCityOnly(!filterInCityOnly)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                  filterInCityOnly
                    ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-200 dark:border-slate-700'
                }`}
              >
                🏙️ {isTe ? 'నగర పరిధిలో' : isHi ? 'शहर में' : 'Within City'}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-2 py-1 text-[11px] font-bold text-red-600 dark:text-rose-400 hover:underline flex items-center gap-1 ml-1"
                >
                  <X size={12} />
                  <span>{isTe ? 'ఫిల్టర్లు తొలగించు' : isHi ? 'फिल्टर हटाएं' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-stone-400 font-bold uppercase text-[10px]">
                {isTe ? 'క్రమం:' : isHi ? 'क्रम:' : 'Sort:'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#fefaf3] dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg py-1 px-2 text-[11px] font-bold text-stone-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="nearest">{isTe ? 'సమీపంలోనివి ముందు' : isHi ? 'निकटतम पहले' : 'Nearest First'}</option>
                <option value="az">{isTe ? 'అక్షర క్రమం (A-Z)' : isHi ? 'वर्णमाला क्रम' : 'Alphabetical (A-Z)'}</option>
                <option value="daytrips">{isTe ? 'డే ట్రిప్స్ మొదట' : isHi ? 'दिन-यात्राएं पहले' : 'Day Trips First'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isAct = selectedCats.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => handleCatToggle(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-xs transition flex items-center gap-1.5 active:scale-95 ${
                  isAct
                    ? 'bg-[#991b1b] text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-amber-200/80 dark:border-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{isTe ? cat.te : isHi ? cat.hi : cat.en}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 mb-3 px-1">
          <span>
            {isTe
              ? `${filteredDestinations.length} పర్యాటక ప్రదేశాలు కనుగొనబడ్డాయి`
              : isHi
              ? `${filteredDestinations.length} दर्शनीय स्थल मिले`
              : `Found ${filteredDestinations.length} tourist destinations`}
          </span>
          <span className="text-[11px] font-medium text-stone-400">
            {isTe ? 'రాజమండ్రి & పరిసరాలు' : isHi ? 'राजमहेंद्रवरम एवं आसपास' : 'Rajamahendravaram Region'}
          </span>
        </div>

        {/* ── View 1: Card Grid ── */}
        {viewMode === 'grid' && (
          <div>
            {filteredDestinations.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-amber-100 dark:border-slate-800 shadow-sm my-6">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-slate-100 mb-1">
                  {isTe ? 'ఎలాంటి ప్రదేశాలు కనుగొనబడలేదు' : isHi ? 'कोई स्थल नहीं मिला' : 'No destinations match your filters'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                  {isTe
                    ? 'దయచేసి మీ శోధన పదాన్ని మార్చండి లేదా ఫిల్టర్లను తొలగించి చూడండి.'
                    : isHi
                    ? 'कृपया अपने खोज शब्द को बदलें या फिल्टर हटाएं।'
                    : 'Try broadening your search term or clear active category filters.'}
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#991b1b] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isTe ? 'అన్ని ఫిల్టర్లు తొలగించు' : isHi ? 'सभी फिल्टर हटाएं' : 'Clear All Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDestinations.map((dest) => {
                  const distKm = haversineKm(refPoint, [dest.lat, dest.lng]).toFixed(1);
                  const name = isTe ? dest.name_te || dest.name : isHi ? dest.name_hi || dest.name : dest.name;
                  const locality = isTe ? dest.locality_te || dest.locality : isHi ? dest.locality_hi || dest.locality : dest.locality;
                  const famous = isTe ? dest.famous_for_te || dest.famous_for : isHi ? dest.famous_for_hi || dest.famous_for : dest.famous_for;

                  return (
                    <div
                      key={dest.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-amber-100 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col group"
                    >
                      {/* Image Banner */}
                      <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={dest.image_url}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cc/River_Godavari_from_arch_bridge_at_Rajahmundry_01.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Distance Badge */}
                        <div className="absolute bottom-2.5 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                          <Compass size={12} className="text-amber-400" />
                          <span>{distKm} km</span>
                        </div>

                        {/* Day Trip / In-City tag */}
                        <div className="absolute top-2.5 right-3">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider ${
                              dest.is_in_city
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-amber-500/90 text-white'
                            }`}
                          >
                            {dest.is_in_city ? (isTe ? 'నగరం' : 'City') : (isTe ? 'డే ట్రిప్' : 'Day Trip')}
                          </span>
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-slate-100 leading-snug group-hover:text-[#991b1b] dark:group-hover:text-rose-400 transition-colors">
                            {name}
                          </h3>

                          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin size={12} className="text-[#991b1b] flex-shrink-0" />
                            <span className="truncate">{locality}</span>
                          </p>

                          <div className="mt-2.5 bg-amber-50/70 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                            <div className="text-[10px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-tight flex items-center gap-1 mb-0.5">
                              <Sparkles size={11} className="text-amber-600" />
                              <span>{isTe ? 'దేనికి ప్రసిద్ధి:' : isHi ? 'किसलिए प्रसिद्ध:' : 'Famous for:'}</span>
                            </div>
                            <p className="text-[11px] text-stone-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {famous}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100 dark:border-slate-800">
                          <button
                            onClick={() => navigate(`/explore/${dest.id}`)}
                            className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-700 text-stone-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <span>{isTe ? 'వివరాలు' : isHi ? 'विवरण' : 'Details'}</span>
                            <ChevronRight size={13} />
                          </button>

                          <button
                            onClick={() => navigate(`/navigate/${encodeURIComponent(dest.id)}`)}
                            className="py-2 px-3 bg-[#991b1b] hover:bg-[#881337] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
                          >
                            <Navigation size={12} />
                            <span>{isTe ? 'నావిగేట్' : isHi ? 'नेविगेट' : 'Navigate'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── View 2: Interactive Tourism Map ── */}
        {viewMode === 'map' && (
          <div className="relative h-[65vh] rounded-3xl overflow-hidden border border-amber-200 dark:border-slate-800 shadow-xl">
            <MapContainer
              center={selectedDest ? [selectedDest.lat, selectedDest.lng] : RAJAHMUNDRY_CENTRE}
              zoom={12}
              className="w-full h-full"
            >
              <TileLayer url={tileUrl} />
              {selectedDest && <MapFlyTo center={[selectedDest.lat, selectedDest.lng]} />}

              {filteredDestinations.map((dest) => {
                const isSel = selectedDest?.id === dest.id;
                const iconChar =
                  dest.category === 'spiritual' || dest.category === 'famous_temples'
                    ? '🛕'
                    : dest.category === 'nature_and_scenic'
                    ? '🌿'
                    : dest.category === 'food'
                    ? '🍽️'
                    : dest.category === 'shopping'
                    ? '🛍️'
                    : '📍';

                return (
                  <Marker
                    key={dest.id}
                    position={[dest.lat, dest.lng]}
                    icon={customPinIcon('#991b1b', iconChar, isSel)}
                    eventHandlers={{
                      click: () => setSelectedDest(dest),
                    }}
                  />
                );
              })}
            </MapContainer>

            {/* Bottom Preview Callout if marker clicked */}
            {selectedDest && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[1000] bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-amber-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start gap-3">
                  <img
                    src={selectedDest.image_url}
                    alt={selectedDest.name}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 truncate">
                      {isTe ? selectedDest.name_te || selectedDest.name : isHi ? selectedDest.name_hi || selectedDest.name : selectedDest.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate mt-0.5">
                      {selectedDest.locality}
                    </p>
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1">
                      {haversineKm(refPoint, [selectedDest.lat, selectedDest.lng]).toFixed(1)} km away
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDest(null)}
                    className="text-stone-400 hover:text-stone-600 p-1"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-stone-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate(`/explore/${selectedDest.id}`)}
                    className="py-2 bg-slate-100 dark:bg-slate-800 text-stone-800 dark:text-slate-200 text-xs font-bold rounded-xl"
                  >
                    {isTe ? 'వివరాలు చూడండి' : isHi ? 'विवरण देखें' : 'View Details'}
                  </button>
                  <button
                    onClick={() => navigate(`/navigate/${encodeURIComponent(selectedDest.id)}`)}
                    className="py-2 bg-[#991b1b] text-white text-xs font-bold rounded-xl"
                  >
                    {isTe ? 'నావిగేట్' : isHi ? 'नेविगेट' : 'Navigate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
