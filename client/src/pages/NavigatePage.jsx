/**
 * NavigatePage — Fully responsive Apple Maps-style navigation
 *
 * Layout adapts to:
 *   Mobile  (<640 px)  – full-screen map, bottom sheet slides up
 *   Tablet  (640–1024) – same as mobile but larger touch targets
 *   Desktop (>1024 px) – split view: sidebar on left, map on right
 *
 * Works completely offline via bundled fallbackFacilities.json.
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

/* ─── Breakpoints (mirror Tailwind) ───────────────────────────── */
const BP = { sm: 640, lg: 1024 };

function useBreakpoint() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { isMobile: w < BP.sm, isTablet: w >= BP.sm && w < BP.lg, isDesktop: w >= BP.lg };
}

/* ─── Constants ─────────────────────────────────────────────────── */
const DEFAULT_CENTRE = [16.9948, 81.7798]; // Rajahmundry Panchavati Ghat

const MODES = [
  { key: 'walking', icon: '🚶', label: 'Walk' },
  { key: 'cycling', icon: '🚲', label: 'Cycle' },
  { key: 'driving', icon: '🚗', label: 'Drive' },
];

const MANEUVER_ICONS = {
  depart: '📍', arrive: '🏁', roundabout: '⟳', merge: '⇒',
  turn_left: '↰', turn_right: '↱', turn_sharp_left: '↩', turn_sharp_right: '↪',
  turn_slight_left: '↙', turn_slight_right: '↘', default: '↑',
};

function stepIcon(step) {
  if (!step?.maneuver) return MANEUVER_ICONS.default;
  const { maneuver, modifier } = step;
  if (maneuver === 'depart') return MANEUVER_ICONS.depart;
  if (maneuver === 'arrive') return MANEUVER_ICONS.arrive;
  if (maneuver === 'roundabout') return MANEUVER_ICONS.roundabout;
  if (maneuver === 'turn' && modifier)
    return MANEUVER_ICONS[`turn_${modifier.replace(' ', '_')}`] ?? MANEUVER_ICONS.default;
  return MANEUVER_ICONS.default;
}

