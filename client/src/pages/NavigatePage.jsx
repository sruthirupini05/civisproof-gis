/**
 * NavigatePage — Apple Maps-style navigation for ALL devices
 *
 * Designed uniformly across Mobile, Tablet, Laptop & Desktop:
 *  ✅ Full-screen map (NO static sidebar on any screen size)
 *  ✅ On-demand Options Drawer (☰ Options button opens slide-over panel, close via ✕ or backdrop)
 *  ✅ Collapsible Bottom Sheet (peeks at bottom, expands smoothly for directions & amenities)
 *  ✅ Popping Apple Maps top navigation HUD with maneuver icons & step-by-step guidance
 *  ✅ Real-time animated simulation puck (🎬 Simulate Route) + progress bar
 *  ✅ Live ETA, duration of travel & distance remaining
 *  ✅ Step navigation controls (‹ Prev, Step X / Total, Next ›)
 *  ✅ Nearby Amenities via Overpass API: Petrol bunks (⛽), Food (🍽️), Medical (🏥), ATM (🏧), Toilets (🚻)
 *  ✅ Full offline support via bundled fallbackFacilities.json
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Polyline, Popup, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import { calculateRoute } from '../services/routing.js';
import fallbackFacilities from '../data/fallbackFacilities.json';

/* ─── POI categories ─────────────────────────────────────────── */
const POI_CATS = [
  {
    key: 'fuel',
    label: 'Petrol',
    icon: '⛽',
    color: '#f97316',
    query: (r, lat, lng) => `node[amenity=fuel](around:${r},${lat},${lng});`,
  },
  {
    key: 'food',
    label: 'Food',
    icon: '🍽️',
    color: '#16a34a',
    query: (r, lat, lng) =>
      `(node[amenity=restaurant](around:${r},${lat},${lng});node[amenity=fast_food](around:${r},${lat},${lng});node[amenity=cafe](around:${r},${lat},${lng}););`,
  },
  {
    key: 'medical',
    label: 'Medical',
    icon: '🏥',
    color: '#dc2626',
    query: (r, lat, lng) =>
      `(node[amenity=hospital](around:${r},${lat},${lng});node[amenity=clinic](around:${r},${lat},${lng});node[amenity=pharmacy](around:${r},${lat},${lng}););`,
  },
  {
    key: 'atm',
    label: 'ATM',
    icon: '🏧',
    color: '#7c3aed',
    query: (r, lat, lng) =>
      `(node[amenity=atm](around:${r},${lat},${lng});node[amenity=bank](around:${r},${lat},${lng}););`,
  },
  {
    key: 'toilet',
    label: 'Toilet',
    icon: '🚻',
    color: '#0284c7',
    query: (r, lat, lng) => `node[amenity=toilets](around:${r},${lat},${lng});`,
  },
];

async function fetchPOIs(lat, lng, catKey, radiusM = 2500) {
  const cat = POI_CATS.find((c) => c.key === catKey);
  if (!cat) return [];
  const q = `[out:json][timeout:12];${cat.query(radiusM, lat, lng)}out 15;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    return (data.elements ?? []).map((el) => ({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name ?? el.tags?.['name:en'] ?? cat.label,
      category: catKey,
      address: el.tags?.['addr:street'] ?? el.tags?.['addr:city'] ?? '',
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
  const R = 6371000,
    r = Math.PI / 180;
  const dlat = (la2 - la1) * r,
    dlng = (lo2 - lo1) * r;
  const a =
    Math.sin(dlat / 2) ** 2 +
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

function calcETA(durS) {
  if (!durS) return '';
  const d = new Date(Date.now() + durS * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── Maneuver Icons ─────────────────────────────────────────── */
function mIcon(step) {
  if (!step) return '↑';
  const t = String(step.maneuver || '').toLowerCase();
  const m = String(step.modifier || '').toLowerCase();
  if (t === 'depart') return '📍';
  if (t === 'arrive') return '🏁';
  if (t.includes('roundabout')) return '⟳';
  if (t.includes('merge')) return '⇒';
  if (m.includes('sharp left')) return '↩';
  if (m.includes('sharp right')) return '↪';
  if (m.includes('slight left')) return '↙';
  if (m.includes('slight right')) return '↘';
  if (m.includes('left') || t.includes('left')) return '↰';
  if (m.includes('right') || t.includes('right')) return '↱';
  if (m.includes('u-turn')) return '↺';
  return '↑';
}

/* ─── Leaflet Marker Icons ────────────────────────────────────── */
const mkIcon = (html, size = [28, 28], anchor = [14, 14]) =>
  L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor });

const originIcon = mkIcon(
  `<div style="width:18px;height:18px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0006;"></div>`,
  [18, 18],
  [9, 9]
);

const destIcon = mkIcon(
  `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 3px 5px #0006);">📍</div>`,
  [32, 32],
  [16, 32]
);

