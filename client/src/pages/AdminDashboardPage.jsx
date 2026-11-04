import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldCheck,
  PlusCircle,
  Wrench,
  AlertTriangle,
  MapPin,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Search,
  Filter,
  BarChart3,
  RefreshCw,
  Building2,
  ExternalLink,
  Calendar,
  Sparkles,
  Clock,
  Music,
  Users,
  Flame,
  Plus,
} from 'lucide-react';
import { facilitiesAPI, inspectionsAPI } from '../services/api.js';
import { cacheFacility, cacheAllFacilities, getCachedFacilities } from '../services/db.js';
import { getStoredEvents, saveEvent, deleteEvent, resetEventsToDefault } from '../services/eventsService.js';
import { useAuthStore, useThemeStore, useLanguageStore } from '../store/useStore.js';
import fallbackFacilities from '../data/fallbackFacilities.json';

const RAJAHMUNDRY_CENTRE = [16.9948, 81.7798];

const CATEGORIES = [
  { id: 'ghat', label: 'Ghats', icon: '🌊' },
  { id: 'water', label: 'Water Facilities', icon: '💧' },
  { id: 'medical', label: 'Medical Facilities', icon: '🏥' },
  { id: 'toilet', label: 'Toilets', icon: '🚻' },
  { id: 'petrol', label: 'Petrol Stations', icon: '⛽' },
  { id: 'ev_charging', label: 'EV Charging', icon: '⚡' },
  { id: 'transport', label: 'Transport Hubs', icon: '🚆' },
  { id: 'shelter', label: 'Accommodations', icon: '🛏️' },
  { id: 'parking', label: 'Parking', icon: '🅿️' },
  { id: 'food', label: 'Food & Annadanam', icon: '🍽️' },
];

