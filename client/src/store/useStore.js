import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { changeAppLanguage } from '../i18n/i18n.js';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    { name: 'civicproof_auth' }
  )
);

export const useLanguageStore = create((set) => ({
  currentLang: localStorage.getItem('civicproof_lang') || 'te',
  setLang: (lang) => {
    changeAppLanguage(lang);
    set({ currentLang: lang });
  },
}));

export const useMapStore = create((set) => ({
  selectedFacility: null,
  activeCategory: 'all',
  searchQuery: '',
  userLocation: null,
  setSelectedFacility: (f) => set({ selectedFacility: f }),
  setActiveCategory: (c) => set({ activeCategory: c }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setUserLocation: (loc) => set({ userLocation: loc }),
}));

export const useSyncStore = create(
  persist(
    (set, get) => ({
      pendingInspections: [],
      lastSyncTime: null,
      syncStatus: 'idle', // idle | syncing | failed
      addPendingInspection: (inspection) =>
        set((s) => ({ pendingInspections: [...s.pendingInspections, inspection] })),
      removePendingInspection: (id) =>
        set((s) => ({ pendingInspections: s.pendingInspections.filter((i) => i.localId !== id) })),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setLastSyncTime: (t) => set({ lastSyncTime: t }),
      hasPending: () => get().pendingInspections.length > 0,
    }),
    { name: 'civicproof_sync' }
  )
);
