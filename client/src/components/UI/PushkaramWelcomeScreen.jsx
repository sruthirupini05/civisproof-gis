import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Compass, Home, Globe } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';

export default function PushkaramWelcomeScreen({ onContinue, scannedToken, scannedFacility }) {
  const navigate = useNavigate();
  const { currentLang, setLanguage } = useLanguageStore();
  const [langOpen, setLangOpen] = useState(false);

  const isTe = (currentLang || 'en').startsWith('te');
  const isHi = (currentLang || 'en').startsWith('hi');

  const t = (en, te, hi) => (isTe ? te : isHi ? hi : en);

  const handleFindFacilities = () => {
    if (onContinue) onContinue();
    if (scannedToken) {
      navigate(`/facility/${encodeURIComponent(scannedToken)}`);
    } else {
      navigate('/map');
    }
  };

  const handleExploreNearby = () => {
    if (onContinue) onContinue();
    navigate('/explore');
  };

  const handleGoHome = () => {
    if (onContinue) onContinue();
    navigate('/');
  };

  const LANGS = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'te', label: 'TE', name: 'తెలుగు (Telugu)' },
    { code: 'hi', label: 'HI', name: 'हिन्दी (Hindi)' },
  ];

  const currentLangLabel = LANGS.find((l) => (currentLang || 'en').startsWith(l.code))?.label || 'EN';

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 select-none"
      style={{
        backgroundImage: 'url(/godavari-arch-bridge.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* Darkened backdrop with blur so the sacred card stands out dramatically */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />

      {/* Language Selector – Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-white/95 text-stone-900 font-black text-xs sm:text-sm px-4 py-2 rounded-full shadow-lg border-2 border-amber-400 hover:bg-white active:scale-95 transition"
          >
            <Globe size={15} className="text-[#991b1b]" />
            <span>{currentLangLabel}</span>
            <span className="text-[10px] text-stone-500">▼</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-2xl border-2 border-amber-300 overflow-hidden min-w-[170px] z-30 animate-in fade-in slide-in-from-top-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-extrabold hover:bg-amber-50 transition flex items-center justify-between ${
                    (currentLang || 'en').startsWith(l.code)
                      ? 'bg-amber-100/60 text-[#991b1b]'
                      : 'text-stone-800'
                  }`}
                >
                  <span>{l.name}</span>
                  {(currentLang || 'en').startsWith(l.code) && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Sacred Welcome Card (High Visibility, Large Fonts, Contrast) */}
      <div className="relative z-10 w-full max-w-md mx-auto bg-[#fffdf9]/95 dark:bg-[#181110]/95 backdrop-blur-md rounded-[32px] sm:rounded-[36px] shadow-2xl border-2 border-amber-400/90 p-6 sm:p-8 flex flex-col items-center text-center space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200">
        {/* Sacred Om Symbol */}
        <div className="flex flex-col items-center space-y-1">
          <div
            className="text-6xl sm:text-7xl font-black leading-none drop-shadow-md select-none"
            style={{ color: '#b91c1c' }}
          >
            ॐ
          </div>
          {/* Gold & Azure Wave Ribbons */}
          <div className="w-28 h-2 bg-gradient-to-r from-amber-400 via-sky-400 to-amber-500 rounded-full shadow-xs" />
        </div>

        {/* Big Bold Event Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-serif text-[#881337] dark:text-amber-300 leading-tight tracking-tight">
            {t('Godavari Pushkaralu 2027', 'గోదావరి పుష్కరాలు 2027', 'गोदावरी पुष्करालु 2027')}
          </h1>
          <div className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">
            {t('Rajamahendravaram • Andhra Pradesh', 'రాజమహేంద్రవరం • ఆంధ్రప్రదేశ్', 'राजमहेंद्रवरम • आंध्र प्रदेश')}
          </div>
        </div>

        {/* Welcome Subtitle & Mission */}
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3.5 w-full space-y-1">
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white leading-snug">
            {t(
              'Welcome to Godavari Pushkaralu 2027',
              'గోదావరి పుష్కరాలు 2027కి స్వాగతం',
              'गोदावरी पुष्करालु 2027 में आपका स्वागत है'
            )}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 leading-relaxed">
            {t(
              'Find essential verified facilities, ghats, and travel navigation near you.',
              'మీ సమీపంలో ఉన్న అధికారిక ఘాట్‌లు, పవిత్ర స్నాన ప్రదేశాలు మరియు వసతులను కనుగొనండి.',
              'अपने आस-पास प्रामाणिक घाट, पवित्र स्नान स्थल और सुविधाएं खोजें।'
            )}
          </p>
        </div>

        {/* Scanned Badge (if arriving via QR Code) */}
        {scannedToken && (
          <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl px-3.5 py-2 text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2 justify-center shadow-xs">
            <span>✅</span>
            <span>{scannedFacility ? `Scanned: ${scannedFacility.name}` : `QR Code: ${scannedToken}`}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-3 pt-1">
          {/* 1. Primary Find Facilities Button */}
          <button
            onClick={handleFindFacilities}
            className="w-full py-4 px-6 text-sm sm:text-base font-black text-white rounded-full flex items-center justify-center gap-2.5 shadow-xl hover:shadow-2xl active:scale-98 transition"
            style={{ background: 'linear-gradient(135deg, #991b1b 0%, #881337 50%, #7f1d1d 100%)' }}
          >
            <span>
              {scannedToken
                ? t('View Scanned Facility', 'స్కాన్ చేసిన సౌకర్యం చూడండి', 'स्कैन की गई सुविधा देखें')
                : t('Find Facilities', 'సౌకర్యాలు కనుగొనండి', 'सुविधाएं खोजें')}
            </span>
            <ArrowRight size={20} className="stroke-[2.5]" />
          </button>

          {/* 2. Secondary Explore Nearby Button */}
          <button
            onClick={handleExploreNearby}
            className="w-full py-3.5 px-6 text-sm sm:text-base font-black rounded-full flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg active:scale-98 transition border-2 border-amber-400"
            style={{
              background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #fde047 100%)',
              color: '#713f12',
            }}
          >
            <MapPin size={19} className="text-amber-900 stroke-[2.5]" />
            <span>{t('Explore Nearby', 'సమీపంలో అన్వేషించండి', 'आस-पास खोजें')}</span>
          </button>

          {/* 3. Clearly Visible "Continue to Home Screen" Pill Button */}
          <button
            onClick={handleGoHome}
            className="w-full py-3 px-5 text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-full border border-stone-300 dark:border-stone-600 shadow-sm flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Home size={16} className="text-[#991b1b]" />
            <span>{t('Continue to Home Screen →', 'హోమ్‌ స్క్రీన్‌కు కొనసాగండి →', 'होम स्क्रीन पर आगे बढ़ें →')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
