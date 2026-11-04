import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  Clock,
  ArrowLeft,
  Heart,
  CheckCircle2,
  Accessibility,
  ArrowUpRight,
  Phone,
  QrCode,
  Share2,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI, qrAPI } from '../services/api.js';
import { getCachedFacility, cacheFacility } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import destinations from '../data/destinations.json';
import { getPublicAppUrl } from '../services/config.js';
import { useLanguageStore, useThemeStore, useAuthStore } from '../store/useStore.js';

const RAJAHMUNDRY_CENTRE = [16.9948, 81.7798];

function haversineKm([la1, lo1], [la2, lo2]) {
  const R = 6371, r = Math.PI / 180;
  const dlat = (la2 - la1) * r, dlng = (lo2 - lo1) * r;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSlug(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s_-]+/g, '');
}

const CATEGORY_DEFAULT_IMAGES = {
  toilet: '/public-washroom.jpg',
  ghat: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Godavari_River_at_Rajahmundry.jpg/800px-Godavari_River_at_Rajahmundry.jpg',
  water: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80',
  medical: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=800&auto=format&fit=crop&q=80',
  petrol: 'https://images.unsplash.com/photo-1527018607637-a24255af41ff?w=800&auto=format&fit=crop&q=80',
  ev_charging: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
  transport: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Rajahmundry_Railway_Station_Entrance.jpg/800px-Rajahmundry_Railway_Station_Entrance.jpg',
  shelter: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
  parking: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80',
  food: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80',
};

const CATEGORY_META = {
  ghat: { label: 'Godavari Bathing Ghat', teLabel: 'గోదావరి స్నాన ఘాట్', hiLabel: 'गोदावरी स्नान घाट', icon: '🌊', color: '#b45309' },
  water: { label: 'Drinking Water Station', teLabel: 'త్రాగునీటి కేంద్రం', hiLabel: 'पेयजल केंद्र', icon: '💧', color: '#0284c7' },
  medical: { label: 'Medical Camp & First-Aid', teLabel: 'వైద్య శిబిరం', hiLabel: 'चिकित्सा शिविर', icon: '🏥', color: '#dc2626' },
  toilet: { label: 'Public Washroom', teLabel: 'సార్వజనీన మరుగుదొడ్డి', hiLabel: 'सार्वजनिक शौचालय', icon: '🚻', color: '#991b1b' },
  petrol: { label: 'Petrol & Fuel Station', teLabel: 'పెట్రోల్ బంకు', hiLabel: 'पेट्रोल पंप', icon: '⛽', color: '#ea580c' },
  ev_charging: { label: 'EV Charging Station', teLabel: 'EV ఛార్జింగ్ కేంద్రం', hiLabel: 'ईवी चार्जिंग', icon: '⚡', color: '#16a34a' },
  transport: { label: 'Public Transport Hub', teLabel: 'రవాణా కేంద్రం', hiLabel: 'परिवहन केंद्र', icon: '🚆', color: '#2563eb' },
  shelter: { label: 'Pilgrim Shelter / Hotel', teLabel: 'యాత్రికుల విశ్రాంతి గదులు', hiLabel: 'विश्राम स्थल', icon: '🛏️', color: '#7c3aed' },
  parking: { label: 'Parking Zone', teLabel: 'పార్కింగ్ స్థలం', hiLabel: 'पार्किंग', icon: '🅿️', color: '#475569' },
  food: { label: 'Food & Annadanam', teLabel: 'అన్నదాన భవనం', hiLabel: 'अन्नदान व भोजन', icon: '🍽️', color: '#059669' },
};

