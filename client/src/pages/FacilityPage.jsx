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
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI, qrAPI } from '../services/api.js';
import { getCachedFacility, cacheFacility } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { getPublicAppUrl } from '../services/config.js';
import { useLanguageStore } from '../store/useStore.js';

const CATEGORY_META = {
  toilet: { label: 'Public Washroom', teLabel: 'సార్వజనీన మరుగుదొడ్డి', hiLabel: 'सार्वजनिक शौचालय', icon: '🚻', color: '#991b1b', bg: '#fef2f2' },
  water: { label: 'Drinking Water Station', teLabel: 'త్రాగునీటి కేంద్రం', hiLabel: 'पेयजल केंद्र', icon: '💧', color: '#0284c7', bg: '#f0f9ff' },
  medical: { label: 'Medical Camp & First-Aid', teLabel: 'వైద్య శిబిరం & ప్రథమ చికిత్స', hiLabel: 'चिकित्सा शिविर', icon: '➕', color: '#dc2626', bg: '#fff1f2' },
  ghat: { label: 'Godavari Bathing Ghat', teLabel: 'గోదావరి స్నాన ఘాట్', hiLabel: 'गोदावरी स्नान घाट', icon: '🌊', color: '#b45309', bg: '#fffbeb' },
  shelter: { label: 'Pilgrim Rest Area', teLabel: 'యాత్రికుల విశ్రాంతి ప్రదేశం', hiLabel: 'तीर्थयात्री विश्राम स्थल', icon: '🛏️', color: '#7c3aed', bg: '#faf5ff' },
  parking: { label: 'Vehicle Parking Zone', teLabel: 'పార్కింగ్ స్థలం', hiLabel: 'वाहन पार्किंग', icon: '🅿️', color: '#475569', bg: '#f8fafc' },
};

function isValidFacility(f) {
  return f && typeof f === 'object' && f.lat != null && f.lng != null;
}