/* ─── Coordinate helpers ─────────────────────────────────────────── */
function getCoords(place) {
  if (!place) return null;
  const lat = Number(place.lat ?? place.latitude ?? place.location?.lat);
  const lng = Number(place.lng ?? place.lon ?? place.longitude ?? place.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function haversineM([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmt(m) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function fmtTime(s) {
  if (s == null) return '';
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;
}

/* ─── Leaflet icons ──────────────────────────────────────────────── */
const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0005;"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px #0006);">📍</div>`,
  iconSize: [28, 28], iconAnchor: [14, 28],
});

const pulseIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:26px;height:26px;">
    <div style="position:absolute;inset:0;background:#2563eb22;border-radius:50%;animation:civicPulse 1.6s cubic-bezier(.215,.61,.355,1) infinite;"></div>
    <div style="position:absolute;inset:4px;background:#2563eb;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px #0004;"></div>
  </div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

/* ─── Map helpers ────────────────────────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 17, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
    }
  }, [key]);
  return null;
}

/* ─── Component ──────────────────────────────────────────────────── */
export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const targetId =
    facilityId ?? id ?? searchParams.get('facilityId') ?? searchParams.get('id');

  /* ── state ── */
  const [facility, setFacility]     = useState(null);
  const [loadError, setLoadError]   = useState('');
  const [loading, setLoading]       = useState(true);

  const [origin, setOrigin]         = useState(null);
  const [locStatus, setLocStatus]   = useState('pending');

  const [mode, setMode]             = useState('walking');
  const [route, setRoute]           = useState(null);
  const [routeLoading, setRL]       = useState(false);
  const [routeError, setRE]         = useState('');

  const [navActive, setNavActive]   = useState(false);
  const [stepIdx, setStepIdx]       = useState(0);
  const [arrived, setArrived]       = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const destination = useMemo(() => getCoords(facility), [facility]);

  const fitPoints = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    return pts;
  }, [JSON.stringify(origin), JSON.stringify(destination)]);

  const currentStep = route?.steps?.[stepIdx] ?? null;

  /* ── Load facility ── */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true); setLoadError('');
      if (!targetId) {
        setLoadError('No facility selected. Please go back and choose a facility.');
        setLoading(false); return;
      }
      let found = null;

      // 1. QR resolve
      try {
        const res = await qrAPI.resolve(targetId);
        const f = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
        if (getCoords(f)) found = f;
      } catch {}

      // 2. Facilities endpoint
      if (!found) {
        try {
          const res = await facilitiesAPI.get(targetId);
          const f = res?.facility ?? res?.data?.facility ?? res?.data ?? res;
          if (getCoords(f)) found = f;
        } catch {}
      }

      // 3. Offline bundle
      if (!found) {
        found = fallbackFacilities.find(
          (f) => f.qr_token === targetId || f.id === targetId
        ) ?? null;
      }

      if (!alive) return;
      if (!found || !getCoords(found)) {
        setLoadError('Could not load this facility. You may be offline or the link is invalid.');
      } else {
        setFacility(found);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [targetId]);

  /* ── Geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) { setOrigin(DEFAULT_CENTRE); setLocStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin([Number(pos.coords.latitude), Number(pos.coords.longitude)]);
        setLocStatus('ok');
      },
      () => { setOrigin(DEFAULT_CENTRE); setLocStatus('denied'); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  /* ── Route calculation ── */
  const calcRoute = useCallback(async () => {
    if (!origin || !destination) return;
    setRL(true); setRE(''); setRoute(null); setStepIdx(0); setArrived(false);
    try {
      const results = await calculateRoute(origin, destination, mode);
      const best = Array.isArray(results) ? results[0] : results;
      if (!best) throw new Error('No route returned.');
      const coords = best?.geometry?.coordinates ?? [];
      const points = coords
        .filter((c) => Array.isArray(c) && c.length >= 2)
        .map((c) => [Number(c[1]), Number(c[0])]);
      setRoute({
        points: points.length >= 2 ? points : [origin, destination],
        steps: best.steps ?? [],
        distLabel: best.distanceLabel ?? fmt(best.distanceM),
        durLabel: best.durationLabel ?? fmtTime(best.durationS),
        distM: best.distanceM,
        isFallback: points.length < 2,
      });
    } catch (err) {
      const distM = haversineM(origin, destination);
      setRoute({ points: [origin, destination], steps: [], distLabel: fmt(distM), durLabel: '', distM, isFallback: true });
      setRE(`Live routing unavailable — straight-line estimate shown. ${err?.message ?? ''}`);
    } finally { setRL(false); }
  }, [origin, destination, mode]);

  useEffect(() => { if (origin && destination) calcRoute(); }, [calcRoute]);

  /* ── Nav controls ── */
  const nextStep = () => {
    if (!route?.steps?.length) return;
    if (stepIdx < route.steps.length - 1) setStepIdx((i) => i + 1);
    else { setArrived(true); setNavActive(false); }
  };
  const prevStep = () => { if (stepIdx > 0) setStepIdx((i) => i - 1); };

  /* ── Derived UI text ── */
  const bannerText = arrived
    ? '🏁 You have arrived!'
    : navActive && route?.steps?.length
      ? currentStep?.instruction ?? `Head to ${facility?.name ?? 'destination'}`
      : facility?.name ?? 'Navigate';

  const bannerSub = navActive && currentStep
    ? `In ${currentStep.distanceLabel ?? ''}`
    : `${route?.distLabel ?? ''}${route?.durLabel ? ' · ' + route.durLabel : ''}`;

  /* ─── Loading / Error screens ─── */
  if (loading) return (
    <div style={css.splash}>
      <div style={css.spinner} />
      <p style={{ color: '#fff', marginTop: 16, fontSize: 15 }}>Loading facility…</p>
    </div>
  );

  if (loadError || !destination) return (
    <div style={css.splash}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: 22 }}>Navigation unavailable</h2>
        <p style={{ color: '#ffffffcc', lineHeight: 1.7, marginBottom: 24, fontSize: 15 }}>
          {loadError || 'This facility has no valid coordinates.'}
        </p>
        <button style={css.btnWhite} onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );

  /* ─── Main layout ─── */
  // Desktop: side panel (380 px) + map fills rest
  // Mobile/Tablet: full-screen map + overlay panels

  const sidebarW = isDesktop ? 380 : isTablet ? 340 : 0;

  return (
    <div style={{ ...css.root, flexDirection: isDesktop ? 'row' : 'column' }}>
      <style>{`
        @keyframes civicPulse {
          0%   { transform:scale(0.5); opacity:0.8; }
          80%, 100% { transform:scale(2.2); opacity:0; }
        }
        @keyframes civicSpin {
          to { transform:rotate(360deg); }
        }
        .civic-map-container .leaflet-control-zoom {
          margin: ${isDesktop ? '16px' : '12px'} !important;
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══ */}
      {isDesktop && (
        <aside style={css.sidebar}>
          <SidebarContent
            facility={facility}
            route={route}
            routeLoading={routeLoading}
            routeError={routeError}
            locStatus={locStatus}
            mode={mode}
            setMode={setMode}
            navActive={navActive}
            stepIdx={stepIdx}
            arrived={arrived}
            destination={destination}
            onStart={() => { setNavActive(true); setStepIdx(0); }}
            onExit={() => { setNavActive(false); setStepIdx(0); }}
            onPrev={prevStep}
            onNext={nextStep}
            onBack={() => navigate(-1)}
            isDesktop
          />
        </aside>
      )}

      {/* ══ MAP ══ */}
      <div style={{ ...css.mapWrap, flex: 1, minHeight: isDesktop ? '100vh' : '55vh' }}>
        <MapContainer
          center={destination}
          zoom={14}
          zoomControl={isDesktop}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
          className="civic-map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={fitPoints} />
          {origin && <Marker position={origin} icon={navActive ? pulseIcon : originIcon} />}
          <Marker position={destination} icon={destIcon} />
          {route?.points?.length >= 2 && (
            <>
              <Polyline positions={route.points}
                pathOptions={{ color: '#00000026', weight: 10, lineCap: 'round' }} />
              <Polyline positions={route.points}
                pathOptions={{ color: route.isFallback ? '#f59e0b' : '#2563eb', weight: 6, opacity: 0.95, lineCap: 'round' }} />
            </>
          )}
        </MapContainer>

        {/* Mobile/Tablet overlays */}
        {!isDesktop && (
          <>
            {/* Top banner */}
            <div style={{ ...css.topBanner, paddingTop: 12 }}>
              <div style={css.bannerRow}>
                {!navActive && (
                  <button style={css.backPill} onClick={() => navigate(-1)}>‹ Back</button>
                )}
                <div style={css.bannerCard}>
                  {navActive && route?.steps?.length > 0 && (
                    <span style={{ fontSize: isTablet ? 24 : 20, marginRight: 8 }}>
                      {stepIcon(currentStep)}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...css.bannerTitle, fontSize: isTablet ? 17 : 15 }}>
                      {bannerText}
                    </p>
                    {bannerSub ? (
                      <p style={{ ...css.bannerSub, fontSize: isTablet ? 13 : 12 }}>{bannerSub}</p>
                    ) : null}
                  </div>
                  {navActive && (
                    <button style={css.xBtn}
                      onClick={() => { setNavActive(false); setStepIdx(0); }}>✕</button>
                  )}
                </div>
              </div>
              {navActive && route?.steps?.length > 0 && !arrived && (
                <div style={css.stepRow}>
                  <button style={{ ...css.stepBtn, opacity: stepIdx === 0 ? 0.3 : 1 }}
                    disabled={stepIdx === 0} onClick={prevStep}>‹ Prev</button>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    {stepIdx + 1} / {route.steps.length}
                  </span>
                  <button style={css.stepBtn} onClick={nextStep}>
                    {stepIdx === route.steps.length - 1 ? 'Arrive 🏁' : 'Next ›'}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom sheet (mobile/tablet) */}
            <div style={{
              ...css.sheet,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 190px))',
              maxHeight: isTablet ? '65vh' : '72vh',
            }}>
              <button style={css.handle} onClick={() => setDrawerOpen((o) => !o)}>
                <div style={css.handleBar} />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {drawerOpen ? 'Collapse' : 'Expand for directions'}
                </span>
              </button>
              <SheetBody
                facility={facility}
                route={route}
                routeLoading={routeLoading}
                routeError={routeError}
                locStatus={locStatus}
                mode={mode}
                setMode={setMode}
                navActive={navActive}
                stepIdx={stepIdx}
                arrived={arrived}
                destination={destination}
                drawerOpen={drawerOpen}
                onStart={() => { setNavActive(true); setStepIdx(0); setDrawerOpen(false); }}
                onExit={() => { setNavActive(false); setStepIdx(0); }}
                onPrev={prevStep}
                onNext={nextStep}
                isTablet={isTablet}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Desktop sidebar ────────────────────────────────────────────── */
function SidebarContent({
  facility, route, routeLoading, routeError, locStatus,
  mode, setMode, navActive, stepIdx, arrived,
  destination, onStart, onExit, onPrev, onNext, onBack,
}) {
  return (
    <div style={css.sideInner}>
      {/* Header */}
      <div style={css.sideHeader}>
        <button style={css.backPillDark} onClick={onBack}>‹ Back</button>
        <div style={{ marginTop: 12 }}>
          <h1 style={css.sideTitle}>
            {facility?.name ?? 'Facility'}
          </h1>
          {facility?.address && (
            <p style={css.sideSub}>{facility.address}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {route && !routeLoading && (
              <span style={css.badge}>
                {route.isFallback ? '⚠️ ' : '🛣️ '}{route.distLabel}
              </span>
            )}
            {route?.durLabel && !routeLoading && (
              <span style={css.badge}>⏱ {route.durLabel}</span>
            )}
            {routeLoading && <span style={css.badge}>⏳ Calculating…</span>}
            {locStatus === 'denied' && (
              <span style={{ ...css.badge, background: '#fef3c7', color: '#92400e' }}>
                📍 Default location
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Route error */}
      {routeError && (
        <div style={css.alertWarn}>{routeError}</div>
      )}

      {/* Mode selector */}
      {!navActive && !arrived && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={css.label}>Travel mode</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {MODES.map(({ key, icon, label }) => (
              <button key={key} style={{ ...css.modeBtn, ...(mode === key ? css.modeBtnOn : {}) }}
                onClick={() => setMode(key)}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 12, marginTop: 3 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start / Exit */}
      {!arrived && (
        navActive
          ? (
            <button style={{ ...css.startBtn, margin: '0 16px 16px', background: '#ef4444' }}
              onClick={onExit}>Stop navigation ✕</button>
          )
          : (
            <button style={{ ...css.startBtn, margin: '0 16px 16px', opacity: route && !routeLoading ? 1 : 0.5 }}
              disabled={!route || routeLoading}
              onClick={onStart}>
              {routeLoading ? '⏳ Calculating route…' : '▶  Start Navigation'}
            </button>
          )
      )}

      {arrived && (
        <div style={{ textAlign: 'center', padding: '8px 16px 16px' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🏁</p>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>You have arrived!</p>
          <button style={{ ...css.startBtn }} onClick={() => window.location.reload()}>
            Navigate again
          </button>
        </div>
      )}

      {/* Step-through banner when navigating */}
      {navActive && route?.steps?.length > 0 && !arrived && (
        <div style={css.navBanner}>
          <span style={{ fontSize: 26, marginRight: 10 }}>{stepIcon(route.steps[stepIdx])}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.3 }}>
              {route.steps[stepIdx]?.instruction ?? 'Continue'}
            </p>
            {route.steps[stepIdx]?.distanceLabel && (
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                In {route.steps[stepIdx].distanceLabel}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <button style={{ ...css.stepBtn, width: 72 }}
              disabled={stepIdx === 0} onClick={onPrev}
              style={{ ...css.stepBtn, width: 72, opacity: stepIdx === 0 ? 0.3 : 1 }}>‹ Prev</button>
            <span style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
              {stepIdx + 1}/{route.steps.length}
            </span>
            <button style={{ ...css.stepBtn, width: 72 }} onClick={onNext}>
              {stepIdx === route.steps.length - 1 ? 'Arrive' : 'Next ›'}
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px 12px' }} />

      {/* Turn-by-turn list */}
      {route?.steps?.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ ...css.label, padding: '0 16px', marginBottom: 8 }}>Directions</p>
          {route.steps.map((step, i) => (
            <div key={i} style={{
              ...css.stepItem,
              background: navActive && i === stepIdx ? '#eff6ff' : 'transparent',
              borderLeft: navActive && i === stepIdx ? '3px solid #2563eb' : '3px solid transparent',
            }}>
              <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{stepIcon(step)}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#1e293b', lineHeight: 1.4 }}>
                  {step.instruction}
                </p>
                {step.distanceLabel && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {step.distanceLabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No directions */}
      {route && route.steps.length === 0 && (
        <p style={{ padding: '0 16px', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
          Detailed turn-by-turn directions are unavailable for this route.
        </p>
      )}

      {/* Google Maps link */}
      {destination && (
        <div style={{ padding: '12px 16px 16px', marginTop: 'auto' }}>
          <button style={css.gmapsBtn}
            onClick={() => window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
              '_blank', 'noopener,noreferrer'
            )}>
            Open in Google Maps ↗
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile/Tablet bottom sheet body ───────────────────────────── */
function SheetBody({
  facility, route, routeLoading, routeError, locStatus,
  mode, setMode, navActive, stepIdx, arrived,
  destination, drawerOpen, onStart, onExit, onPrev, onNext, isTablet,
}) {
  return (
    <div style={{ padding: '0 0 8px' }}>
      {/* Summary row */}
      <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: isTablet ? 17 : 16, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {facility?.name ?? 'Facility'}
          </p>
          {facility?.address && (
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>{facility.address}</p>
          )}
          {route && !routeLoading && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              {route.isFallback ? '⚠️ Estimate · ' : ''}{route.distLabel}
              {route.durLabel ? ` · ${route.durLabel}` : ''}
            </p>
          )}
          {routeLoading && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Calculating route…</p>}
        </div>
      </div>

      {/* Route error */}
      {routeError && drawerOpen && (
        <div style={{ ...css.alertWarn, margin: '0 16px 12px', fontSize: 13 }}>{routeError}</div>
      )}

      {/* Mode buttons */}
      {!navActive && !arrived && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px' }}>
          {MODES.map(({ key, icon, label }) => (
            <button key={key}
              style={{ ...css.modeBtn, ...(mode === key ? css.modeBtnOn : {}), flex: 1, padding: '8px 4px' }}
              onClick={() => setMode(key)}>
              <span style={{ fontSize: isTablet ? 20 : 18 }}>{icon}</span>
              <span style={{ fontSize: 12, marginTop: 2 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Start / arrived */}
      {!arrived ? (
        navActive ? (
          <button style={{ ...css.startBtn, margin: '0 16px 12px', background: '#ef4444' }}
            onClick={onExit}>Stop ✕</button>
        ) : (
          <button
            style={{ ...css.startBtn, margin: '0 16px 12px', opacity: route && !routeLoading ? 1 : 0.5 }}
            disabled={!route || routeLoading}
            onClick={onStart}>
            {routeLoading ? '⏳ Calculating…' : '▶  Start'}
          </button>
        )
      ) : (
        <div style={{ textAlign: 'center', padding: '4px 16px 12px' }}>
          <p style={{ fontSize: 24, margin: '0 0 4px' }}>🏁</p>
          <p style={{ fontWeight: 700, margin: '0 0 12px', fontSize: 16 }}>You have arrived!</p>
        </div>
      )}

      {/* Turn-by-turn — only when drawer open */}
      {drawerOpen && route?.steps?.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          <p style={{ ...css.label, margin: '10px 16px 6px' }}>Directions</p>
          {route.steps.map((step, i) => (
            <div key={i} style={{
              ...css.stepItem,
              background: navActive && i === stepIdx ? '#eff6ff' : 'transparent',
              borderLeft: navActive && i === stepIdx ? '3px solid #2563eb' : '3px solid transparent',
            }}>
              <span style={{ fontSize: 16, minWidth: 22, textAlign: 'center' }}>{stepIcon(step)}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#1e293b', lineHeight: 1.4 }}>{step.instruction}</p>
                {step.distanceLabel && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{step.distanceLabel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Maps */}
      {drawerOpen && destination && (
        <div style={{ padding: '8px 16px 4px' }}>
          <button style={css.gmapsBtn}
            onClick={() => window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
              '_blank', 'noopener,noreferrer'
            )}>
            Open in Google Maps ↗
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const css = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    background: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    zIndex: 0,
  },

  /* Map */
  mapWrap: {
    position: 'relative',
    overflow: 'hidden',
  },

  /* Desktop sidebar */
  sidebar: {
    width: 380,
    minWidth: 320,
    maxWidth: '38vw',
    height: '100vh',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 24px #00000022',
    zIndex: 10,
    overflowY: 'auto',
  },
  sideInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  sideHeader: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc',
  },
  sideTitle: {
    margin: '0 0 2px',
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  sideSub: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.4,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
  },

  /* Splash */
  splash: {
    position: 'fixed',
    inset: 0,
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    zIndex: 9999,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '5px solid #ffffff33',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'civicSpin 0.9s linear infinite',
  },
  btnWhite: {
    padding: '13px 30px',
    background: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    color: '#0f172a',
  },

  /* Mobile top banner */
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
    padding: '8px 12px',
    background: 'linear-gradient(180deg,#1e293bf5 0%,#1e293bcc 75%,transparent 100%)',
    pointerEvents: 'none',
  },
  bannerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'all',
  },
  bannerCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1e293b',
    borderRadius: 14,
    padding: '10px 12px',
    boxShadow: '0 4px 16px #0005',
  },
  bannerTitle: {
    margin: 0,
    color: '#fff',
    fontWeight: 700,
    letterSpacing: -0.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bannerSub: {
    margin: '2px 0 0',
    color: '#94a3b8',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: '6px 4px 0',
    pointerEvents: 'all',
  },

  /* Buttons */
  backPill: {
    background: '#1e293b',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    padding: '10px 14px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 2px 8px #0004',
  },
  backPillDark: {
    background: '#0f172a',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  xBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: '50%',
    color: '#fff',
    width: 30,
    height: 30,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  /* Bottom sheet */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 800,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -6px 32px #00000022',
    overflowY: 'auto',
    transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
    paddingBottom: 'env(safe-area-inset-bottom, 12px)',
  },
  handle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '10px 0 4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  handleBar: {
    width: 40,
    height: 4,
    background: '#cbd5e1',
    borderRadius: 2,
    marginBottom: 4,
  },

  /* Shared sheet / sidebar internals */
  label: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  modeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    background: '#f8fafc',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#475569',
    transition: 'all 0.15s',
  },
  modeBtnOn: {
    border: '1.5px solid #2563eb',
    background: '#eff6ff',
    color: '#2563eb',
  },
  startBtn: {
    display: 'block',
    width: 'calc(100% - 32px)',
    margin: '0 16px 12px',
    padding: '16px',
    background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)',
    border: 'none',
    borderRadius: 16,
    color: '#fff',
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 0.3,
    cursor: 'pointer',
    boxShadow: '0 4px 18px #16a34a44',
    transition: 'transform 0.1s, opacity 0.2s',
    textAlign: 'center',
  },
  gmapsBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'inherit',
  },
  alertWarn: {
    padding: '10px 14px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: 10,
    fontSize: 12.5,
    color: '#92400e',
    lineHeight: 1.5,
  },
  navBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: '#f0f9ff',
    borderTop: '1px solid #bae6fd',
    borderBottom: '1px solid #bae6fd',
    marginBottom: 12,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid #f8fafc',
    transition: 'background 0.2s',
  },
};
