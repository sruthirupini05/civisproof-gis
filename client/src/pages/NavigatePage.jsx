/**
 * NavigatePage — Godavari Pushkaralu 2027 Navigation
 *
 * Matches Screen 5 from UI design:
 *  - Top bar: ← Navigate
 *  - Clean map with blue route polyline and beacon
 *  - Floating bottom card with Destination, Distance, Duration & "Start Navigation →"
 *  - Live Apple Maps-style maneuver HUD & animated route simulation
 *  - Quick nearby amenities: Petrol (⛽), Food (🍽️), Medical (🏥), ATM (🏧), Toilets (🚻)
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
import {
  ArrowLeft,
  Navigation,
  Crosshair,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  PhoneCall,
  X,
  Play,
  Square,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import { calculateRoute } from '../services/routing.js';
import fallbackFacilities from '../data/fallbackFacilities.json';

/* ─── POI categories ─────────────────────────────────────────── */
const POI_CATS = [
  { key: 'fuel', label: 'Petrol', icon: '⛽', color: '#f97316', query: (r, lat, lng) => `node[amenity=fuel](around:${r},${lat},${lng});` },
  { key: 'food', label: 'Food', icon: '🍽️', color: '#16a34a', query: (r, lat, lng) => `(node[amenity=restaurant](around:${r},${lat},${lng});node[amenity=fast_food](around:${r},${lat},${lng});node[amenity=cafe](around:${r},${lat},${lng}););` },
  { key: 'medical', label: 'Medical', icon: '🏥', color: '#dc2626', query: (r, lat, lng) => `(node[amenity=hospital](around:${r},${lat},${lng});node[amenity=clinic](around:${r},${lat},${lng});node[amenity=pharmacy](around:${r},${lat},${lng}););` },
  { key: 'atm', label: 'ATM', icon: '🏧', color: '#7c3aed', query: (r, lat, lng) => `(node[amenity=atm](around:${r},${lat},${lng});node[amenity=bank](around:${r},${lat},${lng}););` },
  { key: 'toilet', label: 'Toilet', icon: '🚻', color: '#991b1b', query: (r, lat, lng) => `node[amenity=toilets](around:${r},${lat},${lng});` },
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
      address: el.tags?.['addr:street'] ?? '',
    }));
  } catch {
    return [];
  }
}

/* ─── Coordinate Helpers ─────────────────────────────────────── */
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
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dlng / 2) ** 2;
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
  return '↑';
}

/* ─── Leaflet Marker Icons ────────────────────────────────────── */
const mkIcon = (html, size = [28, 28], anchor = [14, 14]) =>
  L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor });

const userBeaconIcon = mkIcon(
  `<div style="width:20px;height:20px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>`,
  [20, 20], [10, 10]
);

const destPinIcon = mkIcon(
  `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 4px 6px rgba(153,27,27,0.4));">📍</div>`,
  [32, 32], [16, 32]
);

const pulsePuckIcon = mkIcon(
  `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;background:rgba(153,27,27,0.3);border-radius:50%;animation:pulse-ring 1.6s infinite;"></div>
    <div style="position:absolute;inset:4px;background:#991b1b;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>
  </div>`,
  [28, 28], [14, 14]
);

function poiPinIcon(cat) {
  const c = POI_CATS.find((p) => p.key === cat);
  return mkIcon(
    `<div style="background:${c?.color || '#991b1b'};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 8px rgba(0,0,0,0.25);border:2px solid #fff;">${c?.icon || '📌'}</div>`,
    [30, 30], [15, 15]
  );
}

function FitBounds({ points }) {
  const map = useMap();
  const key = useMemo(() => JSON.stringify(points), [points]);
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 16, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    }
  }, [key, map]);
  return null;
}

function PanTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, map.getZoom(), { animate: true });
  }, [JSON.stringify(point), map]);
  return null;
}

