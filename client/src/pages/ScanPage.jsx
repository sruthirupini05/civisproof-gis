import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Keyboard, Search, Sparkles, AlertCircle } from 'lucide-react';
import { facilitiesAPI } from '../services/api.js';
import { getCachedFacilities } from '../services/db.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import PushkaramWelcomeScreen from '../components/UI/PushkaramWelcomeScreen.jsx';

export default function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [demoFacilities, setDemoFacilities] = useState([]);
  const [cameraActive, setCameraActive] = useState(true);
  const [scannedToken, setScannedToken] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Load facilities for quick testing / fallback
    async function loadQuickList() {
      try {
        let list = [];
        if (navigator.onLine) {
          try {
            const res = await facilitiesAPI.list({});
            if (Array.isArray(res)) list = res;
            else if (Array.isArray(res?.facilities)) list = res.facilities;
          } catch {}
        }
        if (!list.length) {
          try {
            const cached = await getCachedFacilities();
            if (Array.isArray(cached) && cached.length) list = cached;
          } catch {}
        }
        if (!list.length) {
          list = fallbackFacilities || [];
        }
        setDemoFacilities(list.slice(0, 6));
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
          let raw = decodedText.trim();
          let extractedToken = raw;
          if (raw.includes('/facility/')) {
            const parts = raw.split('/facility/');
            extractedToken = parts[parts.length - 1].split('?')[0];
          } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
            try {
              const url = new URL(raw);
              const pathParts = url.pathname.split('/');
              extractedToken = pathParts[pathParts.length - 1] || 'WHKsjhLgHFX2';
            } catch {
              extractedToken = raw;
            }
          }

          // Trigger dedicated Pushkaralu Welcome Screen before continuing
          setScannedToken(extractedToken);
          setShowWelcome(true);
        },
        () => {
          // Continuous scanning ticks
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
  }, []);

  function handleManualSubmit(e) {
    e.preventDefault();
    let code = manualCode.trim();
    if (!code) {
      setError(t('errors.required'));
      return;
    }
    if (code.includes('/facility/')) {
      const parts = code.split('/facility/');
      code = parts[parts.length - 1].split('?')[0];
    }
    setScannedToken(code);
    setShowWelcome(true);
  }

  // If scan succeeded, render dedicated Pushkaralu Welcome Screen (Matching Image 3)
  if (showWelcome) {
    return (
      <PushkaramWelcomeScreen
        scannedToken={scannedToken}
        onContinue={() => {
          if (scannedToken) {
            navigate(`/facility/${encodeURIComponent(scannedToken)}`);
          } else {
            navigate('/');
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex p-3 bg-amber-100 rounded-full text-[#991b1b] mb-1">
          <QrCode size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">{t('scan.title')}</h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{t('scan.instruction')}</p>
      </div>

      {/* Camera Box */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div
          id="qr-reader-container"
          className="rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-300"
        >
          {!cameraActive && (
            <div className="text-center p-6 space-y-2">
              <AlertCircle className="mx-auto text-amber-500" size={32} />
              <p className="text-xs text-slate-600 font-medium">
                Camera permission needed or not available.
              </p>
              <p className="text-[11px] text-slate-400">
                You can enter the facility token below or click a sample code.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Code Input Form */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Keyboard size={16} />
          <span>{t('scan.manualEntry')}</span>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              setError('');
            }}
            placeholder="e.g. WHKsjhLgHFX2, FOD-SAI-ANNADAN"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#991b1b]"
          />
          <button
            type="submit"
            className="bg-[#991b1b] hover:bg-[#881337] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
          >
            <Search size={14} />
            <span>Open</span>
          </button>
        </form>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>

      {/* Quick Test Codes */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Sparkles size={14} className="text-amber-500" />
          <span>Simulate QR Scan (Tap to Test Welcome Flow):</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {demoFacilities.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setScannedToken(f.qr_token || f.id);
                setShowWelcome(true);
              }}
              className="text-left p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#991b1b] transition text-xs shadow-2xs active:scale-98"
            >
              <div className="font-mono text-[10px] text-amber-700 font-bold">{f.qr_token || f.id}</div>
              <div className="font-semibold text-slate-800 truncate">{f.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
