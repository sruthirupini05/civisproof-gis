import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  MapPin,
  Waves,
  Droplets,
  HeartPulse,
  Compass,
  Bus,
  UtensilsCrossed,
  Bed,
  Car,
  PhoneCall,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'toilet',
    name: 'Toilets',
    teName: 'మరుగుదొడ్లు',
    icon: '🚻',
    desc: 'Public washrooms',
    color: 'from-amber-50 to-orange-50 border-orange-200 text-orange-900',
  },
  {
    id: 'water',
    name: 'Drinking Water',
    teName: 'త్రాగునీరు',
    icon: '💧',
    desc: 'RO water kiosks',
    color: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-900',
  },
  {
    id: 'medical',
    name: 'Medical Help',
    teName: 'వైద్య సహాయం',
    icon: '➕',
    desc: 'First-aid & camps',
    color: 'from-rose-50 to-red-50 border-rose-200 text-rose-900',
  },
  {
    id: 'ghat',
    name: 'Ghats',
    teName: 'పుష్కర ఘాట్లు',
    icon: '🌊',
    desc: 'Bathing ghats',
    color: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-900',
  },
  {
    id: 'parking',
    name: 'Parking',
    teName: 'పార్కింగ్',
    icon: '🅿️',
    desc: 'Vehicle parking slots',
    color: 'from-slate-50 to-stone-50 border-stone-200 text-stone-900',
  },
  {
    id: 'transport',
    name: 'Bus & Transport',
    teName: 'రవాణా సౌకర్యాలు',
    icon: '🚌',
    desc: 'Shuttle & bus pickup',
    color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900',
  },
  {
    id: 'food',
    name: 'Food & Rest Areas',
    teName: 'ఆహారం & విశ్రాంతి',
    icon: '🍽️',
    desc: 'Annadanam & food points',
    color: 'from-yellow-50 to-amber-50 border-yellow-200 text-yellow-900',
  },
  {
    id: 'shelter',
    name: 'Accommodation',
    teName: 'వసతి గృహాలు',
    icon: '🛏️',
    desc: 'Pilgrim rest shelters',
    color: 'from-purple-50 to-pink-50 border-purple-200 text-purple-900',
  },
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/map?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-full pb-16 bg-[#fffdf9]">
      {/* ── Sacred Welcome Hero Card (Screen 1 & 10) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white pt-6 pb-12 px-4 shadow-md">
        {/* Decorative Sacred Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          {/* Sacred Om Emblem */}
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 rounded-full shadow-lg text-[#881337] font-black text-2xl mb-3 border-2 border-amber-200 animate-in zoom-in duration-300">
            ॐ
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Godavari Pushkaralu 2027
          </h1>
          <p className="text-amber-200/90 text-sm md:text-base max-w-xl mx-auto mb-6">
            Find certified ghats, clean washrooms, free drinking water, medical camps and pilgrim shelters across Rajahmundry.
          </p>

          {/* Quick CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              to="/map"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#7f1d1d] font-extrabold rounded-2xl shadow-lg active:scale-95 transition"
            >
              <span>Find Facilities</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/map?nearby=true"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-white/15 hover:bg-white/20 border border-white/25 text-white font-bold rounded-2xl active:scale-95 transition"
            >
              <MapPin size={18} className="text-amber-300" />
              <span>Explore Nearby</span>
            </Link>
          </div>
        </div>

        {/* Decorative Wave Edge */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#fffdf9] rounded-t-3xl" />
      </section>

      {/* ── Main Content Container ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-2">
        {/* ── Search Bar ("How can we help you?") ── */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-amber-950/5 border border-amber-100 mb-6">
          <div className="text-center mb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-[#881337]">
              How can we help you?
            </h2>
            <p className="text-xs text-stone-500">
              Find essential facilities and ghats around you in Rajahmundry
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3.5 top-3.5 text-stone-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search facilities (e.g. Panchavati Ghat, Water, Toilet)..."
              className="w-full pl-10 pr-24 py-3 bg-[#fefaf3] rounded-xl border border-amber-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#991b1b] focus:bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#991b1b] hover:bg-[#881337] text-white text-xs font-bold rounded-lg transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* ── Facility Category Grid (Screen 2) ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-extrabold text-stone-800 tracking-tight flex items-center gap-1.5">
              <span>Essential Facilities</span>
              <span className="text-[10px] bg-amber-100 text-[#991b1b] font-bold px-1.5 py-0.5 rounded-full">
                8 Categories
              </span>
            </h3>
            <Link to="/map" className="text-xs font-bold text-[#991b1b] hover:underline">
              View All on Map →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/map?category=${cat.id}`)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 shadow-xs hover:shadow-md transition text-center group active:scale-98`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition shadow-2xs border border-amber-200/50">
                  {cat.icon}
                </div>
                <div className="font-extrabold text-sm text-stone-900 group-hover:text-[#991b1b] transition leading-tight">
                  {cat.name}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {cat.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Emergency Help Row (Screen 8) ── */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-4 border border-red-200/60 mb-8 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
              🆘
            </div>
            <div>
              <div className="font-extrabold text-sm text-red-950">Emergency Pushkaram Assistance</div>
              <div className="text-[11px] text-red-800/80">Available 24×7 for pilgrim safety and first-aid</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Emergency', num: '108', icon: PhoneCall, color: 'text-red-700 bg-white border-red-200' },
              { label: 'Police Help', num: '100', icon: ShieldAlert, color: 'text-blue-700 bg-white border-blue-200' },
              { label: 'Ambulance', num: '108', icon: HeartPulse, color: 'text-emerald-700 bg-white border-emerald-200' },
              { label: 'Helpline', num: '1800-425-4567', icon: PhoneCall, color: 'text-amber-800 bg-white border-amber-200' },
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
        </div>

        {/* ── Offline Info Card (Screen 7 Preview) ── */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl border border-amber-200/60">
              📶
            </div>
            <div>
              <div className="font-extrabold text-sm text-stone-800">Available Completely Offline</div>
              <div className="text-xs text-stone-500">Facility locations and basic map navigation work without Internet</div>
            </div>
          </div>
          <Link
            to="/help"
            className="text-xs font-bold text-[#991b1b] bg-[#fff5f5] hover:bg-[#ffebeb] px-3 py-2 rounded-xl transition flex-shrink-0"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
