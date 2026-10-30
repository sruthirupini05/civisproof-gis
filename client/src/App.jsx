import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/UI/Layout.jsx';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import OfflineIndicator from './components/UI/OfflineIndicator.jsx';

const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const FacilityPage = lazy(() => import('./pages/FacilityPage.jsx'));
const NavigatePage = lazy(() => import('./pages/NavigatePage.jsx'));
const InspectPage = lazy(() => import('./pages/InspectPage.jsx'));
const ScanPage = lazy(() => import('./pages/ScanPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const QRAdminPage = lazy(() => import('./pages/QRAdminPage.jsx'));
const CityQRPage = lazy(() => import('./pages/CityQRPage.jsx'));

export default function App() {
  return (
    <>
      <OfflineIndicator />
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MapPage />} />
            <Route path="facility/:token" element={<FacilityPage />} />
            <Route path="navigate/:facilityId" element={<NavigatePage />} />
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
