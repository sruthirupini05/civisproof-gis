import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  Info,
  Search,
  Accessibility,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useLanguageStore } from '../store/useStore.js';

export default function HelpPage({ defaultView }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  // 'overview' (classic Learn More page) | 'bulletins' (Official Bulletins & Alerts screen)
  const initialView = searchParams.get('tab') === 'bulletins' || defaultView === 'bulletins' ? 'bulletins' : 'overview';
  const [activeView, setActiveView] = useState(initialView);

  useEffect(() => {
    if (searchParams.get('tab') === 'bulletins') {
      setActiveView('bulletins');
    }
  }, [searchParams]);

  const setView = (view) => {
    setActiveView(view);
    if (view === 'bulletins') {
      setSearchParams({ tab: 'bulletins' });
    } else {
      setSearchParams({});
    }
  };

  const bulletins = [
    {
      id: 'alt-01',
      tag: 'LIVE WATER STATUS',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300',
      time: 'Updated Today 07:00 AM',
      title: 'Godavari Water Flow Normal & Safe',
      title_te: 'గోదావరి నది ప్రవాహం సాధారణ & సురక్షిత స్థితిలో ఉంది',
      title_hi: 'गोदावरी जल प्रवाह सामान्य एवं सुरक्षित',
      desc: 'Water level at Dowleswaram barrage is normal. Bathing permitted across all 5 main ghats with safety barricades intact.',
      desc_te: 'ధవళేశ్వరం బ్యారేజీ వద్ద నీటి మట్టం సాధారణంగా ఉంది. రక్షణ బారికేడ్ల పరిధిలో అన్ని ప్రధాన ఘాట్లలో పవిత్ర స్నానాలు అనుమతించబడ్డాయి.',
      desc_hi: 'धवलेश्वरम बैराज पर जलस्तर सामान्य है। सुरक्षा बैरिकेड्स के भीतर सभी मुख्य घाटों पर स्नान की अनुमति है।',
    },
    {
      id: 'alt-02',
      tag: 'TRANSIT UPDATE',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300',
      time: 'Operating Continuous',
      title: 'Free Circular City Ghat Buses Active',
      title_te: 'ఉచిత సర్క్యులర్ సిటీ ఘాట్ బస్సులు నడుస్తున్నాయి',
      title_hi: 'निःशुल्क सर्कुलर सिटी घाट बसें सक्रिय',
      desc: 'APSRTC operating free non-stop feeder buses between satellite parking grounds and Kotipalli Ghat.',
      desc_te: 'శాటిలైట్ పార్కింగ్ మైదానాలు మరియు కోటిపల్లి ఘాట్ మధ్య ఏపీఎస్ఆర్టీసీ ఉచిత నిరంతర ఫీడర్ బస్సులను నడుపుతోంది.',
      desc_hi: 'एपीएसआरटीसी सैटेलाइट पार्किंग मैदानों और कोटिपल्ली घाट के बीच निरंतर मुफ्त बसें संचालित कर रहा है।',
    },
    {
      id: 'alt-03',
      tag: 'RITUAL ADVISORY',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300',
      time: '04:30 AM - 07:00 AM',
      title: 'Morning Brahma Muhurtam Bathing Hours',
      title_te: 'ఉదయపు బ్రాహ్మీ ముహూర్తం పవిత్ర స్నాన సమయాలు',
      title_hi: 'प्रातः ब्राह्म मुहूर्त स्नान समय',
      desc: 'Special sacred lamp floating (Deepa Daanam) permitted at Saraswathi Ghat and Panchavati Ghat.',
      desc_te: 'సరస్వతి ఘాట్ మరియు పంచవటి ఘాట్ వద్ద పవిత్ర దీపారాధన (దీప దానం) ప్రత్యేకంగా అనుమతించబడింది.',
      desc_hi: 'सरस्वती घाट एवं पंचवटी घाट पर पवित्र दीप दान अनुष्ठान की विशेष अनुमति दी गई है।',
    },
    {
      id: 'alt-04',
      tag: 'SAFETY & RESCUE',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300',
      time: '24×7 Active Patrol',
      title: 'NDRF Water Rescue & Life Jackets Ready',
      title_te: 'ఎన్.డి.ఆర్.ఎఫ్ నీటి రెస్క్యూ & లైఫ్ జాకెట్లు సిద్ధం',
      title_hi: 'एनडीआरएफ जल बचाव एवं लाइफ जैकेट तैनात',
      desc: 'Professional swimmers and rescue speedboats continuously patrolling riverfront. Pilgrims requested to bathe strictly within marked barricades.',
      desc_te: 'నదీ తీరంలో నిరంతర గస్తీలో స్పీడ్ బోట్లు మరియు రెస్క్యూ స్విమ్మర్లు. బారికేడ్ల పరిధిలోనే స్నానం చేయవలసిందిగా మనవి.',
      desc_hi: 'नदी तट पर लाइफगार्ड एवं स्पीड बोट्स निरंतर गश्त पर हैं। कृपया बैरिकेड्स के भीतर ही स्नान करें।',
    },
  ];

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 transition-colors">
      {/* ── Top Header ── */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white p-6 shadow-md text-center relative">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (activeView === 'bulletins') {
                setView('overview');
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{activeView === 'bulletins' ? (isTe ? 'వెనుకకు' : 'Back to Help') : (isTe ? 'హోమ్' : 'Back')}</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-2xl font-black mb-0.5">
              {activeView === 'bulletins'
                ? isTe
                  ? 'అధికారిక బులెటిన్లు & సలహాలు'
                  : 'Official Pushkaram Bulletins'
                : isTe
                ? 'అత్యవసర సహాయం & సేవలు'
                : isHi
                ? 'आपातकालीन सहायता और सेवाएं'
                : 'Emergency Help & Services'}
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-200/90">
              {isTe
                ? 'గోదావరి పుష్కరాలు 2027 — 24×7 యాత్రికుల రక్షణ'
                : 'Godavari Pushkaralu 2027 — 24×7 Pilgrim Support'}
            </p>
          </div>

          <Link
            to="/events"
            className="text-[11px] font-bold bg-amber-400 text-stone-900 px-3 py-1.5 rounded-full shadow-xs hover:bg-amber-300 transition"
          >
            Events →
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: OFFICIAL BULLETINS & ALERTS (MATCHING USER SCREENSHOT) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeView === 'bulletins' ? (
          <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200">
            {/* Top Green Banner */}
            <div className="rounded-3xl p-5 border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={20} className="text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isTe ? 'అధికారిక పుష్కర బులెటిన్లు & హెచ్చరికలు' : 'Official Pushkaram Bulletins & Alerts'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-200/80">
                {isTe
                  ? 'నదీ జలమట్టం, పవిత్ర స్నాన ముహూర్తాలు మరియు ట్రాఫిక్ కదలికల తాజా సమాచారం.'
                  : 'Live river water levels, auspicious bath muhurtams, and traffic movement advisory.'}
              </p>
            </div>

            {/* 4 Official Bulletin Cards */}
            <div className="space-y-3.5">
              {bulletins.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-stone-200/90 dark:border-slate-800 shadow-xs space-y-2.5 transition hover:border-amber-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${item.badgeClass}`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-[11px] font-medium text-stone-400 dark:text-slate-400">
                      {item.time}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white leading-snug">
                    {isTe && item.title_te ? item.title_te : isHi && item.title_hi ? item.title_hi : item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                    {isTe && item.desc_te ? item.desc_te : isHi && item.desc_hi ? item.desc_hi : item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Switch back button */}
            <div className="text-center pt-2">
              <button
                onClick={() => setView('overview')}
                className="py-3 px-6 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-800 dark:text-slate-200 font-extrabold text-xs sm:text-sm rounded-full border border-stone-300 dark:border-slate-700 transition shadow-xs"
              >
                ← {isTe ? 'అత్యవసర సహాయం & సేవల పేజీకి తిరిగి వెళ్లండి' : 'Back to Emergency Help & Services'}
              </button>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════ */
          /* VIEW 2: CLASSIC LEARN MORE & SERVICES PAGE (AS BEFORE)          */
          /* ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* ── Emergency Help (4 Helpline Cards) ── */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-full bg-red-100 text-[#991b1b] flex items-center justify-center font-bold text-lg">
                  🆘
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#881337] dark:text-amber-300">
                    {isTe ? 'అత్యవసర హెల్ప్‌లైన్లు' : isHi ? 'आपातकालीन हेल्पलाइन' : 'Emergency Help'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {isTe ? 'నేరుగా కాల్ చేయడానికి నంబర్‌పై నొక్కండి' : 'Tap to call directly'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    label: isTe ? 'అత్యవసర ప్రతిస్పందన' : 'Emergency Response',
                    sub: isTe ? 'ఉచిత టోల్‌ఫ్రీ 24×7' : 'Toll-free 24×7',
                    num: '108',
                    icon: PhoneCall,
                    bg: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40',
                  },
                  {
                    label: isTe ? 'పోలీస్ పుష్కర విభాగం' : 'Police Pushkaram Cell',
                    sub: isTe ? 'రాజమండ్రి పోలీస్ కంట్రోల్' : 'Rajahmundry Police',
                    num: '100',
                    icon: ShieldAlert,
                    bg: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
                  },
                  {
                    label: isTe ? 'అంబులెన్స్ & ట్రామా' : 'Ambulance & Trauma',
                    sub: isTe ? 'ఘాట్ జోన్ మొబైల్ విభాగాలు' : 'Ghat Zone Mobile Units',
                    num: '108',
                    icon: HeartPulse,
                    bg: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
                  },
                  {
                    label: isTe ? 'యాత్రికుల సమాచార కేంద్రం' : 'Pilgrim Help Desk',
                    sub: isTe ? 'పురపాలక సహాయ కేంద్రం' : 'Municipal Help Desk',
                    num: '1800-425-4567',
                    icon: Info,
                    bg: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
                  },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href={`tel:${item.num}`}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${item.bg} hover:shadow-xs transition`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800 flex items-center justify-center">
                        <item.icon size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] opacity-80">{item.sub}</div>
                      </div>
                    </div>
                    <span className="font-black text-sm">{item.num}</span>
                  </a>
                ))}
              </div>
            </section>

            {/* ── 4 Essential Pilgrim Services (WITH BULLETINS ADDED IN) ── */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#881337] dark:text-amber-300">
                    {isTe ? 'ముఖ్యమైన యాత్రికుల సేవలు' : isHi ? 'महत्वपूर्ण तीर्थयात्री सेवाएं' : 'Essential Pilgrim Services'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {isTe ? 'పుష్కర సేవా కేంద్రాలు & అధికారిక సలహాలు' : 'Pushkaram assistance counters & official updates'}
                  </p>
                </div>
              </div>

              {/* 4 Feature Columns / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Official Pushkaram Bulletins (CLICKABLE TO OPEN BULLETINS) */}
                <button
                  type="button"
                  onClick={() => setView('bulletins')}
                  className="w-full text-left flex items-center justify-between p-3.5 rounded-2xl border-2 border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 transition shadow-xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                      <Bell size={20} className="text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <span>{isTe ? 'పుష్కర బులెటిన్లు & హెచ్చరికలు' : 'Official Bulletins & Alerts'}</span>
                        <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase">
                          Live
                        </span>
                      </div>
                      <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                        {isTe ? 'నదీ ప్రవాహం, బస్సుల నవీకరణలు & సూచనలు' : 'Water levels, buses & ritual updates'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-emerald-700 dark:text-emerald-300 group-hover:translate-x-1 transition" />
                </button>

                {/* 2. Lost & Found Counter */}
                <Link
                  to="/services/lost-found"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-[#fffdfa] dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-300 transition shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition">
                      <Search size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-stone-900 dark:text-white group-hover:text-[#991b1b] transition">
                        {isTe ? 'తప్పిపోయిన వారి సమాచార కేంద్రం' : 'Lost & Found Counter'}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        {isTe ? 'ప్రధాన ఘాట్లు & రైల్వే స్టేషన్ల వద్ద కేంద్రాలు' : 'Help desks at ghats & transit hubs'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-stone-400 group-hover:text-[#991b1b] transition" />
                </Link>

                {/* 3. Accessibility & Elderly Support */}
                <Link
                  to="/services/accessibility"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-[#fffdfa] dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-300 transition shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition">
                      <Accessibility size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-stone-900 dark:text-white group-hover:text-[#991b1b] transition">
                        {isTe ? 'ప్రత్యేక సహాయం & వీల్‌చైర్లు' : 'Accessibility & Elderly Support'}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        {isTe ? 'వృద్ధులకు ఉచిత బ్యాటరీ కార్లు & ర్యాంప్‌లు' : 'Wheelchairs & battery cart assistance'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-stone-400 group-hover:text-[#991b1b] transition" />
                </Link>

                {/* 4. Events Schedule & Cultural Programs */}
                <Link
                  to="/events"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-[#fffdfa] dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-300 transition shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-stone-900 dark:text-white group-hover:text-[#991b1b] transition">
                        {isTe ? 'సాంస్కృతిక కార్యక్రమాల షెడ్యూల్' : 'Pushkaram Events Schedule'}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">
                        {isTe ? 'సాయంత్రం హారతి, సంగీత కచేరీలు & నాటకాలు' : 'Maha Harathi, music & cultural dramas'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-stone-400 group-hover:text-[#991b1b] transition" />
                </Link>
              </div>
            </section>

            {/* ── Offline Architecture Card (Screen 7 as before) ── */}
            <section className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 rounded-3xl p-5 border border-amber-200/80 dark:border-amber-900/40 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-[#991b1b] dark:text-amber-400 flex items-center justify-center font-bold text-xl shadow-xs border border-amber-200 dark:border-slate-700">
                  📶
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#881337] dark:text-amber-300">
                    {isTe ? 'మీరు ఆఫ్‌లైన్‌లో ఉపయోగించడానికి సిద్ధంగా ఉన్నారు' : isHi ? 'आप ऑफ़लाइन उपयोग के लिए तैयार हैं' : "You're Ready for Offline Use"}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    {isTe
                      ? 'మొబైల్ సిగ్నల్ లేకపోయినా మ్యాప్‌లు, సౌకర్యాలు మరియు నావిగేషన్ పని చేస్తాయి'
                      : 'Explore maps, facilities and navigation even without mobile network'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4 bg-white/90 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-amber-200/50 dark:border-slate-700">
                {[
                  isTe
                    ? 'సౌకర్యాల స్థానాలు మరియు సమాచారం మీ పరికరంలో భద్రపరచబడ్డాయి'
                    : 'Facility locations and verification details cached on device',
                  isTe
                    ? 'డౌన్‌లోడ్ చేసిన మ్యాప్ ప్రాంతం మరియు GPS ట్రాకింగ్'
                    : 'Downloaded map area and GPS tracking',
                  isTe
                    ? 'అత్యవసర ఫోన్ నంబర్లు ఎల్లప్పుడూ అందుబాటులో ఉంటాయి'
                    : 'Emergency contact numbers accessible anytime',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