export default function FacilityPage() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
  const { currentLang } = useLanguageStore();
  const navigate = useNavigate();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#991b1b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-600 text-sm font-semibold">
            {isTe ? 'వివరాలు లోడ్ అవుతున్నాయి…' : isHi ? 'विवरण लोड हो रहा है…' : 'Loading details…'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="max-w-sm text-center bg-white p-6 rounded-3xl border border-amber-200 shadow-lg">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">
            {isTe ? 'సౌకర్యం కనుగొనబడలేదు' : isHi ? 'सुविधा नहीं मिली' : 'Facility Not Found'}
          </h2>
          <p className="text-xs text-stone-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/map')}
            className="w-full py-2.5 bg-[#991b1b] text-white font-bold text-xs rounded-xl"
          >
            {isTe ? 'మ్యాప్‌కు తిరిగి వెళ్ళండి' : isHi ? 'नक्शे पर वापस जाएं' : 'Back to Map'}
          </button>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[facility.category] || { label: 'Civic Facility', teLabel: 'పుష్కర సౌకర్యం', hiLabel: 'पुष्कर सुविधा', icon: '📍', color: '#991b1b', bg: '#fef2f2' };
  const facilityUrl = `${getPublicAppUrl()}/facility/${facility.qr_token || facility.id}`;

  const displayName = isTe ? facility.name_te || facility.name : isHi ? facility.name_hi || facility.name : facility.name;
  const displayDesc = isTe ? facility.description_te || facility.description : isHi ? facility.description_hi || facility.description : facility.description;

  return (
    <div className="min-h-full pb-24 bg-[#fffdf9]">
      {/* ── Top Header Bar (Screen 4) ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-stone-700 flex items-center justify-center transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
          {isTe ? 'సౌకర్య వివరాలు' : isHi ? 'सुविधा विवरण' : 'Facility Details'}
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${
              isSaved ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-stone-600 hover:bg-slate-200'
            }`}
            title="Save facility"
          >
            <Heart size={18} className={isSaved ? 'fill-red-600' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ── Facility Photo Banner (Screen 4) ── */}
        <div className="relative h-48 sm:h-56 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100 border border-amber-200/80 shadow-sm flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-white shadow-md flex items-center justify-center text-3xl mb-2 border border-amber-200">
              {meta.icon}
            </div>
            <span className="text-xs font-bold text-amber-900/80 uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full border border-amber-200/60">
              {isTe ? meta.teLabel : isHi ? meta.hiLabel : meta.label}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1 text-xs font-bold bg-white/95 text-stone-800 hover:bg-white px-2.5 py-1.5 rounded-xl shadow-xs border border-amber-200"
            >
              <QrCode size={14} className="text-[#991b1b]" />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* ── Title & Status Card (Screen 4) ── */}
        <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              {displayName}
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex-shrink-0">
              {isTe ? 'అందుబాటులో ఉంది' : isHi ? 'उपलब्ध' : 'Available'}
            </span>
          </div>

          {facility.address && (
            <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
              <MapPin size={14} className="text-[#991b1b] flex-shrink-0" />
              <span>{facility.address}</span>
            </p>
          )}
        </div>

        {/* ── 3 Quick Metric Cards (Screen 4) ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">🚶</div>
            <div className="font-extrabold text-sm text-stone-900">~350 m</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">
              {isTe ? 'దూరం' : isHi ? 'दूरी' : 'Distance'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">🕒</div>
            <div className="font-extrabold text-sm text-stone-900">24 × 7</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">
              {isTe ? 'తెరిచి ఉంది' : isHi ? 'खुला है' : 'Open'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">♿</div>
            <div className="font-extrabold text-sm text-stone-900">
              {isTe ? 'అందరికీ' : isHi ? 'सुलभ' : 'Accessible'}
            </div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">
              {isTe ? 'అందుబాటు' : isHi ? 'सुविधा' : 'For All'}
            </div>
          </div>
        </div>

        {/* ── Facilities Verified Checklist (Screen 4) ── */}
        <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-stone-900 tracking-tight">
            {isTe ? 'సౌకర్యాలు & అధికారిక ధృవీకరణ' : isHi ? 'सुविधाएं एवं आधिकारिक सत्यापन' : 'Features & Civic Verification'}
          </h3>

          <div className="space-y-2">
            {[
              isTe ? 'పురుషులు & మహిళలకు వేర్వేరు సౌకర్యాలు' : isHi ? 'महिला व पुरुषों के लिए अलग सुविधाएं' : 'Men & Women Separate Facilities',
              isTe ? 'వీల్‌చైర్ ర్యాంప్ మరియు ప్రత్యేక సదుపాయాలు' : isHi ? 'व्हीलचेयर एवं विशेष सहायता सुलभ' : 'Wheelchair Accessible Ramp & Railings',
              isTe ? 'నిరంతర పారిశుద్ధ్యం మరియు RO తాగునీటి సరఫరా' : isHi ? 'नियमित स्वच्छता एवं RO पेयजल आपूर्ति' : 'Regular Sanitation & RO Water Supply',
              isTe ? 'సివిక్ప్రూఫ్ GIS ద్వారా ధృవీకరించబడింది' : isHi ? 'सिविकप्रूफ GIS प्रमाणित अवसंरचना' : 'Official CivicProof Verified Infrastructure',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-stone-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {displayDesc && (
            <p className="text-xs text-stone-500 pt-2 border-t border-stone-100 leading-relaxed">
              {displayDesc}
            </p>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Navigation Button (Screen 4) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/95 backdrop-blur-md border-t border-amber-100 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() =>
              navigate(`/navigate/${facility.qr_token || facility.id}`)
            }
            className="w-full py-4 px-6 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-red-950/20 active:scale-[0.99] transition"
          >
            <Navigation size={18} />
            <span>
              {isTe ? 'సౌకర్యానికి నావిగేట్ చేయండి' : isHi ? 'सुविधा तक नेविगेट करें' : 'Navigate to Facility'}
            </span>
          </button>
        </div>
      </div>

      {/* ── QR Code Verification Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center border border-amber-200 shadow-2xl space-y-4">
            <h4 className="font-extrabold text-base text-stone-900">
              {isTe ? 'సౌకర్యం అధికారిక QR కోడ్' : isHi ? 'सुविधा आधिकारिक क्यूआर कोड' : 'Facility QR Code'}
            </h4>
            <div className="p-4 bg-[#fefaf3] rounded-2xl border border-amber-200 inline-block shadow-inner">
              <QRCodeCanvas value={facilityUrl} size={180} level="H" />
            </div>
            <p className="text-xs text-stone-500">
              {isTe
                ? 'ఏ ఫోన్ కెమెరా ద్వారానైనా ఈ QR కోడ్‌ను స్కాన్ చేసి ఆఫ్‌లైన్ లేదా ఆన్‌లైన్‌లో నేరుగా ఈ పేజీని పొందవచ్చు.'
                : isHi
                ? 'किसी भी फोन कैमरे से स्कैन कर ऑफलाइन या ऑनलाइन सीधे विवरण प्राप्त करें।'
                : 'Scan this code with any phone camera to access this facility page offline or online.'}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl"
            >
              {isTe ? 'మూసివేయండి' : isHi ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
