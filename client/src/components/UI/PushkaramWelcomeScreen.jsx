import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Compass, CheckCircle2 } from 'lucide-react';
import LanguageSelector from './LanguageSelector.jsx';
import { useLanguageStore } from '../../store/useStore.js';

export default function PushkaramWelcomeScreen({ scannedToken, scannedFacility, onContinue }) {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const handleProceed = () => {
    if (onContinue) {
      onContinue();
      return;
    }
    if (scannedToken) {
      navigate(`/facility/${encodeURIComponent(scannedToken)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fffdf9] flex flex-col items-center justify-between overflow-y-auto select-none animate-in fade-in zoom-in-95 duration-300">
      {/* ── Top Sacred Wave Crest ── */}
      <div className="w-full relative">
        <div className="h-14 sm:h-16 w-full bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] rounded-b-[40px] shadow-md flex items-center justify-end px-6">
          {/* Language Selector Top Right */}
          <div className="scale-95">
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="max-w-sm w-full mx-auto px-6 py-4 flex-1 flex flex-col items-center text-center justify-center space-y-4">
        {/* Sacred Om Emblem & Title (Matching Image 3) */}
        <div className="flex flex-col items-center">
          <div className="text-4xl sm:text-5xl font-black text-[#991b1b] leading-none mb-1">
            ॐ
          </div>
          {/* Gold & Blue Wave Ribbons below Om */}
          <div className="w-20 h-1.5 bg-gradient-to-r from-amber-400 via-sky-400 to-amber-500 rounded-full mb-2" />

          <h1 className="text-2xl sm:text-3xl font-black text-[#881337] font-serif tracking-tight leading-tight">
            {isTe ? 'గోదావరి పుష్కరాలు 2027' : isHi ? 'गोदावरी पुष्करालु 2027' : 'Godavari Pushkaralu 2027'}
          </h1>
        </div>

        {/* ── Pushkaralu River Ghats & Temples Photo Banner (Image 3) ── */}
        <div className="relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden shadow-xl border-2 border-amber-300/60 bg-amber-50">
          <img
            src="/pushkar-ghat.jpg"
            alt="Godavari Pushkaralu Riverfront"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/pushkaralu-hero.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* ── Scanned Facility Indicator ── */}
        {scannedToken && (
          <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-2.5 flex items-center justify-center gap-2 shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-amber-950 truncate">
              {scannedFacility ? `Scanned: ${scannedFacility.name}` : `Scanned Code: ${scannedToken}`}
            </span>
          </div>
        )}

        {/* ── Welcome Heading ── */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-[#881337] leading-snug">
            {isTe
              ? 'గోదావరి పుష్కరాలు 2027 కు స్వాగతం'
              : isHi
              ? 'गोदावरी पुष्करालु 2027 में आपका स्वागत है'
              : 'Welcome to Godavari Pushkaralu 2027'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            {isTe
              ? 'మీ సమీపంలో ఉన్న ముఖ్యమైన సౌకర్యాలను కనుగొనండి.'
              : isHi
              ? 'अपने निकटतम आवश्यक सुविधाएं खोजें।'
              : 'Find essential facilities near you.'}
          </p>
        </div>

        {/* ── Action Buttons (Matching Image 3) ── */}
        <div className="w-full space-y-2.5 pt-2">
          {/* Crimson Primary Button */}
          <button
            onClick={handleProceed}
            className="w-full py-3.5 px-6 bg-[#991b1b] hover:bg-[#881337] text-white font-black text-sm rounded-full shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <span>
              {scannedToken
                ? (isTe ? 'సౌకర్యం వివరాలు చూడండి' : 'View Scanned Facility')
                : (isTe ? 'సౌకర్యాలను కనుగొనండి' : isHi ? 'सुविधाएं खोजें' : 'Find Facilities')}
            </span>
            <ArrowRight size={16} />
          </button>

          {/* Golden Secondary Button */}
          <button
            onClick={() => navigate('/explore')}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:to-amber-400 border border-amber-400/80 text-amber-950 font-black text-sm rounded-full shadow-sm flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Compass size={16} className="text-amber-800" />
            <span>{isTe ? 'సమీపంలో అన్వేషించండి' : isHi ? 'आस-पास देखें' : 'Explore Nearby'}</span>
          </button>

          {/* Continue to Home */}
          <button
            onClick={() => navigate('/')}
            className="text-xs font-bold text-stone-500 hover:text-stone-800 pt-1 underline"
          >
            {isTe ? 'హోమ్ పేజీకి వెళ్లండి' : 'Continue to Home Screen'}
          </button>
        </div>
      </div>

      {/* ── Bottom Sacred Wave Crest ── */}
      <div className="w-full">
        <div className="h-8 sm:h-10 w-full bg-gradient-to-r from-amber-500 via-[#991b1b] to-amber-600 rounded-t-[40px] opacity-90" />
      </div>
    </div>
  );
}
