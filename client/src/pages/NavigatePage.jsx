
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { qrAPI, facilitiesAPI } from '../services/api.js';
import {
  calculateRoute,
  SUPPORTED_MODES,
} from '../services/routing.js';

const DEFAULT_START = [16.996, 81.775];

function getCoordinates(place) {
  if (!place) return null;

  const lat = place.lat ?? place.latitude ?? place.location?.lat;
  const lng =
    place.lng ??
    place.lon ??
    place.longitude ??
    place.location?.lng ??
    place.location?.lon ??
    place.location?.longitude;

  if (
    lat === null ||
    lat === undefined ||
    lat === '' ||
    lng === null ||
    lng === undefined ||
    lng === ''
  ) {
    return null;
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

function isValidPoint(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    point.every(
      value =>
        value !== null &&
        value !== undefined &&
        value !== '' &&
        Number.isFinite(Number(value))
    ) &&
    Number(point[0]) >= -90 &&
    Number(point[0]) <= 90 &&
    Number(point[1]) >= -180 &&
    Number(point[1]) <= 180
  );
}

function createPin(color) {
  return L.divIcon({
    className: 'civicproof-map-pin',
    html: `<div style="
      width:22px;
      height:22px;
      border:3px solid white;
      border-radius:50%;
      background:${color};
      box-shadow:0 2px 8px #0005;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function MapView({ center }) {
  const map = useMap();

  useEffect(() => {
    if (isValidPoint(center)) {
      map.setView(center.map(Number), 15);
    }
  }, [center, map]);

  return null;
}

function normaliseRoute(result, start, destination) {
  const raw =
    result?.geometry?.coordinates ??
    result?.coordinates ??
    result?.route?.geometry?.coordinates ??
    result?.data?.geometry?.coordinates;

  // GeoJSON coordinates use [longitude, latitude].
  if (Array.isArray(raw) && raw.length >= 2) {
    const points = raw
      .filter(
        point =>
          Array.isArray(point) &&
          point.length >= 2 &&
          point[0] !== null &&
          point[1] !== null &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1])) &&
          Math.abs(Number(point[0])) <= 180 &&
          Math.abs(Number(point[1])) <= 90
      )
      .map(point => [Number(point[1]), Number(point[0])]);

    if (points.length >= 2) return points;
  }

  // Array-of-points results use [latitude, longitude].
  if (Array.isArray(result) && result.length >= 2) {
    const points = result
      .filter(isValidPoint)
      .map(point => point.map(Number));

    if (points.length >= 2) return points;
  }

  // Safe visual fallback; this is not a road-following route.
  return [start, destination];
}

export default function NavigatePage() {
  const { facilityId, id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const targetId =
    facilityId ??
    id ??
    searchParams.get('facilityId') ??
    searchParams.get('id');

  const [destination, setDestination] = useState(null);
  const [startPoint, setStartPoint] = useState(DEFAULT_START);
  const [routePoints, setRoutePoints] = useState([]);
  const [travelMode, setTravelMode] = useState('foot');
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState(
    'Using the default starting point until your location is available.'
  );

  const destinationPoint = useMemo(
    () => getCoordinates(destination),
    [destination]
  );

  const safeDestinationPoint = isValidPoint(destinationPoint)
    ? destinationPoint.map(Number)
    : null;

  const safeStartPoint = isValidPoint(startPoint)
    ? startPoint.map(Number)
    : null;

  const safeRoutePoints = Array.isArray(routePoints)
    ? routePoints.filter(isValidPoint).map(point => point.map(Number))
    : [];

  const startPin = useMemo(() => createPin('#2563eb'), []);
  const endPin = useMemo(() => createPin('#dc2626'), []);

  // Load the selected facility.
  useEffect(() => {
    let active = true;

    async function loadDestination() {
      setLoading(true);
      setError('');
      setDestination(null);

      if (!targetId) {
        setError(
          'No facility was selected. Please return to the map and select a facility.'
        );
        setLoading(false);
        return;
      }

      try {
        let result = null;

        try {
          result = await qrAPI.resolve(targetId);
        } catch {
          result = null;
        }

        let facility =
          result?.facility ??
          result?.data?.facility ??
          result?.data ??
          result;

        if (!getCoordinates(facility)) {
          try {
            result = await facilitiesAPI.get(targetId);

            facility =
              result?.facility ??
              result?.data?.facility ??
              result?.data ??
              result;
          } catch {
            // A useful error is displayed below if loading fails.
          }
        }

        if (!getCoordinates(facility)) {
          throw new Error(
            'This facility has missing or invalid map coordinates. Check its latitude and longitude in the facility data.'
          );
        }

        if (active) {
          setDestination(facility);
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
              'Unable to load this facility. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDestination();

    return () => {
      active = false;
    };
  }, [targetId]);

  // Get the user's location when permission is available.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Geolocation is unavailable. Using the default starting point.'
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const point = [
          Number(position.coords.latitude),
          Number(position.coords.longitude),
        ];

        if (isValidPoint(point)) {
          setStartPoint(point);
          setLocationMessage('Using your current location.');
        }
      },
      () => {
        setLocationMessage(
          'Location permission was unavailable. Using the default starting point.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Calculate a route only when both points are valid.
  useEffect(() => {
    let active = true;

    async function loadRoute() {
      if (
        !isValidPoint(safeStartPoint) ||
        !isValidPoint(safeDestinationPoint)
      ) {
        setRoutePoints([]);
        setRouteLoading(false);
        return;
      }

      const start = safeStartPoint.map(Number);
      const destinationCoords = safeDestinationPoint.map(Number);

      setRouteLoading(true);
      setRoutePoints([start, destinationCoords]);

      try {
        const result = await calculateRoute(
          start,
          destinationCoords,
          travelMode
        );

        const points = normaliseRoute(
          result,
          start,
          destinationCoords
        );

        if (active) {
          setRoutePoints(
            points.length >= 2 ? points : [start, destinationCoords]
          );
        }
      } catch (err) {
        console.warn(
          'Live routing failed. Showing a straight-line fallback instead.',
          err
        );

        if (active) {
          setRoutePoints([start, destinationCoords]);
        }
      } finally {
        if (active) setRouteLoading(false);
      }
    }

    loadRoute();

    return () => {
      active = false;
    };
  }, [safeStartPoint?.[0], safeStartPoint?.[1],
      safeDestinationPoint?.[0], safeDestinationPoint?.[1],
      travelMode]);

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Loading facility and map…</p>
      </main>
    );
  }

  if (error || !safeDestinationPoint) {
    return (
      <main style={styles.page}>
        <button
          style={styles.secondaryButton}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <h2>Navigation unavailable</h2>

        <p role="alert" style={styles.error}>
          {error || 'The selected facility has no valid coordinates.'}
        </p>

        <p>
          Return to the facilities map and select another facility, or
          check the selected facility's latitude and longitude.
        </p>
      </main>
    );
  }

  const facilityName =
    destination?.name ??
    destination?.facility_name ??
    destination?.facilityName ??
    destination?.title ??
    'Selected facility';

  const modes = Array.isArray(SUPPORTED_MODES)
    ? SUPPORTED_MODES
    : ['foot', 'driving', 'cycling'];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <button
          style={styles.secondaryButton}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div>
          <h1 style={styles.heading}>Navigation</h1>
          <p style={styles.muted}>{facilityName}</p>
        </div>
      </header>

      <section style={styles.panel}>
        <label htmlFor="travel-mode" style={styles.label}>
          Travel mode
        </label>

        <select
          id="travel-mode"
          value={travelMode}
          onChange={event => setTravelMode(event.target.value)}
          style={styles.select}
        >
          {modes.map(mode => {
            const value =
              typeof mode === 'string'
                ? mode
                : mode.value ?? mode.id ?? 'foot';

            const label =
              typeof mode === 'string'
                ? mode
                : mode.label ?? mode.name ?? value;

            return (
              <option key={value} value={value}>
                {String(label).charAt(0).toUpperCase() +
                  String(label).slice(1)}
              </option>
            );
          })}
        </select>

        <p style={styles.muted}>{locationMessage}</p>

        {routeLoading && (
          <p style={styles.muted}>Checking for a live route…</p>
        )}

        {!routeLoading && safeRoutePoints.length === 2 && (
          <p style={styles.muted}>
            A straight-line fallback may be shown if live routing is
            unavailable. It does not represent the actual road or walking
            path.
          </p>
        )}
      </section>

      <section style={styles.mapWrapper}>
        {safeDestinationPoint ? (
          <MapContainer
            center={safeDestinationPoint}
            zoom={14}
            scrollWheelZoom
            style={styles.map}
          >
            <MapView center={safeDestinationPoint} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {safeStartPoint && (
              <Marker position={safeStartPoint} icon={startPin}>
                <Popup>Your starting point</Popup>
              </Marker>
            )}

            <Marker position={safeDestinationPoint} icon={endPin}>
              <Popup>{facilityName}</Popup>
            </Marker>

            {safeRoutePoints.length >= 2 && (
              <Polyline
                positions={safeRoutePoints}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.85,
                }}
              />
            )}
          </MapContainer>
        ) : (
          <p style={{ padding: 16 }}>
            Destination coordinates are unavailable.
          </p>
        )}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.subheading}>Destination details</h2>

        <p>
          <strong>Facility:</strong> {facilityName}
        </p>

        <p>
          <strong>Latitude:</strong> {safeDestinationPoint[0]}
        </p>

        <p>
          <strong>Longitude:</strong> {safeDestinationPoint[1]}
        </p>

        <button
          style={styles.primaryButton}
          onClick={() => {
            const [lat, lng] = safeDestinationPoint;

            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
              '_blank',
              'noopener,noreferrer'
            );
          }}
        >
          Open directions in Google Maps
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    color: '#172033',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  heading: {
    margin: '0 0 6px',
    fontSize: 28,
  },
  subheading: {
    marginTop: 0,
    fontSize: 20,
  },
  muted: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.5,
  },
  panel: {
    padding: 18,
    marginBottom: 18,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#fff',
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontWeight: 600,
  },
  select: {
    padding: '10px 12px',
    minWidth: 180,
    maxWidth: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#fff',
    fontSize: 15,
  },
  mapWrapper: {
    height: 'min(65vh, 600px)',
    minHeight: 320,
    marginBottom: 18,
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  primaryButton: {
    padding: '11px 16px',
    border: 0,
    borderRadius: 8,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
  },
  error: {
    color: '#b91c1c',
    lineHeight: 1.5,
  },
};
