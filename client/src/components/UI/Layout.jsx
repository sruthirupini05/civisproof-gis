import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Map, QrCode, Heart, HelpCircle, LogIn, LogOut, Printer } from 'lucide-react';
import { useAuthStore } from '../../store/useStore.js';
import LanguageSelector from './LanguageSelector.jsx';

export default function Layout() {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide header and bottom nav on dedicated full-screen navigation mode if desired
  const isNavigateView = location.pathname.startsWith('/navigate');

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdf9] text-stone-900 font-sans">
      {/* ── Sacred Pushkaram Header ── */}
      <header className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white shadow-md sticky top-0 z-40 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo & Pushkaram Crest */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-300 to-amber-500 rounded-2xl flex items-center justify-center font-black text-[#881337] text-lg shadow-md border border-amber-200 group-hover:scale-105 transition">
              🛕
            </div>
            <div>
              <div className="font-extrabold text-sm md:text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                <span>Godavari Pushkaralu 2027</span>
                <span className="text-[11px] font-bold text-amber-300 bg-black/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
                  GIS
                </span>
              </div>
              <div className="text-[11px] text-amber-200/90 font-medium hidden sm:block">
                CivicProof — Facilities & Pilgrimage Navigation
              </div>
            </div>
          </NavLink>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />

            <NavLink
              to="/city-qr"
              className="flex items-center gap-1 text-xs bg-amber-400 hover:bg-amber-300 text-[#7f1d1d] font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
            >
              <QrCode size={13} />
              <span className="hidden sm:inline">City QR</span>
            </NavLink>

            {user?.role === 'admin' && (
              <NavLink
                to="/admin/qr"
                title="Print QR Codes"
                className="hidden md:flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
              >
                <Printer size={13} />
                <span>QR Labels</span>
              </NavLink>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-200 hidden md:inline">
                  {user.username}
                </span>
                <button
                  onClick={() => {
                    clearAuth();
                    navigate('/');
                  }}
                  className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1.5 rounded-xl transition"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Login</span>
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
      <nav className="bg-[#fffdf9] border-t border-amber-200/80 flex sm:hidden z-30 shadow-lg px-2 py-1 justify-around">
        {[
          { to: '/', icon: Home, label: 'Home' },
          { to: '/map', icon: Map, label: 'Map' },
          { to: '/scan', icon: QrCode, label: 'Scan QR' },
          { to: '/saved', icon: Heart, label: 'Saved' },
          { to: '/help', icon: HelpCircle, label: 'Help' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-1 text-[11px] font-semibold transition ${
                isActive
                  ? 'text-[#991b1b] scale-105'
                  : 'text-stone-400 hover:text-stone-600'
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
