import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Keyboard, Search, Sparkles, AlertCircle } from 'lucide-react';
import { facilitiesAPI } from '../services/api.js';
import { getCachedFacilities } from '../services/db.js';

export default function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [demoFacilities, setDemoFacilities] = useState([]);
  const [cameraActive, setCameraActive] = useState(true);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Load facilities for quick testing / fallback
    async function loadQuickList() {
      try {
        let list = [];
        if (navigator.onLine) {
          list = await facilitiesAPI.list({});
        } else {
          list = await getCachedFacilities();
        }
        setDemoFacilities(list.slice(0, 5));
      } catch (e) {
        console.error('Failed to load demo list:', e);
      }
    }
    loadQuickList();

    // Start scanner safely
    let scannerInstance = null;
    try {
      scannerInstance = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        false
      );

      scannerInstance.render(
        (decodedText) => {
          try {
            scannerInstance.clear();
          } catch {}
          let token = decodedText.trim();
          if (token.includes('/facility/')) {
            const parts = token.split('/facility/');
            token = parts[parts.length - 1].split('?')[0];
          }
          navigate(`/facility/${token}`);
        },
        (scanError) => {
          // Continuous scanning errors are expected when no QR is in frame
        }
      );
      scannerRef.current = scannerInstance;
    } catch (e) {
      console.warn('QR scanner failed to mount:', e);
      setCameraActive(false);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, [navigate]);

  function handleManualSubmit(e) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setError(t('errors.required'));
      return;
    }
    navigate(`/facility/${encodeURIComponent(code)}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <div className="text-center sm:text-left">
        <h1 className="text-xl font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
          <QrCode className="text-[#1e3a5f]" size={24} />
          <span>{t('qr.scanTitle')}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t('qr.scanInstructions')}</p>
      </div>

      {/* QR Camera Reader */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-3">
        <div id="qr-reader-container" className="rounded-xl overflow-hidden" />
        {!cameraActive && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{t('qr.cameraError')}</span>
          </div>
        )}
      </div>

      {/* Manual Entry Fallback */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Keyboard size={15} />
          <span>{t('qr.manualEntry')}</span>
        </h2>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setError('');
            }}
            placeholder={t('qr.manualPlaceholder')}
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            type="submit"
            className="bg-[#1e3a5f] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#15294a] transition flex items-center gap-1 shadow-sm shrink-0"
          >
            <Search size={14} />
            <span>{t('qr.manualSubmit')}</span>
          </button>
        </form>
        {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}
      </div>

      {/* Demo Facilities Quick Picker */}
      {demoFacilities.length > 0 && (
        <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Sparkles size={14} className="text-amber-500" />
            <span>Quick Test Tokens (Offline & Demo):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {demoFacilities.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate(`/facility/${f.qr_token}`)}
                className="text-[11px] bg-white border border-slate-200 hover:border-[#1e3a5f] px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-[#1e3a5f] font-medium transition text-left"
              >
                {f.name} <span className="font-mono text-slate-400">({f.qr_token})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
