import { DEFAULT_COORDINATES } from '../constants/config';

let cachedCoordinates = {
  latitude: DEFAULT_COORDINATES.latitude,
  longitude: DEFAULT_COORDINATES.longitude,
  source: 'default',
  name: DEFAULT_COORDINATES.name,
  isLiveGps: false,
};

let listeners = [];

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn({ ...cachedCoordinates });
    } catch (e) {
      console.warn('Location listener error:', e);
    }
  });
}

function getNativeLocationModule() {
  try {
    const Location = require('expo-location');
    return Location;
  } catch (err) {
    console.log('[ORCA Location] expo-location native module not available in current binary:', err?.message || err);
    return null;
  }
}

/**
 * Checks if a natural language question indicates a location-sensitive intent.
 */
export function isLocationQuery(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const keywords = [
    'near me',
    'nearest',
    'around here',
    'my location',
    'current location',
    'closest',
    'here',
    'nearby',
    'from my port',
    'coordinates',
    'latitude',
    'longitude',
    'where am i',
    'live location',
  ];
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Returns the currently active coordinates.
 */
export async function getCoordinates() {
  return { ...cachedCoordinates };
}

/**
 * Fallback to IP-based live location if hardware GPS native module is absent or permissions are not yet granted.
 */
async function fetchIpLocation() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('http://ip-api.com/json', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && data.lat && data.lon) {
        return {
          latitude: Number(data.lat.toFixed(4)),
          longitude: Number(data.lon.toFixed(4)),
          source: 'ip-geo',
          name: `${data.city || 'Coastal Base'}, ${data.regionName || data.country || 'IN'}`,
          isLiveGps: true,
        };
      }
    }
  } catch (err) {
    // try secondary IP geo
    try {
      const res2 = await fetch('https://ipapi.co/json/');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.latitude && data2.longitude) {
          return {
            latitude: Number(data2.latitude.toFixed(4)),
            longitude: Number(data2.longitude.toFixed(4)),
            source: 'ip-geo',
            name: `${data2.city || 'Coastal Port'}, ${data2.region || data2.country_name || 'IN'}`,
            isLiveGps: true,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Requests GPS permission and acquires real-time device coordinates.
 * Falls back to IP geolocation seamlessly if native GPS module is pending APK rebuild.
 * @returns {Promise<{ latitude: number, longitude: number, source: string, name: string, isLiveGps: boolean }>}
 */
export async function requestLiveLocation() {
  const Location = getNativeLocationModule();

  if (Location) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy ? Location.Accuracy.Balanced : 3,
        });

        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));

        let placeName = `${lat >= 0 ? lat + '°N' : Math.abs(lat) + '°S'}, ${
          lon >= 0 ? lon + '°E' : Math.abs(lon) + '°W'
        }`;

        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (rev && rev[0]) {
            const p = rev[0];
            const city = p.city || p.subregion || p.district || p.name || '';
            const region = p.region || p.country || '';
            placeName = city ? `${city}, ${region}` : placeName;
          }
        } catch {
          // Reverse geocode is best-effort
        }

        cachedCoordinates = {
          latitude: lat,
          longitude: lon,
          source: 'gps',
          name: placeName,
          isLiveGps: true,
        };

        notifyListeners();
        return { ...cachedCoordinates };
      }
    } catch (err) {
      console.warn('[ORCA Location] Native GPS lookup encountered error, falling back to IP geo:', err?.message || err);
    }
  }

  // Fallback to IP geolocation
  const ipLoc = await fetchIpLocation();
  if (ipLoc) {
    cachedCoordinates = ipLoc;
    notifyListeners();
    return { ...cachedCoordinates };
  }

  return { ...cachedCoordinates };
}

/**
 * Manually updates the target marine operational sector or vessel GPS coordinate.
 */
export function setCoordinates(latitude, longitude, name = 'Custom Vessel GPS') {
  cachedCoordinates = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    source: 'manual',
    name,
    isLiveGps: false,
  };
  notifyListeners();
}

/**
 * Subscribes to live location updates.
 */
export function subscribeLocation(callback) {
  listeners.push(callback);
  callback({ ...cachedCoordinates });
  return () => {
    listeners = listeners.filter((fn) => fn !== callback);
  };
}

export default {
  isLocationQuery,
  getCoordinates,
  requestLiveLocation,
  setCoordinates,
  subscribeLocation,
};
