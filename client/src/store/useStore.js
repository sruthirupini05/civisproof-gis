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

function getInitialTheme() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('civicproof_theme');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.mode === 'dark' || parsed?.state?.mode === 'light') {
          return parsed.state.mode;
        }
      }
    } catch {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

export const useThemeStore = create(
  persist(
    (set, get) => {
      const initialMode = getInitialTheme();
      const initialIsDark = initialMode === 'dark';

      // Immediately apply to DOM
      if (typeof document !== 'undefined') {
        if (initialIsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      return {
        mode: initialMode, // 'light' | 'dark' (Auto removed from UI)
        isDark: initialIsDark,
        setMode: (mode) => {
          const nextMode = mode === 'dark' ? 'dark' : 'light';
          const isDark = nextMode === 'dark';
          if (typeof document !== 'undefined') {
            if (isDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          set({ mode: nextMode, isDark });
        },
        toggleTheme: () => {
          const current = get().mode;
          const nextMode = current === 'dark' ? 'light' : 'dark';
          get().setMode(nextMode);
        },
        refreshSystemTheme: () => {
          // If user hasn't explicitly set a preference, follow system
          try {
            const raw = localStorage.getItem('civicproof_theme');
            if (!raw) {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              get().setMode(prefersDark ? 'dark' : 'light');
            }
          } catch {}
        },
      };
    },
    { name: 'civicproof_theme' }
  )
);

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
