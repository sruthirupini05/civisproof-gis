import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  Ticket,
  Sparkles,
  Compass,
  Heart,
  Share2,
  Calendar,
  Accessibility,
  CheckCircle2,
  ExternalLink,
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

const CATEGORY_NAMES = {
  spiritual: { en: 'Spiritual & Religious', te: 'ఆధ్యాత్మిక & పవిత్ర క్షేత్రాలు', hi: 'आध्यात्मिक एवं धार्मिक स्थल', icon: '🛕', color: '#b45309' },
  mythological_and_historical: { en: 'Mythological & Historical', te: 'పౌరాణిక & చారిత్రక ప్రదేశాలు', hi: 'पौराणिक एवं ऐतिहासिक स्थल', icon: '📜', color: '#881337' },
  famous_temples: { en: 'Famous Temples', te: 'ప్రసిద్ధ ఆలయాలు', hi: 'प्रसिद्ध मंदिर', icon: '🕉️', color: '#dc2626' },
  entertainment: { en: 'Entertainment & Recreation', te: 'వినోదం & ఉల్లాసం', hi: 'मनोरंजन एवं आमोद-प्रमोद', icon: '🎡', color: '#2563eb' },
  nature_and_scenic: { en: 'Nature & Scenic Places', te: 'ప్రకృతి దృశ్యాలు & నదీ తీరం', hi: 'प्राकृतिक एवं सुरम्य स्थल', icon: '🌿', color: '#16a34a' },
  shopping: { en: 'Shopping & Local Markets', te: 'షాపింగ్ & చేనేత బజార్లు', hi: 'खरीदारी एवं स्थानीय बाजार', icon: '🛍️', color: '#d97706' },
  tourist_attractions: { en: 'Tourist Attractions', te: 'పర్యాటక ఆకర్షణలు', hi: 'पर्यटक आकर्षण', icon: '🏛️', color: '#7c3aed' },
  food: { en: 'Food & Local Experiences', te: 'సాంప్రదాయ వంటకాలు & రుచులు', hi: 'स्थानीय खानपान एवं अनुभव', icon: '🍽️', color: '#ea580c' },
  nearby_day_trips: { en: 'Nearby Day Trips', te: 'సమీప పర్యాటక యాత్రలు', hi: 'समीपवर्ती दिन-यात्राएं', icon: '🚗', color: '#059669' },
};

