/**
 * NavigatePage — Apple Maps–style full-screen navigation
 *
 * Works fully offline using the bundled fallbackFacilities.json.
 * Live OSRM routing is attempted first; on failure a straight-line
 * fallback is drawn and labelled clearly.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import { calculateRoute } from '../services/routing.js';
import fallbackFacilities from '../data/fallbackFacilities.json';

/* ─── Constants ─────────────────────────────────────────────── */

const DEFAULT_CENTRE = [16.9948, 81.7798]; // Rajahmundry Pushkara Ghat

const MODE_CONFIG = {
  walking: { label: 'Walk', icon: '🚶', osrm: 'foot' },
  cycling: { label: 'Cycle', icon: '🚲', osrm: 'bike' },
  driving: { label: 'Drive', icon: '🚗', osrm: 'car' },
};

const MANEUVER_ICON = {
  turn: { left: '↰', right: '↱', 'sharp left': '↩', 'sharp right': '↪', 'slight left': '↙', 'slight right': '↘' },
  roundabout: '⟳',
  merge: '⇒',
  depart: '📍',
  arrive: '🏁',
  default: '↑',
};

function maneuverIcon(step) {
  if (!step?.maneuver) return MANEUVER_ICON.default;
  const type = step.maneuver;
  if (type === 'depart') return MANEUVER_ICON.depart;
  if (type === 'arrive') return MANEUVER_ICON.arrive;
  if (type === 'roundabout') return MANEUVER_ICON.roundabout;
  if (type === 'merge') return MANEUVER_ICON.merge;
  if (type === 'turn') return MANEUVER_ICON.turn[step.modifier] || MANEUVER_ICON.default;
  return MANEUVER_ICON.default;
}

/* ─── Coordinate helpers ─────────────────────────────────────── */

function getCoords(place) {
  if (!place) return null;
  const lat = Number(place.lat ?? place.latitude ?? place.location?.lat);
  const lng = Number(
    place.lng ?? place.lon ?? place.longitude ?? place.location?.lng ?? place.location?.lon
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m) {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatTime(s) {
  if (s == null) return '';
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

/* ─── Marker icons ───────────────────────────────────────────── */

const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0005;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 2px 4px #0006);">📍</div>`,
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

const pulseIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;inset:0;background:#2563eb22;border-radius:50%;animation:pulse-ring 1.6s cubic-bezier(0.215,0.61,0.355,1) infinite;"></div>
    <div style="position:absolute;inset:4px;background:#2563eb;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px #0004;"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/* ─── Map sub-components ─────────────────────────────────────── */

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 17 });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
  }, [map, JSON.stringify(points)]);
  return null;
}

