import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';

export default function PushkaramWelcomeScreen({ onContinue, scannedToken, scannedFacility }) {
  const navigate = useNavigate();
  const { currentLang, setLanguage } = useLanguageStore();
  const [langOpen, setLangOpen] = useState(false);

  const isTe = (currentLang || 'en').startsWith('te');
  const isHi = (currentLang || 'en').startsWith('hi');

  const t = (en, te, hi) => (isTe ? te : isHi ? hi : en);

  const handleFindFacilities = () => {
    if (onContinue) { onContinue(); }
    if (scannedToken) {
      navigate(`/facility/${encodeURIComponent(scannedToken)}`);
    } else {
      navigate('/map');
    }
  };

  const handleExploreNearby = () => {
    if (onContinue) { onContinue(); }
    navigate('/explore');
  };

  const LANGS = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'te', label: 'TE', name: 'Telugu' },
    { code: 'hi', label: 'HI', name: 'Hindi' },
  ];

  const currentLangLabel = LANGS.find(l => (currentLang || 'en').startsWith(l.code))?.label || 'EN';

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        backgroundImage: 'url(/godavari-arch-bridge.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Warm golden overlay – light enough to see the photo clearly */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-amber-800/20 to-amber-900/50 pointer-events-none" />

      {/* Language Selector – top right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setLangOpen(o => !o)}
            className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-stone-800 font-black text-xs px-3 py-1.5 rounded-full shadow border border-white/60"
          >
            {currentLangLabel} <span className="text-[10px]">▼</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden min-w-[100px]">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-amber-50 transition ${
                    (currentLang || 'en').startsWith(l.code) ? 'text-[#991b1b]' : 'text-stone-700'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Card – centred, max 360px wide like a phone screen */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-6 flex flex-col items-center text-center space-y-5 py-10">

        {/* Om symbol */}
        <div className="flex flex-col items-center space-y-1">
          <div
            className="text-5xl font-black leading-none drop-shadow-lg"
            style={{ color: '#c0392b', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          >
            ॐ
          </div>
          {/* Coloured wave ribbon */}
          <div className="w-24 h-1.5 bg-gradient-to-r from-amber-400 via-sky-400 to-amber-500 rounded-full" />
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-black font-serif leading-tight drop-shadow-xl"
          style={{ color: '#7f1d1d', textShadow: '0 2px 10px rgba(255,255,255,0.7)' }}
        >
          {t('Godavari\nPushkaralu\n2027', 'గోదావరి\nపుష్కరాలు\n2027', 'गोदावरी\nपुष्करालु\n2027')}
        </h1>

        {/* Welcome text */}
        <div className="space-y-1">
          <h2 className="text-lg font-black text-stone-900 drop-shadow-sm">
            {t('Welcome to Godavari Pushkaralu 2027', 'గోదావరి పుష్కరాలు 2027కి స్వాగతం', 'गोदावरी पुष्करालु 2027 में आपका स्वागत है')}
          </h2>
          <p className="text-sm font-semibold text-stone-700">
            {t('Find essential facilities near you.', 'మీ సమీపంలో ముఖ్యమైన సౌకర్యాలను కనుగొనండి.', 'अपने आस-पास जरूरी सुविधाएं खोजें।')}
          </p>
        </div>

        {/* Scanned badge */}
        {scannedToken && (
          <div className="w-full bg-white/80 backdrop-blur-sm border border-amber-300 rounded-2xl px-3 py-2 text-xs font-bold text-amber-900 flex items-center gap-2 justify-center shadow">
            ✅ {scannedFacility ? `Scanned: ${scannedFacility.name}` : `QR Code: ${scannedToken}`}
          </div>
        )}

        {/* Buttons */}
        <div className="w-full space-y-3 pt-2">
          <button
            onClick={handleFindFacilities}
            className="w-full py-4 px-6 font-black text-sm text-white rounded-full flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
            style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}
          >
            <span>
              {scannedToken
                ? t('View Facility', 'సౌకర్యం చూడండి', 'सुविधा देखें')
                : t('Find Facilities', 'సౌకర్యాలు కనుగొనండి', 'सुविधाएं खोजें')}
            </span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={handleExploreNearby}
            className="w-full py-4 px-6 font-black text-sm rounded-full flex items-center justify-center gap-2 shadow active:scale-95 transition border border-amber-400/80"
            style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24, #fde68a)', color: '#78350f' }}
          >
            <MapPin size={18} className="text-amber-800" />
            <span>{t('Explore Nearby', 'సమీపంలో అన్వేషించండి', 'आस-पास खोजें')}</span>
          </button>

          <button
            onClick={() => {
              if (onContinue) onContinue();
              navigate('/');
            }}
            className="w-full text-center text-xs font-bold text-stone-700 hover:text-stone-900 pt-2 underline transition"
          >
            {t('Continue to Home Screen →', 'హోమ్‌ స్క్రీన్‌కు కొనసాగండి →', 'होम स्क्रीन पर आगे बढ़ें →')}
          </button>
        </div>
      </div>
    </div>
  );
}
