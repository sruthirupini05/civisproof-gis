import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Map, QrCode, Heart, HelpCircle, LogIn, LogOut, Printer, Sun, Moon, Compass, Calendar } from 'lucide-react';
import { useAuthStore, useLanguageStore, useThemeStore } from '../../store/useStore.js';
import LanguageSelector from './LanguageSelector.jsx';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const { currentLang } = useLanguageStore();
  const { mode, isDark, setMode } = useThemeStore();
  const navigate = useNavigate();

  const isTe = (currentLang || i18n.language || 'te').startsWith('te');
  const isHi = (currentLang || i18n.language || 'te').startsWith('hi');

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
      {/* ── Sacred Pushkaram Header ── */}
      <header className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white shadow-md sticky top-0 z-40 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Official AP Govt Logo & Pushkaram Title */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md border border-amber-300/80 group-hover:scale-105 transition flex items-center justify-center shrink-0">
              <img
                src="/ap-govt-logo.svg"
                alt="Government of Andhra Pradesh"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-sm md:text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                <span>
                  {isTe
                    ? 'గోదావరి పుష్కరాలు 2027'
                    : isHi
                    ? 'गोदावरी पुष्करालु 2027'
                    : 'Godavari Pushkaralu 2027'}
                </span>
                <span className="text-[11px] font-bold text-amber-300 bg-black/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
                  GIS
                </span>
              </div>
              <div className="text-[11px] text-amber-200/90 font-medium hidden sm:block">
                {isTe
                  ? 'సివిక్ప్రూఫ్ — సౌకర్యాల అన్వేషణ & యాత్రికుల నావిగేషన్'
                  : isHi
                  ? 'सिविकप्रूफ — सुविधाएं और तीर्थयात्री नेविगेशन'
                  : 'CivicProof — Facilities & Pilgrimage Navigation'}
              </div>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-black/15 p-1 rounded-2xl border border-white/10">
            <NavLink
              to="/map"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive ? 'bg-white text-[#7f1d1d] shadow-xs' : 'text-amber-100 hover:text-white'
                }`
              }
            >
              <Map size={13} />
              <span>{isTe ? 'సౌకర్యాలు' : isHi ? 'सुविधाएं' : 'Find Facilities'}</span>
            </NavLink>
            <NavLink
              to="/events"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive ? 'bg-white text-[#7f1d1d] shadow-xs' : 'text-amber-100 hover:text-white'
                }`
              }
            >
              <Calendar size={13} />
              <span>{isTe ? 'కార్యక్రమాలు' : isHi ? 'कार्यक्रम' : 'Events'}</span>
            </NavLink>
            <NavLink
              to="/explore"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive ? 'bg-white text-[#7f1d1d] shadow-xs' : 'text-amber-100 hover:text-white'
                }`
              }
            >
              <Compass size={13} />
              <span>{isTe ? 'పర్యాటక అన్వేషణ' : isHi ? 'अन्वेषण' : 'Explore Nearby'}</span>
            </NavLink>
          </nav>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Segmented Light / Dark Toggle (Clean, explicit selection) */}
            <div className="flex items-center bg-black/20 backdrop-blur-xs p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setMode('light')}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                  !isDark ? 'bg-white text-stone-900 shadow-xs' : 'text-amber-100/80 hover:text-white'
                }`}
                title="Light Mode"
                aria-label="Light Mode"
              >
                <Sun size={13} className={!isDark ? 'text-amber-600' : ''} />
                <span className="hidden md:inline">Light</span>
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                  isDark ? 'bg-amber-400 text-stone-950 shadow-xs' : 'text-amber-100/80 hover:text-white'
                }`}
                title="Dark Mode"
                aria-label="Dark Mode"
              >
                <Moon size={13} className={isDark ? 'text-stone-900' : ''} />
                <span className="hidden md:inline">Dark</span>
              </button>
            </div>

            <LanguageSelector />

            <NavLink
              to="/city-qr"
              className="flex items-center gap-1 text-xs bg-amber-400 hover:bg-amber-300 text-[#7f1d1d] font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
            >
              <QrCode size={13} />
              <span className="hidden sm:inline">
                {isTe ? 'సిటీ QR' : isHi ? 'सिटी क्यूआर' : 'City QR'}
              </span>
            </NavLink>

            <NavLink
              to="/qr-labels"
              title="Print QR Codes"
              className="hidden md:flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
            >
              <Printer size={13} />
              <span>QR Labels</span>
            </NavLink>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-200 hidden md:inline">
                  {user.username} ({user.role})
                </span>
                <button
                  onClick={() => {
                    clearAuth();
                    navigate('/');
                  }}
                  className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">
                    {isTe ? 'లాగౌట్' : isHi ? 'लॉगआउट' : 'Logout'}
                  </span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">
                  {isTe ? 'లాగిన్' : isHi ? 'लॉगिन' : 'Login'}
                </span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* ── Main View Container ── */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Sacred Bottom Navigation Bar ── */}
      <nav className="bg-[#fffdf9] dark:bg-[#0f172a] border-t border-amber-200/80 dark:border-slate-800 flex sm:hidden z-30 shadow-lg px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] justify-around">
        {[
          { to: '/', icon: Home, label: isTe ? 'హోమ్' : isHi ? 'होम' : 'Home' },
          { to: '/map', icon: Map, label: isTe ? 'సౌకర్యాలు' : isHi ? 'सुविधाएं' : 'Facilities' },
          { to: '/events', icon: Calendar, label: isTe ? 'కార్యక్రమాలు' : isHi ? 'कार्यक्रम' : 'Events' },
          { to: '/explore', icon: Compass, label: isTe ? 'అన్వేషణ' : isHi ? 'अन्वेषण' : 'Explore' },
          { to: '/scan', icon: QrCode, label: isTe ? 'స్కాన్' : isHi ? 'स्कैन' : 'Scan' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-1 text-[11px] font-semibold transition ${
                isActive
                  ? 'text-[#991b1b] dark:text-rose-400 scale-105'
                  : 'text-stone-400 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-200'
              }`
            }
          >
            <div className="p-1 rounded-full">
              <Icon size={19} className="stroke-[2.2]" />
            </div>
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