function RecenterButton({ position }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(position, 16, { animate: true })}
      style={{
        position: 'absolute',
        bottom: 200,
        right: 16,
        zIndex: 1000,
        width: 44,
        height: 44,
        background: '#fff',
        border: 'none',
        borderRadius: 12,
        boxShadow: '0 2px 12px #0003',
        fontSize: 20,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Re-centre map"
    >
      📍
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const targetId =
    facilityId ?? id ?? searchParams.get('facilityId') ?? searchParams.get('id');

  /* ── state ── */
  const [facility, setFacility] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadingFacility, setLoadingFacility] = useState(true);

  const [origin, setOrigin] = useState(null); // [lat, lng] or null
  const [locationStatus, setLocationStatus] = useState('pending'); // pending | ok | denied

  const [mode, setMode] = useState('walking');
  const [route, setRoute] = useState(null); // null | { points, steps, distM, durS, isFallback }
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const [navActive, setNavActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [arrived, setArrived] = useState(false);

  const mapRef = useRef(null);

  /* ── derived ── */
  const destination = useMemo(() => getCoords(facility), [facility]);

  const fitPoints = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    return pts;
  }, [origin, destination]);

  const currentStep = route?.steps?.[stepIndex] ?? null;

  /* ── Load facility ── */
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoadingFacility(true);
      setLoadError('');

      if (!targetId) {
        setLoadError('No facility selected. Please go back and choose a facility.');
        setLoadingFacility(false);
        return;
      }

      /* 1. Try QR resolve endpoint */
      let found = null;
      try {
        const res = await qrAPI.resolve(targetId);
        const f = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
        if (getCoords(f)) found = f;
      } catch { /* network unavailable */ }

      /* 2. Try facilities/:id endpoint */
      if (!found) {
        try {
          const res = await facilitiesAPI.get(targetId);
          const f = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
          if (getCoords(f)) found = f;
        } catch { /* offline or wrong id */ }
      }

      /* 3. Offline fallback — search bundled JSON by qr_token or id */
      if (!found) {
        found =
          fallbackFacilities.find(
            (f) => f.qr_token === targetId || f.id === targetId
          ) ?? null;
      }

      if (!alive) return;

      if (!found || !getCoords(found)) {
        setLoadError(
          'Could not load this facility. It may not exist, or you are offline and the facility is not cached.'
        );
      } else {
        setFacility(found);
      }
      setLoadingFacility(false);
    }

    load();
    return () => { alive = false; };
  }, [targetId]);

  /* ── Get user location ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setOrigin(DEFAULT_CENTRE);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = [Number(pos.coords.latitude), Number(pos.coords.longitude)];
        setOrigin(pt);
        setLocationStatus('ok');
      },
      () => {
        setOrigin(DEFAULT_CENTRE);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  /* ── Calculate route ── */
  const calcRoute = useCallback(async () => {
    if (!origin || !destination) return;

    setRouteLoading(true);
    setRouteError('');
    setRoute(null);
    setStepIndex(0);
    setArrived(false);

    try {
      const results = await calculateRoute(origin, destination, mode);
      const best = Array.isArray(results) ? results[0] : results;

      if (!best) throw new Error('No route returned.');

      // Extract GeoJSON coordinate array [lng, lat] → convert to [lat, lng]
      const coords = best?.geometry?.coordinates ?? [];
      const points = coords
        .filter((c) => Array.isArray(c) && c.length >= 2)
        .map((c) => [Number(c[1]), Number(c[0])]);

      setRoute({
        points: points.length >= 2 ? points : [origin, destination],
        steps: best.steps ?? [],
        distM: best.distanceM,
        durS: best.durationS,
        distLabel: best.distanceLabel,
        durLabel: best.durationLabel,
        isFallback: points.length < 2,
        source: best.source ?? 'OSRM',
      });
    } catch (err) {
      // Straight-line fallback
      const distM = haversineKm(origin, destination) * 1000;
      setRoute({
        points: [origin, destination],
        steps: [],
        distM,
        durS: null,
        distLabel: formatDist(distM),
        durLabel: '',
        isFallback: true,
        source: 'straight-line fallback',
      });
      setRouteError(
        `Live routing unavailable (${err?.message ?? 'network error'}). Showing straight-line estimate — not a road route.`
      );
    } finally {
      setRouteLoading(false);
    }
  }, [origin, destination, mode]);

  useEffect(() => {
    if (origin && destination) calcRoute();
  }, [calcRoute]);

  /* ── Navigation step helpers ── */
  function nextStep() {
    if (!route?.steps?.length) return;
    if (stepIndex < route.steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setArrived(true);
      setNavActive(false);
    }
  }

  function prevStep() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  /* ─── Render: loading state ─── */
  if (loadingFacility) {
    return (
      <div style={S.splash}>
        <div style={S.spinnerRing} />
        <p style={{ color: '#fff', marginTop: 16, fontSize: 15 }}>Loading facility…</p>
      </div>
    );
  }

  /* ─── Render: error state ─── */
  if (loadError || !destination) {
    return (
      <div style={S.splash}>
        <div style={{ maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#fff', marginBottom: 12 }}>Navigation unavailable</h2>
          <p style={{ color: '#ffffffcc', lineHeight: 1.6, marginBottom: 24 }}>
            {loadError || 'This facility has no valid coordinates.'}
          </p>
          <button style={S.btnWhite} onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </div>
    );
  }

  const facilityName =
    facility?.name ?? facility?.facility_name ?? facility?.title ?? 'Facility';

  const stepsBannerText = (() => {
    if (arrived) return '🏁 You have arrived!';
    if (!navActive) return facilityName;
    if (!route?.steps?.length) return `Head towards ${facilityName}`;
    return currentStep?.instruction ?? `Continue towards ${facilityName}`;
  })();

  const stepsDist = navActive && currentStep ? currentStep.distanceLabel : route?.distLabel;

  /* ─── Main render ─── */
  return (
    <div style={S.root}>
      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0.8; }
          80%, 100% { transform: scale(2.2); opacity: 0; }
        }
        .civicproof-route { stroke-linecap: round; stroke-linejoin: round; }
      `}</style>

      {/* ── Map (fills screen) ── */}
      <MapContainer
        center={destination}
        zoom={14}
        zoomControl={false}
        style={S.map}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={fitPoints} />

        {/* Origin marker */}
        {origin && (
          <Marker position={origin} icon={navActive ? pulseIcon : originIcon} />
        )}

        {/* Destination marker */}
        <Marker position={destination} icon={destIcon} />

        {/* Route polyline */}
        {route?.points?.length >= 2 && (
          <>
            {/* Shadow */}
            <Polyline
              positions={route.points}
              pathOptions={{ color: '#00000033', weight: 9, lineCap: 'round' }}
            />
            {/* Main line */}
            <Polyline
              positions={route.points}
              pathOptions={{
                color: route.isFallback ? '#f59e0b' : '#2563eb',
                weight: 6,
                opacity: 0.95,
                className: 'civicproof-route',
              }}
            />
          </>
        )}

        {/* Recenter button (absolute inside map) */}
        {origin && <RecenterButton position={navActive ? origin : destination} />}
      </MapContainer>

      {/* ── Top navigation banner (Apple Maps style) ── */}
      <div style={S.topBanner}>
        <div style={S.bannerInner}>
          {navActive && route?.steps?.length > 0 && (
            <div style={S.maneuverIcon}>{maneuverIcon(currentStep)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={S.bannerInstruction}>{stepsBannerText}</p>
            {stepsDist && (
              <p style={S.bannerDist}>
                {navActive ? `In ${stepsDist}` : stepsDist}
                {route?.durLabel ? ` · ${route.durLabel}` : ''}
              </p>
            )}
          </div>
          {navActive && (
            <button style={S.exitNavBtn} onClick={() => { setNavActive(false); setStepIndex(0); }}>
              ✕
            </button>
          )}
        </div>

        {/* Step-through controls (while navigating) */}
        {navActive && route?.steps?.length > 0 && !arrived && (
          <div style={S.stepControls}>
            <button
              style={{ ...S.stepBtn, opacity: stepIndex === 0 ? 0.3 : 1 }}
              disabled={stepIndex === 0}
              onClick={prevStep}
            >
              ‹ Prev
            </button>
            <span style={{ color: '#fff', fontSize: 13 }}>
              {stepIndex + 1} / {route.steps.length}
            </span>
            <button style={S.stepBtn} onClick={nextStep}>
              {stepIndex === route.steps.length - 1 ? 'Arrive 🏁' : 'Next ›'}
            </button>
          </div>
        )}
      </div>

      {/* ── Back button (top-left) ── */}
      {!navActive && (
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          ‹ Back
        </button>
      )}

      {/* ── Bottom sheet ── */}
      <div style={{ ...S.bottomSheet, transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 200px))' }}>

        {/* Drag handle / toggle */}
        <button style={S.dragHandle} onClick={() => setDrawerOpen((o) => !o)}>
          <div style={S.handleBar} />
        </button>

        {/* Facility name + summary */}
        <div style={S.sheetHeader}>
          <div style={{ flex: 1 }}>
            <p style={S.sheetTitle}>{facilityName}</p>
            {facility?.address && (
              <p style={S.sheetSub}>{facility.address}</p>
            )}
            {route && !routeLoading && (
              <p style={S.sheetSub}>
                {route.isFallback ? '⚠️ Straight-line estimate · ' : ''}
                {route.distLabel}
                {route.durLabel ? ` · ${route.durLabel}` : ''}
              </p>
            )}
            {routeLoading && <p style={S.sheetSub}>Calculating route…</p>}
          </div>
        </div>

        {/* Route error */}
        {routeError && (
          <div style={S.routeError}>{routeError}</div>
        )}

        {/* Mode selector */}
        {!navActive && (
          <div style={S.modeRow}>
            {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                style={{ ...S.modeBtn, ...(mode === key ? S.modeBtnActive : {}) }}
                onClick={() => setMode(key)}
              >
                <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                <span style={{ fontSize: 12, marginTop: 2 }}>{cfg.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* START button */}
        {!navActive && !arrived && (
          <button
            style={{
              ...S.startBtn,
              opacity: route && !routeLoading ? 1 : 0.5,
            }}
            disabled={!route || routeLoading}
            onClick={() => {
              setNavActive(true);
              setStepIndex(0);
              setDrawerOpen(false);
            }}
          >
            {routeLoading ? 'Calculating…' : '▶  Start'}
          </button>
        )}

        {/* Arrived screen */}
        {arrived && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <p style={{ fontSize: 22, marginBottom: 8 }}>🏁 You have arrived!</p>
            <button style={S.startBtn} onClick={() => navigate(-1)}>Done</button>
          </div>
        )}

        {/* Turn-by-turn step list (when drawer open) */}
        {drawerOpen && route?.steps?.length > 0 && (
          <div style={S.stepList}>
            <p style={S.stepListHeader}>Turn-by-turn directions</p>
            {route.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  ...S.stepItem,
                  background: navActive && i === stepIndex ? '#eff6ff' : 'transparent',
                }}
              >
                <span style={S.stepItemIcon}>{maneuverIcon(step)}</span>
                <div>
                  <p style={S.stepItemText}>{step.instruction}</p>
                  {step.distanceLabel && (
                    <p style={S.stepItemDist}>{step.distanceLabel}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No steps but drawer open */}
        {drawerOpen && route && route.steps.length === 0 && (
          <p style={{ color: '#64748b', fontSize: 13, padding: '8px 16px' }}>
            Detailed turn-by-turn directions are not available for this route.
          </p>
        )}

        {/* Open in Google Maps */}
        {drawerOpen && destination && (
          <button
            style={S.gmapsBtn}
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            Open in Google Maps ↗
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const S = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  /* Splash / error screen */
  splash: {
    position: 'fixed',
    inset: 0,
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  spinnerRing: {
    width: 48,
    height: 48,
    border: '5px solid #ffffff33',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  btnWhite: {
    padding: '12px 28px',
    background: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#0f172a',
  },

  /* Map */
  map: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    zIndex: 0,
  },

  /* Top banner */
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
    background: 'linear-gradient(180deg, #1e293bf0 0%, #1e293bcc 80%, transparent 100%)',
    paddingTop: 'env(safe-area-inset-top, 12px)',
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  bannerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  maneuverIcon: {
    fontSize: 28,
    minWidth: 36,
    textAlign: 'center',
  },
  bannerInstruction: {
    margin: 0,
    color: '#fff',
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: -0.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bannerDist: {
    margin: '2px 0 0',
    color: '#94a3b8',
    fontSize: 13,
  },
  exitNavBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: 50,
    color: '#fff',
    width: 32,
    height: 32,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #ffffff22',
  },
  stepBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  /* Back button */
  backBtn: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top, 12px) + 12px)',
    left: 16,
    zIndex: 950,
    background: '#1e293bf0',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    padding: '8px 14px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    marginTop: 56,
  },

  /* Bottom sheet */
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 800,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 32px #0003',
    maxHeight: '75vh',
    overflowY: 'auto',
    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
  },
  dragHandle: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 0 4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  handleBar: {
    width: 36,
    height: 4,
    background: '#cbd5e1',
    borderRadius: 2,
  },
  sheetHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '4px 20px 12px',
  },
  sheetTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  sheetSub: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.4,
  },
  routeError: {
    margin: '0 20px 12px',
    padding: '10px 14px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: 10,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 1.5,
  },
  modeRow: {
    display: 'flex',
    gap: 8,
    padding: '0 20px 12px',
  },
  modeBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    background: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    color: '#475569',
  },
  modeBtnActive: {
    border: '1.5px solid #2563eb',
    background: '#eff6ff',
    color: '#2563eb',
  },

  /* Start button — same green as Apple Maps */
  startBtn: {
    display: 'block',
    width: 'calc(100% - 40px)',
    margin: '0 20px 16px',
    padding: '16px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.5,
    cursor: 'pointer',
    boxShadow: '0 4px 16px #16a34a55',
    transition: 'transform 0.1s, opacity 0.2s',
  },
  gmapsBtn: {
    display: 'block',
    width: 'calc(100% - 40px)',
    margin: '4px 20px 8px',
    padding: '12px',
    background: 'transparent',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },

  /* Step list */
  stepList: {
    padding: '0 0 8px',
    borderTop: '1px solid #f1f5f9',
  },
  stepListHeader: {
    margin: '12px 20px 8px',
    fontSize: 13,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 20px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s',
  },
  stepItemIcon: {
    fontSize: 18,
    minWidth: 24,
    textAlign: 'center',
    paddingTop: 1,
  },
  stepItemText: {
    margin: 0,
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  stepItemDist: {
    margin: '2px 0 0',
    fontSize: 12,
    color: '#94a3b8',
  },
};