const customPinIcon = (color = '#991b1b', icon = '📍') =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width: 38px; height: 38px;
        background: ${color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      ">${icon}</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

export default function DestinationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [saved, setSaved] = useState(false);
  const [userLoc, setUserLoc] = useState(null);

  // Attempt user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(null),
        { timeout: 8000 }
      );
    }
  }, []);

  const dest = useMemo(() => {
    return destinations.find((d) => d.id === id) || null;
  }, [id]);

  if (!dest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9] dark:bg-[#090d16]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-amber-200 dark:border-slate-800 text-center shadow-lg">
          <div className="text-4xl mb-3">📍</div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100 mb-2">
            {isTe ? 'ప్రదేశం కనుగొనబడలేదు' : isHi ? 'स्थान नहीं मिला' : 'Destination Not Found'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">
            {isTe ? 'అభ్యర్థించిన పర్యాటక ప్రదేశ వివరాలు అందుబాటులో లేవు.' : isHi ? 'अनुरोधित गंतव्य विवरण उपलब्ध नहीं है।' : 'The requested tourism destination is not available in the database.'}
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="w-full py-2.5 bg-[#991b1b] text-white font-bold text-xs rounded-xl"
          >
            {isTe ? 'అన్వేషణ పేజీకి వెళ్ళండి' : isHi ? 'अन्वेषण पर वापस जाएं' : 'Back to Explore Nearby'}
          </button>
        </div>
      </div>
    );
  }

  const catMeta = CATEGORY_NAMES[dest.category] || CATEGORY_NAMES.tourist_attractions;
  const distOrigin = userLoc || RAJAHMUNDRY_CENTRE;
  const distKm = haversineKm(distOrigin, [dest.lat, dest.lng]).toFixed(1);
  const estTimeMin = Math.round((distKm / 35) * 60);

  const related = destinations.filter((d) => d.id !== dest.id && (d.category === dest.category || d.is_in_city === dest.is_in_city)).slice(0, 3);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const name = isTe ? dest.name_te || dest.name : isHi ? dest.name_hi || dest.name : dest.name;
  const locality = isTe ? dest.locality_te || dest.locality : isHi ? dest.locality_hi || dest.locality : dest.locality;
  const desc = isTe ? dest.description_te || dest.description : isHi ? dest.description_hi || dest.description : dest.description;
  const famous = isTe ? dest.famous_for_te || dest.famous_for : isHi ? dest.famous_for_hi || dest.famous_for : dest.famous_for;
  const significance = isTe ? dest.significance_te || dest.significance : isHi ? dest.significance_hi || dest.significance : dest.significance;

  return (
    <div className="min-h-full pb-24 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/explore')}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-extrabold text-sm sm:text-base tracking-tight truncate max-w-[200px] sm:max-w-md">
          {name}
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSaved(!saved)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${
              saved ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : 'bg-slate-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300'
            }`}
            title="Save place"
          >
            <Heart size={18} className={saved ? 'fill-red-600' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* ── Destination Image Banner ── */}
        <div className="relative h-64 sm:h-80 rounded-3xl overflow-hidden shadow-lg border border-amber-100 dark:border-slate-800">
          <img
            src={dest.image_url}
            alt={dest.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/c/cc/River_Godavari_from_arch_bridge_at_Rajahmundry_01.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Category Pill */}
          <div className="absolute top-4 left-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-white shadow-md backdrop-blur-md"
              style={{ backgroundColor: `${catMeta.color}e6` }}
            >
              <span>{catMeta.icon}</span>
              <span>{isTe ? catMeta.te : isHi ? catMeta.hi : catMeta.en}</span>
            </span>
          </div>

          {/* Place Title on Image */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
              {name}
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 flex items-center gap-1.5 mt-1 drop-shadow-sm">
              <MapPin size={14} className="text-amber-400 flex-shrink-0" />
              <span>{locality}</span>
            </p>
            {dest.image_attribution && (
              <p className="text-[10px] text-stone-300/80 mt-1 truncate drop-shadow-xs">
                📸 {dest.image_attribution}
              </p>
            )}
          </div>
        </div>

        {/* ── Key Metrics (Distance, Travel Time, City Reference) ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Compass size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="font-extrabold text-sm">{distKm} km</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {userLoc ? (isTe ? 'మీ నుండి దూరం' : isHi ? 'आपकी दूरी' : 'From You') : (isTe ? 'నగరం నుండి' : isHi ? 'शहर से दूरी' : 'From City')}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Clock size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="font-extrabold text-sm">~{estTimeMin} min</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {isTe ? 'ప్రయాణ సమయం' : isHi ? 'यात्रा समय' : 'Est. Travel'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Ticket size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-extrabold text-sm truncate">{dest.entry_fee.includes('Free') ? (isTe ? 'ఉచితం' : isHi ? 'निःशुल्क' : 'Free') : dest.entry_fee.split(' ')[0]}</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {isTe ? 'ప్రవేశ రుసుము' : isHi ? 'प्रवेश शुल्क' : 'Entry'}
            </div>
          </div>
        </div>

        {/* ── Primary Action Bar (Navigate & View on Map) ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/navigate/${encodeURIComponent(dest.id)}`)}
            className="py-3 px-4 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
          >
            <Navigation size={16} />
            <span>{isTe ? 'నావిగేట్ చేయండి' : isHi ? 'नेविगेट करें' : 'Navigate Here'}</span>
          </button>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-amber-200 dark:border-slate-700 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs active:scale-98 transition"
          >
            <ExternalLink size={16} className="text-[#991b1b] dark:text-rose-400" />
            <span>{isTe ? 'గూగుల్ మ్యాప్స్' : isHi ? 'गूगल मैप्स' : 'Google Maps'}</span>
          </a>
        </div>

        {/* ── What it is Famous For ── */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-3xl p-5 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm">
            <Sparkles size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>{isTe ? 'ఈ ప్రదేశం దేనికి ప్రసిద్ధి?' : isHi ? 'यह स्थान किसलिए प्रसिद्ध है?' : 'What it is Famous For'}</span>
          </div>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
            {famous}
          </p>
        </div>

        {/* ── Comprehensive Description ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-2">
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
            {isTe ? 'పూర్తి వివరణ' : isHi ? 'विस्तृत विवरण' : 'About this Destination'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
            {desc}
          </p>
        </div>

        {/* ── Historical & Mythological Significance ── */}
        {significance && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
                {isTe ? 'చారిత్రక & పౌరాణిక విశేషాలు' : isHi ? 'ऐतिहासिक एवं पौराणिक संदर्भ' : 'Historical & Cultural Heritage'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
              {significance}
            </p>
          </div>
        )}

        {/* ── Visiting Details Card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
            {isTe ? 'సందర్శన వివరాలు & మార్గదర్శకాలు' : isHi ? 'यात्रा विवरण एवं दिशानिर्देश' : 'Visitor Guidelines & Timings'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <Clock size={16} className="text-[#991b1b] dark:text-rose-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-stone-500 dark:text-slate-400 uppercase text-[10px]">{isTe ? 'సమయాలు' : isHi ? 'समय' : 'Timings'}</div>
                <div className="font-extrabold text-stone-900 dark:text-slate-100 mt-0.5">{dest.opening_hours}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <Ticket size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-stone-500 dark:text-slate-400 uppercase text-[10px]">{isTe ? 'ప్రవేశ రుసుము' : isHi ? 'प्रवेश शुल्क' : 'Entry Fee'}</div>
                <div className="font-extrabold text-stone-900 dark:text-slate-100 mt-0.5">{dest.entry_fee}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <Calendar size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-stone-500 dark:text-slate-400 uppercase text-[10px]">{isTe ? 'ఉత్తమ సందర్శన సమయం' : isHi ? 'उत्तम समय' : 'Best Time'}</div>
                <div className="font-extrabold text-stone-900 dark:text-slate-100 mt-0.5">{dest.best_time_to_visit}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <Accessibility size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-stone-500 dark:text-slate-400 uppercase text-[10px]">{isTe ? 'దివ్యాంగుల సౌలభ్యం' : isHi ? 'सुलभता' : 'Accessibility'}</div>
                <div className="font-extrabold text-stone-900 dark:text-slate-100 mt-0.5">{dest.accessibility}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Interactive Map Location Preview ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <MapPin size={16} className="text-[#991b1b] dark:text-rose-400" />
              <span>{isTe ? 'మ్యాప్ స్థానం' : isHi ? 'नक्शा स्थान' : 'Map Location'}</span>
            </h3>
            <span className="text-xs text-stone-500 dark:text-slate-400 font-mono">
              {dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}
            </span>
          </div>

          <div className="h-56 rounded-2xl overflow-hidden border border-amber-100 dark:border-slate-800 shadow-inner">
            <MapContainer
              center={[dest.lat, dest.lng]}
              zoom={15}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer url={tileUrl} />
              <Marker
                position={[dest.lat, dest.lng]}
                icon={customPinIcon(catMeta.color, catMeta.icon)}
              >
                <Popup>
                  <div className="font-bold text-xs">{name}</div>
                  <div className="text-[11px] text-stone-500">{locality}</div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* ── Related Nearby Attractions ── */}
        {related.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
              {isTe ? 'సమీపంలోని ఇతర ఆకర్షణీయ ప్రదేశాలు' : isHi ? 'आस-पास के अन्य आकर्षण' : 'More Nearby Places to Explore'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/explore/${item.id}`}
                  className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-amber-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md transition"
                >
                  <div className="h-28 overflow-hidden relative">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {haversineKm(distOrigin, [item.lat, item.lng]).toFixed(1)} km
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-extrabold text-xs text-stone-900 dark:text-slate-100 truncate group-hover:text-[#991b1b] dark:group-hover:text-rose-400">
                      {isTe ? item.name_te || item.name : isHi ? item.name_hi || item.name : item.name}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate mt-0.5">
                      {isTe ? item.locality_te || item.locality : isHi ? item.locality_hi || item.locality : item.locality}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
