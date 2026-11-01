/**
 * NavigatePage — Apple Maps-style full navigation
 *
 * Features:
 *  ✅ Fully responsive: mobile (no sidebar, bottom sheet), desktop (sidebar + map)
 *  ✅ Route simulation: animated puck moves along route like real navigation
 *  ✅ Estimated arrival time (ETA) + duration + distance remaining
 *  ✅ Prev / Next step controls (step-through mode)
 *  ✅ Nearby POI search: Fuel, Food, Medical, ATM via Overpass API
 *  ✅ Offline fallback from bundled JSON
 *  ✅ Real OSRM routing with straight-line fallback
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import { calculateRoute } from '../services/routing.js';
import fallbackFacilities from '../data/fallbackFacilities.json';

/* ─── Breakpoints ─────────────────────────────────────────────── */
function useBreakpoint() {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [w, setW] = useState(get);
  useEffect(() => {
    const fn = () => setW(get());
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 };
}

/* ─── POI categories ─────────────────────────────────────────── */
const POI_CATS = [
  { key: 'fuel',     label: 'Petrol',   icon: '⛽', color: '#f97316',
    query: (r,lat,lng) => `node[amenity=fuel](around:${r},${lat},${lng});` },
  { key: 'food',     label: 'Food',     icon: '🍽️', color: '#16a34a',
    query: (r,lat,lng) => `(node[amenity=restaurant](around:${r},${lat},${lng});node[amenity=fast_food](around:${r},${lat},${lng});node[amenity=cafe](around:${r},${lat},${lng}););` },
  { key: 'medical',  label: 'Medical',  icon: '🏥', color: '#dc2626',
    query: (r,lat,lng) => `(node[amenity=hospital](around:${r},${lat},${lng});node[amenity=clinic](around:${r},${lat},${lng});node[amenity=pharmacy](around:${r},${lat},${lng}););` },
  { key: 'atm',      label: 'ATM',      icon: '🏧', color: '#7c3aed',
    query: (r,lat,lng) => `(node[amenity=atm](around:${r},${lat},${lng});node[amenity=bank](around:${r},${lat},${lng}););` },
  { key: 'toilet',   label: 'Toilet',   icon: '🚻', color: '#0284c7',
    query: (r,lat,lng) => `node[amenity=toilets](around:${r},${lat},${lng});` },
];

async function fetchPOIs(lat, lng, catKey, radiusM = 2000) {
  const cat = POI_CATS.find(c => c.key === catKey);
  if (!cat) return [];
  const q = `[out:json][timeout:12];${cat.query(radiusM, lat, lng)}out 15;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(14000) });
    const data = await res.json();
    return (data.elements ?? []).map(el => ({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name ?? el.tags?.['name:en'] ?? cat.label,
      category: catKey,
      address: el.tags?.['addr:street'] ?? '',
    }));
  } catch {
    return [];
  }
}

/* ─── Helpers ────────────────────────────────────────────────── */
const DEFAULT_CENTRE = [16.9948, 81.7798];

function getCoords(p) {
  if (!p) return null;
  const lat = Number(p.lat ?? p.latitude ?? p.location?.lat);
  const lng = Number(p.lng ?? p.lon ?? p.longitude ?? p.location?.lng);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function haversineM([la1, lo1], [la2, lo2]) {
  const R = 6371000, r = Math.PI / 180;
  const dlat = (la2 - la1) * r, dlng = (lo2 - lo1) * r;
  const a = Math.sin(dlat / 2) ** 2 +
    Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function fmtDur(s) {
  if (s == null) return '';
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;
}

function eta(durS) {
  if (!durS) return '';
  const d = new Date(Date.now() + durS * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── Maneuver icons ─────────────────────────────────────────── */
function mIcon(step) {
  if (!step) return '↑';
  const t = step.maneuver, m = step.modifier ?? '';
  if (t === 'depart')     return '📍';
  if (t === 'arrive')     return '🏁';
  if (t === 'roundabout') return '⟳';
  if (t === 'merge')      return '⇒';
  if (t === 'turn') {
    if (m.includes('sharp left'))  return '↩';
    if (m.includes('sharp right')) return '↪';
    if (m.includes('slight left')) return '↙';
    if (m.includes('slight right'))return '↘';
    if (m.includes('left'))        return '↰';
    if (m.includes('right'))       return '↱';
  }
  return '↑';
}

/* ─── Map icons ──────────────────────────────────────────────── */
const mkIcon = (html, size = [28, 28], anchor = [14, 14]) =>
  L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor });

const originIcon = mkIcon(
  `<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;
   border-radius:50%;box-shadow:0 2px 8px #0006;"></div>`,
  [18, 18], [9, 9]
);

const destIcon = mkIcon(
  `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 3px 4px #0005);">📍</div>`,
  [30, 30], [15, 30]
);

const pulseIcon = mkIcon(
  `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;background:#2563eb22;border-radius:50%;
      animation:civicPulse 1.5s cubic-bezier(.215,.61,.355,1) infinite;"></div>
    <div style="position:absolute;inset:4px;background:#2563eb;border:3px solid #fff;
      border-radius:50%;box-shadow:0 2px 8px #0005;"></div>
  </div>`,
  [28, 28], [14, 14]
);

function poiIcon(cat) {
  const c = POI_CATS.find(p => p.key === cat);
  return mkIcon(
    `<div style="background:${c?.color ?? '#64748b'};color:#fff;border-radius:50%;
      width:30px;height:30px;display:flex;align-items:center;justify-content:center;
      font-size:15px;box-shadow:0 2px 8px #0004;border:2px solid #fff;">${c?.icon ?? '📌'}</div>`,
    [30, 30], [15, 15]
  );
}

/* ─── Map sub-components ─────────────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap();
  const key = useMemo(() => JSON.stringify(points), [points]);
  useEffect(() => {
    if (points.length >= 2)
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 17, animate: true });
    else if (points.length === 1)
      map.setView(points[0], 16, { animate: true });
  }, [key]);
  return null;
}

function PanTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, map.getZoom(), { animate: true });
  }, [JSON.stringify(point)]);
  return null;
}

/* ─── Main component ─────────────────────────────────────────── */
export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const targetId = facilityId ?? id ?? sp.get('facilityId') ?? sp.get('id');

  /* facility */
  const [facility, setFacility]   = useState(null);
  const [loadErr, setLoadErr]     = useState('');
  const [loading, setLoading]     = useState(true);

  /* location */
  const [origin, setOrigin]       = useState(null);
  const [locOk, setLocOk]         = useState(false);

  /* route */
  const [mode, setMode]           = useState('walking');
  const [route, setRoute]         = useState(null);
  const [routeLoading, setRL]     = useState(false);
  const [routeErr, setRE]         = useState('');

  /* navigation state */
  const [navActive, setNavActive] = useState(false);
  const [stepIdx, setStepIdx]     = useState(0);
  const [arrived, setArrived]     = useState(false);

  /* simulation */
  const [simActive, setSimActive] = useState(false);
  const [simPtIdx, setSimPtIdx]   = useState(0);
  const [simPuck, setSimPuck]     = useState(null);
  const simRef                    = useRef(null);

  /* UI */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sideOpen, setSideOpen]     = useState(false); // mobile slide-in panel
  const [activePoi, setActivePoi]   = useState(null);  // active POI category key
  const [pois, setPois]             = useState([]);
  const [poisLoading, setPoisLoading] = useState(false);

  /* derived */
  const destination = useMemo(() => getCoords(facility), [facility]);
  const fitPoints   = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    return pts;
  }, [JSON.stringify(origin), JSON.stringify(destination)]);

  const currentStep = route?.steps?.[stepIdx] ?? null;

  // Distance remaining (during nav/sim)
  const distRemaining = useMemo(() => {
    if (!route || !simActive) return route?.distM ?? null;
    if (!route.points?.length) return null;
    let d = 0;
    for (let i = simPtIdx; i < route.points.length - 1; i++) {
      d += haversineM(route.points[i], route.points[i + 1]);
    }
    return d;
  }, [route, simActive, simPtIdx]);

  // Speed in m/s per simulation tick
  const simSpeed = mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4;
  // points per tick at 100 ms interval
  const tickDist = simSpeed * 0.1; // metres per 100ms

  /* ── Load facility ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setLoadErr('');
      if (!targetId) { setLoadErr('No facility selected.'); setLoading(false); return; }
      let found = null;
      try { const r = await qrAPI.resolve(targetId); const f = r?.facility ?? r?.data?.facility ?? r?.data ?? r; if (getCoords(f)) found = f; } catch {}
      if (!found) { try { const r = await facilitiesAPI.get(targetId); const f = r?.facility ?? r?.data?.facility ?? r?.data ?? r; if (getCoords(f)) found = f; } catch {} }
      if (!found) found = fallbackFacilities.find(f => f.qr_token === targetId || f.id === targetId) ?? null;
      if (!alive) return;
      if (!found || !getCoords(found)) setLoadErr('Could not load facility. You may be offline.');
      else setFacility(found);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [targetId]);

  /* ── Geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) { setOrigin(DEFAULT_CENTRE); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setOrigin([+p.coords.latitude, +p.coords.longitude]); setLocOk(true); },
      () => setOrigin(DEFAULT_CENTRE),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  /* ── Route calculation ── */
  const calcRoute = useCallback(async () => {
    if (!origin || !destination) return;
    setRL(true); setRE(''); setRoute(null); setStepIdx(0); setArrived(false);
    stopSim();
    try {
      const results = await calculateRoute(origin, destination, mode);
      const best = Array.isArray(results) ? results[0] : results;
      if (!best) throw new Error('No route returned');
      const raw = best?.geometry?.coordinates ?? [];
      const points = raw.filter(c => Array.isArray(c) && c.length >= 2)
                        .map(c => [+c[1], +c[0]]);
      setRoute({
        points: points.length >= 2 ? points : [origin, destination],
        steps: best.steps ?? [],
        distM: best.distanceM,
        durS: best.durationS,
        distLabel: best.distanceLabel ?? fmtDist(best.distanceM),
        durLabel: best.durationLabel ?? fmtDur(best.durationS),
        isFallback: points.length < 2,
      });
    } catch (err) {
      const distM = haversineM(origin, destination);
      const durS = distM / (mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4);
      setRoute({ points: [origin, destination], steps: [], distM, durS, distLabel: fmtDist(distM), durLabel: fmtDur(durS), isFallback: true });
      setRE(`Routing unavailable – straight-line shown. ${err?.message ?? ''}`);
    } finally { setRL(false); }
  }, [origin, destination, mode]);

  useEffect(() => { if (origin && destination) calcRoute(); }, [calcRoute]);

  /* ── Simulation ── */
  function startSim() {
    if (!route?.points?.length) return;
    setSimPtIdx(0);
    setSimPuck(route.points[0]);
    setSimActive(true);
    setNavActive(true);
    setStepIdx(0);
    setArrived(false);
    setDrawerOpen(false);
  }

  function stopSim() {
    clearInterval(simRef.current);
    setSimActive(false);
    setSimPuck(null);
    setSimPtIdx(0);
  }

  // Accumulate distances per step for step detection during simulation
  const stepBreaks = useMemo(() => {
    if (!route?.steps?.length) return [];
    let cum = 0;
    return route.steps.map(s => { cum += (s.distanceM ?? 0); return cum; });
  }, [route]);

  useEffect(() => {
    if (!simActive || !route?.points) return;
    clearInterval(simRef.current);

    let ptIdx = simPtIdx;
    let subDist = 0; // sub-segment distance accumulator

    simRef.current = setInterval(() => {
      const pts = route.points;
      if (ptIdx >= pts.length - 1) {
        clearInterval(simRef.current);
        setSimActive(false);
        setArrived(true);
        setNavActive(false);
        setSimPuck(pts[pts.length - 1]);
        return;
      }
      // advance by tickDist
      let budget = tickDist;
      while (budget > 0 && ptIdx < pts.length - 1) {
        const segLen = haversineM(pts[ptIdx], pts[ptIdx + 1]);
        if (subDist + budget >= segLen) {
          budget -= (segLen - subDist);
          subDist = 0;
          ptIdx++;
        } else {
          subDist += budget;
          budget = 0;
        }
      }
      setSimPtIdx(ptIdx);
      setSimPuck([...pts[ptIdx]]);

      // figure out which step we're on
      if (stepBreaks.length) {
        let distSoFar = 0;
        for (let i = 0; i < ptIdx && i < pts.length - 1; i++) {
          distSoFar += haversineM(pts[i], pts[i + 1]);
        }
        let sIdx = stepBreaks.findIndex(b => b > distSoFar);
        if (sIdx < 0) sIdx = stepBreaks.length - 1;
        setStepIdx(sIdx);
      }
    }, 100);

    return () => clearInterval(simRef.current);
  }, [simActive, route, simSpeed, stepBreaks]);

  /* ── POI loading ── */
  useEffect(() => {
    if (!activePoi || !destination) { setPois([]); return; }
    setPoisLoading(true);
    fetchPOIs(destination[0], destination[1], activePoi, 1500)
      .then(setPois)
      .finally(() => setPoisLoading(false));
  }, [activePoi, JSON.stringify(destination)]);

  /* ── Nav step helpers ── */
  const nextStep = () => {
    if (!route?.steps?.length) return;
    if (stepIdx < route.steps.length - 1) setStepIdx(i => i + 1);
    else { setArrived(true); setNavActive(false); }
  };
  const prevStep = () => { if (stepIdx > 0) setStepIdx(i => i - 1); };

  /* ── Derived text ── */
  const puck = simPuck ?? origin;
  const bannerText = arrived
    ? '🏁 You have arrived!'
    : navActive && route?.steps?.length
      ? (currentStep?.instruction ?? 'Continue on current road')
      : (facility?.name ?? 'Navigate');

  const bannerSub = arrived
    ? ''
    : navActive && currentStep?.distanceLabel
      ? `In ${currentStep.distanceLabel}`
      : `${route?.distLabel ?? ''}${route?.durLabel ? ' · ' + route.durLabel : ''}`;

  const etaStr   = eta(route?.durS);
  const distRem  = fmtDist(distRemaining);

  /* ─── Loading ─── */
  if (loading) return (
    <div style={S.splash}>
      <div style={S.spinner} />
      <p style={{ color: '#fff', marginTop: 16, fontSize: 15 }}>Loading facility…</p>
    </div>
  );

  if (loadErr || !destination) return (
    <div style={S.splash}>
      <div style={{ maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#fff', margin: '0 0 12px' }}>Navigation unavailable</h2>
        <p style={{ color: '#ffffffcc', lineHeight: 1.7, marginBottom: 24, fontSize: 15 }}>
          {loadErr || 'This facility has no valid coordinates.'}
        </p>
        <button style={S.btnWhite} onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );

  const fName = facility?.name ?? 'Facility';

  /* ─── RENDER ─── */
  return (
    <div style={S.root}>
      <style>{`
        @keyframes civicPulse { 0%{transform:scale(.5);opacity:.8} 80%,100%{transform:scale(2.2);opacity:0} }
        @keyframes civicSpin  { to{transform:rotate(360deg)} }
        @keyframes civicSlide { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        .civic-route-shadow { stroke-linecap:round!important;stroke-linejoin:round!important; }
        .leaflet-control-zoom { margin:16px!important; }
      `}</style>

      {/* ══════════ MAP ══════════ */}
      <div style={S.mapWrap}>
        <MapContainer center={destination} zoom={14} zoomControl={isDesktop}
          scrollWheelZoom style={S.mapEl}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit / pan */}
          {!simActive && <FitBounds points={fitPoints} />}
          {simActive && simPuck && <PanTo point={simPuck} />}

          {/* Origin / puck */}
          {puck && (
            <Marker position={puck} icon={navActive ? pulseIcon : originIcon} />
          )}

          {/* Destination */}
          <Marker position={destination} icon={destIcon}>
            <Popup><strong>{fName}</strong><br />{facility?.address ?? ''}</Popup>
          </Marker>

          {/* Route: remaining portion (blue) vs travelled (grey) */}
          {route?.points?.length >= 2 && (
            <>
              {simActive && simPtIdx > 0 && (
                <Polyline
                  positions={route.points.slice(0, simPtIdx + 1)}
                  pathOptions={{ color: '#94a3b8', weight: 6, opacity: 0.6, lineCap: 'round', className: 'civic-route-shadow' }}
                />
              )}
              <Polyline
                positions={simActive ? route.points.slice(simPtIdx) : route.points}
                pathOptions={{
                  color: route.isFallback ? '#f59e0b' : '#2563eb',
                  weight: 7, opacity: 0.95, lineCap: 'round', className: 'civic-route-shadow',
                }}
              />
            </>
          )}

          {/* POI markers */}
          {pois.map(poi => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiIcon(poi.category)}>
              <Popup>
                <strong>{poi.name}</strong>
                {poi.address ? <><br /><small>{poi.address}</small></> : null}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ══ MOBILE / TABLET overlays ══ */}
        {!isDesktop && (
          <>
            {/* Top banner */}
            <div style={S.topBanner}>
              {/* Back + menu row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, pointerEvents: 'all' }}>
                {!navActive && (
                  <button style={S.pill} onClick={() => navigate(-1)}>‹ Back</button>
                )}
                {!navActive && (
                  <button style={{ ...S.pill, marginLeft: 'auto' }}
                    onClick={() => setSideOpen(o => !o)}>☰ Options</button>
                )}
              </div>

              {/* Instruction card */}
              <div style={S.instrCard}>
                {navActive && route?.steps?.length > 0 && (
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{mIcon(currentStep)}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={S.instrTitle}>{bannerText}</p>
                  {bannerSub ? <p style={S.instrSub}>{bannerSub}</p> : null}
                </div>
                {navActive && etaStr && (
                  <div style={S.etaPill}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>ETA</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{etaStr}</span>
                  </div>
                )}
                {navActive && (
                  <button style={S.xBtn} onClick={() => { stopSim(); setNavActive(false); }}>✕</button>
                )}
              </div>

              {/* Step controls */}
              {navActive && route?.steps?.length > 0 && !arrived && !simActive && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 4px 0', pointerEvents: 'all' }}>
                  <button style={{ ...S.stepBtn, opacity: stepIdx === 0 ? 0.3 : 1 }}
                    disabled={stepIdx === 0} onClick={prevStep}>‹ Prev</button>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    Step {stepIdx + 1} / {route.steps.length}
                  </span>
                  <button style={S.stepBtn} onClick={nextStep}>
                    {stepIdx === route.steps.length - 1 ? '🏁 Arrive' : 'Next ›'}
                  </button>
                </div>
              )}

              {/* Simulation progress */}
              {simActive && route?.points?.length > 1 && (
                <div style={{ padding: '6px 4px 0', pointerEvents: 'all' }}>
                  <div style={{ height: 4, background: '#ffffff22', borderRadius: 2 }}>
                    <div style={{
                      height: 4, background: '#4ade80', borderRadius: 2,
                      width: `${(simPtIdx / (route.points.length - 1)) * 100}%`,
                      transition: 'width 0.1s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>Simulating…</span>
                    <span style={{ color: '#fff', fontSize: 11 }}>{distRem} remaining</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom sheet */}
            <div style={{
              ...S.sheet,
              transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 200px))',
            }}>
              <button style={S.handle} onClick={() => setDrawerOpen(o => !o)}>
                <div style={S.handleBar} />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {drawerOpen ? '▼ Collapse' : '▲ Directions & Options'}
                </span>
              </button>

              <MobileSheetBody
                facility={facility}
                route={route}
                routeLoading={routeLoading}
                routeErr={routeErr}
                locOk={locOk}
                mode={mode}
                setMode={setMode}
                navActive={navActive}
                simActive={simActive}
                stepIdx={stepIdx}
                arrived={arrived}
                destination={destination}
                distRem={distRem}
                etaStr={etaStr}
                drawerOpen={drawerOpen}
                activePoi={activePoi}
                setActivePoi={setActivePoi}
                poisLoading={poisLoading}
                pois={pois}
                onStart={() => { setNavActive(true); setStepIdx(0); setDrawerOpen(false); }}
                onSimulate={startSim}
                onStop={() => { stopSim(); setNavActive(false); }}
                onPrev={prevStep}
                onNext={nextStep}
                isTablet={isTablet}
              />
            </div>

            {/* Side panel (options drawer) */}
            {sideOpen && (
              <div style={S.sidePanelOverlay} onClick={() => setSideOpen(false)}>
                <div style={S.sidePanel} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Options</h3>
                    <button style={{ ...S.xBtn, background: '#f1f5f9', color: '#64748b' }}
                      onClick={() => setSideOpen(false)}>✕</button>
                  </div>
                  <SidePanelContent
                    facility={facility}
                    route={route}
                    routeLoading={routeLoading}
                    mode={mode}
                    setMode={setMode}
                    activePoi={activePoi}
                    setActivePoi={k => { setActivePoi(k); setSideOpen(false); }}
                    destination={destination}
                    etaStr={etaStr}
                    distRem={distRem}
                    locOk={locOk}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ DESKTOP SIDEBAR ══════════ */}
      {isDesktop && (
        <aside style={S.sidebar}>
          <DesktopSidebar
            facility={facility}
            route={route}
            routeLoading={routeLoading}
            routeErr={routeErr}
            locOk={locOk}
            mode={mode}
            setMode={setMode}
            navActive={navActive}
            simActive={simActive}
            stepIdx={stepIdx}
            arrived={arrived}
            destination={destination}
            distRem={distRem}
            etaStr={etaStr}
            activePoi={activePoi}
            setActivePoi={setActivePoi}
            poisLoading={poisLoading}
            pois={pois}
            mIcon={mIcon}
            currentStep={currentStep}
            onBack={() => navigate(-1)}
            onStart={() => { setNavActive(true); setStepIdx(0); }}
            onSimulate={startSim}
            onStop={() => { stopSim(); setNavActive(false); }}
            onPrev={prevStep}
            onNext={nextStep}
            simPtIdx={simPtIdx}
            totalPts={route?.points?.length ?? 0}
          />
        </aside>
      )}
    </div>
  );
}

/* ─── Desktop Sidebar ─────────────────────────────────────────── */
function DesktopSidebar({
  facility, route, routeLoading, routeErr, locOk,
  mode, setMode, navActive, simActive, stepIdx, arrived,
  destination, distRem, etaStr,
  activePoi, setActivePoi, poisLoading, pois,
  mIcon, currentStep,
  onBack, onStart, onSimulate, onStop, onPrev, onNext,
  simPtIdx, totalPts,
}) {
  const fName = facility?.name ?? 'Facility';
  return (
    <div style={S.sideInner}>
      {/* Header */}
      <div style={S.sideHead}>
        <button style={S.backBtn} onClick={onBack}>‹ Back</button>
        <h1 style={{ margin: '10px 0 2px', fontSize: 19, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
          {fName}
        </h1>
        {facility?.address && (
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{facility.address}</p>
        )}
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {route && !routeLoading && <>
            <Chip>{route.isFallback ? '⚠️ Est. ' : '🛣️ '}{route.distLabel}</Chip>
            {route.durLabel && <Chip>⏱ {route.durLabel}</Chip>}
            {etaStr && <Chip color="#22c55e">🕐 Arrive {etaStr}</Chip>}
          </>}
          {routeLoading && <Chip>⏳ Calculating…</Chip>}
          {!locOk && <Chip color="#f59e0b">📍 Default location</Chip>}
        </div>
      </div>

      {/* Route error */}
      {routeErr && <div style={{ ...S.warn, margin: '0 14px 10px', fontSize: 12 }}>{routeErr}</div>}

      {/* Mode selector */}
      {!navActive && !arrived && (
        <div style={{ padding: '0 14px 12px' }}>
          <Label>Travel mode</Label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[
              { key: 'walking', icon: '🚶', label: 'Walk' },
              { key: 'cycling', icon: '🚲', label: 'Cycle' },
              { key: 'driving', icon: '🚗', label: 'Drive' },
            ].map(({ key, icon, label }) => (
              <button key={key}
                style={{ ...S.modeBtn, ...(mode === key ? S.modeBtnOn : {}), flex: 1 }}
                onClick={() => setMode(key)}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 11, marginTop: 3 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!arrived && !navActive && (
        <div style={{ padding: '0 14px 12px', display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button style={S.startBtn}
            disabled={!route || routeLoading}
            onClick={onStart}>
            ▶  Start Navigation
          </button>
          <button style={{ ...S.startBtn, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
            boxShadow: '0 4px 14px #7c3aed44' }}
            disabled={!route || routeLoading}
            onClick={onSimulate}>
            🎬  Simulate Route
          </button>
        </div>
      )}

      {navActive && !arrived && (
        <>
          {/* Active nav banner */}
          <div style={S.navBanner}>
            <span style={{ fontSize: 26 }}>{mIcon(currentStep)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.4 }}>
                {currentStep?.instruction ?? 'Continue on current road'}
              </p>
              {currentStep?.distanceLabel && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#2563eb' }}>
                  In {currentStep.distanceLabel}
                </p>
              )}
            </div>
          </div>

          {/* Simulation progress */}
          {simActive && totalPts > 1 && (
            <div style={{ padding: '6px 14px 10px' }}>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{
                  height: 6, background: 'linear-gradient(90deg,#22c55e,#16a34a)',
                  borderRadius: 3, width: `${(simPtIdx / (totalPts - 1)) * 100}%`,
                  transition: 'width 0.1s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Simulating route…</span>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{distRem} left</span>
              </div>
            </div>
          )}

          {/* Step controls */}
          {!simActive && route?.steps?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px' }}>
              <button style={{ ...S.stepBtn, flex: 1, opacity: stepIdx === 0 ? 0.4 : 1 }}
                disabled={stepIdx === 0} onClick={onPrev}>‹ Prev</button>
              <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', flexShrink: 0 }}>
                {stepIdx + 1}/{route.steps.length}
              </span>
              <button style={{ ...S.stepBtn, flex: 1 }} onClick={onNext}>
                {stepIdx === route.steps.length - 1 ? '🏁 Arrive' : 'Next ›'}
              </button>
            </div>
          )}

          {/* ETA row */}
          <div style={{ display: 'flex', gap: 6, padding: '0 14px 12px', flexWrap: 'wrap' }}>
            {distRem && <Chip>{distRem} remaining</Chip>}
            {etaStr && <Chip color="#22c55e">Arrive at {etaStr}</Chip>}
          </div>

          <button style={{ ...S.startBtn, margin: '0 14px 12px',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px #ef444433' }}
            onClick={onStop}>
            ■  Stop Navigation
          </button>
        </>
      )}

      {arrived && (
        <div style={{ textAlign: 'center', padding: '12px 14px 16px' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏁</p>
          <p style={{ fontWeight: 800, fontSize: 18, margin: '0 0 14px' }}>You have arrived!</p>
          <button style={S.startBtn} onClick={() => window.location.reload()}>Navigate again</button>
        </div>
      )}

      <div style={{ height: 1, background: '#f1f5f9', margin: '0 14px 12px' }} />

      {/* Nearby POI filters */}
      <div style={{ padding: '0 14px 10px' }}>
        <Label>Nearby</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {POI_CATS.map(cat => (
            <button key={cat.key}
              style={{
                padding: '6px 10px', border: `1.5px solid ${activePoi === cat.key ? cat.color : '#e2e8f0'}`,
                borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: activePoi === cat.key ? cat.color : '#f8fafc',
                color: activePoi === cat.key ? '#fff' : '#475569',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onClick={() => setActivePoi(activePoi === cat.key ? null : cat.key)}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        {poisLoading && <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>Searching nearby…</p>}
        {activePoi && !poisLoading && pois.length === 0 && (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>None found within 1.5 km.</p>
        )}
      </div>

      {/* POI list */}
      {pois.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
          {pois.map(poi => {
            const cat = POI_CATS.find(c => c.key === poi.category);
            const d = getCoords(poi) && destination
              ? fmtDist(haversineM(getCoords(poi), destination)) : '';
            return (
              <div key={poi.id} style={S.poiItem}>
                <span style={{ fontSize: 20 }}>{cat?.icon ?? '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#1e293b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {poi.name}
                  </p>
                  {poi.address && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {poi.address}
                    </p>
                  )}
                </div>
                {d && <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{d}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Turn list */}
      {!pois.length && route?.steps?.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
          <Label style={{ padding: '10px 14px 6px', display: 'block' }}>Directions</Label>
          {route.steps.map((step, i) => (
            <div key={i} style={{
              ...S.stepItem,
              background: navActive && i === stepIdx ? '#eff6ff' : 'transparent',
              borderLeft: `3px solid ${navActive && i === stepIdx ? '#2563eb' : 'transparent'}`,
            }}>
              <span style={{ fontSize: 17, minWidth: 22, textAlign: 'center' }}>{mIcon(step)}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>{step.instruction}</p>
                {step.distanceLabel && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{step.distanceLabel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Maps */}
      {destination && (
        <div style={{ padding: '10px 14px 14px' }}>
          <button style={S.gmapsBtn}
            onClick={() => window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
              '_blank', 'noopener,noreferrer')}>
            Open in Google Maps ↗
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile bottom sheet body ───────────────────────────────── */
function MobileSheetBody({
  facility, route, routeLoading, routeErr, locOk,
  mode, setMode, navActive, simActive, stepIdx, arrived,
  destination, distRem, etaStr,
  drawerOpen, activePoi, setActivePoi, poisLoading, pois,
  onStart, onSimulate, onStop, onPrev, onNext, isTablet,
}) {
  const fName = facility?.name ?? 'Facility';
  return (
    <div>
      {/* Summary */}
      <div style={{ padding: '2px 16px 10px' }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: isTablet ? 17 : 16, color: '#0f172a',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fName}</p>
        {facility?.address && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{facility.address}</p>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {route && !routeLoading && <Chip>{route.isFallback ? '⚠️ Est. ' : '🛣️ '}{route.distLabel}</Chip>}
          {route?.durLabel && !routeLoading && <Chip>⏱ {route.durLabel}</Chip>}
          {etaStr && navActive && <Chip color="#22c55e">🕐 {etaStr}</Chip>}
          {routeLoading && <Chip>⏳ Calculating…</Chip>}
        </div>
      </div>

      {/* Route error */}
      {routeErr && drawerOpen && (
        <div style={{ ...S.warn, margin: '0 16px 10px', fontSize: 12 }}>{routeErr}</div>
      )}

      {/* Mode */}
      {!navActive && !arrived && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px' }}>
          {[{ key: 'walking', icon: '🚶', label: 'Walk' }, { key: 'cycling', icon: '🚲', label: 'Cycle' }, { key: 'driving', icon: '🚗', label: 'Drive' }]
            .map(({ key, icon, label }) => (
              <button key={key}
                style={{ ...S.modeBtn, ...(mode === key ? S.modeBtnOn : {}), flex: 1, padding: '8px 4px' }}
                onClick={() => setMode(key)}>
                <span style={{ fontSize: isTablet ? 20 : 18 }}>{icon}</span>
                <span style={{ fontSize: 11, marginTop: 2 }}>{label}</span>
              </button>
            ))}
        </div>
      )}

      {/* Action buttons */}
      {!arrived && !navActive && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
          <button style={{ ...S.startBtn, margin: 0, flex: 1, fontSize: 15,
            opacity: route && !routeLoading ? 1 : 0.5 }}
            disabled={!route || routeLoading}
            onClick={onStart}>▶ Start</button>
          <button style={{ ...S.startBtn, margin: 0, flex: 1, fontSize: 15,
            background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 4px 14px #7c3aed44',
            opacity: route && !routeLoading ? 1 : 0.5 }}
            disabled={!route || routeLoading}
            onClick={onSimulate}>🎬 Simulate</button>
        </div>
      )}

      {navActive && !arrived && (
        <button style={{ ...S.startBtn, margin: '0 16px 10px', fontSize: 15,
          background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: 'none' }}
          onClick={onStop}>■ Stop</button>
      )}

      {arrived && (
        <div style={{ textAlign: 'center', padding: '8px 16px 12px' }}>
          <p style={{ fontSize: 26, margin: '0 0 4px' }}>🏁</p>
          <p style={{ fontWeight: 800, fontSize: 16, margin: '0 0 10px' }}>You have arrived!</p>
        </div>
      )}

      {/* Nearby POI filters */}
      {drawerOpen && (
        <>
          <div style={{ padding: '4px 16px 8px', borderTop: '1px solid #f1f5f9' }}>
            <Label style={{ marginBottom: 6, display: 'block' }}>Nearby</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {POI_CATS.map(cat => (
                <button key={cat.key}
                  style={{
                    padding: '6px 10px',
                    border: `1.5px solid ${activePoi === cat.key ? cat.color : '#e2e8f0'}`,
                    borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: activePoi === cat.key ? cat.color : '#f8fafc',
                    color: activePoi === cat.key ? '#fff' : '#475569',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onClick={() => setActivePoi(activePoi === cat.key ? null : cat.key)}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            {poisLoading && <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>Searching…</p>}
            {activePoi && !poisLoading && pois.length === 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>None found within 1.5 km.</p>
            )}
          </div>

          {/* POI list */}
          {pois.length > 0 && pois.map(poi => {
            const cat = POI_CATS.find(c => c.key === poi.category);
            const coords = getCoords(poi);
            const d = coords && destination ? fmtDist(haversineM(coords, destination)) : '';
            return (
              <div key={poi.id} style={{ ...S.poiItem, padding: '8px 16px' }}>
                <span style={{ fontSize: 18 }}>{cat?.icon ?? '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poi.name}</p>
                </div>
                {d && <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{d}</span>}
              </div>
            );
          })}

          {/* Step list */}
          {!pois.length && route?.steps?.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <Label style={{ padding: '8px 16px 4px', display: 'block' }}>Directions</Label>
              {route.steps.map((step, i) => (
                <div key={i} style={{
                  ...S.stepItem, padding: '9px 16px',
                  background: navActive && i === stepIdx ? '#eff6ff' : 'transparent',
                  borderLeft: `3px solid ${navActive && i === stepIdx ? '#2563eb' : 'transparent'}`,
                }}>
                  <span style={{ fontSize: 15, minWidth: 20, textAlign: 'center' }}>{mIcon(step)}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>{step.instruction}</p>
                    {step.distanceLabel && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>{step.distanceLabel}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Google Maps */}
          {destination && (
            <div style={{ padding: '8px 16px 12px' }}>
              <button style={S.gmapsBtn}
                onClick={() => window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
                  '_blank', 'noopener,noreferrer')}>
                Open in Google Maps ↗
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Mobile side panel (options) ────────────────────────────── */
function SidePanelContent({ facility, route, routeLoading, mode, setMode, activePoi, setActivePoi, destination, etaStr, distRem, locOk }) {
  return (
    <div style={{ padding: '12px 16px 16px', overflowY: 'auto', maxHeight: '70vh' }}>
      <Label>Travel mode</Label>
      <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 16 }}>
        {[{ key: 'walking', icon: '🚶', label: 'Walk' }, { key: 'cycling', icon: '🚲', label: 'Cycle' }, { key: 'driving', icon: '🚗', label: 'Drive' }]
          .map(({ key, icon, label }) => (
            <button key={key}
              style={{ ...S.modeBtn, ...(mode === key ? S.modeBtnOn : {}), flex: 1 }}
              onClick={() => setMode(key)}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 11, marginTop: 3 }}>{label}</span>
            </button>
          ))}
      </div>

      {route && !routeLoading && (
        <div style={{ marginBottom: 16 }}>
          <Label>Route summary</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <Chip>{route.distLabel}</Chip>
            {route.durLabel && <Chip>{route.durLabel}</Chip>}
            {etaStr && <Chip color="#22c55e">Arrive {etaStr}</Chip>}
            {!locOk && <Chip color="#f59e0b">📍 Default location used</Chip>}
          </div>
        </div>
      )}

      <Label>Nearby places</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {POI_CATS.map(cat => (
          <button key={cat.key}
            style={{
              padding: '7px 12px',
              border: `1.5px solid ${activePoi === cat.key ? cat.color : '#e2e8f0'}`,
              borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: activePoi === cat.key ? cat.color : '#f8fafc',
              color: activePoi === cat.key ? '#fff' : '#475569',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onClick={() => setActivePoi(activePoi === cat.key ? null : cat.key)}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {destination && (
        <button style={{ ...S.gmapsBtn, marginTop: 16 }}
          onClick={() => window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`,
            '_blank', 'noopener,noreferrer')}>
          Open in Google Maps ↗
        </button>
      )}
    </div>
  );
}

/* ─── Tiny shared components ─────────────────────────────────── */
function Chip({ children, color = '#2563eb' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: color + '18', color,
      border: `1px solid ${color}33`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 12, fontWeight: 600,
    }}>{children}</span>
  );
}

function Label({ children, style }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: 0.8, ...style }}>
      {children}
    </span>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const S = {
  root: {
    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'row',
    background: '#0f172a',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    zIndex: 0,
  },
  mapWrap: { position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 },
  mapEl:   { width: '100%', height: '100%' },

  /* Splash */
  splash: {
    position: 'fixed', inset: 0, background: '#0f172a',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', zIndex: 9999,
  },
  spinner: {
    width: 48, height: 48,
    border: '5px solid #ffffff33', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'civicSpin 0.9s linear infinite',
  },
  btnWhite: {
    padding: '13px 30px', background: '#fff', border: 'none',
    borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#0f172a',
  },

  /* Mobile top banner */
  topBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900,
    padding: '10px 12px 10px',
    background: 'linear-gradient(180deg,#0f172af8 0%,#0f172acc 80%,transparent 100%)',
    pointerEvents: 'none',
  },
  instrCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#1e293b', borderRadius: 16,
    padding: '12px 14px', boxShadow: '0 4px 20px #00000040',
    pointerEvents: 'all',
  },
  instrTitle: {
    margin: 0, color: '#fff', fontWeight: 700,
    fontSize: 15, letterSpacing: -0.2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  instrSub: { margin: '3px 0 0', color: '#94a3b8', fontSize: 12 },
  etaPill: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#0f2', borderRadius: 10, padding: '4px 8px', flexShrink: 0,
    background: '#14532d',
  },

  /* Buttons */
  pill: {
    background: '#1e293b', border: 'none', borderRadius: 12,
    color: '#fff', padding: '9px 14px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px #0004',
  },
  xBtn: {
    background: '#334155', border: 'none', borderRadius: '50%',
    color: '#fff', width: 30, height: 30, fontSize: 13,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepBtn: {
    background: '#334155', border: 'none', borderRadius: 8,
    color: '#fff', padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  backBtn: {
    background: '#0f172a', border: 'none', borderRadius: 10,
    color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  startBtn: {
    display: 'block', width: 'calc(100% - 28px)', margin: '0 14px 10px',
    padding: '15px', background: 'linear-gradient(135deg,#22c55e,#16a34a)',
    border: 'none', borderRadius: 16, color: '#fff',
    fontSize: 16, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 18px #16a34a44', textAlign: 'center',
    transition: 'transform 0.1s,opacity 0.2s', letterSpacing: 0.2,
  },
  gmapsBtn: {
    display: 'block', width: '100%', padding: '12px',
    background: 'transparent', border: '1.5px solid #e2e8f0',
    borderRadius: 12, color: '#2563eb', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
  },

  /* Bottom sheet */
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 800,
    background: '#fff', borderRadius: '22px 22px 0 0',
    boxShadow: '0 -6px 32px #00000022', overflowY: 'auto',
    transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
    maxHeight: '78vh',
    paddingBottom: 'env(safe-area-inset-bottom,12px)',
  },
  handle: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', padding: '10px 0 4px',
    background: 'transparent', border: 'none', cursor: 'pointer',
  },
  handleBar: { width: 40, height: 4, background: '#cbd5e1', borderRadius: 2, marginBottom: 3 },

  /* Mobile side panel (options) */
  sidePanelOverlay: {
    position: 'fixed', inset: 0, background: '#00000055', zIndex: 1000,
  },
  sidePanel: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '85%', maxWidth: 360,
    background: '#fff', boxShadow: '4px 0 32px #0003',
    animation: 'civicSlide 0.28s ease',
  },

  /* Desktop sidebar */
  sidebar: {
    width: 360, minWidth: 300, maxWidth: '35vw',
    height: '100vh', background: '#fff',
    display: 'flex', flexDirection: 'column',
    boxShadow: '2px 0 24px #00000018', zIndex: 10, overflowY: 'auto',
  },
  sideInner: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  sideHead: {
    padding: '14px 14px 12px', borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc', flexShrink: 0,
  },

  /* Common */
  warn: {
    padding: '9px 12px', background: '#fef3c7',
    border: '1px solid #fde68a', borderRadius: 10,
    lineHeight: 1.5, color: '#92400e',
  },
  modeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '9px 4px', border: '1.5px solid #e2e8f0',
    borderRadius: 12, background: '#f8fafc', cursor: 'pointer',
    fontFamily: 'inherit', color: '#475569', transition: 'all 0.15s',
  },
  modeBtnOn: { border: '1.5px solid #2563eb', background: '#eff6ff', color: '#2563eb' },
  navBanner: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', background: '#eff6ff',
    borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe', marginBottom: 10,
  },
  stepItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '9px 14px', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s',
  },
  poiItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 14px', borderBottom: '1px solid #f8fafc',
  },
};
