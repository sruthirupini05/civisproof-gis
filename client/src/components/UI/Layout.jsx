import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Map, QrCode, LayoutDashboard, LogIn, LogOut, Printer } from 'lucide-react';
import { useAuthStore } from '../../store/useStore.js';
import LanguageSelector from './LanguageSelector.jsx';

export default function Layout() {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center font-bold text-[#1e3a5f] text-sm shadow-sm">
              CP
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">{t('app.name')}</div>
              <div className="text-[11px] text-blue-200 hidden sm:block">{t('app.subtitle')}</div>
            </div>
          </NavLink>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <NavLink
              to="/city-qr"
              className="flex items-center gap-1.5 text-xs bg-amber-400 text-[#1e3a5f] hover:bg-amber-300 font-bold px-2.5 py-1.5 rounded-xl transition shadow-xs"
            >
              <QrCode size={14} />
              <span className="hidden sm:inline">{t('nav.cityQR')}</span>
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink
                to="/admin/qr"
                title="Print QR Codes"
                className="hidden md:flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded transition"
              >
                <Printer size={14} />
                <span>QR Labels</span>
              </NavLink>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-200 hidden md:inline">
                  {user.username} ({user.role})
                </span>
                <button
                  onClick={() => {
                    clearAuth();
                    navigate('/');
                  }}
                  className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded transition"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded transition"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden sm:flex flex-col w-16 bg-white border-r border-slate-200 items-center py-4 gap-4 z-20">
          {[
            { to: '/', icon: Map, label: 'nav.map' },
            { to: '/scan', icon: QrCode, label: 'nav.scan' },
            { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
            ...(user?.role === 'admin' ? [{ to: '/admin/qr', icon: Printer, label: 'facility.downloadQR' }] : []),
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={t(label, { defaultValue: label })}
              className={({ isActive }) =>
                `w-11 h-11 flex items-center justify-center rounded-xl transition ${
                  isActive ? 'bg-[#1e3a5f] text-white shadow' : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </aside>

        {/* Content View */}
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bg-white border-t border-slate-200 flex sm:hidden z-30 shadow-lg">
        {[
          { to: '/', icon: Map, label: 'nav.map' },
          { to: '/scan', icon: QrCode, label: 'nav.scan' },
          { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
          ...(user?.role === 'admin' ? [{ to: '/admin/qr', icon: Printer, label: 'facility.downloadQR' }] : []),
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs transition ${
                isActive ? 'text-[#1e3a5f] font-semibold' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            <span className="mt-0.5">{t(label, { defaultValue: label })}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
