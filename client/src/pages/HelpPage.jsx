import React from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  Info,
  Search,
  Accessibility,
  Bell,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-full pb-20 bg-[#fffdf9]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white p-6 shadow-md text-center">
        <h1 className="text-xl sm:text-2xl font-black mb-1">Emergency Help & Services</h1>
        <p className="text-xs sm:text-sm text-amber-200/90">
          Godavari Pushkaralu 2027 — 24×7 Pilgrim Support
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* ── Emergency Help (Screen 8) ── */}
        <section className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 text-[#991b1b] flex items-center justify-center font-bold text-lg">
              🆘
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#881337]">Emergency Help</h2>
              <p className="text-xs text-stone-500">Tap to call emergency response directly</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Emergency Response', sub: 'Toll-free 24×7', num: '108', icon: PhoneCall, bg: 'bg-red-50 text-red-900 border-red-200' },
              { label: 'Police Pushkaram Cell', sub: 'Rajahmundry Police', num: '100', icon: ShieldAlert, bg: 'bg-blue-50 text-blue-900 border-blue-200' },
              { label: 'Ambulance & Trauma', sub: 'Ghat Zone Mobile Units', num: '108', icon: HeartPulse, bg: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
              { label: 'Pilgrim Information Desk', sub: 'Municipal Help Desk', num: '0883-2475555', icon: Info, bg: 'bg-amber-50 text-amber-900 border-amber-200' },
            ].map((item, idx) => (
              <a
                key={idx}
                href={`tel:${item.num}`}
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${item.bg} hover:shadow-xs transition`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <div>
                    <div className="font-extrabold text-sm leading-tight">{item.label}</div>
                    <div className="text-[11px] opacity-75">{item.sub}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm bg-white/80 px-2.5 py-1 rounded-lg border border-black/5 shadow-2xs">
                    {item.num}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── More Services (Screen 9) ── */}
        <section className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg">
              ℹ️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-800">More Services</h2>
              <p className="text-xs text-stone-500">Event guidance and pilgrim accessibility</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: 'Information Centres',
                desc: 'Located at Rajahmundry railway station, bus stands & main ghats',
                icon: Info,
                link: '/map?category=shelter',
              },
              {
                title: 'Lost & Found Counters',
                desc: 'Report or find lost personal belongings and family members',
                icon: Search,
                link: '/map?q=Information',
              },
              {
                title: 'Accessibility Services',
                desc: 'Wheelchair access points, battery carts & assistance for elderly',
                icon: Accessibility,
                link: '/map?category=toilet',
              },
              {
                title: 'Official Event Updates',
                desc: 'Live crowd density alerts and ghat operational status',
                icon: Bell,
                link: '/dashboard',
              },
            ].map((srv, idx) => (
              <Link
                key={idx}
                to={srv.link}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-100 bg-[#fffdfa] hover:bg-white hover:border-amber-200 transition shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition">
                    <srv.icon size={18} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-stone-900 group-hover:text-[#991b1b] transition">
                      {srv.title}
                    </div>
                    <div className="text-xs text-stone-500">{srv.desc}</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-stone-400 group-hover:text-[#991b1b] transition" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Offline Architecture Card (Screen 7) ── */}
        <section className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 rounded-3xl p-5 border border-amber-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#991b1b] flex items-center justify-center font-bold text-xl shadow-xs border border-amber-200">
              📶
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#881337]">You're Ready for Offline Use</h2>
              <p className="text-xs text-stone-600">
                You can explore maps, facilities and navigation even without mobile network
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4 bg-white/80 p-3.5 rounded-2xl border border-amber-200/50">
            {[
              'Facility locations and verification details cached on your device',
              'Downloaded map area and GPS location tracking',
              'Basic straight-line navigation fallback',
              'Emergency contact numbers accessible anytime',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