function isValidFacility(f) {
  if (!f || typeof f !== 'object') return false;
  const lat = Number(f.lat ?? f.latitude);
  const lng = Number(f.lng ?? f.lon ?? f.longitude);
  return isFinite(lat) && isFinite(lng);
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

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(null),
        { timeout: 6000 }
      );
    }
  }, []);

  // Resolve Facility with normalized slug matching
  useEffect(() => {
    async function fetchFacility() {
      if (!token) {
        setError('No facility specified.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      let found = null;

      const decoded = decodeURIComponent(token).trim();
      const norm = normalizeSlug(decoded);

      // 1. Direct match in fallbackFacilities
      const direct = fallbackFacilities.find(
        (f) => (f.qr_token === decoded || f.id === decoded) && isValidFacility(f)
      );
      if (direct) found = direct;

      // 2. Direct match in destinations
      if (!found) {
        const dest = destinations.find(
          (d) => (d.id === decoded || normalizeSlug(d.id) === norm) && isValidFacility(d)
        );
        if (dest) {
          found = {
            ...dest,
            qr_token: dest.id,
            category: dest.category || 'tourist',
            status: 'verified',
            operational_status: 'operational',
            operating_hours: dest.opening_hours || '06:00 - 20:00',
            features: [
              dest.famous_for || 'Sacred Pilgrim Destination',
              'Accessibility: Wheelchair friendly paths',
              'Managed by AP Endowments & Tourism Department',
            ],
          };
        }
      }

      // 3. Normalized slug in fallbackFacilities
      if (!found) {
        const normFac = fallbackFacilities.find((f) => {
          if (!isValidFacility(f)) return false;
          return (
            normalizeSlug(f.id) === norm ||
            normalizeSlug(f.qr_token) === norm ||
            normalizeSlug(f.name) === norm ||
            normalizeSlug(f.name).includes(norm)
          );
        });
        if (normFac) found = normFac;
      }

      // 4. Check IndexedDB
      if (!found) {
        try {
          const cached = await getCachedFacility(token);
          if (isValidFacility(cached)) found = cached;
        } catch {}
      }

      // 5. Online API fetch
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

  const meta = CATEGORY_META[facility.category] || {
    label: 'Civic Facility',
    teLabel: 'పుష్కర సౌకర్యం',
    hiLabel: 'पुष्कर सुविधा',
    icon: '📍',
    color: '#991b1b',
  };

  const displayName = isTe ? facility.name_te || facility.name : isHi ? facility.name_hi || facility.name : facility.name;
  const displayAddress = isTe ? facility.address_te || facility.address : isHi ? facility.address_hi || facility.address : facility.address;

  const distOrigin = userLoc || RAJAHMUNDRY_CENTRE;
  const distValKm = haversineKm(distOrigin, [facility.lat, facility.lng]);
  const distLabel = distValKm < 1 ? `${Math.round(distValKm * 1000)} m` : `${distValKm.toFixed(1)} km`;

  const heroImage =
    facility.image_url ||
    CATEGORY_DEFAULT_IMAGES[facility.category] ||
    CATEGORY_DEFAULT_IMAGES.toilet;

  // Features Checklist matching Screenshot 10
  const facilitiesChecklist =
    Array.isArray(facility.features) && facility.features.length > 0
      ? facility.features
      : [
          'Men & Women Separate',
          'Wheelchair Accessible',
          'Regular Cleaning & Water Supply',
          'Official Pushkaram Certified Staff',
        ];

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 pb-28 transition-colors">
      {/* ── Top Header matching Screenshot 10 ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-black text-base sm:text-lg text-stone-900 dark:text-white tracking-tight">
          Facility Details
        </h1>

        <button
          onClick={() => setIsSaved(!isSaved)}
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center active:scale-95 transition"
          aria-label="Save"
        >
          <Heart size={18} className={isSaved ? 'text-red-600 fill-red-600' : ''} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-3 space-y-4">
        {/* ── Facility Photo Banner (Screenshot 10) ── */}
        <div className="relative h-52 sm:h-56 w-full rounded-3xl overflow-hidden shadow-md border border-stone-200/80 dark:border-stone-800 bg-stone-100 dark:bg-stone-800">
          <img
            src={heroImage}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = CATEGORY_DEFAULT_IMAGES[facility.category] || '/public-washroom.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {/* QR code button top right */}
          <button
            onClick={() => setShowQrModal(true)}
            className="absolute top-3 right-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs p-2 rounded-xl text-stone-800 dark:text-stone-200 shadow-md active:scale-95 transition"
            title="View QR Code"
          >
            <QrCode size={16} />
          </button>
        </div>

        {/* ── Title & Status Card (Screenshot 10) ── */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center text-2xl shadow-md shrink-0">
            {meta.icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white leading-tight truncate">
              {displayName}
            </h2>
            <span className="inline-block mt-1 bg-[#22c55e] text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-xs">
              Available
            </span>
          </div>
        </div>

        {/* ── Location Pin (Screenshot 10) ── */}
        <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 text-sm font-semibold">
          <MapPin size={18} className="text-[#dc2626] shrink-0" />
          <span className="truncate">{displayAddress || 'Ghat Road, Rajahmundry (Near Main Ghat)'}</span>
        </div>

        {/* ── 3 Stat Cards Row (Screenshot 10) ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Distance */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 text-center shadow-xs">
            <div className="flex justify-center text-[#dc2626] mb-1">
              <ArrowUpRight size={22} />
            </div>
            <div className="font-black text-sm sm:text-base text-stone-900 dark:text-white">{distLabel}</div>
            <div className="text-[11px] text-stone-400 font-medium">Distance</div>
          </div>

          {/* Open Hours */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 text-center shadow-xs">
            <div className="flex justify-center text-[#dc2626] mb-1">
              <Clock size={22} />
            </div>
            <div className="font-black text-sm sm:text-base text-stone-900 dark:text-white truncate">
              {facility.operating_hours || '24 × 7'}
            </div>
            <div className="text-[11px] text-stone-400 font-medium">Open</div>
          </div>

          {/* Accessibility */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 text-center shadow-xs">
            <div className="flex justify-center text-[#dc2626] mb-1">
              <Accessibility size={22} />
            </div>
            <div className="font-black text-xs sm:text-sm text-stone-900 dark:text-white leading-tight">
              Accessible For All
            </div>
            <div className="text-[11px] text-stone-400 font-medium">Accessibility</div>
          </div>
        </div>

        {/* ── Facilities Checklist Card (Screenshot 10) ── */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-2.5">
          <h3 className="font-extrabold text-base text-stone-900 dark:text-white mb-2">
            Facilities
          </h3>
          {facilitiesChecklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-sm font-semibold text-stone-800 dark:text-stone-200">
              <CheckCircle2 size={18} className="text-[#22c55e] fill-emerald-100 dark:fill-emerald-950 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Contact info if available */}
        {facility.contact_number && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
              <Phone size={15} className="text-[#dc2626]" />
              <span>Helpline: {facility.contact_number}</span>
            </div>
            <a
              href={`tel:${facility.contact_number}`}
              className="text-xs font-bold text-[#991b1b] dark:text-rose-400 hover:underline"
            >
              Call Now
            </a>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Navigate Button (Screenshot 10) ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200/60 dark:border-stone-800 z-30">
        <div className="max-w-md mx-auto">
          <button
            onClick={() =>
              navigate(
                `/navigate/${encodeURIComponent(facility.qr_token || facility.id)}?lat=${facility.lat}&lng=${facility.lng}&name=${encodeURIComponent(displayName)}`
              )
            }
            className="w-full py-3.5 bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] hover:bg-[#881337] text-white font-black text-base rounded-full shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Navigation size={18} className="fill-white rotate-45" />
            <span>Navigate</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800">
            <h3 className="font-black text-sm text-stone-900 dark:text-white">
              Official Pushkaram Facility QR
            </h3>
            <div className="p-3 bg-white rounded-2xl inline-block shadow-inner border border-stone-200">
              <QRCodeCanvas
                value={`${getPublicAppUrl()}/facility/${facility.qr_token || facility.id}`}
                size={180}
                level="H"
              />
            </div>
            <p className="text-[11px] font-mono text-stone-500">
              Token: {facility.qr_token || facility.id}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