function MapClickHandler({ onSelectCoords }) {
  useMapEvents({
    click(e) {
      onSelectCoords([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
    },
  });
  return null;
}

const customPin = (icon = '📍') =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:#991b1b;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);">${icon}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'manage';
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || 'te').startsWith('te');

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab); // 'manage' | 'add' | 'issues' | 'inspectors' | 'events'
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Add facility form state
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [category, setCategory] = useState('ghat');
  const [transportType, setTransportType] = useState('bus_station');
  const [lat, setLat] = useState('16.9948');
  const [lng, setLng] = useState('81.7798');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('3000');
  const [description, setDescription] = useState('');

  // Edit modal
  const [editingFacility, setEditingFacility] = useState(null);

  // Issues queue
  const [issues, setIssues] = useState([]);

  // Pushkaralu Events Management State
  const [events, setEvents] = useState(() => getStoredEvents());
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  // Event form fields
  const [evTitle, setEvTitle] = useState('');
  const [evTitleTe, setEvTitleTe] = useState('');
  const [evTitleHi, setEvTitleHi] = useState('');
  const [evCategory, setEvCategory] = useState('harathi');
  const [evDate, setEvDate] = useState('2026-11-04');
  const [evTime, setEvTime] = useState('18:30 - 20:00');
  const [evVenue, setEvVenue] = useState('Kotilingala Ghat Harathi Deck');
  const [evVenueTe, setEvVenueTe] = useState('కోటిలింగాల ఘాట్ హారతి వేదిక');
  const [evLat, setEvLat] = useState('17.0094');
  const [evLng, setEvLng] = useState('81.7745');
  const [evArtists, setEvArtists] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDescriptionTe, setEvDescriptionTe] = useState('');
  const [evEntry, setEvEntry] = useState('Free for All Pilgrims');
  const [evIsToday, setEvIsToday] = useState(true);
  const [evStatus, setEvStatus] = useState('verified');

  const EVENT_VENUE_PRESETS = [
    { name: 'Kotilingala Ghat Harathi Deck', name_te: 'కోటిలింగాల ఘాట్ హారతి వేదిక', lat: 17.0094, lng: 81.7745 },
    { name: 'Pushkar Ghat Sacred Steps', name_te: 'పుష్కర్ ఘాట్ ప్రధాన వేదిక', lat: 16.9942, lng: 81.7765 },
    { name: 'Subrahmanya Maidan Open Air Auditorium', name_te: 'సుబ్రహ్మణ్య మైదానం బహిరంగ వేదిక', lat: 16.9915, lng: 81.7768 },
    { name: 'Anam Kala Kendram, Stadium Road', name_te: 'ఆనం కళాకేంద్రం, రాజమహేంద్రవరం', lat: 17.0082, lng: 81.7895 },
    { name: 'Saraswathi Ghat Cultural Pandal', name_te: 'సరస్వతి ఘాట్ సాంస్కృతిక వేదిక', lat: 16.9975, lng: 81.7770 },
  ];

  function openAddEvent() {
    setEditingEvent(null);
    setEvTitle('');
    setEvTitleTe('');
    setEvTitleHi('');
    setEvCategory('harathi');
    setEvDate('2026-11-04');
    setEvTime('18:30 - 20:00');
    setEvVenue('Kotilingala Ghat Harathi Deck');
    setEvVenueTe('కోటిలింగాల ఘాట్ హారతి వేదిక');
    setEvLat('17.0094');
    setEvLng('81.7745');
    setEvArtists('');
    setEvDescription('');
    setEvDescriptionTe('');
    setEvEntry('Free for All Pilgrims');
    setEvIsToday(true);
    setEvStatus('verified');
    setIsEventFormOpen(true);
  }

  function openEditEvent(ev) {
    setEditingEvent(ev);
    setEvTitle(ev.title || '');
    setEvTitleTe(ev.title_te || '');
    setEvTitleHi(ev.title_hi || '');
    setEvCategory(ev.category || 'harathi');
    setEvDate(ev.date || '2026-11-04');
    setEvTime(ev.time || '18:30 - 20:00');
    setEvVenue(ev.venue || '');
    setEvVenueTe(ev.venue_te || '');
    setEvLat(String(ev.venue_lat || '16.9948'));
    setEvLng(String(ev.venue_lng || '81.7798'));
    setEvArtists(ev.artists || '');
    setEvDescription(ev.description || '');
    setEvDescriptionTe(ev.description_te || '');
    setEvEntry(ev.entry || 'Free for All Pilgrims');
    setEvIsToday(Boolean(ev.is_today));
    setEvStatus(ev.status || 'verified');
    setIsEventFormOpen(true);
  }

  function handleSaveEvent(e) {
    e.preventDefault();
    if (!evTitle || !evDate || !evTime || !evVenue) {
      alert('Please fill in Event Title, Date, Time, and Venue');
      return;
    }

    const payload = {
      ...(editingEvent ? { id: editingEvent.id } : {}),
      title: evTitle.trim(),
      title_te: evTitleTe.trim() || evTitle.trim(),
      title_hi: evTitleHi.trim() || evTitle.trim(),
      category: evCategory,
      date: evDate,
      time: evTime.trim(),
      venue: evVenue.trim(),
      venue_te: evVenueTe.trim() || evVenue.trim(),
      venue_lat: Number(evLat) || 16.9948,
      venue_lng: Number(evLng) || 81.7798,
      artists: evArtists.trim(),
      description: evDescription.trim(),
      description_te: evDescriptionTe.trim() || evDescription.trim(),
      entry: evEntry.trim(),
      is_today: Boolean(evIsToday),
      status: evStatus,
    };

    const updated = saveEvent(payload);
    setEvents(updated);
    setIsEventFormOpen(false);
    setEditingEvent(null);
    setStatusMsg(editingEvent ? `Event "${payload.title}" updated successfully!` : `New event "${payload.title}" published!`);
    setTimeout(() => setStatusMsg(''), 4000);
  }

  function handleDeleteEvent(ev) {
    if (!window.confirm(`Are you sure you want to remove the event "${ev.title}"?`)) return;
    const updated = deleteEvent(ev.id);
    setEvents(updated);
    setStatusMsg(`Event "${ev.title}" has been deleted.`);
    setTimeout(() => setStatusMsg(''), 4000);
  }

  function handleResetEvents() {
    if (!window.confirm('Reset all Pushkaram events to the official verified default schedule?')) return;
    const res = resetEventsToDefault();
    setEvents(res);
    setStatusMsg('Events reset to official schedule.');
    setTimeout(() => setStatusMsg(''), 4000);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let list = [];
      if (navigator.onLine) {
        try {
          const res = await facilitiesAPI.list({});
          list = Array.isArray(res) ? res : res?.facilities || [];
        } catch {}
      }
      if (list.length === 0) {
        list = await getCachedFacilities();
      }
      if (list.length === 0) {
        list = fallbackFacilities;
      }
      setFacilities(list);

      // Issues queue
      try {
        const q = await inspectionsAPI.attentionQueue();
        setIssues(Array.isArray(q) ? q : []);
      } catch {
        // Mock / fallback issues for admin review
        setIssues([
          { id: 'iss-1', facility_name: 'Pushkara Sanitation Complex B', description: 'Low water pressure in Sector 2 cubicles', severity: 'medium', status: 'reported', reported_at: '2026-11-01 07:30' },
          { id: 'iss-2', facility_name: 'Dhavaleswaram Barrage Ghat', description: 'Depth marker chain requires readjustment', severity: 'high', status: 'under_inspection', reported_at: '2026-10-31 16:45' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFacility(e) {
    e.preventDefault();
    if (!name || !lat || !lng) return;

    const newRecord = {
      id: crypto.randomUUID(),
      qr_token: Math.random().toString(36).substring(2, 14),
      name: name.trim(),
      name_te: nameTe.trim() || name.trim(),
      category,
      transport_type: category === 'transport' ? transportType : null,
      lat: Number(lat),
      lng: Number(lng),
      address: address.trim() || 'Rajahmundry, Andhra Pradesh',
      capacity: Number(capacity) || 1000,
      description: description.trim() || `${name} public facility for Godavari Pushkaram 2027 pilgrims.`,
      status: 'verified',
      operational_status: 'operational',
      is_verified: 1,
    };

    try {
      if (navigator.onLine) {
        try {
          await facilitiesAPI.create(newRecord);
        } catch {}
      }
      await cacheFacility(newRecord);
      setFacilities((prev) => [newRecord, ...prev]);

      setStatusMsg(`Successfully added "${newRecord.name}" to the GIS map and database!`);
      setName('');
      setNameTe('');
      setAddress('');
      setDescription('');
      setActiveTab('manage');
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err) {
      alert(`Error creating facility: ${err.message}`);
    }
  }

  async function handleDeleteFacility(id, name) {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the GIS database?`)) return;
    try {
      if (navigator.onLine) {
        try {
          await facilitiesAPI.delete(id);
        } catch {}
      }
      setFacilities((prev) => prev.filter((f) => f.id !== id));
      setStatusMsg(`Facility "${name}" removed from database.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  async function handleToggleStatus(f) {
    const nextStatus = f.operational_status === 'operational' ? 'maintenance' : 'operational';
    try {
      if (navigator.onLine) {
        try {
          await facilitiesAPI.updateStatus(f.id, { operational_status: nextStatus, status: f.status });
        } catch {}
      }
      const updated = { ...f, operational_status: nextStatus };
      await cacheFacility(updated);
      setFacilities((prev) => prev.map((item) => (item.id === f.id ? updated : item)));
    } catch (err) {
      alert(`Status update error: ${err.message}`);
    }
  }

  const filteredFacilities = facilities.filter((f) => {
    const matchCat = filterCat === 'all' || f.category === filterCat;
    const matchSearch =
      !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.address?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="min-h-full pb-20 bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-slate-100 transition-colors">
      {/* ── Top Header ── */}
      <div className="bg-gradient-to-r from-stone-900 to-[#7f1d1d] text-white p-4 shadow-md border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-[#7f1d1d] flex items-center justify-center font-black text-xl shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg tracking-tight">
                  CivicProof GIS — Official Admin Dashboard
                </h1>
                <span className="text-[10px] bg-amber-400 text-stone-900 font-black px-2 py-0.5 rounded-full uppercase">
                  Admin
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Logged in as <strong className="text-white">{user?.username || 'admin'}</strong> • Full GIS facility management & verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab('add')}
              className="py-2 px-3.5 bg-amber-400 hover:bg-amber-300 text-stone-900 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <PlusCircle size={15} />
              <span>Add Facility</span>
            </button>
            <Link
              to="/map"
              className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition"
            >
              <span>Public Map</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {statusMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ── Key GIS Statistics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Facilities</div>
            <div className="text-2xl font-black mt-1">{facilities.length}</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Across 10 Categories</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-500 uppercase">Operational Rate</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {facilities.length > 0
                ? `${Math.round((facilities.filter((f) => f.operational_status === 'operational').length / facilities.length) * 100)}%`
                : '100%'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Active for Pilgrims</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-500 uppercase">Transport & Hubs</div>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {facilities.filter((f) => f.category === 'transport' || f.category === 'petrol' || f.category === 'ev_charging').length}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Airports, Rail, Bus, EV, Fuel</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-500 uppercase">Pushkaram Events</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{events.length}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Cultural & Maha Harathi</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-stone-500 uppercase">Open Issues</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{issues.length}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Field Staff Reports</div>
          </div>
        </div>

        {/* ── Tabs: Manage Facilities | Add Facility | Events | Reported Issues | Inspectors ── */}
        <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'manage' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Building2 size={15} />
            <span>Manage Facilities ({facilities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'add' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <PlusCircle size={15} />
            <span>Add New Facility</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'events' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Calendar size={15} />
            <span>Manage Events ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'issues' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={15} />
            <span>Reported Issues ({issues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inspectors')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'inspectors' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Inspector Accounts</span>
          </button>
        </div>

        {/* ── TAB 1: MANAGE FACILITIES ── */}
        {activeTab === 'manage' && (
          <div className="space-y-3">
            {/* Search & Filter Header */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search registered facilities..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                />
              </div>

              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="py-1.5 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Facilities List Table / Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {filteredFacilities.map((f) => (
                  <div key={f.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-lg flex-shrink-0 mt-0.5 border border-amber-200/50">
                        {CATEGORIES.find((c) => c.id === f.category)?.icon || '📍'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-stone-900 dark:text-slate-100">{f.name}</span>
                          {f.transport_type && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase">
                              {f.transport_type}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.operational_status === 'operational'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {f.operational_status}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                          {f.address} • <span className="font-mono">{f.lat?.toFixed(4)}, {f.lng?.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => handleToggleStatus(f)}
                        className="py-1 px-2.5 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition"
                        title="Toggle Operational Status"
                      >
                        {f.operational_status === 'operational' ? 'Set Maintenance' : 'Set Operational'}
                      </button>

                      <button
                        onClick={() => navigate(`/facility/${f.qr_token || f.id}`)}
                        className="py-1 px-2.5 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 transition"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleDeleteFacility(f.id, f.name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Facility"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ADD NEW FACILITY ── */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Form */}
            <form onSubmit={handleAddFacility} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm space-y-3">
              <h2 className="font-extrabold text-sm text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <PlusCircle size={16} className="text-[#991b1b]" />
                <span>Facility Registration Form</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Facility Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Godavari Pushkar Ghat 3"
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Facility Name (Telugu)</label>
                  <input
                    type="text"
                    value={nameTe}
                    onChange={(e) => setNameTe(e.target.value)}
                    placeholder="e.g. గోదావరి పుష్కర ఘాట్ 3"
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>

                  {category === 'transport' ? (
                    <div>
                      <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Transport Subtype</label>
                      <select
                        value={transportType}
                        onChange={(e) => setTransportType(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      >
                        <option value="bus_station">Bus Station</option>
                        <option value="railway_station">Railway Station</option>
                        <option value="airport">Airport</option>
                        <option value="transit_hub">Transit Hub</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Pilgrim Capacity</label>
                      <input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  )}
                </div>

                {/* Coordinates Picker Notice */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  💡 Tip: Click anywhere on the map beside to automatically capture exact coordinates!
                </p>

                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Address & Landmarking</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Kotipalli Ghat Circle, Rajahmundry"
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-slate-300 block mb-1">Description & Verification Notes</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe facility services, units, or guidance..."
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#991b1b] hover:bg-[#881337] text-white font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Register & Publish to Map
              </button>
            </form>

            {/* Interactive Coordinate Picker Map */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">Interactive Map Coordinate Picker</span>
                <span className="text-[11px] text-stone-400 font-mono">{lat}, {lng}</span>
              </div>
              <div className="flex-1 min-h-[350px] rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-700">
                <MapContainer
                  center={[Number(lat) || 16.9948, Number(lng) || 81.7798]}
                  zoom={14}
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer url={tileUrl} />
                  <MapClickHandler
                    onSelectCoords={([newLat, newLng]) => {
                      setLat(String(newLat));
                      setLng(String(newLng));
                    }}
                  />
                  <Marker position={[Number(lat) || 16.9948, Number(lng) || 81.7798]} icon={customPin('📍')} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: REPORTED ISSUES QUEUE ── */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-3xl border border-amber-200 dark:border-amber-900/40">
              <h2 className="font-extrabold text-sm text-amber-950 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Field Inspector Reported Issues & Maintenance Audit Queue</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                All defects reported by field staff and pilgrims are queued here for administrative triage and resolution tracking.
              </p>
            </div>

            <div className="space-y-2.5">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">{iss.facility_name || 'Sanitation Facility'}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          iss.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {iss.severity} Priority
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">{iss.description}</p>
                    <div className="text-[11px] text-stone-400 mt-1">Reported: {iss.reported_at}</div>
                  </div>

                  <button
                    onClick={() => {
                      setIssues((prev) => prev.filter((item) => item.id !== iss.id));
                      setStatusMsg(`Issue marked as Resolved.`);
                      setTimeout(() => setStatusMsg(''), 4000);
                    }}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: INSPECTOR ACCOUNTS & ASSIGNMENTS ── */}
        {activeTab === 'inspectors' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Authorized Field Inspectors & Sanitation Assignments</span>
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Manage field verification teams, credentials setup with bcrypt/SHA-256 hashing, and assign monitoring duties for Ghats and water kiosks.
                </p>
              </div>
              <Link
                to="/login"
                className="self-start sm:self-auto py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition"
              >
                Register Credentials
              </Link>
            </div>

            {/* List of Inspectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  username: 'inspector1',
                  role: 'Chief Field Inspector',
                  zone: 'Zone 1 — Pushkar Ghat & Main Riverfront',
                  assignedFacilities: ['Pushkar Ghat', 'Panchavati Ghat', 'RO Water Station 01'],
                  lastActive: 'Today 08:30 AM',
                  status: 'Active on Duty',
                },
                {
                  username: 'inspector2_kotilingala',
                  role: 'Ghat Safety Inspector',
                  zone: 'Zone 2 — Kotilingala & Saraswathi Ghats',
                  assignedFacilities: ['Kotilingala Ghat', 'Saraswathi Ghat', 'Emergency First-Aid Post'],
                  lastActive: 'Today 07:45 AM',
                  status: 'Active on Duty',
                },
                {
                  username: 'inspector3_transit',
                  role: 'Transit & Cleanliness Inspector',
                  zone: 'Zone 3 — Railway Stations & Bus Complexes',
                  assignedFacilities: ['Main Railway Station Washrooms', 'APSRTC Terminal Water Point'],
                  lastActive: 'Yesterday 18:20',
                  status: 'Off-duty (Rest)',
                },
                {
                  username: 'field1',
                  role: 'Sanitation Maintenance Staff',
                  zone: 'Zone 4 — Dowleswaram & Gowthami Ghats',
                  assignedFacilities: ['Gowthami Ghat Bio-toilets', 'Dowleswaram Barrage Steps'],
                  lastActive: 'Today 06:15 AM',
                  status: 'Active on Duty',
                },
              ].map((ins, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                        {ins.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-stone-900 dark:text-white">
                          {ins.username}
                        </div>
                        <div className="text-[11px] text-stone-500">{ins.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {ins.status}
                    </span>
                  </div>

                  <div className="text-xs bg-stone-50 dark:bg-slate-800/60 p-2.5 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                      📍 {ins.zone}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Assigned: {ins.assignedFacilities.join(' • ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                    <span>Last synced: {ins.lastActive}</span>
                    <Link
                      to="/dashboard"
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      View Reports →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: PUSHKARALU EVENTS MANAGEMENT ── */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Header / Actions Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-3xl border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-sm text-amber-950 dark:text-amber-300 flex items-center gap-2">
                  <Calendar size={18} className="text-amber-600 dark:text-amber-400" />
                  <span>Pushkaralu 2027 Events & Cultural Programmes Administration</span>
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Add, modify, verify, or reschedule daily Godavari Maha Harathi, classical concerts, Kuchipudi ballets, dramas, and devotional activities. Changes instantly publish to all pilgrim devices.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={openAddEvent}
                  className="py-2 px-3.5 bg-[#991b1b] hover:bg-[#881337] text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus size={15} />
                  <span>Add New Event</span>
                </button>

                <Link
                  to="/events"
                  className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 text-stone-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-stone-200 dark:border-slate-700 flex items-center gap-1 transition"
                >
                  <span>Public View</span>
                  <ExternalLink size={13} />
                </Link>

                <button
                  onClick={handleResetEvents}
                  title="Reset to default official schedule"
                  className="py-2 px-2.5 bg-stone-200/60 dark:bg-slate-800 hover:bg-stone-300 text-stone-600 dark:text-slate-400 text-xs rounded-xl transition"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Event Form (Add or Edit) */}
            {isEventFormOpen && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-amber-400 dark:border-amber-500/50 shadow-md space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-stone-900 dark:text-white">
                        {editingEvent ? 'Edit Pushkaram Event' : 'Add New Pushkaram Event'}
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {editingEvent ? `Modifying ID: ${editingEvent.id}` : 'Create an authorised official event entry'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsEventFormOpen(false);
                      setEditingEvent(null);
                    }}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-full text-stone-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Event Title (English) *
                      </label>
                      <input
                        type="text"
                        required
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        placeholder="e.g. Grand Godavari Maha Harathi & Deepotsavam"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Category *
                      </label>
                      <select
                        value={evCategory}
                        onChange={(e) => setEvCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-bold"
                      >
                        <option value="harathi">🔥 Maha Harathi</option>
                        <option value="concert">🎵 Classical & Carnatic Concert</option>
                        <option value="dance">💃 Kuchipudi & Traditional Dance</option>
                        <option value="drama">🎭 Theatrical & Mythological Drama</option>
                        <option value="devotional">📿 Vedic & Devotional Recital</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Title in Telugu (తెలుగు శీర్షిక)
                      </label>
                      <input
                        type="text"
                        value={evTitleTe}
                        onChange={(e) => setEvTitleTe(e.target.value)}
                        placeholder="ఉదా: మహా గోదావరి హారతి & సంగీత దీపోత్సవం"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Title in Hindi (हिन्दी शीर्षक)
                      </label>
                      <input
                        type="text"
                        value={evTitleHi}
                        onChange={(e) => setEvTitleHi(e.target.value)}
                        placeholder="उदा: भव्य गोदावरी महा आरती"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={evDate}
                        onChange={(e) => setEvDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Timing *
                      </label>
                      <input
                        type="text"
                        required
                        value={evTime}
                        onChange={(e) => setEvTime(e.target.value)}
                        placeholder="18:30 - 20:00"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Entry Fee / Seating
                      </label>
                      <input
                        type="text"
                        value={evEntry}
                        onChange={(e) => setEvEntry(e.target.value)}
                        placeholder="Free for All Pilgrims"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* Venue Presets */}
                  <div className="space-y-1.5 bg-amber-50/60 dark:bg-slate-800/40 p-3 rounded-2xl border border-amber-200/60 dark:border-slate-700">
                    <label className="text-[11px] font-black uppercase text-amber-900 dark:text-amber-300">
                      Quick Venue Selection Presets:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_VENUE_PRESETS.map((vp, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEvVenue(vp.name);
                            setEvVenueTe(vp.name_te);
                            setEvLat(String(vp.lat));
                            setEvLng(String(vp.lng));
                          }}
                          className="py-1 px-2.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-stone-800 dark:text-slate-200 rounded-lg text-[11px] font-bold border border-amber-300/80 dark:border-slate-600 transition"
                        >
                          📍 {vp.name.split(',')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Venue Name (English) *
                      </label>
                      <input
                        type="text"
                        required
                        value={evVenue}
                        onChange={(e) => setEvVenue(e.target.value)}
                        placeholder="Kotilingala Ghat Harathi Deck"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Venue Name (Telugu)
                      </label>
                      <input
                        type="text"
                        value={evVenueTe}
                        onChange={(e) => setEvVenueTe(e.target.value)}
                        placeholder="కోటిలింగాల ఘాట్ హారతి వేదిక"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={evLat}
                        onChange={(e) => setEvLat(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={evLng}
                        onChange={(e) => setEvLng(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Artists / Troupe / Vedic Scholars
                      </label>
                      <input
                        type="text"
                        value={evArtists}
                        onChange={(e) => setEvArtists(e.target.value)}
                        placeholder="e.g. TTD Annamacharya Troupe"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Description (English)
                      </label>
                      <textarea
                        rows={2}
                        value={evDescription}
                        onChange={(e) => setEvDescription(e.target.value)}
                        placeholder="Details of the performance, significance, and seating notes..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-slate-300">
                        Description (Telugu)
                      </label>
                      <textarea
                        rows={2}
                        value={evDescriptionTe}
                        onChange={(e) => setEvDescriptionTe(e.target.value)}
                        placeholder="కార్యక్రమ విశేషాలు మరియు వివరాలు..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={evIsToday}
                        onChange={(e) => setEvIsToday(e.target.checked)}
                        className="rounded accent-[#991b1b] w-4 h-4"
                      />
                      <span>Mark as Today's Highlight Event</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={evStatus === 'verified'}
                        onChange={(e) => setEvStatus(e.target.checked ? 'verified' : 'scheduled')}
                        className="rounded accent-emerald-600 w-4 h-4"
                      />
                      <span className="text-emerald-700 dark:text-emerald-400">Authorised & Verified</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEventFormOpen(false);
                        setEditingEvent(null);
                      }}
                      className="py-2 px-4 rounded-xl text-xs font-bold bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-5 rounded-xl text-xs font-black bg-[#991b1b] hover:bg-[#881337] text-white shadow-md transition active:scale-95"
                    >
                      {editingEvent ? 'Save Changes' : 'Publish Event'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search events by title, venue, or artists..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
                />
              </div>

              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                className="py-1.5 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="harathi">🔥 Maha Harathi</option>
                <option value="concert">🎵 Concerts</option>
                <option value="dance">💃 Dance Dramas</option>
                <option value="drama">🎭 Theatrical Dramas</option>
                <option value="devotional">📿 Devotional</option>
              </select>

              <span className="text-xs text-stone-500 font-bold px-2">
                Showing {events.filter((ev) => {
                  const matchCat = eventCategoryFilter === 'all' || ev.category === eventCategoryFilter;
                  const matchSearch =
                    !eventSearch ||
                    ev.title?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                    ev.venue?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                    ev.artists?.toLowerCase().includes(eventSearch.toLowerCase());
                  return matchCat && matchSearch;
                }).length} of {events.length} events
              </span>
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events
                .filter((ev) => {
                  const matchCat = eventCategoryFilter === 'all' || ev.category === eventCategoryFilter;
                  const matchSearch =
                    !eventSearch ||
                    ev.title?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                    ev.venue?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                    ev.artists?.toLowerCase().includes(eventSearch.toLowerCase());
                  return matchCat && matchSearch;
                })
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2.5 flex flex-col justify-between hover:border-amber-400/80 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                            {ev.category === 'harathi'
                              ? '🔥 Harathi'
                              : ev.category === 'concert'
                              ? '🎵 Concert'
                              : ev.category === 'dance'
                              ? '💃 Dance'
                              : ev.category === 'drama'
                              ? '🎭 Drama'
                              : '📿 Devotional'}
                          </span>
                          {ev.is_today && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              Today's Spotlight
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditEvent(ev)}
                            title="Edit Event"
                            className="p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 rounded-lg transition"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            title="Delete Event"
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm text-stone-900 dark:text-white mt-1.5 leading-snug">
                        {ev.title}
                      </h4>
                      {ev.title_te && (
                        <div className="text-xs text-amber-900 dark:text-amber-400 font-medium">
                          {ev.title_te}
                        </div>
                      )}

                      <div className="mt-2 space-y-1 text-xs text-stone-600 dark:text-slate-400">
                        <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-slate-200">
                          <Clock size={13} className="text-[#991b1b] shrink-0" />
                          <span>{ev.date} • {ev.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-amber-600 shrink-0" />
                          <span className="truncate">{ev.venue}</span>
                        </div>
                        {ev.artists && (
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <Users size={12} className="shrink-0" />
                            <span className="truncate">{ev.artists}</span>
                          </div>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400 font-mono text-[10px] truncate max-w-[150px]">
                        ID: {ev.id}
                      </span>
                      <Link
                        to={`/navigate/${ev.venue_lat},${ev.venue_lng}`}
                        className="text-[#991b1b] dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Navigate Venue</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
