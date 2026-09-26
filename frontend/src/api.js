import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: API_BASE_URL,
  // timeout: 80000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.warn('[ORCA API]', err.config?.url, err.message)
    return Promise.reject(err)
  }
)


export const endpoints = {
  health: () => api.get('/api/system-health'),
  sync: () => api.post('/api/sync'),
  nearestMaritime: (lat, lon) => api.get(`/api/location/nearest?lat=${lat}&lon=${lon}`),
  chat: (data) => api.post('/api/chat', data),
  intel: (lat, lon) => api.get(`/api/intel?lat=${lat}&lon=${lon}`),
  safety: (lat, lon, timeOffset = 0) =>
    api.get(`/api/safety?lat=${lat}&lon=${lon}${timeOffset ? `&time_offset=${timeOffset}` : ''}`),
  pfz: (lat, lon) => api.get(`/api/pfz?lat=${lat}&lon=${lon}`),
  ocean: (lat, lon, source = 'all', timeOffset = 0) =>
    api.get(`/api/ocean?lat=${lat}&lon=${lon}&source=${source}${timeOffset ? `&time_offset=${timeOffset}` : ''}`),
  geofence: (lat, lon) => api.get(`/api/geofence?lat=${lat}&lon=${lon}`),
  tides: (lat, lon) => api.get(`/api/tides?lat=${lat}&lon=${lon}`),
  ports: (lat, lon, all = false) =>
    all || (!lat && !lon)
      ? api.get('/api/ports?all=true')
      : api.get(`/api/ports?lat=${lat}&lon=${lon}`),
  depth: (lat, lon) => api.get(`/api/depth?lat=${lat}&lon=${lon}`),
  hazards: (lat, lon) => api.get(`/api/hazards?lat=${lat}&lon=${lon}`),
  route: (startLat, startLon, endLat, endLon, steps = 15, vesselType = 'small_boat', departureTime = null, cruiseSpeed = 14) =>
    api.get(`/api/route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}&steps=${steps}&vessel_type=${vesselType}${departureTime ? `&departure_time=${encodeURIComponent(departureTime)}` : ''}${cruiseSpeed ? `&cruise_speed=${cruiseSpeed}` : ''}`),
  productivity: (region = 'India') => api.get(`/api/productivity?region=${region}`),
  graph: (lat, lon, refresh = false) =>
    api.get(`/api/graph?lat=${lat}&lon=${lon}${refresh ? '&refresh=true' : ''}`),
  bhuvanEcology: (lat, lon, sector) =>
    api.get(`/api/bhuvan/ecology?${lat != null ? `lat=${lat}&lon=${lon}` : ''}${sector ? `&sector=${sector}` : ''}`),
  bulletins: () => api.get('/api/alerts/bulletins'),
  oceanTelemetry: (lat, lon) => api.get(`/api/ocean/telemetry?lat=${lat}&lon=${lon}`),
  oceanValidate: (lat, lon) => api.get(`/api/ocean/validate?lat=${lat}&lon=${lon}`),
  alerts: (lat, lon) => api.get(`/api/alerts?lat=${lat}&lon=${lon}`),
  subscribe: (data) => api.post('/api/subscribe', data),
  subscriptions: (userId = '') => api.get(`/api/subscriptions${userId ? `?user_id=${userId}` : ''}`),
  deleteSubscription: (id) => api.delete(`/api/subscriptions/${id}`),
  seasonalBan: (lat, lon) => api.get(`/api/seasonal-ban?lat=${lat}&lon=${lon}`),
  fleet: () => api.get('/api/fleet'),
  vessels: (lat, lon, radius = 200) => api.get(`/api/vessels?lat=${lat}&lon=${lon}&radius_km=${radius}`),
  charts: (lat, lon) => api.get(`/api/charts?lat=${lat}&lon=${lon}`),
  tsunami: (lat, lon, radius = 1500) => api.get(`/api/tsunami?lat=${lat || 13.0827}&lon=${lon || 80.2707}&radius_km=${radius}`),
  argo: (lat, lon, radius = 800, limit = 100) => api.get(`/api/argo?${lat != null ? `lat=${lat}&lon=${lon}&radius_km=${radius}&` : ''}limit=${limit}`),
  sourcesRegistry: () => api.get('/api/registry/sources'),
  provenance: (tools = '') => api.get(`/api/registry/provenance?tools=${encodeURIComponent(tools)}`),
  spatialReasoning: (params) => api.get('/api/spatial/reasoning', { params }),
  alertsProactive: (lat, lon, vessel = 'small_boat') =>
    api.get(`/api/alerts/proactive?lat=${lat}&lon=${lon}&vessel_type=${vessel}`),
  notificationsActive: (lat, lon, vessel = 'small_boat') =>
    api.get(`/api/notifications/active?lat=${lat}&lon=${lon}&vessel_type=${vessel}`),
  notificationsSimulate: (data) =>
    api.post('/api/notifications/simulate', data),
  transcribeVoice: (formData) => api.post('/api/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export default api
