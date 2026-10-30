import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, XCircle, HelpCircle, Activity } from 'lucide-react';

const STATUS_CONFIG = {
  verified: { icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  reported: { icon: AlertCircle, cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  unavailable: { icon: XCircle, cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  operational: { icon: Activity, cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  unknown: { icon: HelpCircle, cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function StatusBadge({ status, prefix = '' }) {
  const { t } = useTranslation();
  const key = status?.toLowerCase() || 'unknown';
  const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  const label = t(`status.${key}`, { defaultValue: status });

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}
    >
      <Icon size={12} className="shrink-0" />
      {prefix && <span className="opacity-75">{prefix}: </span>}
      <span>{label}</span>
    </span>
  );
}
