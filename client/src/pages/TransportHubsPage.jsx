import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Train,
  Plane,
  MapPin,
  Clock,
  Navigation,
  ArrowLeft,
  Search,
  Map as MapIcon,
  List,
  RefreshCw,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchTransportHubsOSM } from '../services/overpass.js';
import fallbackFacilities from '../data/fallbackFacilities.json';
import { useLanguageStore, useThemeStore } from '../store/useStore.js';

const CITY_CENTRE = [16.9948, 81.7798];

function haversineDistKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const transportMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#4f46e5;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff;font-size:14px;">🚉</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const VERIFIED_TRANSPORT_HUBS = [
  {
    id: 'trn-air-rja',
    osm_id: 'rja-airport',
    name: 'Rajahmundry Domestic Airport (RJA)',
    name_te: 'రాజమండ్రి విమానాశ్రయం (మధురపూడి - RJA)',
    name_hi: 'राजमुंदरी घरेलू हवाई अड्डा (RJA)',
    category: 'transport',
    transport_type: 'flight',
    lat: 17.1104,
    lng: 81.8183,
    address: 'Madhurapudi, Rajahmundry (NH-16 Connectivity)',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-rly-rjy',
    osm_id: 'rjy-station',
    name: 'Rajahmundry Main Railway Station (RJY - Junction)',
    name_te: 'రాజమండ్రి ప్రధాన రైల్వే స్టేషన్ (RJY జంక్షన్)',
    name_hi: 'राजमुंदरी मुख्य रेलवे स्टेशन (RJY)',
    category: 'transport',
    transport_type: 'train',
    lat: 16.9912,
    lng: 81.7824,
    address: 'Railway Station Road, Innespeta, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-rly-gvn',
    osm_id: 'gvn-station',
    name: 'Godavari Railway Station (GVN - Direct Ghat Access)',
    name_te: 'గోదావరి రైల్వే స్టేషన్ (ఘాట్లకు సమీపం - GVN)',
    name_hi: 'गोदावरी रेलवे स्टेशन (घाटों के सबसे पास - GVN)',
    category: 'transport',
    transport_type: 'train',
    lat: 17.0089,
    lng: 81.7772,
    address: 'Kotilingala Ghat Road, Old Town, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-rly-kvvr',
    osm_id: 'kvvr-station',
    name: 'Kovvur Railway Station (West Godavari Pushkar Junction)',
    name_te: 'కొవ్వూరు రైల్వే స్టేషన్ (పశ్చిమ గోదావరి ఘాట్ జంక్షన్)',
    name_hi: 'कोव्वूर रेलवे स्टेशन (पश्चिम गोदावरी)',
    category: 'transport',
    transport_type: 'train',
    lat: 17.0145,
    lng: 81.7348,
    address: 'Station Road, Kovvur (Godavari Arch Bridge Western Bank)',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-bus-rtc',
    osm_id: 'apsrtc-complex',
    name: 'APSRTC Central Bus Station Complex',
    name_te: 'ఏపీఎస్ఆర్టీసీ సెంట్రల్ బస్ స్టేషన్ కాంప్లెక్స్',
    name_hi: 'एपीएसआरटीसी केंद्रीय बस स्टेशन परिसर',
    category: 'transport',
    transport_type: 'bus',
    lat: 17.0035,
    lng: 81.7885,
    address: 'Kotipalli Road, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-bus-ktp',
    osm_id: 'ktp-terminal',
    name: 'Kotipalli Bus Stand & Free Ghat Feeder Terminal',
    name_te: 'కోటిపల్లి బస్ స్టాండ్ & ఉచిత ఘాట్ ఫీడర్ టెర్మినల్',
    name_hi: 'कोटिपल्ली बस स्टैंड एवं निःशुल्क फीडर टर्मिनल',
    category: 'transport',
    transport_type: 'bus',
    lat: 16.9965,
    lng: 81.781,
    address: 'Near Godavari Bund Road, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-bus-mor',
    osm_id: 'morampudi-hub',
    name: 'Morampudi Satellite Inter-City Bus Stand',
    name_te: 'మోరంపూడి శాటిలైట్ అంతర్-నగర బస్ స్టాప్',
    name_hi: 'मोरमपुडी सैटेलाइट इंटर-सिटी बस स्टैंड',
    category: 'transport',
    transport_type: 'bus',
    lat: 16.9812,
    lng: 81.8021,
    address: 'Morampudi Junction, NH-16 Highway, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-bus-arts',
    osm_id: 'arts-college-hub',
    name: 'Govt Arts College Pushkaram Transit Hub',
    name_te: 'ప్రభుత్వ ఆర్ట్స్ కళాశాల పుష్కర రవాణా కేంద్రం',
    name_hi: 'शासकीय आर्ट्स कॉलेज पुष्करम ट्रांजिट हब',
    category: 'transport',
    transport_type: 'bus',
    lat: 17.0092,
    lng: 81.7865,
    address: 'Arts College Grounds, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-ferry-push',
    osm_id: 'pushkar-ferry',
    name: 'Pushkar Ghat Pilgrim Ferry & Boat Jetty',
    name_te: 'పుష్కర్ ఘాట్ తీర్థయాత్రికుల పడవ జెట్టీ',
    name_hi: 'पुष्कर घाट तीर्थयात्री नौका जेट्टी',
    category: 'transport',
    transport_type: 'bus',
    lat: 16.9942,
    lng: 81.7765,
    address: 'Riverfront Steps, Pushkar Ghat, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
  {
    id: 'trn-ferry-srsw',
    osm_id: 'saraswathi-ferry',
    name: 'Saraswathi Ghat River Transit Station',
    name_te: 'సరస్వతి ఘాట్ నదీ రవాణా కేంద్రం',
    name_hi: 'सरस्वती घाट नदी परिवहन केंद्र',
    category: 'transport',
    transport_type: 'bus',
    lat: 17.0018,
    lng: 81.7752,
    address: 'Saraswathi Ghat Promenade, Rajahmundry',
    data_source: 'official_gis',
    is_verified: 1,
    operational_status: 'operational',
  },
];

