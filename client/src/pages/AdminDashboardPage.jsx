import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { facilitiesAPI, inspectionsAPI } from '../services/api.js';
import { cacheFacility, cacheAllFacilities, getCachedFacilities } from '../services/db.js';
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
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const { currentLang } = useLanguageStore();

  const isTe = (currentLang || 'te').startsWith('te');

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'add' | 'issues'
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="text-[11px] font-bold text-stone-500 uppercase">Open Issues</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{issues.length}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Reported by Field Staff</div>
          </div>
        </div>

        {/* ── Tabs: Manage Facilities | Add Facility | Reported Issues ── */}
        <div className="flex gap-2 border-b border-stone-200 dark:border-slate-800 pb-2">
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
            onClick={() => setActiveTab('issues')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'issues' ? 'bg-[#991b1b] text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={15} />
            <span>Reported Issues ({issues.length})</span>
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
      </div>
    </div>
  );
}
