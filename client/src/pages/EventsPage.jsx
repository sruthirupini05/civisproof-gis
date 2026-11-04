import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Music,
  Sparkles,
  ArrowLeft,
  Navigation,
  Share2,
  Filter,
  CheckCircle2,
  Users,
  Flame,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import pushkaraluEvents from '../data/pushkaraluEvents.json';
import { getStoredEvents } from '../services/eventsService.js';
import { useLanguageStore, useThemeStore, useAuthStore } from '../store/useStore.js';

export default function EventsPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const [eventsList, setEventsList] = useState(() => getStoredEvents());

  useEffect(() => {
    const handleEventsUpdate = () => {
      setEventsList(getStoredEvents());
    };
    window.addEventListener('pushkaram_events_updated', handleEventsUpdate);
    window.addEventListener('storage', handleEventsUpdate);
    return () => {
      window.removeEventListener('pushkaram_events_updated', handleEventsUpdate);
      window.removeEventListener('storage', handleEventsUpdate);
    };
  }, []);
  const [selectedDate, setSelectedDate] = useState('all'); // 'all' | 'today' | date string
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'harathi' | 'concert' | 'dance' | 'drama' | 'devotional'
  const [toastMsg, setToastMsg] = useState('');

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Distinct dates available
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(eventsList.map((e) => e.date))).sort();
    return dates;
  }, [eventsList]);

  // Today's verified events
  const todayEvents = useMemo(() => {
    return eventsList.filter((e) => e.date === todayDateStr || e.is_today);
  }, [eventsList, todayDateStr]);

  // Filtered Events for Day-wise Browser
  const filteredEvents = useMemo(() => {
    return eventsList.filter((e) => {
      const matchDate =
        selectedDate === 'all'
          ? true
          : selectedDate === 'today'
          ? e.date === todayDateStr || e.is_today
          : e.date === selectedDate;

      const matchCat = categoryFilter === 'all' ? true : e.category === categoryFilter;

      return matchDate && matchCat;
    });
  }, [eventsList, selectedDate, categoryFilter, todayDateStr]);

  const categories = [
    { id: 'all', label: isTe ? 'అన్ని కార్యక్రమాలు' : isHi ? 'सभी कार्यक्रम' : 'All Events', icon: Sparkles },
    { id: 'harathi', label: isTe ? 'గోదావరి హారతి' : isHi ? 'गोदावरी आरती' : 'Maha Harathi', icon: Flame },
    { id: 'concert', label: isTe ? 'సంగీత కచేరీలు' : isHi ? 'संगीत कार्यक्रम' : 'Music Concerts', icon: Music },
    { id: 'dance', label: isTe ? 'కూచిపూడి నృత్యాలు' : isHi ? 'शास्त्रीय नृत्य' : 'Dance Dramas', icon: Users },
    { id: 'drama', label: isTe ? 'పౌరాణిక నాటకాలు' : isHi ? 'नाटक' : 'Theatrical Dramas', icon: Sparkles },
    { id: 'devotional', label: isTe ? 'భక్తి & వేద పారాయణం' : isHi ? 'वेद पारायण' : 'Vedic & Devotional', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* ── Top Header ── */}
      <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'వెనుకకు' : isHi ? 'पीछे' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-400 text-stone-900 font-black px-3 py-1 rounded-full shadow-xs">
              {eventsList.length} {isTe ? 'కార్యక్రమాలు' : 'Verified Events'}
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/dashboard?tab=events')}
                className="py-1 px-3 bg-amber-300 hover:bg-amber-200 text-stone-900 font-black text-xs rounded-full flex items-center gap-1 shadow-sm transition"
              >
                <Plus size={13} />
                <span>{isTe ? 'నిర్వహించండి' : 'Manage Events'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Calendar size={24} className="text-amber-300" />
            <span>
              {isTe
                ? 'గోదావరి పుష్కరాలు 2027 — సాంస్కృతిక కార్యక్రమాల షెడ్యూల్'
                : isHi
                ? 'गोदावरी पुष्करालु 2027 — सांस्कृतिक कार्यक्रम अनुसूची'
                : 'Godavari Pushkaralu 2027 — Cultural & Devotional Events'}
            </span>
          </h1>
          <p className="text-xs text-amber-200 mt-1">
            {isTe
              ? 'సాయంత్రం సాంస్కృతిక కార్యక్రమాలు, సంగీత కచేరీలు, కూచిపూడి నృత్య రూపకాలు, నాటకాలు మరియు అఖండ హారతి'
              : 'Evening cultural programmes, music concerts, dramas, devotional recitals & daily Godavari Maha Harathi'}
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c1e] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-white/20 animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* ── SECTION 1: TODAY'S SCHEDULE (Highlighted Separately) ── */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-900 dark:to-amber-950/30 p-5 rounded-3xl border border-amber-200/90 dark:border-amber-900/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#881337] dark:text-amber-300">
                {isTe ? "ఈ రోజు ప్రత్యేక కార్యక్రమాలు (Today's Schedule)" : isHi ? "आज का कार्यक्रम (Today's Schedule)" : "Today's Verified Schedule"}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full">
              {todayDateStr}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-amber-100 dark:border-stone-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                      {evt.category?.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{evt.time}</span>
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-stone-900 dark:text-white leading-snug">
                    {isTe && evt.title_te ? evt.title_te : evt.title}
                  </h3>

                  <p className="text-[11px] text-stone-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {isTe && evt.description_te ? evt.description_te : evt.description}
                  </p>

                  <div className="mt-2.5 space-y-1 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
                      <MapPin size={13} className="text-[#dc2626] shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                    {evt.artists && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        ✦ {evt.artists}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    {evt.entry || 'Free Admission'}
                  </span>
                  <button
                    onClick={() =>
                      navigate(
                        `/navigate/venue-${evt.id}?lat=${evt.venue_lat}&lng=${evt.venue_lng}&name=${encodeURIComponent(evt.venue)}`
                      )
                    }
                    className="py-1 px-3 bg-[#991b1b] hover:bg-[#881337] text-white text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95 transition"
                  >
                    <Navigation size={12} />
                    <span>{isTe ? 'రూట్' : 'Navigate'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 2: BROWSE DAY-WISE SCHEDULE ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#991b1b]" />
              <span>{isTe ? 'తేదీల వారీగా షెడ్యూల్ (Day-Wise Schedule)' : 'Day-Wise Full Schedule'}</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium">
              Showing {filteredEvents.length} events
            </span>
          </div>

          {/* Date Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedDate('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                selectedDate === 'all'
                  ? 'bg-[#991b1b] text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
              }`}
            >
              {isTe ? 'అన్ని రోజులు' : 'All Days'}
            </button>
            <button
              onClick={() => setSelectedDate('today')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                selectedDate === 'today'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
              }`}
            >
              ⭐ {isTe ? 'ఈ రోజు (Today)' : "Today's Events"}
            </button>
            {availableDates.map((d, idx) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition font-mono ${
                  selectedDate === d
                    ? 'bg-[#991b1b] text-white shadow-xs'
                    : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                Day {idx + 1} ({d.slice(5)})
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((c) => {
              const Icon = c.icon;
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg shrink-0 transition ${
                    active
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  <Icon size={12} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* List of Events */}
          <div className="space-y-3 pt-2">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                <p className="text-xs font-semibold text-stone-500">
                  {isTe ? 'ఎంచుకున్న తేదీలో కార్యక్రమాలు లేవు.' : 'No verified events found for this selection.'}
                </p>
              </div>
            ) : (
              filteredEvents.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xs hover:shadow-md transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#881337] dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                          {item.category?.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-stone-500 dark:text-stone-400">
                          📅 {item.date}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Clock size={12} />
                          <span>{item.time}</span>
                        </span>
                      </div>

                      <h3 className="font-black text-base text-stone-900 dark:text-white leading-snug">
                        {isTe && item.title_te ? item.title_te : item.title}
                      </h3>
                      {item.artists && (
                        <p className="text-xs font-bold text-stone-600 dark:text-stone-300 mt-0.5">
                          Featured: {item.artists}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: item.title,
                            text: `${item.title} at ${item.venue} on ${item.date} (${item.time}) - Godavari Pushkaralu 2027`,
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard?.writeText?.(`${item.title} at ${item.venue}`);
                          showToast(isTe ? 'వివరాలు కాపీ చేయబడ్డాయి' : 'Event details copied');
                        }
                      }}
                      className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 transition"
                      title="Share Event"
                    >
                      <Share2 size={15} />
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {isTe && item.description_te ? item.description_te : item.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 min-w-0">
                      <MapPin size={14} className="text-[#dc2626] shrink-0" />
                      <span className="truncate">{item.venue}</span>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/navigate/venue-${item.id}?lat=${item.venue_lat}&lng=${item.venue_lng}&name=${encodeURIComponent(item.venue)}`
                        )
                      }
                      className="py-1.5 px-3.5 bg-[#991b1b] hover:bg-[#881337] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition shrink-0"
                    >
                      <Navigation size={13} />
                      <span>{isTe ? 'వేదిక మార్గం' : 'Navigate'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
