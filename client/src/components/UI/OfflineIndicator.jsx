import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { syncPendingDrafts, setupOnlineSync } from '../../services/sync.js';
import { useSyncStore } from '../../store/useStore.js';

export default function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const { pendingInspections } = useSyncStore();

  useEffect(() => {
    setupOnlineSync();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function triggerManualSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncPendingDrafts();
      setSyncResult(result);
      setTimeout(() => setSyncResult(null), 4000);
    } catch (e) {
      console.error('Manual sync failed:', e);
    } finally {
      setSyncing(false);
    }
  }

  if (isOnline && pendingInspections.length === 0 && !syncResult) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 flex items-center justify-between text-xs font-medium z-40 transition ${
        !isOnline
          ? 'bg-amber-500 text-white'
          : syncResult
          ? 'bg-emerald-600 text-white'
          : 'bg-blue-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff size={15} />
            <span>{t('offline.offlineTitle')}: {t('offline.offlineMessage')}</span>
          </>
        ) : syncResult ? (
          <>
            <CheckCircle size={15} />
            <span>
              {t('sync.synced')} ({syncResult.synced} items synced)
            </span>
          </>
        ) : (
          <>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{t('sync.pendingItems', { count: pendingInspections.length })}</span>
          </>
        )}
      </div>

      {isOnline && pendingInspections.length > 0 && (
        <button
          onClick={triggerManualSync}
          disabled={syncing}
          className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[11px] font-semibold transition disabled:opacity-50"
        >
          {syncing ? t('sync.syncing') : t('sync.syncNow')}
        </button>
      )}
    </div>
  );
}