export default function TransportHubsPage() {
  const navigate = useNavigate();
  const { currentLang } = useLanguageStore();
  const { isDark } = useThemeStore();

  const isTe = (currentLang || 'te').startsWith('te');
  const isHi = (currentLang || 'te').startsWith('hi');

  const bundledTransport = useMemo(() => {
    const list = [...VERIFIED_TRANSPORT_HUBS];
    const existingIds = new Set(list.map((h) => h.id));

    (fallbackFacilities || [])
      .filter((f) => f.category === 'transport')
      .forEach((f) => {
        if (!existingIds.has(f.id)) {
          list.push({
            id: f.id,
            osm_id: f.id,
            name: f.name,
            name_te: f.name_te,
            name_hi: f.name_hi,
            category: 'transport',
            transport_type: f.transport_type || (f.name.includes('Railway') ? 'train' : f.name.includes('Airport') ? 'flight' : 'bus'),
            lat: f.lat,
            lng: f.lng,
            address: f.address,
            data_source: 'official_gis',
            is_verified: 1,
            operational_status: 'operational',
          });
        }
      });
    return list;
  }, []);

  const [hubs, setHubs] = useState(bundledTransport);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'train' | 'bus' | 'flight'
  const [searchTerm, setSearchTerm] = useState('');
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLoc(CITY_CENTRE),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setUserLoc(CITY_CENTRE);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const osmHubs = await fetchTransportHubsOSM();
        if (alive && osmHubs && osmHubs.length > 0) {
          // Merge OSM hubs with bundled, avoiding duplicates by distance < 200m
          const existingCoords = bundledTransport.map((b) => [b.lat, b.lng]);
          const newHubs = osmHubs.filter((osm) => {
            return !existingCoords.some(
              (ec) => haversineDistKm(ec, [osm.lat, osm.lng]) < 0.2
            );
          });
          setHubs([...bundledTransport, ...newHubs]);
        }
      } catch (e) {
        console.warn('OSM transport hubs background refresh note:', e);
      }
    })();
    return () => { alive = false; };
  }, [bundledTransport]);

  const filteredHubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return hubs.filter((h) => {
      const matchSearch =
        !term ||
        h.name?.toLowerCase().includes(term) ||
        h.address?.toLowerCase().includes(term);

      const matchType = typeFilter === 'all' ? true : h.transport_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [hubs, searchTerm, typeFilter]);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#090d16] text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#3730a3] via-[#4f46e5] to-[#4338ca] text-white pt-4 pb-6 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-xs transition"
          >
            <ArrowLeft size={16} />
            <span>{isTe ? 'వెనుకకు' : isHi ? 'पीछे' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-200 text-stone-900 font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {filteredHubs.length} {isTe ? 'కేంద్రాలు' : 'Hubs'}
            </span>
            <div className="flex bg-white/20 p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'list' ? 'bg-white text-indigo-950 shadow-xs' : 'text-white'
                }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'map' ? 'bg-white text-indigo-950 shadow-xs' : 'text-white'
                }`}
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Bus size={22} className="text-indigo-200" />
            <span>
              {isTe
                ? 'రైల్వే, బస్సు & విమానాశ్రయ రవాణా కేంద్రాలు'
                : isHi
                ? 'रेलवे, बस एवं हवाई अड्डा परिवहन केंद्र'
                : 'Railway, Bus & Airport Transport Hubs'}
            </span>
          </h1>
          <p className="text-xs text-indigo-100 mt-1">
            {isTe
              ? 'పుష్కర ప్రత్యేక రైళ్లు, ఆర్టీసీ బస్సులు మరియు షటిల్ పాయింట్లు'
              : 'Official Pushkaram Special Trains, APSRTC Shuttles & Flight Terminals'}
          </p>

          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isTe ? 'రవాణా కేంద్రం పేరు వెతకండి...' : 'Search bus or railway station...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl text-xs sm:text-sm font-medium shadow-inner border border-indigo-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: isTe ? 'అన్నీ' : 'All' },
          { id: 'train', label: isTe ? 'రైల్వే స్టేషన్లు' : 'Railway Stations', icon: Train },
          { id: 'bus', label: isTe ? 'బస్సు స్టేషన్లు' : 'Bus Stations', icon: Bus },
          { id: 'flight', label: isTe ? 'విమానాశ్రయం' : 'Airports', icon: Plane },
        ].map((tab) => {
          const active = typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-2">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-stone-500">
              {isTe ? 'రవాణా కేంద్రాలు లోడ్ అవుతున్నాయి...' : 'Fetching Live OpenStreetMap Transport Hubs...'}
            </p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="rounded-3xl overflow-hidden border border-indigo-200 dark:border-stone-800 shadow-md h-[65vh]">
            <MapContainer
              center={userLoc || CITY_CENTRE}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredHubs.map((h) => (
                <Marker key={h.id} position={[h.lat, h.lng]} icon={transportMarkerIcon}>
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      <h4 className="font-extrabold text-xs text-stone-900">{h.name}</h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">{h.address}</p>
                      <button
                        onClick={() =>
                          navigate(
                            `/navigate/${encodeURIComponent(h.id)}?lat=${h.lat}&lng=${h.lng}&name=${encodeURIComponent(h.name)}`
                          )
                        }
                        className="mt-2 w-full py-1 bg-indigo-600 text-white rounded text-[11px] font-bold"
                      >
                        Navigate
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredHubs.map((item) => {
              const distKm = userLoc ? haversineDistKm(userLoc, [item.lat, item.lng]) : null;
              const isTrain = item.transport_type === 'train';
              const isFlight = item.transport_type === 'flight';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-indigo-100 dark:border-stone-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200">
                            {isTrain ? '🚆 Railway Station' : isFlight ? '✈️ Airport' : '🚌 Bus Terminal'}
                          </span>
                          {distKm != null && (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                              {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-white mt-1.5 line-clamp-1">
                          {isTe && item.name_te ? item.name_te : item.name}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="shrink-0 text-stone-400" />
                        <span className="truncate">{item.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() =>
                        navigate(
                          `/navigate/${encodeURIComponent(item.id)}?lat=${item.lat}&lng=${item.lng}&name=${encodeURIComponent(item.name)}`
                        )
                      }
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                    >
                      <Navigation size={14} />
                      <span>{isTe ? 'రూట్ & నావిగేట్' : isHi ? 'मार्ग व नेविगेट' : 'Navigate Here'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
