
const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

const OSRM_PROFILES = {
  walking: 'foot',
  cycling: 'bike',
  driving: 'car',
};

export async function calculateRoute(start, end, mode = 'walking') {
  const profile = OSRM_PROFILES[mode];

  if (!profile) {
    throw new Error(`Unsupported travel mode: ${mode}`);
  }

  const isValidCoordinate = (point) =>
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(Number(point[0])) &&
    Number.isFinite(Number(point[1])) &&
    Number(point[0]) >= -90 &&
    Number(point[0]) <= 90 &&
    Number(point[1]) >= -180 &&
    Number(point[1]) <= 180;

  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new Error(
      'Invalid route coordinates. Both start and destination must contain valid [latitude, longitude] values.'
    );
  }

  const [startLat, startLng] = start.map(Number);
  const [endLat, endLng] = end.map(Number);

  if (startLat === endLat && startLng === endLng) {
    throw new Error('Your current location and destination are identical.');
  }

  // OSRM expects longitude,latitude.
  const coords = `${startLng},${startLat};${endLng},${endLat}`;
  const url =
    `${OSRM_BASE}/${profile}/${coords}` +
    '?overview=full&geometries=geojson&steps=true&alternatives=true';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch(url, { signal: controller.signal });

    if (!resp.ok) {
      throw new Error(`OSRM routing service returned HTTP ${resp.status}.`);
    }

    const data = await resp.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error(data.message || 'No route found between these locations.');
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
      steps: (route.legs || []).flatMap((leg) =>
        (leg.steps || []).map((step) => ({
          instruction:
            step.maneuver?.instruction || formatManeuver(step.maneuver),
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
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Route calculation timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function formatManeuver(maneuver) {
  if (!maneuver) return 'Continue';

  const { type, modifier } = maneuver;

  if (modifier) {
    return `${type} ${modifier}`.replace(/-/g, ' ');
  }

  return type || 'Continue';
}

export const SUPPORTED_MODES = ['walking', 'cycling', 'driving'];
export const UNSUPPORTED_MODES = ['publicTransport'];
