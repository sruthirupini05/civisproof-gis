import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/UI/Layout.jsx';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import OfflineIndicator from './components/UI/OfflineIndicator.jsx';
import { cacheAllFacilities } from './services/db.js';
import { facilitiesAPI } from './services/api.js';
import { setupOnlineSync } from './services/sync.js';
import fallbackFacilities from './data/fallbackFacilities.json';

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

export default function App() {
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
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="facility/:token" element={<FacilityPage />} />
            <Route path="navigate/:facilityId" element={<NavigatePage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="saved" element={<HelpPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="city-qr" element={<CityQRPage />} />
            <Route path="inspect/:facilityId" element={<InspectPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="admin/qr" element={<QRAdminPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
