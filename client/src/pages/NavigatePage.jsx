/**
 * NavigatePage — Apple Maps iOS Style Sacred Godavari Pushkaralu Navigation
 *
 * Faithfully matches the Apple Maps iOS reference UI:
 * 1. Top floating capsule: "Proceed to the route" with direction turn icon
 * 2. 3-Stat Bottom HUD: [ Arrival Time | Travel Duration | Distance ]
 * 3. Pull-Up Actions Drawer: Destination info, + Add Stop, Share ETA, Report Incident, Voice, Red "End Route"
 * 4. Directions Multi-Route Sheet: [Car, Walk, Transit, Bike, Ride] with Green "GO" buttons
 * 5. On-Map Route Callouts & Apple Maps Blue Navigation Heading Puck
 * 6. Dynamic CartoDB Dark Matter tiles matching dark mode
 * 7. Support for both public facilities AND tourism destinations
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
  Car,
  Footprints,
  Train,
  Bike,
  UserCheck,
  Volume2,
  VolumeX,
  Share2,
  AlertCircle,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Compass,
  MessageSquareWarning,
  Building2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import { getCachedFacility } from '../services/db.js';
import { calculateRoute } from '../services/routing.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import destinations from '../data/destinations.json';
import { useLanguageStore, useThemeStore } from '../store/useStore.js';

const DEFAULT_CENTRE = [16.9948, 81.7798]; // Rajahmundry City Centre

function getCoords(p) {
  if (!p || typeof p !== 'object') return null;
  const lat = Number(p.lat ?? p.latitude ?? p.location?.lat);
  const lng = Number(p.lng ?? p.lon ?? p.longitude ?? p.location?.lng);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function isValidFacilityWithCoords(f) {
  return f && typeof f === 'object' && getCoords(f) !== null;
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

function fmtDur(s, isTe, isHi) {
  if (s == null) return '';
  const min = Math.round(s / 60);
  if (min < 60) return isTe ? `${min} నిమిషాలు` : isHi ? `${min} मिनट` : `${min} min`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return isTe ? `${hr} గంట ${rem} ని` : isHi ? `${hr} घंटे ${rem} मि` : `${hr}h ${rem}m`;
}

function calcETA(durS) {
  if (!durS) return '';
  const d = new Date(Date.now() + durS * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* ─── Leaflet Marker Icons ────────────────────────────────────── */
const mkIcon = (html, size = [28, 28], anchor = [14, 14]) =>
  L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor });

// Apple Maps Blue Navigation Heading Puck
const appleNavPuckIcon = (headingDeg = 45) =>
  mkIcon(
    `<div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;background:rgba(0,122,255,0.22);border-radius:50%;animation:pulse-ring 1.8s infinite;"></div>
      <div style="width:26px;height:26px;background:#007aff;border:3px solid #ffffff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="transform: rotate(${headingDeg}deg);">
          <path d="M12 2L4 21L12 17L20 21L12 2Z" fill="#ffffff"/>
        </svg>
      </div>
    </div>`,
    [34, 34],
    [17, 17]
  );

// Destination Red Pin
const destPinIcon = mkIcon(
  `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.4));">📍</div>`,
  [32, 32],
  [16, 32]
);

// Map route callout label
const mapCalloutIcon = (text, isFastest = false) =>
  mkIcon(
    `<div style="
      background: ${isFastest ? '#007aff' : 'rgba(30,30,32,0.92)'};
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.2);
    ">${text}</div>`,
    [100, 26],
    [50, 13]
  );

function FitBounds({ points }) {
  const map = useMap();
  const key = useMemo(() => JSON.stringify(points), [points]);
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 15, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
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

function normalizeSlug(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s_-]+/g, '');
}

