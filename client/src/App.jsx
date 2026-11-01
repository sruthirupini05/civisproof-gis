import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/UI/Layout.jsx';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import OfflineIndicator from './components/UI/OfflineIndicator.jsx';
import ProtectedRoute from './components/UI/ProtectedRoute.jsx';
import { cacheAllFacilities } from './services/db.js';
import { facilitiesAPI } from './services/api.js';
import { setupOnlineSync } from './services/sync.js';
import fallbackFacilities from './data/fallbackFacilities.json';
import { useThemeStore } from './store/useStore.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const FacilityPage = lazy(() => import('./pages/FacilityPage.jsx'));
const NavigatePage = lazy(() => import('./pages/NavigatePage.jsx'));
const HelpPage = lazy(() => import('./pages/HelpPage.jsx'));
const InspectPage = lazy(() => import('./pages/InspectPage.jsx'));
const ScanPage = lazy(() => import('./pages/ScanPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const QRAdminPage = lazy(() => import('./pages/QRAdminPage.jsx'));
const CityQRPage = lazy(() => import('./pages/CityQRPage.jsx'));
const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'));
const DestinationDetailPage = lazy(() => import('./pages/DestinationDetailPage.jsx'));
const MoreServicesPage = lazy(() => import('./pages/MoreServicesPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
const NearbyFoodPage = lazy(() => import('./pages/NearbyFoodPage.jsx'));
const PetrolStationsPage = lazy(() => import('./pages/PetrolStationsPage.jsx'));
const TransportHubsPage = lazy(() => import('./pages/TransportHubsPage.jsx'));

export default function App() {
  const { mode, setMode, refreshSystemTheme } = useThemeStore();

  useEffect(() => {
    // Initial theme apply
    setMode(mode);

    // Listen to OS system dark/light changes
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => refreshSystemTheme();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [mode, setMode, refreshSystemTheme]);
  useEffect(() => {
    async function preheatOffline() {
      try {
        const fallback = Array.isArray(fallbackFacilities)
          ? fallbackFacilities
          : Array.isArray(fallbackFacilities?.facilities)
          ? fallbackFacilities.facilities
          : [];

        await cacheAllFacilities(fallback);

        if (navigator.onLine) {
          const response = await facilitiesAPI.list({});
          const fresh = Array.isArray(response)
            ? response
            : Array.isArray(response?.facilities)
            ? response.facilities
            : Array.isArray(response?.data)
            ? response.data
            : [];

          if (fresh.length > 0) {
            await cacheAllFacilities(fresh);
          }
        }
      } catch (e) {
        console.warn('Offline storage preheat error:', e);
      }
    }

    preheatOffline();
    setupOnlineSync();
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public Pilgrim Routes */}
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="explore/:id" element={<DestinationDetailPage />} />
            <Route path="services/:type" element={<MoreServicesPage />} />
            <Route path="services" element={<MoreServicesPage />} />
            <Route path="food-nearby" element={<NearbyFoodPage />} />
            <Route path="petrol-stations" element={<PetrolStationsPage />} />
            <Route path="transport-hubs" element={<TransportHubsPage />} />
            <Route path="facility/:token" element={<FacilityPage />} />
            <Route path="navigate/:facilityId" element={<NavigatePage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="saved" element={<HelpPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="city-qr" element={<CityQRPage />} />
            <Route path="login" element={<LoginPage />} />

            {/* Protected Authorized Field Staff & Inspector Routes (Normal users restricted) */}
            <Route
              path="inspect/:facilityId"
              element={
                <ProtectedRoute allowedRoles={['inspector', 'admin']}>
                  <InspectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['inspector', 'admin']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/qr"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <QRAdminPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
