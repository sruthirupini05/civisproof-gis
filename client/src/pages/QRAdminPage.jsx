import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, Download, ArrowLeft, Filter, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { facilitiesAPI } from '../services/api.js';
import { getCachedFacilities } from '../services/db.js';
import LoadingSpinner from '../components/UI/LoadingSpinner.jsx';
import { useAuthStore } from '../store/useStore.js';
import { getPublicAppUrl } from '../services/config.js';

export default function QRAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        let list = [];
        if (navigator.onLine) {
          list = await facilitiesAPI.list({});
        } else {
          list = await getCachedFacilities();
        }
        setFacilities(list);
      } catch (e) {
        console.error('Failed to load facilities:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filterCat === 'all' ? facilities : facilities.filter((f) => f.category === filterCat);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Preparing QR label sheet..." />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-20">
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
            <Printer className="text-[#1e3a5f]" size={22} />
            <span>Printable Facility QR Labels</span>
          </h1>
          <p className="text-xs text-slate-500">
            Official labels suitable for physical placement at Godavari Pushkaram facilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Categories ({facilities.length})</option>
            <option value="ghat">Bathing Ghats</option>
            <option value="toilet">Public Toilets</option>
            <option value="water">Drinking Water</option>
            <option value="medical">Medical Camps</option>
            <option value="shelter">Pilgrim Shelters</option>
          </select>

          <button
            onClick={handlePrint}
            className="bg-[#1e3a5f] hover:bg-[#15294a] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Printer size={15} />
            <span>Print Labels</span>
          </button>
        </div>
      </div>

      {/* Grid of Printable Labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
        {filtered.map((f) => {
          const qrUrl = `${getPublicAppUrl()}/facility/${f.qr_token}`;
          return (
            <div
              key={f.id}
              className="bg-white border-2 border-slate-300 rounded-2xl p-4 flex flex-col justify-between shadow-2xs print:border-black print:rounded-none print:shadow-none break-inside-avoid"
            >
              {/* Header */}
              <div className="border-b border-slate-200 pb-2 mb-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>CivicProof GIS • Godavari Pushkaram</span>
                  <span className="font-mono">{f.qr_token}</span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">{f.name}</h2>
                {f.name_te && (
                  <p className="text-xs text-blue-900 font-semibold">{f.name_te}</p>
                )}
                <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1">
                  {t(`categories.${f.category}`)}
                </span>
              </div>

              {/* QR and Scan Prompt */}
              <div className="flex items-center gap-3 py-1">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent">
                  <QRCodeCanvas
                    value={qrUrl}
                    size={110}
                    fgColor="#1e3a5f"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-bold text-slate-800 text-[11px]">Scan for information:</p>
                  <ul className="text-[10px] space-y-0.5 text-slate-500 list-disc pl-3">
                    <li>Facility status</li>
                    <li>Navigation directions</li>
                    <li>Telugu & Hindi guides</li>
                    <li>Offline cache support</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-2 mt-2 text-[9px] text-slate-400 flex items-center justify-between">
                <span>RMC Authorized Facility</span>
                <span>Code: {f.qr_token}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
