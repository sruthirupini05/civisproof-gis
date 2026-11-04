import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, Download, ArrowLeft, Filter, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI } from '../services/api.js';
import { getCachedFacilities } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import LoadingSpinner from '../components/UI/LoadingSpinner.jsx';
import { useAuthStore } from '../store/useStore.js';
import { getPublicAppUrl } from '../services/config.js';

export default function QRAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const baseList = useMemo(() => {
    return Array.isArray(fallbackFacilities) ? fallbackFacilities : [];
  }, []);

  const [facilities, setFacilities] = useState(baseList);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [targetBaseUrl, setTargetBaseUrl] = useState(getPublicAppUrl());

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        let list = [];
        if (navigator.onLine) {
          try {
            const res = await facilitiesAPI.list({});
            if (Array.isArray(res)) list = res;
            else if (Array.isArray(res?.facilities)) list = res.facilities;
            else if (Array.isArray(res?.data)) list = res.data;
          } catch {}
        }
        if (!list.length) {
          try {
            const cached = await getCachedFacilities();
            if (Array.isArray(cached) && cached.length) list = cached;
          } catch {}
        }
        if (alive && list.length > 0) {
          setFacilities(list);
        }
      } catch (e) {
        console.warn('QR Admin load note:', e);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const safeFacilities = Array.isArray(facilities) && facilities.length > 0 ? facilities : baseList;

  const filtered = useMemo(() => {
    return filterCat === 'all'
      ? safeFacilities
      : safeFacilities.filter((f) => f && f.category === filterCat);
  }, [safeFacilities, filterCat]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Preparing QR label sheet..." />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* Top Controls - Hidden during print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-1"
          >
            <ArrowLeft size={16} />
            <span>{t('nav.back')}</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="text-[#881337]" size={22} />
            <span>Printable Facility QR Labels ({filtered.length})</span>
          </h1>
          <p className="text-xs text-slate-500">
            Official labels suitable for physical placement at Godavari Pushkaram facilities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Live Base URL:</span>
            <input
              type="text"
              value={targetBaseUrl}
              onChange={(e) => setTargetBaseUrl(e.target.value)}
              className="bg-transparent font-mono text-xs w-56 focus:outline-none text-[#881337] font-medium"
              placeholder="https://..."
            />
          </div>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Categories ({safeFacilities.length})</option>
            <option value="ghat">Bathing Ghats</option>
            <option value="toilet">Public Toilets</option>
            <option value="water">Drinking Water</option>
            <option value="medical">Medical Camps</option>
            <option value="shelter">Accommodations & Shelters</option>
            <option value="food">Food & Annadanam</option>
            <option value="transport">Transport Hubs</option>
            <option value="petrol">Petrol Stations</option>
            <option value="ev_charging">EV Charging</option>
          </select>

          <button
            onClick={handlePrint}
            className="bg-[#991b1b] hover:bg-[#881337] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <Printer size={15} />
            <span>Print Labels</span>
          </button>
        </div>
      </div>

      {/* Grid of Printable Labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
        {filtered.map((f) => {
          const tokenStr = f.qr_token || f.id;
          const qrUrl = `${targetBaseUrl}/facility/${tokenStr}`;
          return (
            <div
              key={f.id}
              className="bg-white border-2 border-slate-300 rounded-2xl p-4 flex flex-col justify-between shadow-2xs print:border-black print:rounded-none print:shadow-none break-inside-avoid"
            >
              {/* Header */}
              <div className="border-b border-slate-200 pb-2 mb-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>CivicProof GIS • Godavari Pushkaram</span>
                  <span className="font-mono">{tokenStr}</span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">{f.name}</h2>
                {f.name_te && (
                  <p className="text-xs text-blue-900 font-semibold">{f.name_te}</p>
                )}
                <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1">
                  {f.category?.toUpperCase()}
                </span>
              </div>

              {/* QR and Scan Prompt */}
              <div className="flex items-center gap-3 py-1">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent">
                  <QRCodeCanvas
                    value={qrUrl}
                    size={110}
                    fgColor="#881337"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-bold text-slate-800 text-[11px]">Scan for details:</p>
                  <ul className="text-[10px] space-y-0.5 text-slate-500 list-disc pl-3">
                    <li>Real-time status</li>
                    <li>Turn-by-turn navigation</li>
                    <li>Telugu & Hindi guides</li>
                    <li>Offline cache support</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-2 mt-2 text-[9px] text-slate-400 flex items-center justify-between">
                <span>RMC Authorized Facility</span>
                <span>Code: {tokenStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
