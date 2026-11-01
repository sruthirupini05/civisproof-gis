import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  MapPin,
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { useLanguageStore } from '../store/useStore.js';

const CATEGORIES = [
  {
    id: 'ghat',
    name: 'Ghats',
    teName: 'పుష్కర ఘాట్లు',
    hiName: 'स्नान घाट',
    icon: '🌊',
    desc: 'Sacred bathing ghats',
    teDesc: 'పవిత్ర స్నాన ఘాట్ల స్థానాలు',
    hiDesc: 'पवित्र स्नान घाट',
  },
  {
    id: 'water',
    name: 'Drinking Water',
    teName: 'త్రాగునీరు',
    hiName: 'पेयजल',
    icon: '💧',
    desc: 'RO water kiosks & refill points',
    teDesc: 'RO శుద్ధి చేసిన తాగునీటి కేంద్రాలు',
    hiDesc: 'शुद्ध पेयजल केंद्र',
  },
  {
    id: 'medical',
    name: 'Medical Facilities',
    teName: 'వైద్య కేంద్రాలు',
    hiName: 'चिकित्सा सुविधाएं',
    icon: '🏥',
    desc: 'Hospitals, first-aid & camps',
    teDesc: 'ఆసుపత్రులు & ప్రథమ చికిత్స',
    hiDesc: 'अस्पताल व प्राथमिक चिकित्सा शिविर',
  },
  {
    id: 'toilet',
    name: 'Toilets',
    teName: 'మరుగుదొడ్లు',
    hiName: 'शौचालय',
    icon: '🚻',
    desc: 'Public washrooms & sanitation',
    teDesc: 'సార్వజనీన మరుగుదొడ్లు',
    hiDesc: 'सार्वजनिक शौचालय',
  },
  {
    id: 'petrol',
    name: 'Petrol Stations',
    teName: 'పెట్రోల్ బంకులు',
    hiName: 'पेट्रोल पंप',
    icon: '⛽',
    desc: '24×7 Fuel, diesel & auto care',
    teDesc: '24×7 ఇంధనం & డీజిల్ స్టేషన్లు',
    hiDesc: '24×7 पेट्रोल व डीजल पंप',
  },
  {
    id: 'ev_charging',
    name: 'EV Charging Stations',
    teName: 'EV ఛార్జింగ్ కేంద్రాలు',
    hiName: 'ईवी चार्जिंग स्टेशन',
    icon: '⚡',
    desc: 'Fast DC & AC charging points',
    teDesc: 'ఫాస్ట్ DC & AC ఛార్జింగ్ పాయింట్లు',
    hiDesc: 'फास्ट डीसी व एसी चार्जिंग पॉइंट',
  },
  {
    id: 'transport',
    name: 'Transport',
    teName: 'రవాణా సౌకర్యాలు',
    hiName: 'परिवहन सेवाएं',
    icon: '🚆',
    desc: 'Airports, railways & bus terminals',
    teDesc: 'విమానాశ్రయం, రైల్వే & బస్ స్టేషన్లు',
    hiDesc: 'हवाई अड्डा, रेलवे व बस स्टेशन',
  },
  {
    id: 'shelter',
    name: 'Accommodations',
    teName: 'విశ్రాంతి ఆశ్రయాలు',
    hiName: 'आवास व विश्राम',
    icon: '🛏️',
    desc: 'Pilgrim rest shelters & dorms',
    teDesc: 'యాత్రికుల విశ్రాంతి గదులు',
    hiDesc: 'तीर्थयात्री विश्राम स्थल व डॉर्मिटरी',
  },
  {
    id: 'parking',
    name: 'Parking',
    teName: 'పార్కింగ్ స్థలాలు',
    hiName: 'पार्किंग क्षेत्र',
    icon: '🅿️',
    desc: 'Satellite & city parking lots',
    teDesc: 'వాహన పార్కింగ్ మైదానాలు',
    hiDesc: 'वाहन पार्किंग मैदान',
  },
  {
    id: 'food',
    name: 'Food & Rest Areas',
    teName: 'అన్నదానం & ఆహారం',
    hiName: 'अन्नदान व भोजन',
    icon: '🍽️',
    desc: 'Free Annadanam & food points',
    teDesc: 'ఉచిత అన్నదాన కేంద్రాలు',
    hiDesc: 'निःशुल्क अन्नदान व भोजन केंद्र',
  },
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { currentLang } = useLanguageStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/map?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Sacred Welcome Hero Section (Matching Reference 1 & 2) ── */}
      <section className="relative overflow-hidden min-h-[380px] sm:min-h-[440px] flex flex-col justify-between text-white shadow-xl">
        {/* River Ghat Pilgrimage Background Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1400&auto=format&fit=crop&q=85')`,
          }}
        />
        {/* Golden Hour / Sacred Amber Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#7f1d1d]/85 via-[#991b1b]/70 to-[#fffdf9] dark:to-[#090d16] transition-colors" />

        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 -ml-16 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto w-full pt-8 pb-10 px-4 relative z-10 text-center flex flex-col items-center">
          {/* ── Sacred Om Symbol with River Wave (Matching Reference Screen 1) ── */}
          <div className="flex flex-col items-center mb-3">
            <div className="text-5xl sm:text-6xl text-amber-300 font-serif drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none animate-in zoom-in duration-300">
              ॐ
            </div>
            {/* Flowing blue-and-gold river wave emblem */}
            <div className="w-16 h-2 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full -mt-1 shadow-xs" />
          </div>

          {/* Grand Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-white mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            {isTe
              ? 'గోదావరి పుష్కరాలు 2027'
              : isHi
              ? 'गोदावरी पुष्करालु 2027'
              : 'Godavari Pushkaralu 2027'}
          </h1>

          <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-amber-200/90 mb-4 drop-shadow-sm">
            {isTe
              ? 'జిఐఎస్-ఆధారిత సౌకర్యాలు & పవిత్ర పుష్కర యాత్ర'
              : isHi
              ? 'जीआईएस आधारित सुविधाएं एवं पवित्र पुष्कर यात्रा'
              : 'GIS-Based Facilities & Civic Infrastructure Map'}
          </p>

          {/* Floating Sacred Card: "Welcome to Godavari Pushkaralu 2027" */}
          <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-amber-200/60 dark:border-slate-800 text-stone-900 dark:text-slate-100 my-2">
            <h2 className="text-lg sm:text-xl font-black text-[#881337] dark:text-rose-400 mb-1">
              {isTe
                ? 'గోదావరి పుష్కరాలు 2027 కి స్వాగతం'
                : isHi
                ? 'गोदावरी पुष्करालु 2027 में आपका स्वागत है'
                : 'Welcome to Godavari Pushkaralu 2027'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 mb-4">
              {isTe
                ? 'మీ సమీపంలోని ముఖ్యమైన సౌకర్యాలను కనుగొనండి.'
                : isHi
                ? 'अपने आस-पास आवश्यक सुविधाओं को खोजें।'
                : 'Find essential facilities near you.'}
            </p>

            {/* CTAs Matching Reference Image 1 & 2 */}
            <div className="flex flex-col gap-2.5">
              {/* Button 1: Crimson Red "Find Facilities ->" */}
              <Link
                to="/map"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#991b1b] hover:bg-[#881337] text-white font-extrabold text-sm rounded-full shadow-lg shadow-red-950/20 active:scale-98 transition"
              >
                <span>{isTe ? 'సౌకర్యాలను కనుగొనండి' : isHi ? 'सुविधाएं खोजें' : 'Find Facilities'}</span>
                <ArrowRight size={16} />
              </Link>

              {/* Button 2: Golden Amber "📍 Explore Nearby" */}
              <Link
                to="/explore"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-[#7f1d1d] font-extrabold text-sm rounded-full shadow-md active:scale-98 transition"
              >
                <Compass size={16} />
                <span>{isTe ? 'సమీపంలో అన్వేషించండి' : isHi ? 'आस-पास देखें' : 'Explore Nearby'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-2">
        {/* ── Search Bar ("How can we help you?") ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg shadow-amber-950/5 border border-amber-100 dark:border-slate-800 mb-6 transition-colors">
          <div className="text-center mb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-[#881337] dark:text-rose-400">
              {isTe
                ? 'మేము మీకు ఎలా సహాయపడగలము?'
                : isHi
                ? 'हम आपकी क्या मदद कर सकते हैं?'
                : 'How can we help you?'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {isTe
                ? 'మీ చుట్టూ ఉన్న ముఖ్యమైన పుష్కర సౌకర్యాలను కనుగొనండి'
                : isHi
                ? 'अपने आस-पास आवश्यक पुष्कर सुविधाओं को खोजें'
                : 'Find essential facilities around you'}
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3.5 top-3.5 text-stone-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isTe
                  ? 'సౌకర్యాల కోసం వెతకండి (ఉదా: పంచవటి ఘాట్, నీరు, పెట్రోల్, విమానాశ్రయం)...'
                  : isHi
                  ? 'सुविधाएं खोजें (उदा: पंचवटी घाट, पानी, पेट्रोल, हवाई अड्डा)...'
                  : 'Search facilities (e.g. Panchavati Ghat, Water, Petrol, Airport)...'
              }
              className="w-full pl-10 pr-24 py-3 bg-[#fefaf3] dark:bg-slate-800/80 rounded-xl border border-amber-200/80 dark:border-slate-700 text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#991b1b] dark:focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-800 transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#991b1b] hover:bg-[#881337] text-white text-xs font-bold rounded-lg transition"
            >
              {isTe ? 'వెతకండి' : isHi ? 'खोजें' : 'Search'}
            </button>
          </form>
        </div>

        {/* ── Facility Category Grid (Screen 2) ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-extrabold text-stone-800 dark:text-slate-200 tracking-tight flex items-center gap-1.5">
              <span>{isTe ? 'ముఖ్యమైన సౌకర్యాలు' : isHi ? 'आवश्यक सुविधाएं' : 'Essential Facilities'}</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-[#991b1b] dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-full border border-amber-300/30">
                {isTe ? '10 వర్గాలు' : isHi ? '10 श्रेणियां' : '10 Categories'}
              </span>
            </h3>
            <Link to="/map" className="text-xs font-bold text-[#991b1b] dark:text-rose-400 hover:underline">
              {isTe ? 'మ్యాప్‌లో అన్నీ చూడండి →' : isHi ? 'नक्शे पर सभी देखें →' : 'View All on Map →'}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'food') navigate('/food-nearby');
                  else if (cat.id === 'petrol') navigate('/petrol-stations');
                  else if (cat.id === 'transport') navigate('/transport-hubs');
                  else navigate(`/map?category=${cat.id}`);
                }}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition text-center group active:scale-98"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition shadow-2xs border border-amber-200/50 dark:border-slate-600">
                  {cat.icon}
                </div>
                <div className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-slate-100 group-hover:text-[#991b1b] dark:group-hover:text-rose-400 transition leading-tight">
                  {isTe ? cat.teName : isHi ? cat.hiName : cat.name}
                </div>
                <div className="text-[10px] sm:text-[11px] text-stone-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                  {isTe ? cat.teDesc : isHi ? cat.hiDesc : cat.desc}
                </div>
              </button>
            ))}
          </div>

          {/* View on Map Pill Button (Matching Reference Screen 10) */}
          <div className="mt-5 flex justify-center">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 py-3 px-8 bg-[#991b1b] hover:bg-[#881337] text-white font-extrabold text-sm rounded-full shadow-lg shadow-red-950/20 active:scale-98 transition"
            >
              <span>{isTe ? 'మ్యాప్‌లో వీక్షించండి' : isHi ? 'नक्शे पर देखें' : 'View on Map'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── Emergency Help Row (Screen 8) ── */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-4 border border-red-200/60 mb-8 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
              🆘
            </div>
            <div>
              <div className="font-extrabold text-sm text-red-950">
                {isTe ? 'అత్యవసర పుష్కర సహాయం' : isHi ? 'आपातकालीन पुष्कर सहायता' : 'Emergency Pushkaram Assistance'}
              </div>
              <div className="text-[11px] text-red-800/80">
                {isTe ? 'యాత్రికుల రక్షణ కోసం 24×7 అందుబాటులో ఉంది' : isHi ? 'तीर्थयात्रियों की सुरक्षा के लिए 24×7 उपलब्ध' : 'Available 24×7 for pilgrim safety'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: isTe ? 'అత్యవసరం' : isHi ? 'आपातकाल' : 'Emergency', num: '108', icon: PhoneCall, color: 'text-red-700 bg-white border-red-200' },
              { label: isTe ? 'పోలీస్' : isHi ? 'पुलिस' : 'Police Help', num: '100', icon: ShieldAlert, color: 'text-blue-700 bg-white border-blue-200' },
              { label: isTe ? 'అంబులెన్స్' : isHi ? 'एम्बुलेंस' : 'Ambulance', num: '108', icon: HeartPulse, color: 'text-emerald-700 bg-white border-emerald-200' },
              { label: isTe ? 'హెల్ప్‌లైన్' : isHi ? 'हेल्पलाइन' : 'Helpline', num: '1800-425-4567', icon: PhoneCall, color: 'text-amber-800 bg-white border-amber-200' },
            ].map((em, i) => (
              <a
                key={i}
                href={`tel:${em.num}`}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${em.color} shadow-2xs hover:shadow-xs transition`}
              >
                <em.icon size={16} />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-stone-400">{em.label}</div>
                  <div className="text-xs font-black tracking-tight truncate">{em.num}</div>
                </div>
              </a>
            ))}
          </div>

          {/* View on Map Pill Button (Matching Reference Screen 10) */}
          <div className="mt-5 flex justify-center">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 py-3 px-8 bg-[#991b1b] hover:bg-[#881337] text-white font-extrabold text-sm rounded-full shadow-lg shadow-red-950/20 active:scale-98 transition"
            >
              <span>{isTe ? 'మ్యాప్‌లో వీక్షించండి' : isHi ? 'नक्शे पर देखें' : 'View on Map'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── Offline Info Card (Screen 7 Preview) ── */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl border border-amber-200/60">
              📶
            </div>
            <div>
              <div className="font-extrabold text-sm text-stone-800">
                {isTe ? 'పూర్తిగా ఆఫ్‌లైన్‌లో అందుబాటులో ఉంది' : isHi ? 'पूरी तरह से ऑफ़लाइन उपलब्ध' : 'Available Completely Offline'}
              </div>
              <div className="text-xs text-stone-500">
                {isTe
                  ? 'ఇంటర్నెట్ లేకుండానే సౌకర్యాల స్థానాలు మరియు మ్యాప్ నావిగేషన్ పని చేస్తాయి'
                  : isHi
                  ? 'इंटरनेट के बिना भी सुविधाएं और नक्शा नेविगेशन काम करता है'
                  : 'Facility locations and map navigation work without Internet'}
              </div>
            </div>
          </div>
          <Link
            to="/help"
            className="text-xs font-bold text-[#991b1b] bg-[#fff5f5] hover:bg-[#ffebeb] px-3 py-2 rounded-xl transition flex-shrink-0"
          >
            {isTe ? 'మరిన్ని వివరాలు' : isHi ? 'अधिक जानें' : 'Learn More'}
          </Link>
        </div>
      </div>
    </div>
  );
}
