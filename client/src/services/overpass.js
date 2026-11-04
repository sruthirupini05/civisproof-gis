/**
 * Overpass API Service for Real OpenStreetMap Data Discovery in Rajahmundry
 *
 * Bounding Box for Rajahmundry (Rajamahendravaram) and surroundings:
 * [south: 16.85, west: 81.70, north: 17.15, east: 81.90]
 */

const RAJAHMUNDRY_BBOX = '16.85,81.70,17.15,81.90';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// In-memory & persistent cache to prevent repeated network delays
const memCache = new Map();

async function runOverpassQuery(query, cacheKey) {
  if (cacheKey && memCache.has(cacheKey)) {
    return memCache.get(cacheKey);
  }
  if (typeof window !== 'undefined' && cacheKey) {
    try {
      const stored = localStorage.getItem(`overpass_${cacheKey}`) || sessionStorage.getItem(`overpass_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch {}
  }

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200); // 1.2s fast non-blocking timeout

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data?.elements)) {
        if (cacheKey) {
          memCache.set(cacheKey, data.elements);
          try {
            localStorage.setItem(`overpass_${cacheKey}`, JSON.stringify(data.elements));
          } catch {}
        }
        return data.elements;
      }
    } catch (e) {
      // Non-blocking failover
    }
  }
  return [];
}

/**
 * Fetch real restaurants, cafes, and eateries around Rajahmundry
 */
export async function fetchNearbyFoodOSM() {
  const q = `[out:json][timeout:10];
(
  node["amenity"="restaurant"](${RAJAHMUNDRY_BBOX});
  node["amenity"="fast_food"](${RAJAHMUNDRY_BBOX});
  node["amenity"="cafe"](${RAJAHMUNDRY_BBOX});
);
out body;`;
  const elements = await runOverpassQuery(q, 'nearby_food');

  return elements
    .filter((el) => el.tags?.name && el.lat && el.lon)
    .map((el) => {
      const diet = el.tags['diet:vegetarian'] === 'yes'
        ? 'pure_veg'
        : el.tags['diet:non_vegetarian'] === 'yes'
        ? 'non_veg'
        : 'both';

      const cuisine = el.tags['cuisine'] || (el.tags['amenity'] === 'cafe' ? 'Cafe & Beverages' : 'South Indian / Multi-Cuisine');

      return {
        id: `osm-food-${el.id}`,
        osm_id: el.id,
        name: el.tags.name,
        name_te: el.tags['name:te'] || el.tags.name,
        name_hi: el.tags['name:hi'] || el.tags.name,
        category: 'food',
        lat: Number(el.lat),
        lng: Number(el.lon),
        address: el.tags['addr:street'] || el.tags['addr:full'] || 'Rajamahendravaram City',
        cuisine,
        diet,
        opening_hours: el.tags['opening_hours'] || '07:00 - 22:30',
        phone: el.tags['phone'] || el.tags['contact:phone'] || '',
        data_source: 'openstreetmap',
        is_verified: 1,
        operational_status: 'operational',
      };
    });
}

/**
 * Fetch real fuel / petrol stations around Rajahmundry
 */
export async function fetchPetrolStationsOSM() {
  const q = `[out:json][timeout:10];
(
  node["amenity"="fuel"](${RAJAHMUNDRY_BBOX});
);
out body;`;
  const elements = await runOverpassQuery(q, 'petrol_stations');

  return elements
    .filter((el) => el.lat && el.lon)
    .map((el) => {
      const brand = el.tags['brand'] || el.tags['operator'] || el.tags.name || 'Petrol Station';
      const name = el.tags.name || `${brand} Fuel Station`;

      return {
        id: `osm-fuel-${el.id}`,
        osm_id: el.id,
        name,
        name_te: el.tags['name:te'] || name,
        name_hi: el.tags['name:hi'] || name,
        category: 'petrol',
        lat: Number(el.lat),
        lng: Number(el.lon),
        brand,
        address: el.tags['addr:street'] || el.tags['addr:full'] || 'Main Road, Rajahmundry',
        opening_hours: el.tags['opening_hours'] || '24x7 Open',
        data_source: 'openstreetmap',
        is_verified: 1,
        operational_status: 'operational',
      };
    });
}

/**
 * Fetch real railway stations and bus stations/stops around Rajahmundry
 */
export async function fetchTransportHubsOSM() {
  const q = `[out:json][timeout:10];
(
  node["railway"="station"](${RAJAHMUNDRY_BBOX});
  node["amenity"="bus_station"](${RAJAHMUNDRY_BBOX});
  node["aeroway"="aerodrome"](${RAJAHMUNDRY_BBOX});
);
out body;`;
  const elements = await runOverpassQuery(q, 'transport_hubs');

  return elements
    .filter((el) => el.lat && el.lon)
    .map((el) => {
      const isRail = el.tags['railway'] === 'station';
      const isAero = el.tags['aeroway'] === 'aerodrome';
      const transportType = isRail ? 'train' : isAero ? 'flight' : 'bus';
      const name = el.tags.name || (isRail ? 'Railway Station' : isAero ? 'Airport' : 'Bus Station');

      return {
        id: `osm-transport-${el.id}`,
        osm_id: el.id,
        name,
        name_te: el.tags['name:te'] || name,
        name_hi: el.tags['name:hi'] || name,
        category: 'transport',
        transport_type: transportType,
        lat: Number(el.lat),
        lng: Number(el.lon),
        address: el.tags['addr:street'] || 'Rajamahendravaram Transport Network',
        data_source: 'openstreetmap',
        is_verified: 1,
        operational_status: 'operational',
      };
    });
}
