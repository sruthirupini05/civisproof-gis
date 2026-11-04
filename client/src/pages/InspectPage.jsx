import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Save,
  Send,
  Camera,
} from 'lucide-react';
import { facilitiesAPI, inspectionsAPI } from '../services/api.js';
import { useAuthStore, useSyncStore } from '../store/useStore.js';
import { saveDraft, getCachedFacility } from '../services/db.js';
import LoadingSpinner from '../components/UI/LoadingSpinner.jsx';
import fallbackFacilities from '../data/fallbackFacilities.json';

export default function InspectPage() {
  const { facilityId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addPendingInspection } = useSyncStore();

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [status, setStatus] = useState('satisfactory');
  const [operationalStatus, setOperationalStatus] = useState('operational');
  const [findings, setFindings] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [defects, setDefects] = useState([]);
  const [photoNote, setPhotoNote] = useState('');

  useEffect(() => {
    async function loadFacility() {
      try {
        let f = null;
        if (navigator.onLine) {
          try {
            f = await facilitiesAPI.get(facilityId);
          } catch {}
        }
        if (!f) {
          try {
            f = await getCachedFacility(facilityId);
          } catch {}
        }
        if (!f) {
          const list = Array.isArray(fallbackFacilities) ? fallbackFacilities : [];
          f = list.find((item) => item.id === facilityId || item.qr_token === facilityId);
        }
        if (!f) {
          f = {
            id: facilityId,
            name: `Pushkaram Facility (${facilityId})`,
            category: 'ghat',
            address: 'Godavari Riverfront, Rajahmundry',
            operational_status: 'operational',
          };
        }
        setFacility(f);
      } catch (e) {
        console.error('Failed to load facility for inspection:', e);
      } finally {
        setLoading(false);
      }
    }
    loadFacility();
  }, [facilityId]);

  if (!user || !['admin', 'inspector', 'field_staff'].includes(user.role)) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle size={36} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-amber-900">{t('inspection.authRequired')}</h2>
          <p className="text-xs text-amber-800">{t('inspection.loginRequired')}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-2 bg-[#1e3a5f] text-white text-xs px-4 py-2 rounded-xl font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading inspection form..." />;
  }

  function addDefectRow() {
    setDefects([
      ...defects,
      { id: Date.now().toString(), description: '', severity: 'medium' },
    ]);
  }

  function removeDefectRow(id) {
    setDefects(defects.filter((d) => d.id !== id));
  }

  function updateDefectRow(id, field, value) {
    setDefects(
      defects.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!navigator.onLine) {
      return handleSaveDraft();
    }

    setSubmitting(true);
    setError('');
    try {
      await inspectionsAPI.submit({
        facility_id: facility?.id || facilityId,
        status,
        findings,
        corrective_action: correctiveAction,
        defects,
        evidence_urls: photoNote ? [photoNote] : [],
      });

      // Update operational status
      await facilitiesAPI.updateStatus(facility?.id || facilityId, {
        operational_status: operationalStatus,
        status: status === 'satisfactory' ? 'verified' : 'reported',
      });

      setSubmitted(true);
    } catch (err) {
      console.warn('Direct submission failed, offering draft backup:', err);
      setError(err.response?.data?.error || 'Submission failed. You can save as a local draft.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    const localId = `draft-${Date.now()}`;
    const draftRecord = {
      localId,
      facilityName: facility?.name || facilityId,
      data: {
        facility_id: facility?.id || facilityId,
        status,
        findings,
        corrective_action: correctiveAction,
        defects,
        evidence_urls: photoNote ? [photoNote] : [],
        operational_status: operationalStatus,
      },
      savedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    await saveDraft(draftRecord);
    addPendingInspection(draftRecord);
    setDraftSaved(true);
  }

  if (submitted || draftSaved) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-3">
          <CheckCircle size={48} className="mx-auto text-emerald-500" />
          <h2 className="text-base font-bold text-slate-800">
            {submitted ? t('inspection.submitted') : t('inspection.draftSaved')}
          </h2>
          <p className="text-xs text-slate-500">
            {submitted
              ? 'Inspection record has been synchronized with the live register.'
              : 'Record stored securely in IndexedDB and queued for auto-sync.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => navigate(`/facility/${facility?.qr_token || facilityId}`)}
              className="bg-[#1e3a5f] text-white px-4 py-2 rounded-xl text-xs font-semibold"
            >
              View Facility
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft size={16} />
        <span>{t('nav.back')}</span>
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center">
          <ClipboardList size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">{t('inspection.title')}</h1>
          <p className="text-xs text-slate-500">
            Inspector: <strong className="text-slate-700">{user.username}</strong>
          </p>
        </div>
      </div>

      {facility && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs space-y-0.5">
          <div className="font-bold text-slate-800">{facility.name}</div>
          <div className="text-slate-500">
            {facility.address} • Category: {t(`categories.${facility.category}`)}
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Inspection Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('inspection.status')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'satisfactory', label: 'inspection.satisfactory', color: 'emerald' },
              { val: 'needsAttention', label: 'inspection.needsAttention', color: 'amber' },
              { val: 'critical', label: 'inspection.critical', color: 'rose' },
            ].map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={() => setStatus(s.val)}
                className={`py-2 px-1.5 rounded-xl text-xs font-semibold border-2 transition ${
                  status === s.val
                    ? s.val === 'satisfactory'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : s.val === 'needsAttention'
                      ? 'border-amber-600 bg-amber-50 text-amber-800'
                      : 'border-rose-600 bg-rose-50 text-rose-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Operational Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('status.operationalStatus')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['operational', 'unavailable', 'unknown'].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOperationalStatus(op)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition ${
                  operationalStatus === op
                    ? 'border-[#1e3a5f] bg-slate-50 text-[#1e3a5f]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t(`status.${op}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Findings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('inspection.findings')}
          </label>
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder={t('inspection.findingsPlaceholder')}
            rows={3}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
            required
          />
        </div>

        {/* Corrective Action */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('inspection.correctiveAction')}
          </label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder={t('inspection.correctivePlaceholder')}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
          />
        </div>

        {/* Defects List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('inspection.defects')} ({defects.length})
            </label>
            <button
              type="button"
              onClick={addDefectRow}
              className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline font-bold"
            >
              <Plus size={14} />
              <span>{t('inspection.addDefect')}</span>
            </button>
          </div>

          {defects.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No defects recorded.</p>
          ) : (
            <div className="space-y-2">
              {defects.map((d) => (
                <div key={d.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                  <input
                    type="text"
                    value={d.description}
                    onChange={(e) => updateDefectRow(d.id, 'description', e.target.value)}
                    placeholder={t('inspection.defectDescription')}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    required
                  />
                  <select
                    value={d.severity}
                    onChange={(e) => updateDefectRow(d.id, 'severity', e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700"
                  >
                    <option value="low">{t('inspection.low')}</option>
                    <option value="medium">{t('inspection.medium')}</option>
                    <option value="high">{t('inspection.high')}</option>
                    <option value="critical">{t('inspection.critical_sev')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeDefectRow(d.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence Photo Reference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={14} />
            <span>{t('inspection.evidence')} (Reference Note)</span>
          </label>
          <input
            type="text"
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            placeholder="e.g. IMG_2027_PUSH_0042.jpg or Photo on Inspector Device"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-xs font-semibold transition"
          >
            <Save size={15} />
            <span>{t('inspection.saveDraft')}</span>
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 bg-[#1e3a5f] hover:bg-[#15294a] text-white rounded-xl py-3 text-xs font-semibold disabled:opacity-50 transition shadow-sm"
          >
            <Send size={15} />
            <span>{submitting ? t('inspection.submitting') : t('inspection.submit')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
