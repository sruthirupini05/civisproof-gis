import { getDrafts, updateDraftStatus, deleteDraft } from './db.js';
import { inspectionsAPI } from './api.js';
import { useSyncStore } from '../store/useStore.js';

export async function syncPendingDrafts() {
  const drafts = await getDrafts();
  const pending = drafts.filter((d) => d.syncStatus === 'pending');
  if (!pending.length) return { synced: 0, failed: 0 };

  useSyncStore.getState().setSyncStatus('syncing');
  let synced = 0;
  let failed = 0;

  for (const draft of pending) {
    try {
      await updateDraftStatus(draft.localId, 'syncing');
      await inspectionsAPI.submit(draft.data);
      await deleteDraft(draft.localId);
      synced++;
    } catch (err) {
      console.error('Sync failed for draft', draft.localId, err);
      await updateDraftStatus(draft.localId, 'failed');
      failed++;
    }
  }

  useSyncStore.getState().setLastSyncTime(new Date().toISOString());
  useSyncStore.getState().setSyncStatus(failed > 0 ? 'failed' : 'idle');
  return { synced, failed };
}

export function setupOnlineSync() {
  window.addEventListener('online', async () => {
    console.log('Back online — attempting sync…');
    try {
      await syncPendingDrafts();
    } catch (e) {
      console.error('Auto-sync error:', e);
    }
  });
}