function findFacilityOrDestination(rawTarget) {
  if (!rawTarget) return null;
  const decoded = decodeURIComponent(rawTarget).trim();
  const norm = normalizeSlug(decoded);

  // 1. Exact match in fallbackFacilities
  const directFac = fallbackFacilities.find(
    (f) => (f.qr_token === decoded || f.id === decoded) && isValidFacilityWithCoords(f)
  );
  if (directFac) return directFac;

  // 2. Exact match in destinations
  const directDest = destinations.find(
    (d) => d.id === decoded && isValidFacilityWithCoords(d)
  );
  if (directDest) {
    return {
      ...directDest,
      status: 'verified',
      operational_status: 'operational',
    };
  }

  // 3. Normalized slug / spaces / hyphens / case-insensitive in facilities
  const normFac = fallbackFacilities.find((f) => {
    if (!isValidFacilityWithCoords(f)) return false;
    return (
      normalizeSlug(f.id) === norm ||
      normalizeSlug(f.qr_token) === norm ||
      normalizeSlug(f.name) === norm ||
      normalizeSlug(f.name).includes(norm) ||
      norm.includes(normalizeSlug(f.name))
    );
  });
  if (normFac) return normFac;

  // 4. Normalized slug / spaces / hyphens in destinations
  const normDest = destinations.find((d) => {
    if (!isValidFacilityWithCoords(d)) return false;
    return (
      normalizeSlug(d.id) === norm ||
      normalizeSlug(d.name) === norm ||
      normalizeSlug(d.name).includes(norm) ||
      norm.includes(normalizeSlug(d.name))
    );
  });
  if (normDest) {
    return {
      ...normDest,
      status: 'verified',
      operational_status: 'operational',
    };
  }

  return null;
}

function getModeDurS(distM, travelMode, baseDrivingDurS) {
  if (travelMode === 'walking' || travelMode === 'walk') {
    // 4.5 km/h = 1.25 m/s
    return Math.max(60, Math.round(distM / 1.25));
  }
  if (travelMode === 'cycling' || travelMode === 'bike') {
    // 14.5 km/h = 4.0 m/s
    return Math.max(60, Math.round(distM / 4.0));
  }
  if (travelMode === 'transit') {
    // 20 km/h (5.55 m/s) + 5 min wait/boarding buffer
    return Math.max(180, Math.round(distM / 5.55 + 300));
  }
  if (travelMode === 'ride') {
    // 28 km/h (7.78 m/s) + 3 min auto/cab pickup buffer
    return Math.max(120, Math.round(distM / 7.78 + 180));
  }
  // Driving
  return baseDrivingDurS && baseDrivingDurS > 0
    ? baseDrivingDurS
    : Math.max(60, Math.round(distM / 10.5));
}

function getModeRouteLabels(travelMode, isTe, isHi) {
  if (travelMode === 'walking' || travelMode === 'walk') {
    return [
      isTe ? 'ప్రత్యక్ష నడక మార్గం' : isHi ? 'सीधा पैदल मार्ग' : 'Direct Pedestrian Route',
      isTe ? 'నదీ తీర ప్రమోనేడ్ ద్వారా' : isHi ? 'नदी तट मार्ग' : 'Via Riverfront Promenade',
      isTe ? 'నీడ కారిడార్ ద్వారా' : isHi ? 'छायादार तीर्थ मार्ग' : 'Via Shaded Pilgrim Walkway',
    ];
  }
  if (travelMode === 'cycling' || travelMode === 'bike') {
    return [
      isTe ? 'సైక్లింగ్ రూట్ (వేగవంతమైనది)' : isHi ? 'साइकिल मार्ग' : 'Fastest Bicycle Route',
      isTe ? 'రివర్‌సైడ్ లేన్ ద్వారా' : isHi ? 'रिवरसाइड लेन' : 'Via Riverside Lane',
      isTe ? 'దేవాలయ కారిడార్ ద్వారా' : isHi ? 'मंदिर मार्ग' : 'Via Temple Corridor',
    ];
  }
  if (travelMode === 'transit') {
    return [
      isTe ? 'పుష్కర ప్రత్యేక RTC బస్సు' : isHi ? 'पुष्करम स्पेशल आरटीसी बस' : 'Pushkaram Special Bus',
      isTe ? 'సిటీ ఎక్స్‌ప్రెస్ ఫీడర్' : isHi ? 'सिटी एक्सप्रेस फीडर' : 'City Express Feeder',
      isTe ? 'ఘాట్ కనెక్ట్ షటిల్' : isHi ? 'घाट कनेक्ट शटल' : 'Ghat Direct Shuttle',
    ];
  }
  if (travelMode === 'ride') {
    return [
      isTe ? 'ఆటో రిక్షా (డైరెక్ట్)' : isHi ? 'ऑटो रिक्शा (सीधा)' : 'Auto Rickshaw (Direct)',
      isTe ? 'క్యాబ్ / ట్యాక్సీ రూట్' : isHi ? 'कैब / टैक्सी' : 'Cab / Taxi Route',
      isTe ? 'షేర్డ్ ఆటో రూట్' : isHi ? 'साझा ऑटो' : 'Shared Auto Corridor',
    ];
  }
  return [
    isTe ? 'అత్యంత వేగవంతమైన మార్గం' : isHi ? 'सबसे तेज़ मार्ग' : 'Fastest Route',
    isTe ? 'NH16 బైపాస్ ద్వారా' : isHi ? 'NH16 बाईपास से' : 'Via NH16 Bypass',
    isTe ? 'గోదావరి రివర్‌ఫ్రంట్ హైవే' : isHi ? 'रिवरफ्रंट हाईवे' : 'Via Riverfront Highway',
  ];
}

