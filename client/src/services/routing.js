// OSRM routing service
const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

const OSRM_PROFILES = {
  walking: 'foot',
  cycling: 'bike',
  driving: 'car',
};

/**
 * Calculate a route using the OSRM public API.
 * @param {[number,number]} start - [lat, lng]
 * @param {[number,number]} end - [lat, lng]
 * @param {'walking'|'cycling'|'driving'} mode
 * @returns Promise<RouteResult>
 */
export async function calculateRoute(start, end, mode = 'walking') {
  const profile = OSRM_PROFILES[mode];
  if (!profile) throw new Error(`Unsupported travel mode: ${mode}`);

  // OSRM expects lng,lat
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=true`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`OSRM error: ${resp.status}`);
  const data = await resp.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No route found');
  }

  return data.routes.map((route, index) => ({
    id: `route-${index}`,
    isAlternative: index > 0,
    distanceM: route.distance,
    durationS: route.duration,
    distanceLabel: formatDistance(route.distance),
    durationLabel: formatDuration(route.duration),
    geometry: route.geometry,
    legs: route.legs,
    steps: route.legs.flatMap((leg) =>
      leg.steps.map((step) => ({
        instruction: step.maneuver?.instruction || formatManeuver(step.maneuver),
        distanceM: step.distance,
        distanceLabel: formatDistance(step.distance),
        name: step.name,
        maneuver: step.maneuver?.type,
        bearing: step.maneuver?.bearing_after,
      }))
    ),
    source: 'OSRM',
    sourceLabel: 'OSRM (OpenStreetMap)',
    calculatedAt: new Date().toISOString(),
    mode,
  }));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatManeuver(maneuver) {
  if (!maneuver) return 'Continue';
  const { type, modifier } = maneuver;
  if (modifier) return `${type} ${modifier}`.replace(/-/g, ' ');
  return type || 'Continue';
}

export const SUPPORTED_MODES = ['walking', 'cycling', 'driving'];
export const UNSUPPORTED_MODES = ['publicTransport']; // No OSRM public transit
