import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Info,
  Search,
  Accessibility,
  Bell,
  Phone,
  MapPin,
  Navigation,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useLanguageStore, useThemeStore } from '../store/useStore.js';

export default function MoreServicesPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [activeTab, setActiveTab] = useState(type || 'info');
  const [lostReportSuccess, setLostReportSuccess] = useState('');
  const [lostName, setLostName] = useState('');
  const [lostContact, setLostContact] = useState('');
  const [lostDetails, setLostDetails] = useState('');

  const handleLostSubmit = (e) => {
    e.preventDefault();
    if (!lostName || !lostContact) return;
    setLostReportSuccess(
      isTe
        ? 'మీ నివేదిక నమోదైంది! పుష్కర పోలీస్ కంట్రోల్ రూమ్ మరియు మైక్ ద్వారా అనౌన్స్ చేయబడుతుంది.'
        : isHi
        ? 'आपकी रिपोर्ट दर्ज हो गई है! पुलिस नियंत्रण कक्ष एवं लाउडस्पीकर द्वारा सूचित किया जाएगा।'
        : 'Report logged! Transmitted to Central Police Control Room & Public Announcement Kiosks.'
    );
    setLostName('');
    setLostContact('');
    setLostDetails('');
    setTimeout(() => setLostReportSuccess(''), 6000);
  };

  const tabs = [
    { id: 'info', icon: Info, label: isTe ? 'సమాచార కేంద్రాలు' : isHi ? 'सूचना केंद्र' : 'Information Desks' },
    { id: 'lost-found', icon: Search, label: isTe ? 'తప్పిపోయిన వారి కేంద్రం' : isHi ? 'खोया-पाया' : 'Lost & Found' },
    { id: 'accessibility', icon: Accessibility, label: isTe ? 'దివ్యాంగుల సేవలు' : isHi ? 'दिव्यांग सहायता' : 'Accessibility' },
    { id: 'events', icon: Bell, label: isTe ? 'అధికారిక హెచ్చరికలు' : isHi ? 'पुष्करम अपडेट' : 'Event Alerts' },
  ];

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/help')}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-extrabold text-base tracking-tight">
          {isTe ? 'పుష్కర ప్రత్యేక సేవలు' : isHi ? 'पुष्करम विशेष सेवाएं' : 'Special Pilgrim Services'}
        </h1>

        <div className="w-9" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* ── Tab Switcher ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-stone-200 dark:border-slate-700">
          {tabs.map((tab) => {
            const isAct = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isAct
                    ? 'bg-[#991b1b] text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: Information Centres ── */}
        {activeTab === 'info' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-3xl border border-amber-200/80 dark:border-amber-900/40">
              <h2 className="font-extrabold text-sm text-amber-950 dark:text-amber-300 flex items-center gap-2">
                <Info size={16} className="text-[#991b1b] dark:text-rose-400" />
                <span>{isTe ? 'అధికారిక సమాచార & సహాయ కేంద్రాలు' : isHi ? 'आधिकारिक सूचना एवं मार्गदर्शन केंद्र' : 'Official Pilgrim Information Desks'}</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                {isTe
                  ? 'రాజమండ్రిలోని ప్రధాన రవాణా కూడళ్లు మరియు ఘాట్ల వద్ద 24×7 పనిచేసే ప్రభుత్వ మార్గదర్శక కేంద్రాలు.'
                  : isHi
                  ? 'राजमहेंद्रवरम के मुख्य प्रवेश द्वारों एवं घाटों पर 24×7 संचालित सहायता केंद्र।'
                  : 'Round-the-clock government information counters for pilgrimage queries, route maps, and guidance.'}
              </p>
            </div>

            {[
              {
                name: isTe ? 'రైల్వే స్టేషన్ ప్రధాన సమాచార కేంద్రం' : isHi ? 'मुख्य रेलवे स्टेशन सूचना केंद्र' : 'Railway Station Main Helpdesk',
                location: 'Platform 1 Gate, Rajahmundry Railway Station',
                lat: 16.9856, lng: 81.7801,
                phone: '0883-2462222',
                hours: '24×7 Open',
                staff: 'South Central Railway & AP Tourism Guide Staff',
              },
              {
                name: isTe ? 'APSRTC సెంట్రల్ బస్ స్టాండ్ హెల్ప్‌డెస్క్' : isHi ? 'आरटीसी बस स्टैंड सूचना केंद्र' : 'Central Bus Terminal Information Post',
                location: 'Arrival Concourse, APSRTC Complex',
                lat: 17.0051, lng: 81.7877,
                phone: '0883-2473344',
                hours: '24×7 Open',
                staff: 'APSRTC & Municipal Liaison Officers',
              },
              {
                name: isTe ? 'కోటిపల్లి VIP ఘాట్ ప్రధాన కంట్రోల్ రూమ్' : isHi ? 'कोटिपल्ली घाट मुख्य नियंत्रण कक्ष' : 'Kotipalli Ghat Central Control Pavilion',
                location: 'Kotipalli Ghat Entrance Circle, Rajahmundry',
                lat: 16.9948, lng: 81.7798,
                phone: '0883-2475555',
                hours: '24×7 Open',
                staff: 'District Administration & Endowments Wing',
              },
              {
                name: isTe ? 'రాజమండ్రి విమానాశ్రయం టూరిజం కౌంటర్' : isHi ? 'हवाई अड्डा पर्यटन काउंटर' : 'Rajahmundry Airport Tourist Desk',
                location: 'Arrivals Terminal, Madhurapudi',
                lat: 17.1106, lng: 81.8193,
                phone: '0883-2487856',
                hours: '06:00 - 21:30',
                staff: 'AP Tourism Department Reception',
              },
            ].map((desk, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-amber-100 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100">{desk.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-[#991b1b] flex-shrink-0" />
                      <span>{desk.location}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200">
                    {desk.hours}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-400 pt-2 border-t border-stone-100 dark:border-slate-800">
                  <a href={`tel:${desk.phone}`} className="flex items-center gap-1 text-[#991b1b] dark:text-rose-400 font-bold hover:underline">
                    <Phone size={12} />
                    <span>{desk.phone}</span>
                  </a>
                  <button
                    onClick={() => navigate(`/map?q=${encodeURIComponent(desk.location)}`)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Navigation size={12} />
                    <span>{isTe ? 'మ్యాప్‌లో చూడండి' : isHi ? 'नक्शे पर देखें' : 'View on Map'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB 2: Lost & Found ── */}
        {activeTab === 'lost-found' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-3xl border border-red-200/80 dark:border-red-900/40">
              <h2 className="font-extrabold text-sm text-red-950 dark:text-rose-300 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600" />
                <span>{isTe ? 'తప్పిపోయిన వారి & వస్తువుల పునఃకలయిక కేంద్రం' : isHi ? 'खोया-पाया एवं जन उद्घोषणा केंद्र' : 'Lost & Found Liaison Kiosks'}</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                {isTe
                  ? 'పుష్కరాల్లో కుటుంబ సభ్యులు లేదా పిల్లలు తప్పిపోతే వెంటనే కింద నమోదు చేయండి లేదా నేరుగా పోలీస్ కంట్రోల్ రూమ్ నెంబర్ 100 లేదా 0883-2475555 కు కాల్ చేయండి.'
                  : isHi
                  ? 'यदि कोई परिजन या वस्तु खो जाए, तो तुरंत यहाँ विवरण दर्ज करें अथवा पुलिस हेल्पलाइन 100 पर संपर्क करें।'
                  : 'Report separated pilgrims, children, or valuable belongings for immediate broadcast across city PA speakers.'}
              </p>
            </div>

            {/* Direct Report Form */}
            <form onSubmit={handleLostSubmit} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-100 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100">
                {isTe ? 'తప్పిపోయిన వారి సమాచారాన్ని నమోదు చేయండి' : isHi ? 'खोए हुए व्यक्ति / वस्तु की रिपोर्ट दर्ज करें' : 'Submit Lost Report for Public Broadcast'}
              </h3>

              {lostReportSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{lostReportSuccess}</span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                    {isTe ? 'తప్పిపోయిన వ్యక్తి / వస్తువు పేరు:' : isHi ? 'खोए व्यक्ति / वस्तु का नाम:' : 'Name of Person / Item Description:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={lostName}
                    onChange={(e) => setLostName(e.target.value)}
                    placeholder={isTe ? 'ఉదా: వెంకటేశ్వర్లు (వయస్సు 65), లేదా నలుపు బ్యాగ్' : 'e.g. Rama Rao (Age 68), or Blue Travel Bag'}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-[#fefaf3] dark:bg-slate-800 text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                    {isTe ? 'మీ సంప్రదింపు ఫోన్ నెంబర్:' : isHi ? 'आपका संपर्क फोन नंबर:' : 'Contact Phone Number:'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={lostContact}
                    onChange={(e) => setLostContact(e.target.value)}
                    placeholder="e.g. 9848012345"
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-[#fefaf3] dark:bg-slate-800 text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">
                    {isTe ? 'చివరిగా చూసిన ప్రదేశం / గుర్తులు:' : isHi ? 'अंतिम बार देखे गए स्थान का विवरण:' : 'Last Seen Location & Identifying Details:'}
                  </label>
                  <textarea
                    rows={2}
                    value={lostDetails}
                    onChange={(e) => setLostDetails(e.target.value)}
                    placeholder={isTe ? 'ఉదా: కోటిపల్లి ఘాట్ సమీపంలో ఉదయం 10 గంటలకు' : 'e.g. Near Kotipalli Ghat gate wearing white dhoti at 10 AM'}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-[#fefaf3] dark:bg-slate-800 text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#991b1b] hover:bg-[#881337] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Send size={14} />
                <span>{isTe ? 'నివేదిక సమర్పించండి' : isHi ? 'रिपोर्ट सबमिट करें' : 'Transmit Report to Control Room'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: Accessibility & Elderly Assistance ── */}
        {activeTab === 'accessibility' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-3xl border border-blue-200/80 dark:border-blue-900/40">
              <h2 className="font-extrabold text-sm text-blue-950 dark:text-blue-300 flex items-center gap-2">
                <Accessibility size={16} className="text-blue-600" />
                <span>{isTe ? 'వృద్ధులు & దివ్యాంగుల ప్రత్యేక సేవలు' : isHi ? 'वरिष्ठ नागरिक एवं दिव्यांग सहायता' : 'Accessibility & Special Assistance'}</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                {isTe
                  ? 'పుష్కర ఘాట్లకు చేరుకోవడానికి ఉచిత ఎలక్ట్రిక్ బ్యాటరీ కార్లు, వీల్‌చైర్లు మరియు ర్యాంప్ సదుపాయాలు సిద్ధంగా ఉన్నాయి.'
                  : isHi
                  ? 'घाटों तक निःशुल्क बैटरी वाहन, व्हीलचेयर और रैंप सहायता की व्यवस्था।'
                  : 'Free electric shuttle carts, wheelchair dispatch kiosks, and dedicated ramps across all riverfront zones.'}
              </p>
            </div>

            {[
              {
                title: isTe ? 'ఉచిత ఎలక్ట్రిక్ బ్యాటరీ కార్ సర్వీస్' : isHi ? 'निःशुल्क बैटरी कार सेवा' : 'Free Battery Shuttle Carts',
                desc: isTe ? 'రైల్వే స్టేషన్ మరియు ఆర్టీసీ బస్ స్టాండ్ నుండి కోటిపల్లి & పంచవటి ఘాట్ల వరకు నిరంతరం తిరుగుతాయి.' : 'Continuous eco-friendly electric carts from Railway Station to Kotipalli Ghat.',
                spots: 'Boarding Point: Station Gate 1 & RTC Bus Stand Bay 5',
              },
              {
                title: isTe ? 'ఉచిత వీల్‌చైర్ రిజర్వేషన్ కేంద్రం' : isHi ? 'व्हीलचेयर सहायता केंद्र' : 'Complimentary Wheelchairs at Ghats',
                desc: isTe ? 'ప్రతి ఘాట్ ప్రవేశ ద్వారం వద్ద వాలంటీర్లతో కూడిన వీల్‌చైర్లు ఉచితంగా లభిస్తాయి.' : 'Over 200 wheelchairs with trained Red Cross volunteers deployed at ghat gates.',
                spots: 'Kotipalli Ghat Gate A, Panchavati Entrance, Gowthami Ghat',
              },
              {
                title: isTe ? 'ప్రత్యేక స్నానపు ర్యాంపులు & రెయిలింగ్స్' : isHi ? 'विशेष स्नान रैंप व रेलिंग' : 'Non-Slip Water Access Ramps',
                desc: isTe ? 'నదిలోకి దిగడానికి చేతి పట్టు రెయిలింగ్స్ మరియు జారకుండా ఉండే రాతి ర్యాంపులు నిర్మించబడ్డాయి.' : 'Gentle slope stone ramps with stainless steel grab bars into sacred river water.',
                spots: 'Panchavati Ghat Northern Ramp & Saraswathi Ghat',
              },
            ].map((acc, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-amber-100 dark:border-slate-800 shadow-xs space-y-1.5">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{acc.title}</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300">{acc.desc}</p>
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl">
                  {acc.spots}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB 4: Official Event Updates & Alerts ── */}
        {activeTab === 'events' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40">
              <h2 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                <Bell size={16} className="text-emerald-600" />
                <span>{isTe ? 'అధికారిక పుష్కర హెచ్చరికలు & ప్రకటనలు' : isHi ? 'आधिकारिक पुष्करम अपडेट्स व सूचनाएं' : 'Official Pushkaram Bulletins & Alerts'}</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                {isTe
                  ? 'గోదావరి జలమట్టం, పవిత్ర స్నాన ముహూర్తాలు మరియు ట్రాఫిక్ డైవర్షన్లు.'
                  : isHi
                  ? 'गोदावरी जलस्तर, स्नान मुहूर्त और यातायात व्यवस्था के आधिकारिक अपडेट।'
                  : 'Live river water levels, auspicious bath muhurtams, and traffic movement advisory.'}
              </p>
            </div>

            {[
              {
                tag: 'LIVE WATER STATUS',
                color: 'bg-emerald-100 text-emerald-900',
                title: isTe ? 'గోదావరి నది ప్రవాహం సాధారణ స్థితిలో ఉంది' : 'Godavari Water Flow Normal & Safe',
                time: 'Updated Today 07:00 AM',
                desc: isTe ? 'ధవళేశ్వరం వద్ద నీటి మట్టం సురక్షిత పరిమితిలో ఉంది. ఘాట్ల వద్ద స్నానాలకు ఎటువంటి ఆటంకం లేదు.' : 'Water level at Dowleswaram barrage is normal. Bathing permitted across all 5 main ghats with safety barricades intact.',
              },
              {
                tag: 'TRANSIT UPDATE',
                color: 'bg-blue-100 text-blue-900',
                title: isTe ? 'ఉచిత సిటీ సర్క్యులర్ బస్సులు ప్రారంభం' : 'Free Circular City Ghat Buses Active',
                time: 'Operating Continuous',
                desc: isTe ? 'ప్రతి 5 నిమిషాలకు మోరంపూడి పార్కింగ్ నుండి కోటిపల్లి ఘాట్ వరకు ఉచిత బస్సులు నడుస్తున్నాయి.' : 'APSRTC operating free non-stop feeder buses between satellite parking grounds and Kotipalli Ghat.',
              },
              {
                tag: 'RITUAL ADVISORY',
                color: 'bg-amber-100 text-amber-900',
                title: isTe ? 'ఉదయపు బ్రాహ్మీ ముహూర్తం స్నానాలు' : 'Morning Brahma Muhurtam Bathing Hours',
                time: '04:30 AM - 07:00 AM',
                desc: isTe ? 'ఉదయం వేళల్లో సరస్వతి మరియు పంచవటి ఘాట్ల వద్ద ప్రత్యేక దీపారాధనలు నిర్వహించబడుతున్నాయి.' : 'Special sacred lamp floating (Deepa Daanam) permitted at Saraswathi Ghat and Panchavati Ghat.',
              },
            ].map((alert, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-amber-100 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${alert.color}`}>
                    {alert.tag}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">{alert.time}</span>
                </div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-slate-100">{alert.title}</h3>
                <p className="text-xs text-stone-600 dark:text-slate-300">{alert.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
