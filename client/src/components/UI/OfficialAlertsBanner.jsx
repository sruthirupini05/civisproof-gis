import React, { useState } from 'react';
import { Bell, ChevronRight, AlertTriangle, ShieldCheck, Waves, Bus, Sun } from 'lucide-react';
import { useLanguageStore } from '../../store/useStore.js';

export const INITIAL_ALERTS = [
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
    desc_hi: 'धवलेश्वरम बैराज पर जलस्तर सामान्य है। सुरक्षा बैरिकेड्स के भीतर सभी मुख्य घाटों पर स्नान की अनुमति है।'
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
    desc_hi: 'एपीएसआरटीसी सैटेलाइट पार्किंग मैदानों और कोटिपल्ली घाट के बीच निरंतर मुफ्त बसें संचालित कर रहा है।'
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
    desc_hi: 'सरस्वती घाट एवं पंचवटी घाट पर पवित्र दीप दान अनुष्ठान की विशेष अनुमति दी गई है।'
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
    desc_hi: 'नदी तट पर लाइफगार्ड एवं स्पीड बोट्स निरंतर गश्त पर हैं। कृपया बैरिकेड्स के भीतर ही स्नान करें।'
  }
];

export default function OfficialAlertsBanner() {
  const { currentLang } = useLanguageStore();
  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [alerts] = useState(INITIAL_ALERTS);

  return (
    <div className="space-y-3 my-6 animate-in fade-in duration-300">
      {/* ── Official Pushkaram Bulletins Header (Matching Reference Screen 2) ── */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-3xl border border-emerald-200/90 dark:border-emerald-900/40 shadow-xs">
        <h2 className="font-black text-sm sm:text-base text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
          <Bell size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {isTe
              ? 'అధికారిక పుష్కర హెచ్చరికలు & బులెటిన్లు'
              : isHi
              ? 'आधिकारिक पुष्करम बुलेटिन एवं अलर्ट'
              : 'Official Pushkaram Bulletins & Alerts'}
          </span>
        </h2>
        <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">
          {isTe
            ? 'లైవ్ నదీ ప్రవాహం, పవిత్ర స్నాన ముహూర్తాలు మరియు ట్రాఫిక్ సమాచారం.'
            : isHi
            ? 'लाइव नदी जलस्तर, पवित्र स्नान मुहूर्त और यातायात सलाह।'
            : 'Live river water levels, auspicious bath muhurtams, and traffic movement advisory.'}
        </p>
      </div>

      {/* ── Alert Cards List (Matching Exact Reference Layout) ── */}
      <div className="space-y-2.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-md transition space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${alert.badgeClass}`}
              >
                {alert.tag}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono font-medium">
                {alert.time}
              </span>
            </div>

            <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-white leading-snug">
              {isTe && alert.title_te ? alert.title_te : isHi && alert.title_hi ? alert.title_hi : alert.title}
            </h3>

            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              {isTe && alert.desc_te ? alert.desc_te : isHi && alert.desc_hi ? alert.desc_hi : alert.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
