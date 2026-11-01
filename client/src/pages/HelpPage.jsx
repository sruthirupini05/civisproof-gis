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
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useLanguageStore } from '../store/useStore.js';

export default function HelpPage() {
  const { currentLang } = useLanguageStore();
  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white p-6 shadow-md text-center">
        <h1 className="text-xl sm:text-2xl font-black mb-1">
          {isTe ? 'అత్యవసర సహాయం & సేవలు' : isHi ? 'आपातकालीन सहायता और सेवाएं' : 'Emergency Help & Services'}
        </h1>
        <p className="text-xs sm:text-sm text-amber-200/90">
          {isTe
            ? 'గోదావరి పుష్కరాలు 2027 — 24×7 యాత్రికుల రక్షణ'
            : isHi
            ? 'गोदावरी पुष्करालु 2027 — 24×7 तीर्थयात्री सहायता'
            : 'Godavari Pushkaralu 2027 — 24×7 Pilgrim Support'}
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
              <h2 className="text-base font-extrabold text-[#881337]">
                {isTe ? 'అత్యవసర హెల్ప్‌లైన్లు' : isHi ? 'आपातकालीन हेल्पलाइन' : 'Emergency Help'}
              </h2>
              <p className="text-xs text-stone-500">
                {isTe ? 'నేరుగా కాల్ చేయడానికి నంబర్‌పై నొక్కండి' : isHi ? 'कॉल करने के लिए नंबर पर टैप करें' : 'Tap to call directly'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: isTe ? 'అత్యవసర ప్రతిస్పందన' : isHi ? 'आपातकालीन प्रतिक्रिया' : 'Emergency Response',
                sub: isTe ? 'ఉచిత టోల్‌ఫ్రీ 24×7' : isHi ? 'टोल फ्री 24×7' : 'Toll-free 24×7',
                num: '108',
                icon: PhoneCall,
                bg: 'bg-red-50 text-red-900 border-red-200',
              },
              {
                label: isTe ? 'పోలీస్ పుష్కర విభాగం' : isHi ? 'पुष्करम पुलिस सहायता' : 'Police Pushkaram Cell',
                sub: isTe ? 'రాజమండ్రి పోలీస్ కంట్రోల్' : isHi ? 'राजमुंदरी पुलिस कंट्रोल' : 'Rajahmundry Police',
                num: '100',
                icon: ShieldAlert,
                bg: 'bg-blue-50 text-blue-900 border-blue-200',
              },
              {
                label: isTe ? 'అంబులెన్స్ & ట్రామా' : isHi ? 'एम्बुलेंस व ट्रॉमा यूनिट' : 'Ambulance & Trauma',
                sub: isTe ? 'ఘాట్ జోన్ మొబైల్ విభాగాలు' : isHi ? 'घाट क्षेत्र मोबाइल यूनिट' : 'Ghat Zone Mobile Units',
                num: '108',
                icon: HeartPulse,
                bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
              },
              {
                label: isTe ? 'యాత్రికుల సమాచార కేంద్రం' : isHi ? 'तीर्थयात्री सूचना डेस्क' : 'Pilgrim Help Desk',
                sub: isTe ? 'పురపాలక సహాయ కేంద్రం' : isHi ? 'नगर निगम हेल्प डेस्क' : 'Municipal Help Desk',
                num: '0883-2475555',
                icon: Info,
                bg: 'bg-amber-50 text-amber-900 border-amber-200',
              },
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
              <h2 className="text-base font-extrabold text-stone-800">
                {isTe ? 'ఇతర సేవలు & మార్గదర్శకాలు' : isHi ? 'अन्य सेवाएं एवं मार्गदर्शन' : 'More Services'}
              </h2>
              <p className="text-xs text-stone-500">
                {isTe ? 'పుష్కర సమాచారం మరియు సౌకర్యాలు' : isHi ? 'पुष्करम सूचना और सुविधाएं' : 'Event guidance and accessibility'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: isTe ? 'సమాచార కేంద్రాలు' : isHi ? 'सूचना केंद्र' : 'Information Centres',
                desc: isTe ? 'రైల్వే స్టేషన్, బస్ స్టాండ్ మరియు ప్రధాన ఘాట్ల వద్ద' : isHi ? 'रेलवे स्टेशन, बस स्टैंड एवं मुख्य घाटों पर' : 'At railway station, bus stands & main ghats',
                icon: Info,
                link: '/services/info',
              },
              {
                title: isTe ? 'తప్పిపోయిన వారి / వస్తువుల సహాయ కేంద్రం' : isHi ? 'खोया-पाया केंद्र' : 'Lost & Found Counters',
                desc: isTe ? 'వస్తువులు లేదా కుటుంబ సభ్యులను గుర్తించడానికి' : isHi ? 'खोई वस्तुओं या परिजनों की सूचना के लिए' : 'Report or find lost items and relatives',
                icon: Search,
                link: '/services/lost-found',
              },
              {
                title: isTe ? 'ప్రత్యేక సహాయ & వీల్‌చైర్ సేవలు' : isHi ? 'दिव्यांग व वृद्ध सहायता सेवा' : 'Accessibility Services',
                desc: isTe ? 'వృద్ధులు మరియు దివ్యాంగులకు ఉచిత బ్యాటరీ కార్లు' : isHi ? 'बुजुर्गों और दिव्यांगों के लिए बैटरी कार व व्हीलचेयर' : 'Wheelchairs & battery assistance for elderly',
                icon: Accessibility,
                link: '/services/accessibility',
              },
              {
                title: isTe ? 'అధికారిక పుష్కర నవీకరణలు' : isHi ? 'आधिकारिक पुष्करम अपडेट' : 'Official Event Updates',
                desc: isTe ? 'ఘాట్ల రద్దీ సమాచారం మరియు హెచ్చరికలు' : isHi ? 'घाटों पर भीड़ एवं संचालन की ताजा स्थिति' : 'Crowd density and ghat operational updates',
                icon: Bell,
                link: '/services/events',
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
              <h2 className="text-base font-extrabold text-[#881337]">
                {isTe ? 'మీరు ఆఫ్‌లైన్‌లో ఉపయోగించడానికి సిద్ధంగా ఉన్నారు' : isHi ? 'आप ऑफ़लाइन उपयोग के लिए तैयार हैं' : "You're Ready for Offline Use"}
              </h2>
              <p className="text-xs text-stone-600">
                {isTe
                  ? 'మొబైల్ సిగ్నల్ లేకపోయినా మ్యాప్‌లు, సౌకర్యాలు మరియు నావిగేషన్ పని చేస్తాయి'
                  : isHi
                  ? 'मोबाइल नेटवर्क न होने पर भी नक्शा, सुविधाएं और नेविगेशन उपलब्ध हैं'
                  : 'Explore maps, facilities and navigation even without mobile network'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4 bg-white/80 p-3.5 rounded-2xl border border-amber-200/50">
            {[
              isTe ? 'సౌకర్యాల స్థానాలు మరియు సమాచారం మీ పరికరంలో భద్రపరచబడ్డాయి' : isHi ? 'सुविधाओं के स्थान और विवरण डिवाइस में सुरक्षित हैं' : 'Facility locations and verification details cached on device',
              isTe ? 'డౌన్‌లోడ్ చేసిన మ్యాప్ ప్రాంతం మరియు GPS ట్రాకింగ్' : isHi ? 'ऑफ़लाइन नक्शा और जीपीएस नेविगेशन' : 'Downloaded map area and GPS tracking',
              isTe ? 'అత్యవసర ఫోన్ నంబర్లు ఎల్లప్పుడూ అందుబాటులో ఉంటాయి' : isHi ? 'आपातकालीन संपर्क नंबर हमेशा उपलब्ध हैं' : 'Emergency contact numbers accessible anytime',
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
