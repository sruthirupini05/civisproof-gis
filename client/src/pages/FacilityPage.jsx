import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  ClipboardList,
  Clock,
  Users,
  Info,
  ArrowLeft,
  WifiOff,
  Download,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI, qrAPI } from '../services/api.js';
import { getCachedFacility, cacheFacility } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import StatusBadge from '../components/UI/StatusBadge.jsx';
import SafetyDisclaimer from '../components/UI/SafetyDisclaimer.jsx';
import LoadingSpinner from '../components/UI/LoadingSpinner.jsx';
import { useAuthStore, useLanguageStore } from '../store/useStore.js';
import { getPublicAppUrl } from '../services/config.js';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  ghat: 'bg-blue-700',
  toilet: 'bg-purple-700',
  water: 'bg-cyan-700',
  medical: 'bg-rose-700',
  shelter: 'bg-amber-700',
};

export default function FacilityPage() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentLang } = useLanguageStore();

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOfflineRecord, setIsOfflineRecord] = useState(false);
  const [cachedTime, setCachedTime] = useState(null);

  useEffect(() => {
    async function fetchFacility() {
      setLoading(true);
      setError(null);

      // Attempt network fetch first
      if (navigator.onLine) {
        try {
          const data = await qrAPI.resolve(token);
          setFacility(data);
          setIsOfflineRecord(false);
          await cacheFacility(data);
          setLoading(false);
          return;
        } catch (networkErr) {
          console.warn('Network resolve failed, attempting IndexedDB cache fallback:', networkErr);
        }
      }

      // Offline or network error: attempt IndexedDB resolution
      try {
        let cached = await getCachedFacility(token);
        if (!cached) {
          cached = fallbackFacilities.find((f) => f.qr_token === token || f.id === token);
        }
        if (cached) {
          setFacility(cached);
          setIsOfflineRecord(true);
          setCachedTime(cached.cachedAt || cached.last_updated);
        } else {
          setError(
            !navigator.onLine
              ? t('offline.facilityNotCached')
              : t('errors.notFound')
          );
        }
      } catch (cacheErr) {
        setError(t('errors.generic'));
      } finally {
        setLoading(false);
      }
    }

    fetchFacility();
  }, [token, t]);

  function getLocalizedName() {
    if (!facility) return '';
    const lang = (currentLang || i18n.language || 'te').slice(0, 2);
    if (lang === 'te' && facility.name_te) return facility.name_te;
    if (lang === 'hi' && facility.name_hi) return facility.name_hi;
    return facility.name;
  }

  function getLocalizedDesc() {
    if (!facility) return '';
    const lang = (currentLang || i18n.language || 'te').slice(0, 2);
    if (lang === 'te' && facility.description_te) return facility.description_te;
    if (lang === 'hi' && facility.description_hi) return facility.description_hi;
    return facility.description || '';
  }

  function downloadQRCanvas() {
    const canvas = document.getElementById('facility-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${facility.qr_token}-${facility.name.replace(/\s+/g, '_')}.png`;
    a.click();
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading facility details..." />;
  }

  if (error || !facility) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} />
          <span>{t('nav.back')}</span>
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <WifiOff size={36} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-amber-900">
            {isOfflineRecord ? t('offline.offlineTitle') : 'Facility Information Unavailable'}
          </h2>
          <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
          <p className="text-[11px] text-amber-700/80">{t('help.offlineHelp')}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 inline-block bg-[#1e3a5f] text-white text-xs px-4 py-2 rounded-xl font-medium"
          >
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  const categoryBannerBg = CATEGORY_COLORS[facility.category] || 'bg-slate-700';
  const qrShareUrl = `${getPublicAppUrl()}/facility/${facility.qr_token}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} />
          <span>{t('nav.back')}</span>
        </button>
        <span className="font-mono text-xs text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
          {facility.qr_token}
        </span>
      </div>

      {/* Offline Stale Data Warning Banner */}
      {isOfflineRecord && (
        <div className="bg-amber-500 text-white rounded-xl p-3 text-xs flex items-start gap-2 shadow-sm">
          <WifiOff size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">{t('qr.cachedData')}</span>
            <p className="opacity-95 leading-tight">
              {t('qr.cacheWarning', {
                time: cachedTime ? format(new Date(cachedTime), 'dd MMM yyyy, HH:mm') : 'Unknown',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Facility Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className={`${categoryBannerBg} p-5 text-white`}>
          <div className="flex items-center justify-between text-xs opacity-90 font-medium mb-1">
            <span>{t(`categories.${facility.category}`)}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              ID: {facility.id?.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-tight">{getLocalizedName()}</h1>
          {facility.name !== getLocalizedName() && (
            <p className="text-xs text-white/80 mt-0.5">{facility.name}</p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <StatusBadge status={facility.status} prefix="Status" />
            <StatusBadge status={facility.operational_status} prefix="Operation" />
            {facility.is_verified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck size={12} />
                <span>Verified Facility</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                <span>{t('facility.notVerified')}</span>
              </span>
            )}
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs text-slate-700 divide-y divide-slate-100">
            {facility.address && (
              <div className="flex items-start gap-2 pt-1.5">
                <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{facility.address}</span>
              </div>
            )}
            {facility.capacity && (
              <div className="flex items-center gap-2 pt-1.5">
                <Users size={15} className="text-slate-400 shrink-0" />
                <span>
                  {t('facility.capacity')}:{' '}
                  <strong className="text-slate-900">{facility.capacity.toLocaleString()}</strong>
                </span>
              </div>
            )}
            {facility.last_updated && (
              <div className="flex items-center gap-2 pt-1.5">
                <Clock size={15} className="text-slate-400 shrink-0" />
                <span>
                  {t('facility.lastUpdated')}:{' '}
                  {format(new Date(facility.last_updated), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1.5">
              <ClipboardList size={15} className="text-slate-400 shrink-0" />
              <span>
                {facility.last_inspected ? (
                  <>
                    {t('facility.lastInspected')}:{' '}
                    <strong className="text-slate-800">
                      {format(new Date(facility.last_inspected), 'dd MMM yyyy')}
                    </strong>
                  </>
                ) : (
                  <span className="text-amber-700 font-medium">
                    ⚠️ {t('facility.neverInspected')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Localized Description */}
          {getLocalizedDesc() && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 space-y-1 border border-slate-100">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Info size={13} className="text-slate-500" />
                <span>{t('facility.description')}</span>
              </div>
              <p className="leading-relaxed">{getLocalizedDesc()}</p>
            </div>
          )}

          {/* Provenance note */}
          <p className="text-[11px] text-slate-400 font-mono">
            {t('safety.dataProvenance', {
              source: facility.data_source === 'synthetic' ? t('facility.synthetic') : facility.data_source,
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons: Show on Map & Navigate */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={`/?focus=${facility.id}&lat=${facility.lat}&lng=${facility.lng}`}
          className="bg-[#1e3a5f] text-white rounded-xl py-3 px-2 text-center text-xs font-semibold flex flex-col items-center gap-1.5 hover:bg-[#15294a] transition shadow-sm"
        >
          <MapPin size={18} />
          <span>{t('facility.showOnMap')}</span>
        </Link>
        <Link
          to={`/navigate/${facility.qr_token}`}
          className="bg-emerald-600 text-white rounded-xl py-3 px-2 text-center text-xs font-semibold flex flex-col items-center gap-1.5 hover:bg-emerald-700 transition shadow-sm"
        >
          <Navigation size={18} />
          <span>{t('facility.navigate')}</span>
        </Link>
      </div>

      {/* Inspector Quick Link */}
      {user && ['admin', 'inspector', 'field_staff'].includes(user.role) && (
        <Link
          to={`/inspect/${facility.id}`}
          className="w-full bg-slate-800 text-white rounded-xl py-2.5 px-3 text-center text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-sm"
        >
          <ClipboardList size={16} />
          <span>{t('facility.inspect')}</span>
        </Link>
      )}

      {/* QR Code Label & Download Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('facility.qrCode')}
          </h3>
          <button
            onClick={downloadQRCanvas}
            className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline font-semibold"
          >
            <Download size={13} />
            <span>{t('facility.downloadQR')}</span>
          </button>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
            <QRCodeCanvas
              id="facility-qr-canvas"
              value={qrShareUrl}
              size={90}
              fgColor="#1e3a5f"
              bgColor="#ffffff"
              level="H"
            />
          </div>
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-slate-800">Unique Facility Identifier</p>
            <p className="font-mono text-slate-500 text-[11px]">{facility.qr_token}</p>
            <p className="text-[10px] text-slate-400">
              Printable label for physical entrance placement
            </p>
          </div>
        </div>
      </div>

      {/* Non-negotiable principle disclaimer */}
      <SafetyDisclaimer syntheticData={facility.data_source === 'synthetic'} />
    </div>
  );
}
