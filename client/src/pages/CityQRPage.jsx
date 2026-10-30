import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Printer,
  Download,
  ArrowLeft,
  QrCode,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { useLanguageStore } from '../store/useStore.js';

export default function CityQRPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();

  // Live link presets
  const LIVE_URL = 'https://civicproof-pushkaram-2027.loca.lt';
  const WIFI_URL = 'http://192.168.1.4:5173';
  const CURRENT_URL = window.location.origin;

  const [appUrl, setAppUrl] = useState(LIVE_URL);
  const [posterFormat, setPosterFormat] = useState('a4');

  function handlePrint() {
    window.print();
  }

  function downloadPosterQR() {
    const canvas = document.getElementById('city-poster-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicProof-CityWide-Discovery-QR.png`;
    a.click();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Top action bar - Hidden during print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-1"
          >
            <ArrowLeft size={16} />
            <span>{t('nav.back')}</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="text-[#1e3a5f]" size={22} />
            <span>City-Wide App Discovery QR Poster</span>
          </h1>
          <p className="text-xs text-slate-500">
            Deploy this QR code across Rajahmundry so pilgrims & visitors can scan and access CivicProof GIS instantly
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadPosterQR}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download size={14} />
            <span>{t('poster.downloadPoster')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-[#1e3a5f] hover:bg-[#15294a] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Printer size={15} />
            <span>{t('poster.printPoster')}</span>
          </button>
        </div>
      </div>

      {/* Target Live URL Preset Selector - Hidden during print */}
      <div className="print:hidden bg-slate-100/90 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Smartphone size={16} className="text-[#1e3a5f]" />
            <span>QR Code Destination (Scanned Link):</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setAppUrl(LIVE_URL)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                appUrl === LIVE_URL
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              🌐 Live Public Link
            </button>
            <button
              onClick={() => setAppUrl(WIFI_URL)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                appUrl === WIFI_URL
                  ? 'bg-[#1e3a5f] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              📶 Local Wi-Fi (192.168.1.4)
            </button>
            <button
              onClick={() => setAppUrl(CURRENT_URL)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                appUrl === CURRENT_URL
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              💻 Current Origin
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono flex-1 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1e3a5f] hover:underline flex items-center gap-1 font-semibold text-xs shrink-0"
          >
            <ExternalLink size={13} />
            <span>Open Link</span>
          </a>
        </div>
      </div>

      {/* ========================================================
          PRINTABLE POSTER SHEET (OPTIMIZED FOR PHYSICAL DISPLAY)
          ======================================================== */}
      <div className="bg-white border-4 border-[#1e3a5f] rounded-3xl p-6 sm:p-10 shadow-lg print:border-black print:rounded-none print:shadow-none print:p-6 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-200 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-600" />
            <span>Rajahmundry Municipal Corporation (RMC) Official Civic Portal</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a5f] tracking-tight">
            గోదావరి పుష్కరాలు 2027
          </h2>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">
            Godavari Pushkaram 2027 — Civic Facilities & Navigation
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
            {t('poster.scanPrompt')}
          </p>
        </div>

        {/* Central QR Code Stage */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
          {/* Big Scannable QR Code */}
          <div className="p-4 bg-slate-50 border-3 border-[#1e3a5f] rounded-2xl shadow-sm text-center">
            <QRCodeCanvas
              id="city-poster-qr-canvas"
              value={appUrl}
              size={230}
              fgColor="#1e3a5f"
              bgColor="#ffffff"
              level="H"
            />
            <div className="mt-2 text-[11px] font-bold text-[#1e3a5f] tracking-wider uppercase">
              SCAN WITH ANY PHONE CAMERA
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {appUrl}
            </div>
          </div>

          {/* 3 Steps Guide */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{t('poster.step1')}</h4>
                <p className="text-[11px] text-slate-500">మీ ఫోన్ కెమెరా లేదా Google Lens తెరవండి</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{t('poster.step2')}</h4>
                <p className="text-[11px] text-slate-500">QR కోడ్ మీద కెమెరాను చూపించండి</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{t('poster.step3')}</h4>
                <p className="text-[11px] text-slate-500">సమీప ఘాట్లు, తాగునీరు మరియు రూట్ నావిగేషన్ పొందండి</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Core Civic Facilities Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
          {[
            { icon: '🌊', te: 'స్నాన ఘాట్లు', en: 'Bathing Ghats', bg: 'bg-blue-50 text-blue-900 border-blue-200' },
            { icon: '🚻', te: 'మరుగుదొడ్లు', en: 'Public Toilets', bg: 'bg-purple-50 text-purple-900 border-purple-200' },
            { icon: '💧', te: 'తాగునీరు', en: 'Drinking Water', bg: 'bg-cyan-50 text-cyan-900 border-cyan-200' },
            { icon: '🏥', te: 'వైద్య శిబిరాలు', en: 'Medical Camps', bg: 'bg-rose-50 text-rose-900 border-rose-200' },
            { icon: '⛺', te: 'విశ్రాంతి ఆశ్రయాలు', en: 'Pilgrim Shelters', bg: 'bg-amber-50 text-amber-900 border-amber-200' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-center space-y-0.5 ${item.bg}`}
            >
              <div className="text-xl">{item.icon}</div>
              <div className="text-xs font-bold leading-tight">{item.te}</div>
              <div className="text-[10px] opacity-75">{item.en}</div>
            </div>
          ))}
        </div>

        {/* Key Features Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-700 font-medium">
          {t('poster.noAppNeeded')}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>CivicProof GIS — Authorized Godavari Pushkaralu Portal</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#1e3a5f]">
            <PhoneCall size={14} />
            <span>{t('poster.emergencyHelpline')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
