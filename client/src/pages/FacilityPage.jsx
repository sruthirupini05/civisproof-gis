import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  Clock,
  Users,
  Info,
  ArrowLeft,
  Heart,
  Share2,
  CheckCircle2,
  Accessibility,
  Sparkles,
  QrCode,
  Download,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI, qrAPI } from '../services/api.js';
import { getCachedFacility, cacheFacility } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { getPublicAppUrl } from '../services/config.js';

const CATEGORY_META = {
  toilet: { label: 'Public Washroom', icon: '🚻', color: '#991b1b', bg: '#fef2f2' },
  water: { label: 'Drinking Water Station', icon: '💧', color: '#0284c7', bg: '#f0f9ff' },
  medical: { label: 'Medical Camp & First-Aid', icon: '➕', color: '#dc2626', bg: '#fff1f2' },
  ghat: { label: 'Godavari Bathing Ghat', icon: '🌊', color: '#b45309', bg: '#fffbeb' },
  shelter: { label: 'Pilgrim Rest Area', icon: '🛏️', color: '#7c3aed', bg: '#faf5ff' },
  parking: { label: 'Vehicle Parking Zone', icon: '🅿️', color: '#475569', bg: '#f8fafc' },
};

export default function FacilityPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

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

      if (navigator.onLine) {
        try {
          const res = await qrAPI.resolve(token);
          found = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
          if (found) await cacheFacility(found);
        } catch {}
      }

      if (!found) {
        try {
          found = await getCachedFacility(token);
        } catch {}
      }

      if (!found) {
        found = fallbackFacilities.find(
          (f) => f.qr_token === token || f.id === token
        ) ?? null;
      }

      if (!found) {
        setError('Facility could not be found.');
      } else {
        setFacility(found);
      }
      setLoading(false);
    }
    fetchFacility();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#991b1b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-600 text-sm font-semibold">Loading facility details…</p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="max-w-sm text-center bg-white p-6 rounded-3xl border border-amber-200 shadow-lg">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">Facility Not Found</h2>
          <p className="text-xs text-stone-500 mb-4">{error || 'This facility is not registered.'}</p>
          <button
            onClick={() => navigate('/map')}
            className="w-full py-2.5 bg-[#991b1b] text-white font-bold text-xs rounded-xl"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[facility.category] || { label: 'Civic Facility', icon: '📍', color: '#991b1b', bg: '#fef2f2' };
  const facilityUrl = `${getPublicAppUrl()}/facility/${facility.qr_token || facility.id}`;

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
          Facility Details
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
              {meta.label}
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
              {facility.name}
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex-shrink-0">
              Available
            </span>
          </div>

          {facility.name_te && (
            <p className="text-xs font-semibold text-[#881337] mb-2">{facility.name_te}</p>
          )}

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
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">Distance</div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">🕒</div>
            <div className="font-extrabold text-sm text-stone-900">24 × 7</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">Open</div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-2xs text-center">
            <div className="text-stone-400 flex justify-center mb-1">♿</div>
            <div className="font-extrabold text-sm text-stone-900">Accessible</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tight">For All</div>
          </div>
        </div>

        {/* ── Facilities Verified Checklist (Screen 4) ── */}
        <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-stone-900 tracking-tight">
            Facility Features & Verification
          </h3>

          <div className="space-y-2">
            {[
              'Men & Women Separate Facilities',
              'Wheelchair Accessible Ramp & Railings',
              'Regular Sanitation & RO Water Supply',
              'Official CivicProof Verified Infrastructure',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-stone-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {facility.description && (
            <p className="text-xs text-stone-500 pt-2 border-t border-stone-100 leading-relaxed">
              {facility.description}
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
            <span>Navigate to Facility</span>
          </button>
        </div>
      </div>

      {/* ── QR Code Verification Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center border border-amber-200 shadow-2xl space-y-4">
            <h4 className="font-extrabold text-base text-stone-900">Facility QR Code</h4>
            <div className="p-4 bg-[#fefaf3] rounded-2xl border border-amber-200 inline-block shadow-inner">
              <QRCodeCanvas value={facilityUrl} size={180} level="H" />
            </div>
            <p className="text-xs text-stone-500">
              Scan this code with any phone camera to access this facility page offline or online.
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
