import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SafetyDisclaimer({ syntheticData = true, compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-snug">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span>{t('safety.disclaimer')}</span>
          {syntheticData && (
            <span className="block font-medium text-amber-700 mt-0.5">
              {t('safety.syntheticWarning')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-900">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800 text-xs">
        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        <span>{t('safety.disclaimerTitle')}</span>
      </div>
      <p className="leading-relaxed opacity-90">{t('safety.disclaimer')}</p>
      {syntheticData && (
        <div className="pt-1 border-t border-amber-200/60 font-medium text-amber-700">
          ⚠️ {t('safety.syntheticWarning')}
        </div>
      )}
    </div>
  );
}