const pulseIcon = mkIcon(
  `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;background:#2563eb22;border-radius:50%;animation:civicPulse 1.5s cubic-bezier(.215,.61,.355,1) infinite;"></div>
    <div style="position:absolute;inset:4px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0006;"></div>
  </div>`,
  [28, 28],
  [14, 14]
);

function poiIcon(cat) {
  const c = POI_CATS.find((p) => p.key === cat);
  return mkIcon(
    `<div style="background:${c?.color ?? '#64748b'};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px #0005;border:2px solid #fff;">${c?.icon ?? '📌'}</div>`,
    [30, 30],
    [15, 15]
  );
}

/* ─── Map Sub-components ─────────────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap();
  const key = useMemo(() => JSON.stringify(points), [points]);
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [80, 80],
        maxZoom: 16,
        animate: true,
      });
    } else if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    }
  }, [key, map]);
  return null;
}

function PanTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) {
      map.setView(point, map.getZoom(), { animate: true });
    }
  }, [JSON.stringify(point), map]);
  return null;
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const targetId = facilityId ?? id ?? sp.get('facilityId') ?? sp.get('id');

  /* Facility state */
  const [facility, setFacility] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);

  /* Location state */
  const [origin, setOrigin] = useState(null);
  const [locOk, setLocOk] = useState(false);

  /* Route state */
  const [mode, setMode] = useState('walking');
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeErr, setRouteErr] = useState('');

  /* Navigation state */
  const [navActive, setNavActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);

  /* Simulation state */
  const [simActive, setSimActive] = useState(false);
  const [simPtIdx, setSimPtIdx] = useState(0);
  const [simPuck, setSimPuck] = useState(null);
  const simRef = useRef(null);

  /* UI state */
  const [drawerOpen, setDrawerOpen] = useState(false); // Collapsible bottom sheet
  const [optionsOpen, setOptionsOpen] = useState(false); // On-demand slide-over drawer
  const [activePoi, setActivePoi] = useState(null);
  const [pois, setPois] = useState([]);
  const [poisLoading, setPoisLoading] = useState(false);

  /* Derived data */
  const destination = useMemo(() => getCoords(facility), [facility]);
  const fitPoints = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    return pts;
  }, [JSON.stringify(origin), JSON.stringify(destination)]);

  const currentStep = route?.steps?.[stepIdx] ?? null;

  // Remaining distance
  const distRemaining = useMemo(() => {
    if (!route) return null;
    if (!simActive) return route.distM ?? null;
    if (!route.points?.length) return null;
    let d = 0;
    for (let i = simPtIdx; i < route.points.length - 1; i++) {
      d += haversineM(route.points[i], route.points[i + 1]);
    }
    return d;
  }, [route, simActive, simPtIdx]);

  // Simulation tick config
  const simSpeed = mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4; // m/s
  const tickDist = simSpeed * 0.1; // distance per 100ms

  /* ── 1. Load Facility ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadErr('');
      if (!targetId) {
        setLoadErr('No facility selected. Return to the map to choose a destination.');
        setLoading(false);
        return;
      }
      let found = null;
      try {
        const r = await qrAPI.resolve(targetId);
        const f = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
        if (getCoords(f)) found = f;
      } catch {}

      if (!found) {
        try {
          const r = await facilitiesAPI.get(targetId);
          const f = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
          if (getCoords(f)) found = f;
        } catch {}
      }

      if (!found) {
        found =
          fallbackFacilities.find(
            (f) => f.qr_token === targetId || f.id === targetId
          ) ?? null;
      }

      if (!alive) return;
      if (!found || !getCoords(found)) {
        setLoadErr('Could not locate facility coordinates. You may be offline.');
      } else {
        setFacility(found);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [targetId]);

  /* ── 2. Geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin(DEFAULT_CENTRE);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin([+p.coords.latitude, +p.coords.longitude]);
        setLocOk(true);
      },
      () => setOrigin(DEFAULT_CENTRE),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  /* ── 3. Route Calculation ── */
  const stopSim = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimActive(false);
    setSimPuck(null);
    setSimPtIdx(0);
  }, []);

  const calcRoute = useCallback(async () => {
    if (!origin || !destination) return;
    setRouteLoading(true);
    setRouteErr('');
    setRoute(null);
    setStepIdx(0);
    setArrived(false);
    stopSim();

    try {
      const results = await calculateRoute(origin, destination, mode);
      const best = Array.isArray(results) ? results[0] : results;
      if (!best) throw new Error('No route returned from routing engine.');
      const raw = best?.geometry?.coordinates ?? [];
      const points = raw
        .filter((c) => Array.isArray(c) && c.length >= 2)
        .map((c) => [+c[1], +c[0]]);

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
      const durS =
        distM / (mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4);
      setRoute({
        points: [origin, destination],
        steps: [],
        distM,
        durS,
        distLabel: fmtDist(distM),
        durLabel: fmtDur(durS),
        isFallback: true,
      });
      setRouteErr(`Live routing offline — showing straight line. ${err?.message ?? ''}`);
    } finally {
      setRouteLoading(false);
    }
  }, [origin, destination, mode, stopSim]);

  useEffect(() => {
    if (origin && destination) calcRoute();
  }, [calcRoute]);

  /* ── 4. Route Simulation ── */
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

  const stepBreaks = useMemo(() => {
    if (!route?.steps?.length) return [];
    let cum = 0;
    return route.steps.map((s) => {
      cum += s.distanceM ?? 0;
      return cum;
    });
  }, [route]);

  useEffect(() => {
    if (!simActive || !route?.points) return;
    if (simRef.current) clearInterval(simRef.current);

    let ptIdx = simPtIdx;
    let subDist = 0;

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

      let budget = tickDist;
      while (budget > 0 && ptIdx < pts.length - 1) {
        const segLen = haversineM(pts[ptIdx], pts[ptIdx + 1]);
        if (subDist + budget >= segLen) {
          budget -= segLen - subDist;
          subDist = 0;
          ptIdx++;
        } else {
          subDist += budget;
          budget = 0;
        }
      }

      setSimPtIdx(ptIdx);
      setSimPuck([...pts[ptIdx]]);

      if (stepBreaks.length) {
        let distSoFar = 0;
        for (let i = 0; i < ptIdx && i < pts.length - 1; i++) {
          distSoFar += haversineM(pts[i], pts[i + 1]);
        }
        let sIdx = stepBreaks.findIndex((b) => b > distSoFar);
        if (sIdx < 0) sIdx = stepBreaks.length - 1;
        setStepIdx(sIdx);
      }
    }, 100);

    return () => {
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [simActive, route, tickDist, stepBreaks, simPtIdx]);

  /* ── 5. Nearby Amenities (POI) ── */
  useEffect(() => {
    if (!activePoi || !destination) {
      setPois([]);
      return;
    }
    setPoisLoading(true);
    fetchPOIs(destination[0], destination[1], activePoi, 2500)
      .then(setPois)
      .finally(() => setPoisLoading(false));
  }, [activePoi, JSON.stringify(destination)]);

  /* ── 6. Step Controls ── */
  const nextStep = () => {
    if (!route?.steps?.length) return;
    if (stepIdx < route.steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setArrived(true);
      setNavActive(false);
    }
  };
  const prevStep = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  /* ── 7. Labels & Strings ── */
  const puck = simPuck ?? origin;
  const fName = facility?.name ?? 'Facility';
  const etaStr = calcETA(route?.durS);
  const distRem = fmtDist(distRemaining);

  const bannerText = arrived
    ? '🏁 You have arrived!'
    : navActive && route?.steps?.length
    ? currentStep?.instruction ?? `Continue toward ${fName}`
    : fName;

  const bannerSub = arrived
    ? ''
    : navActive && currentStep?.distanceLabel
    ? `In ${currentStep.distanceLabel}`
    : `${route?.distLabel ?? ''}${route?.durLabel ? ' · ' + route.durLabel : ''}`;

  /* ── 8. Splash Screens ── */
  if (loading) {
    return (
      <div style={S.splash}>
        <div style={S.spinner} />
        <p style={{ color: '#fff', marginTop: 16, fontSize: 15 }}>Loading facility map…</p>
      </div>
    );
  }

  if (loadErr || !destination) {
    return (
      <div style={S.splash}>
        <div style={{ maxWidth: 360, textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: 22 }}>
            Navigation Unavailable
          </h2>
          <p style={{ color: '#ffffffcc', lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>
            {loadErr || 'This facility has missing or invalid coordinates.'}
          </p>
          <button style={S.btnWhite} onClick={() => navigate(-1)}>
            ← Back to Facilities
          </button>
        </div>
      </div>
    );
  }

  /* ── 9. Main Render (Universal Full-Screen Layout) ── */
  return (
    <div style={S.root}>
      <style>{`
        @keyframes civicPulse { 0%{transform:scale(.5);opacity:.8} 80%,100%{transform:scale(2.2);opacity:0} }
        @keyframes civicSpin  { to{transform:rotate(360deg)} }
        @keyframes civicDrawerSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .civic-route-shadow { stroke-linecap:round!important;stroke-linejoin:round!important; }
        .leaflet-control-zoom { margin:16px!important; }
      `}</style>

      {/* ══════════ FULL SCREEN MAP ══════════ */}
      <div style={S.mapWrap}>
        <MapContainer
          center={destination}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom
          style={S.mapEl}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!simActive && <FitBounds points={fitPoints} />}
          {simActive && simPuck && <PanTo point={simPuck} />}

          {/* User / Puck Marker */}
          {puck && (
            <Marker position={puck} icon={navActive ? pulseIcon : originIcon} />
          )}

          {/* Destination Marker */}
          <Marker position={destination} icon={destIcon}>
            <Popup>
              <strong>{fName}</strong>
              {facility?.address && <><br />{facility.address}</>}
            </Popup>
          </Marker>

          {/* Route Polyline (traveled vs upcoming) */}
          {route?.points?.length >= 2 && (
            <>
              {simActive && simPtIdx > 0 && (
                <Polyline
                  positions={route.points.slice(0, simPtIdx + 1)}
                  pathOptions={{
                    color: '#94a3b8',
                    weight: 6,
                    opacity: 0.6,
                    lineCap: 'round',
                    className: 'civic-route-shadow',
                  }}
                />
              )}
              <Polyline
                positions={simActive ? route.points.slice(simPtIdx) : route.points}
                pathOptions={{
                  color: route.isFallback ? '#f59e0b' : '#2563eb',
                  weight: 7,
                  opacity: 0.95,
                  lineCap: 'round',
                  className: 'civic-route-shadow',
                }}
              />
            </>
          )}

          {/* Nearby Amenities (POIs) */}
          {pois.map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={poiIcon(poi.category)}
            >
              <Popup>
                <strong>{poi.name}</strong>
                {poi.address && <><br /><small>{poi.address}</small></>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ══════════ TOP APPLE MAPS HUD (FLOATING) ══════════ */}
        <div style={S.topBanner}>
          <div style={S.topBannerInner}>
            {/* Action pill row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, pointerEvents: 'all' }}>
              <button style={S.pill} onClick={() => navigate(-1)} title="Back">
                ‹ Back
              </button>
              <button
                style={{ ...S.pill, marginLeft: 'auto', background: optionsOpen ? '#3b82f6' : '#1e293b' }}
                onClick={() => setOptionsOpen((o) => !o)}
              >
                ☰ Options
              </button>
            </div>

            {/* Turn instruction card */}
            <div style={S.instrCard}>
              {navActive && route?.steps?.length > 0 && (
                <span style={{ fontSize: 28, flexShrink: 0 }}>
                  {mIcon(currentStep)}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.instrTitle}>{bannerText}</p>
                {bannerSub && <p style={S.instrSub}>{bannerSub}</p>}
              </div>

              {navActive && etaStr && (
                <div style={S.etaPill}>
                  <span style={{ fontSize: 10, color: '#86efac', textTransform: 'uppercase' }}>ETA</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{etaStr}</span>
                </div>
              )}

              {navActive && (
                <button
                  style={S.xBtn}
                  onClick={() => {
                    stopSim();
                    setNavActive(false);
                  }}
                  title="Stop Navigation"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Step navigation buttons (Prev / Next) */}
            {navActive && route?.steps?.length > 0 && !arrived && !simActive && (
              <div style={S.stepControls}>
                <button
                  style={{ ...S.stepBtn, opacity: stepIdx === 0 ? 0.35 : 1 }}
                  disabled={stepIdx === 0}
                  onClick={prevStep}
                >
                  ‹ Prev
                </button>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  Step {stepIdx + 1} / {route.steps.length}
                </span>
                <button style={S.stepBtn} onClick={nextStep}>
                  {stepIdx === route.steps.length - 1 ? '🏁 Arrive' : 'Next ›'}
                </button>
              </div>
            )}

            {/* Simulation progress bar */}
            {simActive && route?.points?.length > 1 && (
              <div style={{ padding: '6px 4px 0', pointerEvents: 'all' }}>
                <div style={{ height: 4, background: '#ffffff26', borderRadius: 2 }}>
                  <div
                    style={{
                      height: 4,
                      background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                      borderRadius: 2,
                      width: `${(simPtIdx / (route.points.length - 1)) * 100}%`,
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>🎬 Simulating movement…</span>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    {distRem} remaining
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════ COLLAPSIBLE BOTTOM SHEET (FOR ALL DEVICES) ══════════ */}
        <div
          style={{
            ...S.sheet,
            transform: drawerOpen
              ? 'translateY(0)'
              : 'translateY(calc(100% - 195px))',
          }}
        >
          <div style={S.sheetInner}>
            {/* Drag / Toggle Handle */}
            <button
              style={S.handle}
              onClick={() => setDrawerOpen((o) => !o)}
              title={drawerOpen ? 'Collapse' : 'Expand Directions'}
            >
              <div style={S.handleBar} />
              <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: 600 }}>
                {drawerOpen ? '▼ Collapse' : '▲ Directions & Amenities'}
              </span>
            </button>

            {/* Summary Header */}
            <div style={{ padding: '4px 18px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={S.sheetTitle}>{fName}</p>
                  {facility?.address && (
                    <p style={S.sheetSub}>{facility.address}</p>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {route && !routeLoading && (
                  <Chip>{route.isFallback ? '⚠️ Est. ' : '🛣️ '}{route.distLabel}</Chip>
                )}
                {route?.durLabel && !routeLoading && (
                  <Chip>⏱ {route.durLabel}</Chip>
                )}
                {etaStr && (
                  <Chip color="#16a34a">🕐 ETA {etaStr}</Chip>
                )}
                {routeLoading && <Chip>⏳ Calculating route…</Chip>}
              </div>
            </div>

            {/* Warnings */}
            {routeErr && (
              <div style={{ ...S.warn, margin: '0 18px 10px' }}>{routeErr}</div>
            )}

            {/* Travel Mode Selector */}
            {!navActive && !arrived && (
              <div style={{ display: 'flex', gap: 8, padding: '0 18px 10px' }}>
                {[
                  { key: 'walking', icon: '🚶', label: 'Walk' },
                  { key: 'cycling', icon: '🚲', label: 'Cycle' },
                  { key: 'driving', icon: '🚗', label: 'Drive' },
                ].map(({ key, icon, label }) => (
                  <button
                    key={key}
                    style={{
                      ...S.modeBtn,
                      ...(mode === key ? S.modeBtnOn : {}),
                      flex: 1,
                      padding: '8px 4px',
                    }}
                    onClick={() => setMode(key)}
                  >
                    <span style={{ fontSize: 19 }}>{icon}</span>
                    <span style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Main Action Buttons: Start & Simulate */}
            {!arrived && !navActive && (
              <div style={{ padding: '0 18px 12px', display: 'flex', gap: 10 }}>
                <button
                  style={{
                    ...S.startBtn,
                    flex: 1,
                    opacity: route && !routeLoading ? 1 : 0.5,
                  }}
                  disabled={!route || routeLoading}
                  onClick={() => {
                    setNavActive(true);
                    setStepIdx(0);
                    setDrawerOpen(false);
                  }}
                >
                  ▶ Start
                </button>
                <button
                  style={{
                    ...S.startBtn,
                    flex: 1,
                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    boxShadow: '0 4px 16px #7c3aed44',
                    opacity: route && !routeLoading ? 1 : 0.5,
                  }}
                  disabled={!route || routeLoading}
                  onClick={startSim}
                >
                  🎬 Simulate
                </button>
              </div>
            )}

            {navActive && !arrived && (
              <div style={{ padding: '0 18px 12px' }}>
                <button
                  style={{
                    ...S.startBtn,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: '0 4px 16px #ef444433',
                  }}
                  onClick={() => {
                    stopSim();
                    setNavActive(false);
                  }}
                >
                  ■ Stop Navigation
                </button>
              </div>
            )}

            {arrived && (
              <div style={{ textAlign: 'center', padding: '10px 18px 14px' }}>
                <p style={{ fontSize: 28, margin: '0 0 4px' }}>🏁</p>
                <p style={{ fontWeight: 800, fontSize: 16, margin: '0 0 10px', color: '#0f172a' }}>
                  You have arrived at {fName}!
                </p>
                <button
                  style={S.startBtn}
                  onClick={() => {
                    setArrived(false);
                    setStepIdx(0);
                    calcRoute();
                  }}
                >
                  Navigate Again
                </button>
              </div>
            )}

            {/* ── EXPANDED DRAWER CONTENT ── */}
            {drawerOpen && (
              <>
                {/* Nearby POI Amenities Filter */}
                <div style={{ padding: '8px 18px 10px', borderTop: '1px solid #f1f5f9' }}>
                  <Label style={{ marginBottom: 8, display: 'block' }}>
                    Nearby Amenities (1.5 km)
                  </Label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {POI_CATS.map((cat) => (
                      <button
                        key={cat.key}
                        style={{
                          padding: '6px 12px',
                          border: `1.5px solid ${activePoi === cat.key ? cat.color : '#e2e8f0'}`,
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activePoi === cat.key ? cat.color : '#f8fafc',
                          color: activePoi === cat.key ? '#fff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s',
                        }}
                        onClick={() => setActivePoi(activePoi === cat.key ? null : cat.key)}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                  {poisLoading && (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>
                      Locating nearby facilities…
                    </p>
                  )}
                  {activePoi && !poisLoading && pois.length === 0 && (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>
                      No {activePoi} found within 2.5 km.
                    </p>
                  )}
                </div>

                {/* Nearby POI Results */}
                {pois.length > 0 && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
                    {pois.map((poi) => {
                      const cat = POI_CATS.find((c) => c.key === poi.category);
                      const coords = getCoords(poi);
                      const d =
                        coords && destination
                          ? fmtDist(haversineM(coords, destination))
                          : '';
                      return (
                        <div key={poi.id} style={S.poiItem}>
                          <span style={{ fontSize: 18 }}>{cat?.icon ?? '📌'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={S.poiName}>{poi.name}</p>
                            {poi.address && <p style={S.poiAddr}>{poi.address}</p>}
                          </div>
                          {d && <span style={S.poiDist}>{d}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Turn-by-Turn Directions List */}
                {!pois.length && route?.steps?.length > 0 && (
                  <div style={{ maxHeight: 260, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
                    <Label style={{ padding: '10px 18px 4px', display: 'block' }}>
                      Turn-by-Turn Directions
                    </Label>
                    {route.steps.map((step, i) => (
                      <div
                        key={i}
                        style={{
                          ...S.stepItem,
                          background: navActive && i === stepIdx ? '#eff6ff' : 'transparent',
                          borderLeft: `3px solid ${
                            navActive && i === stepIdx ? '#2563eb' : 'transparent'
                          }`,
                        }}
                      >
                        <span style={{ fontSize: 16, minWidth: 22, textAlign: 'center' }}>
                          {mIcon(step)}
                        </span>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>
                            {step.instruction}
                          </p>
                          {step.distanceLabel && (
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>
                              {step.distanceLabel}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open in Google Maps */}
                {destination && (
                  <div style={{ padding: '10px 18px 16px', borderTop: '1px solid #f1f5f9' }}>
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
                      Open Directions in Google Maps ↗
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════════ ON-DEMAND OPTIONS DRAWER (FOR ALL DEVICES) ══════════ */}
        {optionsOpen && (
          <div style={S.drawerOverlay} onClick={() => setOptionsOpen(false)}>
            <div style={S.drawerPanel} onClick={(e) => e.stopPropagation()}>
              <div style={S.drawerHeader}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Navigation Options
                </h3>
                <button
                  style={S.xBtnDark}
                  onClick={() => setOptionsOpen(false)}
                  title="Close Options"
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                {/* Destination info */}
                <div style={{ marginBottom: 18 }}>
                  <Label>Destination</Label>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                    {fName}
                  </p>
                  {facility?.address && (
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                      {facility.address}
                    </p>
                  )}
                </div>

                {/* Travel Mode */}
                <div style={{ marginBottom: 18 }}>
                  <Label>Travel Mode</Label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {[
                      { key: 'walking', icon: '🚶', label: 'Walk' },
                      { key: 'cycling', icon: '🚲', label: 'Cycle' },
                      { key: 'driving', icon: '🚗', label: 'Drive' },
                    ].map(({ key, icon, label }) => (
                      <button
                        key={key}
                        style={{
                          ...S.modeBtn,
                          ...(mode === key ? S.modeBtnOn : {}),
                          flex: 1,
                        }}
                        onClick={() => {
                          setMode(key);
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <span style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route Summary */}
                {route && !routeLoading && (
                  <div style={{ marginBottom: 18 }}>
                    <Label>Route Summary</Label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <Chip>{route.distLabel}</Chip>
                      {route.durLabel && <Chip>⏱ {route.durLabel}</Chip>}
                      {etaStr && <Chip color="#16a34a">🕐 Arrive {etaStr}</Chip>}
                      {!locOk && <Chip color="#f59e0b">📍 Default start point</Chip>}
                    </div>
                  </div>
                )}

                {/* Nearby POIs */}
                <div style={{ marginBottom: 18 }}>
                  <Label>Filter Nearby Places</Label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {POI_CATS.map((cat) => (
                      <button
                        key={cat.key}
                        style={{
                          padding: '7px 12px',
                          border: `1.5px solid ${activePoi === cat.key ? cat.color : '#e2e8f0'}`,
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activePoi === cat.key ? cat.color : '#f8fafc',
                          color: activePoi === cat.key ? '#fff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        onClick={() => {
                          setActivePoi(activePoi === cat.key ? null : cat.key);
                          setOptionsOpen(false);
                        }}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* External Maps button */}
                {destination && (
                  <button
                    style={{ ...S.gmapsBtn, marginTop: 10 }}
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
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared UI Helpers ──────────────────────────────────────── */
function Chip({ children, color = '#2563eb' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: color + '18',
        color,
        border: `1px solid ${color}33`,
        borderRadius: 20,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Label({ children, style }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const S = {
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  mapWrap: {
    position: 'relative',
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  mapEl: {
    width: '100%',
    height: '100%',
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
    padding: '13px 28px',
    background: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    color: '#0f172a',
  },

  /* Top Banner (Apple Maps HUD) */
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
    padding: '12px 14px 14px',
    background: 'linear-gradient(180deg, #0f172af2 0%, #0f172ab3 75%, transparent 100%)',
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
  },
  topBannerInner: {
    width: '100%',
    maxWidth: 680,
  },
  instrCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1e293b',
    borderRadius: 16,
    padding: '12px 16px',
    boxShadow: '0 6px 24px #00000045',
    pointerEvents: 'all',
  },
  instrTitle: {
    margin: 0,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: -0.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  instrSub: {
    margin: '3px 0 0',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
  },
  etaPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#14532d',
    borderRadius: 10,
    padding: '4px 10px',
    flexShrink: 0,
    border: '1px solid #22c55e44',
  },
  stepControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 4px 0',
    pointerEvents: 'all',
  },
  stepBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px #0003',
  },
  pill: {
    background: '#1e293b',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px #0004',
  },
  xBtn: {
    background: '#334155',
    border: 'none',
    borderRadius: '50%',
    color: '#fff',
    width: 32,
    height: 32,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* Collapsible Bottom Sheet */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 800,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
    maxHeight: '80vh',
  },
  sheetInner: {
    width: '100%',
    maxWidth: 680,
    background: '#fff',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -6px 36px #00000030',
    pointerEvents: 'all',
    overflowY: 'auto',
    paddingBottom: 'env(safe-area-inset-bottom, 12px)',
    maxHeight: '80vh',
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
    width: 44,
    height: 4,
    background: '#cbd5e1',
    borderRadius: 2,
  },
  sheetTitle: {
    margin: 0,
    fontWeight: 800,
    fontSize: 17,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sheetSub: {
    margin: '2px 0 0',
    fontSize: 12.5,
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '9px 4px',
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
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 16px #16a34a44',
    textAlign: 'center',
    letterSpacing: 0.2,
    transition: 'opacity 0.2s, transform 0.1s',
  },
  gmapsBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    color: '#2563eb',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'inherit',
  },
  warn: {
    padding: '8px 12px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: 10,
    lineHeight: 1.5,
    color: '#92400e',
    fontSize: 12,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '9px 18px',
    borderBottom: '1px solid #f8fafc',
    transition: 'background 0.15s',
  },
  poiItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 18px',
    borderBottom: '1px solid #f8fafc',
  },
  poiName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  poiAddr: {
    margin: '1px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  poiDist: {
    fontSize: 11,
    color: '#64748b',
    flexShrink: 0,
    fontWeight: 600,
  },

  /* Slide-over Options Drawer */
  drawerOverlay: {
    position: 'fixed',
    inset: 0,
    background: '#00000060',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawerPanel: {
    width: '90%',
    maxWidth: 380,
    height: '100%',
    background: '#fff',
    boxShadow: '-4px 0 32px #0004',
    animation: 'civicDrawerSlide 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  xBtnDark: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '50%',
    color: '#64748b',
    width: 32,
    height: 32,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