export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const targetId = facilityId ?? id ?? sp.get('facilityId') ?? sp.get('id');

  const [facility, setFacility] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState(null);
  const [mode, setMode] = useState('walking');
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [navActive, setNavActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);

  const [simActive, setSimActive] = useState(false);
  const [simPtIdx, setSimPtIdx] = useState(0);
  const [simPuck, setSimPuck] = useState(null);
  const simRef = useRef(null);

  const [activePoi, setActivePoi] = useState(null);
  const [pois, setPois] = useState([]);
  const [poisLoading, setPoisLoading] = useState(false);

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

  const simSpeed = mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4;
  const tickDist = simSpeed * 0.1;

  // Load facility
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadErr('');
      if (!targetId) {
        setLoadErr('No facility selected.');
        setLoading(false);
        return;
      }
      let found = null;
      try {
        const r = await qrAPI.resolve(targetId);
        found = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
      } catch {}
      if (!found) {
        try {
          const r = await facilitiesAPI.get(targetId);
          found = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
        } catch {}
      }
      if (!found) {
        found = fallbackFacilities.find((f) => f.qr_token === targetId || f.id === targetId) ?? null;
      }
      if (!alive) return;
      if (!found || !getCoords(found)) {
        setLoadErr('Facility coordinates unavailable.');
      } else {
        setFacility(found);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [targetId]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin(DEFAULT_CENTRE);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin([+p.coords.latitude, +p.coords.longitude]),
      () => setOrigin(DEFAULT_CENTRE),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const stopSim = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimActive(false);
    setSimPuck(null);
    setSimPtIdx(0);
  }, []);

  // Route calculation
  const calcRoute = useCallback(async () => {
    if (!origin || !destination) return;
    setRouteLoading(true);
    setRoute(null);
    setStepIdx(0);
    setArrived(false);
    stopSim();

    try {
      const results = await calculateRoute(origin, destination, mode);
      const best = Array.isArray(results) ? results[0] : results;
      if (!best) throw new Error('No route');
      const raw = best?.geometry?.coordinates ?? [];
      const points = raw.filter((c) => Array.isArray(c) && c.length >= 2).map((c) => [+c[1], +c[0]]);
      setRoute({
        points: points.length >= 2 ? points : [origin, destination],
        steps: best.steps ?? [],
        distM: best.distanceM,
        durS: best.durationS,
        distLabel: best.distanceLabel ?? fmtDist(best.distanceM),
        durLabel: best.durationLabel ?? fmtDur(best.durationS),
      });
    } catch {
      const distM = haversineM(origin, destination);
      const durS = distM / (mode === 'driving' ? 14 : mode === 'cycling' ? 5 : 1.4);
      setRoute({
        points: [origin, destination],
        steps: [],
        distM,
        durS,
        distLabel: fmtDist(distM),
        durLabel: fmtDur(durS),
        isFallback: true,
      });
    } finally {
      setRouteLoading(false);
    }
  }, [origin, destination, mode, stopSim]);

  useEffect(() => {
    if (origin && destination) calcRoute();
  }, [calcRoute]);

  // Simulation loop
  function startSim() {
    if (!route?.points?.length) return;
    setSimPtIdx(0);
    setSimPuck(route.points[0]);
    setSimActive(true);
    setNavActive(true);
    setStepIdx(0);
    setArrived(false);
  }

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
    }, 100);

    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [simActive, route, tickDist, simPtIdx]);

  // Nearby POIs
  useEffect(() => {
    if (!activePoi || !destination) { setPois([]); return; }
    setPoisLoading(true);
    fetchPOIs(destination[0], destination[1], activePoi, 2500)
      .then(setPois)
      .finally(() => setPoisLoading(false));
  }, [activePoi, JSON.stringify(destination)]);

  const nextStep = () => {
    if (!route?.steps?.length) return;
    if (stepIdx < route.steps.length - 1) setStepIdx((i) => i + 1);
    else { setArrived(true); setNavActive(false); }
  };
  const prevStep = () => { if (stepIdx > 0) setStepIdx((i) => i - 1); };

  const puck = simPuck ?? origin;
  const fName = facility?.name ?? 'Facility';
  const etaStr = calcETA(route?.durS);
  const distRem = fmtDist(distRemaining);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdf9]">
        <div className="w-10 h-10 border-4 border-[#991b1b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadErr || !destination) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="max-w-xs text-center bg-white p-6 rounded-3xl border border-amber-200 shadow-md">
          <p className="text-3xl mb-2">⚠️</p>
          <h2 className="text-base font-bold text-stone-900 mb-3">{loadErr || 'Facility coordinates missing.'}</h2>
          <button onClick={() => navigate(-1)} className="w-full py-2 bg-[#991b1b] text-white font-bold text-xs rounded-xl">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-[#e5f2fb]">
      {/* ── Top Header (Screen 5: ← Navigate) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-stone-700 flex items-center justify-center transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="font-extrabold text-base text-stone-900 tracking-tight">
          Navigate
        </h1>

        <div className="flex items-center gap-1.5">
          {navActive && (
            <button
              onClick={() => { stopSim(); setNavActive(false); }}
              className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* ── Apple Maps Maneuver HUD (When Navigating) ── */}
      {navActive && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-20 bg-stone-900/95 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-stone-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-amber-400">
              {mIcon(currentStep)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm truncate">
                {currentStep?.instruction || `Head towards ${fName}`}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {currentStep?.distanceLabel ? `In ${currentStep.distanceLabel}` : distRem}
              </p>
            </div>
            {etaStr && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400">ETA</span>
                <div className="font-black text-xs">{etaStr}</div>
              </div>
            )}
          </div>

          {/* Step buttons */}
          {route?.steps?.length > 0 && !simActive && (
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-800">
              <button
                disabled={stepIdx === 0}
                onClick={prevStep}
                className="text-xs font-bold px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <span className="text-[11px] text-stone-400 font-mono">
                {stepIdx + 1} / {route.steps.length}
              </span>
              <button
                onClick={nextStep}
                className="text-xs font-bold px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg"
              >
                {stepIdx === route.steps.length - 1 ? '🏁 Arrive' : 'Next ›'}
              </button>
            </div>
          )}

          {/* Simulation Progress bar */}
          {simActive && route?.points?.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-stone-800">
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-100"
                  style={{ width: `${(simPtIdx / (route.points.length - 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>Simulating navigation…</span>
                <span>{distRem} left</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Leaflet Route Map ── */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={destination}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!simActive && <FitBounds points={fitPoints} />}
          {simActive && simPuck && <PanTo point={simPuck} />}

          {/* Current location beacon */}
          {puck && (
            <Marker position={puck} icon={navActive ? pulsePuckIcon : userBeaconIcon} />
          )}

          {/* Destination Pin */}
          <Marker position={destination} icon={destPinIcon}>
            <Popup>
              <strong>{fName}</strong>
            </Popup>
          </Marker>

          {/* Route Polylines */}
          {route?.points?.length >= 2 && (
            <>
              {simActive && simPtIdx > 0 && (
                <Polyline
                  positions={route.points.slice(0, simPtIdx + 1)}
                  pathOptions={{ color: '#94a3b8', weight: 6, opacity: 0.6, lineCap: 'round' }}
                />
              )}
              <Polyline
                positions={simActive ? route.points.slice(simPtIdx) : route.points}
                pathOptions={{
                  color: route.isFallback ? '#f59e0b' : '#2563eb',
                  weight: 6.5,
                  opacity: 0.95,
                  lineCap: 'round',
                }}
              />
            </>
          )}

          {/* POI Markers */}
          {pois.map((poi) => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiPinIcon(poi.category)}>
              <Popup>
                <strong>{poi.name}</strong>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Bottom Floating Card (Screen 5) ── */}
      <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-30 bg-white rounded-3xl shadow-2xl border border-amber-200/90 p-4 space-y-3">
        {/* Destination details */}
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#991b1b] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
            📍
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 truncate">
              To {fName}
            </h3>
            {facility?.address && (
              <p className="text-xs text-stone-500 truncate">{facility.address}</p>
            )}
          </div>
        </div>

        {/* 2 Metrics: Distance & Duration (Matches Screen 5) */}
        <div className="grid grid-cols-2 gap-2 bg-[#fefaf3] p-2.5 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-2">
            <div className="text-stone-400">🚶</div>
            <div>
              <div className="font-black text-sm text-stone-900">
                {distRem || route?.distLabel || '~350 m'}
              </div>
              <div className="text-[10px] text-stone-500 uppercase font-bold">Distance</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-stone-400">🕒</div>
            <div>
              <div className="font-black text-sm text-stone-900">
                {route?.durLabel || '3 min'}
              </div>
              <div className="text-[10px] text-stone-500 uppercase font-bold">
                {mode === 'driving' ? 'Driving' : 'Walking'}
              </div>
            </div>
          </div>
        </div>

        {/* Mode & POI Quick Toggles */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex gap-1">
            {[
              { id: 'walking', icon: '🚶', label: 'Walk' },
              { id: 'driving', icon: '🚗', label: 'Drive' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  mode === m.id
                    ? 'bg-amber-100 text-[#991b1b] border border-amber-300'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Quick nearby POI */}
          <div className="flex gap-1">
            {[
              { key: 'fuel', icon: '⛽' },
              { key: 'food', icon: '🍽️' },
              { key: 'toilet', icon: '🚻' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setActivePoi(activePoi === p.key ? null : p.key)}
                className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition border ${
                  activePoi === p.key
                    ? 'bg-amber-400 text-stone-900 border-amber-500'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
                title={`Find nearby ${p.key}`}
              >
                {p.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Big Crimson Action Buttons (Matches Screen 5) */}
        {!navActive ? (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                setNavActive(true);
                setStepIdx(0);
              }}
              className="col-span-2 py-3 px-4 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] hover:opacity-95 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 active:scale-98 transition"
            >
              <span>Start Navigation</span>
              <Navigation size={15} />
            </button>
            <button
              onClick={startSim}
              className="py-3 px-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#7f1d1d] font-black text-xs rounded-2xl flex items-center justify-center gap-1 shadow-md active:scale-98 transition"
            >
              <span>Simulate</span>
              <Play size={12} className="fill-[#7f1d1d]" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              stopSim();
              setNavActive(false);
            }}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
          >
            <span>Stop Navigation</span>
            <Square size={13} className="fill-white" />
          </button>
        )}
      </div>
    </div>
  );
}
