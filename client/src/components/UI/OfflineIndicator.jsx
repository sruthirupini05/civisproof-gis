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
      className={`px-4 py-2 flex items-center justify-between text-xs font-bold z-50 transition shadow-md ${
        !isOnline
          ? 'bg-gradient-to-r from-amber-600 to-[#991b1b] text-white'
          : 'bg-emerald-700 text-white'
      }`}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff size={15} className="animate-pulse" />
              <span>Offline Mode — Showing downloaded maps &amp; cached facilities</span>
            </>
          ) : (
            <>
              <CheckCircle size={15} />
              <span>Online — Synced with live civic registry</span>
            </>
          )}
        </div>

        {pendingInspections.length > 0 && isOnline && (
          <button
            onClick={triggerManualSync}
            disabled={syncing}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>Sync ({pendingInspections.length})</span>
          </button>
        )}
      </div>
    </div>
  );
}
