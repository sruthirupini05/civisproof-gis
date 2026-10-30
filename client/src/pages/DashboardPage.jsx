import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  AlertOctagon,
  Clock,
  ShieldCheck,
  CheckCircle,
  Eye,
  ClipboardList,
  Wrench,
  Search,
  Filter,
} from 'lucide-react';
import { facilitiesAPI, inspectionsAPI } from '../services/api.js';
import { getCachedFacilities } from '../services/db.js';
import StatusBadge from '../components/UI/StatusBadge.jsx';
import LoadingSpinner from '../components/UI/LoadingSpinner.jsx';
import { useAuthStore, useLanguageStore } from '../store/useStore.js';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentLang } = useLanguageStore();

  const [facilities, setFacilities] = useState([]);
  const [attentionQueue, setAttentionQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attention');
  const [searchFilter, setSearchFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);

  function getFacilityDisplayName(f) {
    const lang = (currentLang || i18n.language || 'te').slice(0, 2);
    if (lang === 'te' && f.name_te) return f.name_te;
    if (lang === 'hi' && f.name_hi) return f.name_hi;
    return f.name;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      let all = [];
      let queue = [];
      if (navigator.onLine) {
        all = await facilitiesAPI.list({});
        if (user && ['admin', 'inspector'].includes(user.role)) {
          try {
            queue = await inspectionsAPI.attentionQueue();
          } catch {}
        }
      } else {
        all = await getCachedFacilities();
      }

      setFacilities(all);

      // If queue API wasn't loaded or offline, compute attention queue client-side
      if (!queue.length) {
        queue = all.filter((f) => {
          const isStale =
            !f.last_inspected ||
            new Date(f.last_inspected) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const isUnverified = !f.is_verified || f.status === 'reported';
          const isUnavailable = f.operational_status === 'unavailable' || f.operational_status === 'unknown';
          return isStale || isUnverified || isUnavailable;
        });
      }
      setAttentionQueue(queue);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(facilityId) {
    if (!user) {
      navigate('/login');
      return;
    }
    setVerifyingId(facilityId);
    try {
      await facilitiesAPI.verify(facilityId);
      await loadDashboardData();
    } catch (e) {
      console.error('Failed to verify facility:', e);
    } finally {
      setVerifyingId(null);
    }
  }

  // Summary Metrics
  const totalCount = facilities.length;
  const verifiedCount = facilities.filter((f) => f.is_verified).length;
  const unavailableCount = facilities.filter((f) => f.operational_status === 'unavailable').length;
  const staleCount = facilities.filter((f) => {
    return (
      !f.last_inspected ||
      new Date(f.last_inspected) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
  }).length;

  const filteredList = (activeTab === 'attention' ? attentionQueue : facilities).filter((f) => {
    const q = searchFilter.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
  });

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading operational dashboard..." />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-20">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="text-[#1e3a5f]" size={24} />
            <span>{t('dashboard.title')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Godavari Pushkaralu 2027 Infrastructure Readiness & Attention Queue
          </p>
        </div>

        {user ? (
          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Active: <strong className="text-slate-800">{user.username}</strong> ({user.role})
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-[#15294a] transition w-fit"
          >
            Inspector Login
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t('dashboard.totalFacilities')}</span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">#</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>{t('dashboard.verifiedFacilities')}</span>
            <ShieldCheck size={16} />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{verifiedCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>{t('dashboard.staleRecords')}</span>
            <Clock size={16} />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{staleCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>{t('dashboard.unavailableFacilities')}</span>
            <AlertOctagon size={16} />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{unavailableCount}</div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('attention')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'attention'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('dashboard.attentionQueue')} ({attentionQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-[#1e3a5f] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Facilities ({facilities.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by name or category..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        {/* List / Table */}
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {t('dashboard.noIssues')}
            </div>
          ) : (
            filteredList.map((f) => (
              <div
                key={f.id}
                className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {t(`categories.${f.category}`)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Token: {f.qr_token}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{getFacilityDisplayName(f)}</h3>
                  {f.name !== getFacilityDisplayName(f) && (
                    <p className="text-[11px] text-slate-400">{f.name}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <StatusBadge status={f.status} />
                    <StatusBadge status={f.operational_status} />
                    {f.open_defects > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {f.open_defects} Open Defects
                      </span>
                    )}
                    {f.last_inspected ? (
                      <span className="text-[10px] text-slate-500">
                        Inspected: {format(new Date(f.last_inspected), 'dd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700">
                        ⚠️ Never Inspected
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/facility/${f.qr_token}`)}
                    title="View Facility"
                    className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-xs font-semibold flex items-center gap-1"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">View</span>
                  </button>

                  {user && ['admin', 'inspector', 'field_staff'].includes(user.role) && (
                    <button
                      onClick={() => navigate(`/inspect/${f.id}`)}
                      title="Inspect Facility"
                      className="p-2 text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition text-xs font-semibold flex items-center gap-1"
                    >
                      <ClipboardList size={14} />
                      <span>Inspect</span>
                    </button>
                  )}

                  {user && ['admin', 'inspector'].includes(user.role) && !f.is_verified && (
                    <button
                      onClick={() => handleVerify(f.id)}
                      disabled={verifyingId === f.id}
                      title="Verify Facility Readiness"
                      className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      <span>{verifyingId === f.id ? '...' : 'Verify'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
