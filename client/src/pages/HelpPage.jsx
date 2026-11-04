import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ArrowLeft,
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  Info,
  Search,
  Accessibility,
  CheckCircle2,
  Calendar,
  Waves,
  Bus,
  Sparkles,
} from 'lucide-react';
import { useLanguageStore } from '../store/useStore.js';

export default function HelpPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const alerts = [
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
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* ── Top Header ── */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white pt-4 pb-5 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'హోమ్' : isHi ? 'होम' : 'Back'}</span>
          </button>

          <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
            {isTe ? 'అధికారిక బులెటిన్లు & సలహాలు' : isHi ? 'आधिकारिक बुलेटिन एवं सलाह' : 'Official Bulletins & Advisories'}
          </h1>

          <div className="w-16 flex justify-end">
            <Link
              to="/events"
              className="text-[11px] font-bold bg-amber-400 text-stone-900 px-2.5 py-1 rounded-full shadow-xs hover:bg-amber-300 transition"
            >
              Events →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* ── Official Pushkaram Bulletins & Alerts Header Card (Matching User Image 1) ── */}
        <div className="bg-[#eefcf4] dark:bg-emerald-950/30 p-5 rounded-3xl border border-emerald-300/80 dark:border-emerald-800/60 shadow-xs">
          <h2 className="font-black text-base sm:text-lg text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
            <Bell size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {isTe
                ? 'అధికారిక పుష్కర హెచ్చరికలు & బులెటిన్లు'
                : isHi
                ? 'आधिकारिक पुष्करम बुलेटिन एवं अलर्ट'
                : 'Official Pushkaram Bulletins & Alerts'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 mt-1.5 font-medium">
            {isTe
              ? 'లైవ్ నదీ ప్రవాహం, పవిత్ర స్నాన ముహూర్తాలు మరియు ట్రాఫిక్ సమాచారం.'
              : isHi
              ? 'लाइव नदी जलस्तर, पवित्र स्नान मुहूर्त और यातायात सलाह।'
              : 'Live river water levels, auspicious bath muhurtams, and traffic movement advisory.'}
          </p>
        </div>

        {/* ── Alert Cards List (Matching Exact User Reference Image 1) ── */}
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-md transition space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${alert.badgeClass}`}
                >
                  {alert.tag}
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono font-medium">
                  {alert.time}
                </span>
              </div>

              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white pt-0.5 leading-snug">
                {isTe ? alert.title_te : isHi ? alert.title_hi : alert.title}
              </h3>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                {isTe ? alert.desc_te : isHi ? alert.desc_hi : alert.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Emergency Pushkaram Assistance Row ── */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/20 rounded-3xl p-5 border border-red-200/80 dark:border-red-900/40 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
              🆘
            </div>
            <div>
              <div className="font-extrabold text-sm text-red-950 dark:text-rose-300">
                {isTe ? 'అత్యవసర పుష్కర సహాయం' : isHi ? 'आपातकालीन सहायता' : 'Emergency Pushkaram Assistance'}
              </div>
              <div className="text-[11px] text-red-800/80 dark:text-rose-400">
                {isTe ? 'యాత్రికుల రక్షణ కోసం 24×7 అందుబాటులో ఉంది' : 'Available 24×7 for pilgrim safety'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: isTe ? 'అత్యవసరం' : 'Emergency', num: '108', icon: PhoneCall, color: 'text-red-700 bg-white dark:bg-stone-800 border-red-200 dark:border-stone-700' },
              { label: isTe ? 'పోలీస్' : 'Police Help', num: '100', icon: ShieldAlert, color: 'text-blue-700 bg-white dark:bg-stone-800 border-blue-200 dark:border-stone-700' },
              { label: isTe ? 'అంబులెన్స్' : 'Ambulance', num: '108', icon: HeartPulse, color: 'text-emerald-700 bg-white dark:bg-stone-800 border-emerald-200 dark:border-stone-700' },
              { label: isTe ? 'హెల్ప్‌లైన్' : 'Helpline', num: '1800-425-4567', icon: PhoneCall, color: 'text-amber-800 bg-white dark:bg-stone-800 border-amber-200 dark:border-stone-700' },
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

        {/* ── Offline Architecture Card ── */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-amber-200/80 dark:border-stone-800 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xl border border-amber-200/60 dark:border-amber-900/60">
              📶
            </div>
            <div>
              <div className="font-extrabold text-sm text-stone-900 dark:text-white">
                {isTe ? 'పూర్తిగా ఆఫ్‌లైన్‌లో అందుబాటులో ఉంది' : 'Available Completely Offline'}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {isTe
                  ? 'ఇంటర్నెట్ లేకుండానే సౌకర్యాల స్థానాలు మరియు మ్యాప్ నావిగేషన్ పని చేస్తాయి'
                  : 'Facility locations and map navigation work seamlessly without mobile network.'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {[
              isTe ? 'సౌకర్యాల వివరాలు సేవ్ అయ్యాయి' : 'IndexedDB offline storage cache',
              isTe ? 'మ్యాప్ టైల్స్ క్యాష్ అయ్యాయి' : 'Pre-cached GIS geometry coordinates',
              isTe ? 'టర్న్-బై-టర్న్ నావిగేషన్ సిద్ధం' : 'Offline GPS turn-by-turn guidance',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