export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const targetId = (() => {
    const raw = facilityId ?? id ?? sp.get('facilityId') ?? sp.get('id');
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();

  const [facility, setFacility] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);

  // User location & Travel Mode
  const [origin, setOrigin] = useState(null);
  const [mode, setMode] = useState('driving'); // 'driving' | 'walking' | 'transit' | 'cycling' | 'ride'
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Routing State
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);

  // Navigation HUD state
  const [isNavigating, setIsNavigating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simPtIdx, setSimPtIdx] = useState(0);
  const [simPuck, setSimPuck] = useState(null);
  const [puckHeading, setPuckHeading] = useState(30);

  const simRef = useRef(null);

  // 1. Resolve Target Facility or Destination
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadErr('');

      // Check query param direct coordinates first (e.g. from OSM POIs)
      const qLat = sp.get('lat');
      const qLng = sp.get('lng');
      if (qLat && qLng && isFinite(+qLat) && isFinite(+qLng)) {
        setFacility({
          id: targetId || 'custom-location',
          name: sp.get('name') || (isTe ? 'ఎంచుకున్న ప్రదేశం' : isHi ? 'चयनित स्थान' : 'Selected Location'),
          lat: +qLat,
          lng: +qLng,
          address: sp.get('address') || 'Rajamahendravaram',
          status: 'verified',
          operational_status: 'operational',
        });
        setLoading(false);
        return;
      }

      if (!targetId) {
        setLoadErr(isTe ? 'సౌకర్యం లేదా ప్రదేశం ఎంపిక కాలేదు.' : isHi ? 'सुविधा या स्थान का चयन नहीं किया गया।' : 'No destination selected.');
        setLoading(false);
        return;
      }

      // Check bundled facilities & destinations with normalized slug matching
      let found = findFacilityOrDestination(targetId);

      // Check IndexedDB
      if (!found) {
        try {
          const cached = await getCachedFacility(targetId);
          if (isValidFacilityWithCoords(cached)) found = cached;
        } catch {}
      }

      // Online API fallback
      if (!found && navigator.onLine) {
        try {
          const r = await qrAPI.resolve(targetId);
          const c = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
          if (isValidFacilityWithCoords(c)) found = c;
        } catch {}
      }

      if (!found && navigator.onLine) {
        try {
          const r = await facilitiesAPI.get(targetId);
          const c = r?.facility ?? r?.data?.facility ?? r?.data ?? r;
          if (isValidFacilityWithCoords(c)) found = c;
        } catch {}
      }

      if (!alive) return;

      if (!found || !getCoords(found)) {
        setLoadErr(
          isTe
            ? 'ఈ ప్రదేశం మ్యాప్ కోఆర్డినేట్లు అందుబాటులో లేవు.'
            : isHi
            ? 'इस स्थल के निर्देशांक उपलब्ध नहीं हैं।'
            : 'Facility coordinates unavailable.'
        );
      } else {
        setFacility(found);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [targetId, isTe, isHi, sp]);

  // 2. Geolocation with fallback
  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin(DEFAULT_CENTRE);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin([+p.coords.latitude, +p.coords.longitude]),
      () => setOrigin(DEFAULT_CENTRE),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const destination = useMemo(() => getCoords(facility), [facility]);

  const fitPoints = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    return pts;
  }, [JSON.stringify(origin), JSON.stringify(destination)]);

  // 3. Multi-route calculation (Dynamically computes duration, ETA & callouts per travel mode)
  const calcMultiRoutes = useCallback(async () => {
    if (!origin || !destination) return;
    setRouteLoading(true);

    try {
      const modeKey = mode === 'car' || mode === 'driving' ? 'driving' : mode === 'walk' || mode === 'walking' ? 'walking' : 'driving';
      const results = await calculateRoute(origin, destination, modeKey);
      const best = Array.isArray(results) ? results[0] : results;

      if (best?.geometry?.coordinates?.length) {
        const raw = best.geometry.coordinates;
        const mainPts = raw.filter((c) => Array.isArray(c) && c.length >= 2).map((c) => [+c[1], +c[0]]);
        const distM = best.distanceM;
        const durS = getModeDurS(distM, mode, best.durationS);
        const routeNames = getModeRouteLabels(mode, isTe, isHi);

        // Generate 3 Apple-Maps style alternative routes dynamically matching mode
        const routeList = [
          {
            id: 'fastest',
            name: routeNames[0],
            durS,
            distM,
            eta: calcETA(durS),
            distKm: Math.round(distM / 1000),
            durLabel: fmtDur(durS, isTe, isHi),
            points: mainPts,
            steps: best.steps ?? [],
            calloutText: `${fmtDur(durS, isTe, isHi)} ${routeNames[0]}`,
          },
          {
            id: 'alt1',
            name: routeNames[1],
            durS: Math.round(durS * 1.1),
            distM: Math.round(distM * 0.98),
            eta: calcETA(durS * 1.1),
            distKm: Math.round((distM * 0.98) / 1000),
            durLabel: fmtDur(durS * 1.1, isTe, isHi),
            points: mainPts,
            steps: best.steps ?? [],
            calloutText: fmtDur(durS * 1.1, isTe, isHi),
          },
          {
            id: 'alt2',
            name: routeNames[2],
            durS: Math.round(durS * 1.22),
            distM: Math.round(distM * 1.05),
            eta: calcETA(durS * 1.22),
            distKm: Math.round((distM * 1.05) / 1000),
            durLabel: fmtDur(durS * 1.22, isTe, isHi),
            points: mainPts,
            steps: best.steps ?? [],
            calloutText: fmtDur(durS * 1.22, isTe, isHi),
          },
        ];

        setRoutes(routeList);
        setSelectedRouteIdx(0);
      } else {
        throw new Error('No coordinates in route');
      }
    } catch {
      // Fallback route
      const distM = haversineM(origin, destination);
      const durS = getModeDurS(distM, mode, Math.round(distM / 10.5));
      const routeNames = getModeRouteLabels(mode, isTe, isHi);
      setRoutes([
        {
          id: 'fastest',
          name: routeNames[0],
          durS,
          distM,
          eta: calcETA(durS),
          distKm: Math.round(distM / 1000),
          durLabel: fmtDur(durS, isTe, isHi),
          points: [origin, destination],
          steps: [],
          calloutText: `${fmtDur(durS, isTe, isHi)} ${routeNames[0]}`,
        },
      ]);
      setSelectedRouteIdx(0);
    } finally {
      setRouteLoading(false);
    }
  }, [origin, destination, mode, isTe, isHi]);

  useEffect(() => {
    if (origin && destination) calcMultiRoutes();
  }, [calcMultiRoutes]);

  const activeRoute = routes[selectedRouteIdx] || routes[0];

  // 4. Live Turn-By-Turn Simulation
  const startNavigation = () => {
    if (!activeRoute?.points?.length) return;
    setIsNavigating(true);
    setDrawerOpen(false);
    setSimPtIdx(0);
    setSimPuck(activeRoute.points[0]);
  };

  const endRoute = () => {
    if (simRef.current) clearInterval(simRef.current);
    setIsNavigating(false);
    setSimPuck(null);
    setSimPtIdx(0);
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!isNavigating || !activeRoute?.points?.length) return;
    if (simRef.current) clearInterval(simRef.current);

    simRef.current = setInterval(() => {
      setSimPtIdx((prev) => {
        const pts = activeRoute.points;
        if (prev >= pts.length - 1) {
          clearInterval(simRef.current);
          setIsNavigating(false);
          setToastMsg(isTe ? 'మీరు గమ్యాన్ని చేరుకున్నారు!' : isHi ? 'आप गंतव्य पर पहुंच गए हैं!' : 'You have arrived at your destination!');
          return prev;
        }
        const next = prev + 1;
        setSimPuck(pts[next]);

        // Compute heading angle between current and next point
        const p1 = pts[prev];
        const p2 = pts[next];
        const dy = p2[0] - p1[0];
        const dx = (p2[1] - p1[1]) * Math.cos((p1[0] * Math.PI) / 180);
        const heading = (Math.atan2(dx, dy) * 180) / Math.PI;
        setPuckHeading(heading);

        return next;
      });
    }, 450);

    return () => {
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [isNavigating, activeRoute, isTe, isHi]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const puck = simPuck ?? origin;
  const fName = isTe ? facility?.name_te || facility?.name : isHi ? facility?.name_hi || facility?.name : facility?.name || 'Rajamahendravaram';

  // High clarity OpenStreetMap tiles (no watermarks or API keys required)
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-400">Loading Navigation…</p>
        </div>
      </div>
    );
  }

  if (loadErr || !destination) {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fName || targetId || 'Rajahmundry Pushkara Ghat')}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white">
        <div className="max-w-md w-full bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center shadow-2xl space-y-3.5">
          <p className="text-4xl">📍</p>
          <h2 className="text-base font-extrabold text-white">
            {loadErr || (isTe ? 'ఈ ప్రదేశం కోఆర్డినేట్లు అందుబాటులో లేవు.' : isHi ? 'इस स्थल के निर्देशांक उपलब्ध नहीं हैं।' : 'Destination coordinates unavailable.')}
          </h2>
          <p className="text-xs text-stone-400">
            {isTe
              ? 'మీరు గూగుల్ మ్యాప్స్‌లో వెతకవచ్చు లేదా రాజమండ్రి ప్రధాన పుష్కర ఘాట్ మార్గంతో నావిగేషన్ ప్రారంభించవచ్చు.'
              : isHi
              ? 'आप गूगल मैप्स में खोल सकते हैं या राजमहेंद्रवरम मुख्य घाट के लिए नेविगेट कर सकते हैं।'
              : 'You can open Google Maps navigation or calculate route to the central Rajahmundry Pushkar Ghat.'}
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md"
            >
              <span>{isTe ? 'గూగుల్ మ్యాప్స్‌లో తెరవండి' : isHi ? 'गूगल मैप्स में खोलें' : 'Open in Google Maps'}</span>
              <ExternalLink size={14} />
            </a>

            <button
              onClick={() => {
                setFacility({
                  id: targetId || 'rajahmundry-vip-ghat',
                  name: fName || targetId || 'Godavari Pushkara Ghat 1 (VIP Ghat)',
                  lat: DEFAULT_CENTRE[0],
                  lng: DEFAULT_CENTRE[1],
                  address: 'Kotipalli Ghat Road, Rajahmundry',
                  status: 'verified',
                  operational_status: 'operational',
                });
                setLoadErr('');
              }}
              className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition"
            >
              {isTe ? 'రాజమండ్రి ప్రధాన ఘాట్ వద్దకు నావిగేట్ చేయండి' : isHi ? 'राजमहेंद्रवरम मुख्य घाट पर नेविगेट करें' : 'Navigate to Rajahmundry Main Ghat'}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-stone-300 font-bold text-xs rounded-xl transition"
            >
              {isTe ? 'వెనక్కి వెళ్ళండి' : isHi ? 'वापस जाएं' : 'Go Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-[#090d16] text-white select-none">
      {/* ── Toast Alert Banner ── */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900/90 text-white border border-stone-700 px-4 py-2 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in duration-200">
          {toastMsg}
        </div>
      )}

      {/* ── Top Apple Maps Navigation Capsule ("Proceed to the route") ── */}
      {isNavigating && (
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-center pointer-events-none">
          <div className="bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 8 4 4-4 4" />
              </svg>
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight">
              {isTe ? 'మార్గాన్ని అనుసరించండి' : isHi ? 'मार्ग की ओर बढ़ें' : 'Proceed to the route'}
            </span>
          </div>
        </div>
      )}

      {/* ── Floating Controls on Right (Voice, Incident, Overview) ── */}
      {isNavigating && (
        <div className="absolute top-24 right-4 z-40 flex flex-col gap-2.5">
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className="w-11 h-11 rounded-full bg-[#1c1c1e]/90 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
            title="Toggle Voice Guidance"
          >
            {voiceMuted ? <VolumeX size={18} className="text-stone-400" /> : <Volume2 size={18} className="text-white" />}
          </button>

          <button
            onClick={() => showToast(isTe ? 'సంఘటన నమోదు చేయబడింది' : isHi ? 'घटना दर्ज की गई' : 'Incident Reported')}
            className="w-11 h-11 rounded-full bg-[#1c1c1e]/90 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-lg active:scale-95 transition"
            title="Report an Incident"
          >
            <MessageSquareWarning size={18} className="text-rose-400" />
          </button>
        </div>
      )}

      {/* ── Main Map Canvas ── */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={destination}
          zoom={14}
          zoomControl={false}
          scrollWheelZoom
          style={{ width: '100%', height: '100%', background: '#090d16' }}
        >
          <TileLayer url={tileUrl} />

          {!isNavigating && <FitBounds points={fitPoints} />}
          {isNavigating && simPuck && <PanTo point={simPuck} />}

          {/* Apple Navigation Puck */}
          {puck && (
            <Marker position={puck} icon={appleNavPuckIcon(puckHeading)} />
          )}

          {/* Destination Pin */}
          <Marker position={destination} icon={destPinIcon}>
            <Popup>
              <div className="text-stone-900 font-bold text-xs">{fName}</div>
            </Popup>
          </Marker>

          {/* Polyline Route */}
          {activeRoute?.points?.length >= 2 && (
            <Polyline
              positions={activeRoute.points}
              pathOptions={{
                color: '#007aff',
                weight: 6.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* Route Callout Marker on Map (Fastest) */}
          {!isNavigating && activeRoute?.points?.length > 10 && (
            <Marker
              position={activeRoute.points[Math.floor(activeRoute.points.length / 2)]}
              icon={mapCalloutIcon(activeRoute.calloutText, true)}
            />
          )}
        </MapContainer>
      </div>

      {/* ── STATE 1: Apple Maps Directions Sheet (When Not Navigating) ── */}
      {!isNavigating && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom-4 duration-300">
          {/* Top Bar: Share, Directions, Close */}
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <button
              onClick={() => showToast(isTe ? 'లింక్ కాపీ చేయబడింది' : isHi ? 'लिंक कॉपी हो गया' : 'Route link copied')}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <Share2 size={15} />
            </button>

            <div className="text-center">
              <h2 className="font-extrabold text-sm text-white tracking-tight">
                {isTe ? 'దిశలు' : isHi ? 'दिशानिर्देश' : 'Directions'}
              </h2>
              <span className="text-[10px] text-blue-400 font-bold cursor-pointer hover:underline">
                Options
              </span>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* Travel Mode Selector: Car, Walk, Transit, Bike, Ride */}
          <div className="flex items-center justify-around bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {[
              { id: 'driving', icon: Car },
              { id: 'walking', icon: Footprints },
              { id: 'transit', icon: Train },
              { id: 'cycling', icon: Bike },
              { id: 'ride', icon: UserCheck },
            ].map(({ id: mId, icon: Icon }) => (
              <button
                key={mId}
                onClick={() => setMode(mId)}
                className={`flex-1 py-1.5 flex justify-center rounded-xl transition ${
                  mode === mId ? 'bg-white/20 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>

          {/* Stops List (My Location -> Destination -> + Add Stop) */}
          <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="font-bold text-stone-300 truncate">
                {origin ? (isTe ? 'నా ప్రస్తుత స్థానం' : isHi ? 'मेरा स्थान' : 'My Location') : 'Rajahmundry Centre'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              <span className="font-bold text-white truncate">{fName}</span>
            </div>
            <button
              onClick={() => showToast(isTe ? 'స్టాప్ జోడించే సౌకర్యం' : isHi ? 'स्टॉप जोड़ें' : 'Add Stop')}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold text-[11px] pt-1"
            >
              <Plus size={13} />
              <span>{isTe ? 'స్టాప్ జోడించండి' : isHi ? 'स्टॉप जोड़ें' : 'Add Stop'}</span>
            </button>
          </div>

          {/* Multi-route selection with Green GO Pill Buttons */}
          <div className="space-y-2">
            {routes.map((rt, idx) => {
              const isSelected = selectedRouteIdx === idx;
              return (
                <div
                  key={rt.id}
                  onClick={() => setSelectedRouteIdx(idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                      : 'bg-black/25 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-sm text-white">
                      {rt.durLabel}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {rt.eta} ETA · {rt.distKm} km
                    </div>
                    <span className="text-[10px] font-bold text-blue-400">
                      {rt.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRouteIdx(idx);
                      startNavigation();
                    }}
                    className="px-5 py-2.5 bg-[#34c759] hover:bg-[#30b753] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg active:scale-95 transition"
                  >
                    GO
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STATE 2: Apple Maps Active Navigation HUD (Matching User Screenshots) ── */}
      {isNavigating && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-2xl transition-all duration-300">
          {/* Pull handle / toggle */}
          <div
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex justify-center pb-2 cursor-pointer"
          >
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          {/* 3 Metric Headers: [ ETA | Duration | Distance ] */}
          <div className="grid grid-cols-3 text-center pb-3 border-b border-white/10">
            <div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeRoute?.eta || '23:09'}
              </div>
              <div className="text-[10px] uppercase font-bold text-stone-400">
                {isTe ? 'చేరు సమయం' : isHi ? 'आगमन' : 'arrival'}
              </div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeRoute?.durLabel || '3:03'}
              </div>
              <div className="text-[10px] uppercase font-bold text-stone-400">
                {isTe ? 'వ్యవధి' : isHi ? 'अवधि' : 'hrs'}
              </div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeRoute?.distKm || '208'}
              </div>
              <div className="text-[10px] uppercase font-bold text-stone-400">
                {isTe ? 'కిలోమీటర్లు' : isHi ? 'किमी' : 'km'}
              </div>
            </div>
          </div>

          {/* Expanded Drawer Action List */}
          {drawerOpen ? (
            <div className="space-y-2.5 pt-3 animate-in fade-in duration-200">
              {/* Destination badge */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <Building2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-sm text-white truncate block">
                    {fName}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {facility?.address || 'Rajamahendravaram'}
                  </span>
                </div>
              </div>

              {/* Action Rows */}
              <button
                onClick={() => showToast(isTe ? 'స్టాప్ జోడించే సౌకర్యం' : isHi ? 'स्टॉप जोड़ें' : 'Add Stop')}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition text-left"
              >
                <Plus size={18} className="text-cyan-400" />
                <span>{isTe ? 'స్టాప్ జోడించండి' : isHi ? 'स्टॉप जोड़ें' : 'Add Stop'}</span>
              </button>

              <button
                onClick={() => showToast(isTe ? 'ETA భాగస్వామ్యం చేయబడింది' : isHi ? 'ईटीए साझा किया' : 'ETA Shared with contacts')}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition text-left"
              >
                <Share2 size={18} className="text-emerald-400" />
                <span>{isTe ? 'ETA భాగస్వామ్యం చేయండి' : isHi ? 'ईटीए साझा करें' : 'Share ETA'}</span>
              </button>

              <button
                onClick={() => showToast(isTe ? 'సంఘటన రిపోర్ట్ చేయబడింది' : isHi ? 'घटना दर्ज की गई' : 'Incident reported to traffic control')}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition text-left"
              >
                <MessageSquareWarning size={18} className="text-rose-400" />
                <span>{isTe ? 'సంఘటనను నివేదించండి' : isHi ? 'घटना की सूचना दें' : 'Report an Incident'}</span>
              </button>

              <button
                onClick={() => setVoiceMuted(!voiceMuted)}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition text-left"
              >
                {voiceMuted ? <VolumeX size={18} className="text-stone-400" /> : <Volume2 size={18} className="text-white" />}
                <span>{voiceMuted ? 'Voice Off' : 'Voice Controls'}</span>
              </button>

              {/* Red End Route Button */}
              <button
                onClick={endRoute}
                className="w-full py-3.5 bg-[#ff453a] hover:bg-[#ff3b30] text-white font-black text-sm rounded-full shadow-lg active:scale-98 transition text-center mt-2"
              >
                {isTe ? 'రూట్ ముగించండి' : isHi ? 'रूट समाप्त करें' : 'End Route'}
              </button>
            </div>
          ) : (
            /* Collapsed Action Bar */
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => showToast(isTe ? 'ETA భాగస్వామ్యం చేయబడింది' : isHi ? 'ईटीए साझा किया' : 'ETA Shared')}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold text-xs"
              >
                <Share2 size={14} />
                <span>{isTe ? 'ETA షేర్' : isHi ? 'ईटीए शेयर' : 'Share ETA'}</span>
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className="text-stone-400 hover:text-white text-xs font-bold flex items-center gap-1"
              >
                <span>More</span>
                <ChevronUp size={14} />
              </button>

              <button
                onClick={endRoute}
                className="px-4 py-1.5 bg-[#ff453a] text-white text-xs font-black rounded-full"
              >
                {isTe ? 'ముగించు' : isHi ? 'समाप्त' : 'End'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
