import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getTranslation, LANGUAGES } from '../i18n/translations'

const GlobalContext = createContext(null)

export { LANGUAGES }

// ─── Constants ──────────────────────────────────────────────────
export const VESSEL_PROFILES = {
  small_boat: {
    label: 'Small Boat', icon: '⛵',
    limits: { wave: 1.0, wind: 20, depth: 5 },
    color: 'text-safeGreen',
  },
  fishing_trawler: {
    label: 'Fishing Trawler', icon: '🚢',
    limits: { wave: 1.5, wind: 30, depth: 10 },
    color: 'text-oceanBlue',
  },
  passenger_vessel: {
    label: 'Passenger Ferry', icon: '⛴️',
    limits: { wave: 1.5, wind: 25, depth: 8 },
    color: 'text-cyan-400',
  },
  cargo_vessel: {
    label: 'Cargo Vessel', icon: '🛳️',
    limits: { wave: 2.5, wind: 40, depth: 15 },
    color: 'text-textSecond',
  },
  research_vessel: {
    label: 'Research Vessel', icon: '🔬',
    limits: { wave: 2.0, wind: 35, depth: 12 },
    color: 'text-saffron',
  },
}

export const TIME_PRESETS = [
  { label: 'Now',      value: 0,  icon: '🕐' },
  { label: '+6h',      value: 6,  icon: '⏩' },
  { label: 'Tomorrow', value: 24, icon: '🌅' },
  { label: '+48h',     value: 48, icon: '📅' },
]

export const REGION_PRESETS = [
  { label: 'Chennai',       lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { label: 'Kochi',         lat: 9.9312,  lon: 76.2673, state: 'Kerala' },
  { label: 'Paradip',       lat: 20.3167, lon: 86.6167, state: 'Odisha' },
  { label: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh' },
  { label: 'Kandla',        lat: 23.0333, lon: 70.2167, state: 'Gujarat' },
  { label: 'Mumbai',        lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { label: 'Tuticorin',     lat: 8.7642,  lon: 78.1348, state: 'Tamil Nadu' },
  { label: 'Mangalore',     lat: 12.9141, lon: 74.8560, state: 'Karnataka' },
]

import { endpoints } from '../api'

const LS_SAVED_LOCATIONS = 'orca_saved_locations'
const LS_LANGUAGE = 'orca_language'
const LS_AUTO_SELECT_NEAREST = 'orca_auto_select_nearest'
const LS_AUTO_TARGET = 'orca_auto_target'
const LS_MANUAL_LOCATION_SET = 'orca_manual_location_chosen'
const LS_ACTIVE_LOCATION = 'orca_active_location'

function loadSavedLocations() {
  try {
    return JSON.parse(
      localStorage.getItem(LS_SAVED_LOCATIONS) ||
      localStorage.getItem('ocra_saved_locations') ||
      '[]'
    )
  }
  catch { return [] }
}

function saveSavedLocations(locs) {
  try { localStorage.setItem(LS_SAVED_LOCATIONS, JSON.stringify(locs.slice(0, 10))) }
  catch { /* ignore */ }
}

// ─── Nominatim reverse geocode ──────────────────────────────────
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.village || addr.county || ''
    const state = addr.state || ''
    return city ? `${city}, ${state}` : (state || `${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E`)
  } catch {
    return `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`
  }
}

// ─── Nominatim forward search ────────────────────────────────────
export async function searchPlaces(query) {
  if (!query || query.length < 2) return []
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=in&addressdetails=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    return data.map(r => ({
      name: r.display_name.split(',').slice(0, 2).join(',').trim(),
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      full: r.display_name,
    }))
  } catch {
    return []
  }
}

// ─── Provider ────────────────────────────────────────────────────
export function GlobalProvider({ children }) {
  const [hasManualSelection, setHasManualSelection] = useState(() => {
    try { return localStorage.getItem(LS_MANUAL_LOCATION_SET) === 'true' }
    catch { return false }
  })

  const [autoSelectNearest, setAutoSelectNearestState] = useState(() => {
    try { return localStorage.getItem(LS_AUTO_SELECT_NEAREST) === 'true' }
    catch { return false }
  })

  const [autoTarget, setAutoTargetState] = useState(() => {
    try { return localStorage.getItem(LS_AUTO_TARGET) || 'coast' }
    catch { return 'coast' }
  })

  const [location, _setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_ACTIVE_LOCATION)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      lat: 13.0827, lon: 80.2707,
      name: 'Chennai, Tamil Nadu',
      source: 'preset',
      isManual: false,
    }
  })

  const [gpsStatus, setGpsStatus] = useState('idle') // idle | requesting | success | denied | error
  const [timeOffset, setTimeOffset] = useState(0)
  const [vessel, setVessel] = useState('fishing_trawler')
  const [language, setLanguage] = useState(() => localStorage.getItem(LS_LANGUAGE) || 'en')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [alertCount, setAlertCount] = useState(0)
  const [savedLocations, setSavedLocations] = useState(loadSavedLocations)
  const [activeSpatialOverlay, setActiveSpatialOverlay] = useState(null)
  const gpsAttempted = useRef(false)

  // ── Alert Read/Seen & Dismiss Tracking ─────────────────────────
  const LS_SEEN_ALERT_IDS = 'orca_seen_alert_ids'
  const LS_DISMISSED_ALERT_IDS = 'orca_dismissed_alert_ids'

  const [seenAlertIds, setSeenAlertIds] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_SEEN_ALERT_IDS)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_DISMISSED_ALERT_IDS) || localStorage.getItem('orca_dismissed_alerts')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const markAlertsAsSeen = useCallback((ids) => {
    setSeenAlertIds(prev => {
      const next = new Set(prev)
      if (Array.isArray(ids)) {
        ids.forEach(id => { if (id) next.add(id) })
      } else if (typeof ids === 'string' && ids) {
        next.add(ids)
      }
      try {
        localStorage.setItem(LS_SEEN_ALERT_IDS, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  const markAlertAsUnseen = useCallback((id) => {
    if (!id) return
    setSeenAlertIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      try {
        localStorage.setItem(LS_SEEN_ALERT_IDS, JSON.stringify([...next]))
      } catch {}
      return next
    })
    setDismissedAlertIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      try {
        localStorage.setItem(LS_DISMISSED_ALERT_IDS, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  const dismissAlert = useCallback((id) => {
    if (!id) return
    setDismissedAlertIds(prev => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(LS_DISMISSED_ALERT_IDS, JSON.stringify([...next]))
        localStorage.setItem('orca_dismissed_alerts', JSON.stringify([...next]))
      } catch {}
      return next
    })
    markAlertsAsSeen(id)
  }, [markAlertsAsSeen])

  // ── Separate Selected Maritime Point (Coast or PFZ) ───────────
  const LS_SELECTED_MARITIME = 'orca_selected_maritime_location'
  const [selectedMaritimeLocation, _setSelectedMaritimeLocation] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_SELECTED_MARITIME) || localStorage.getItem('ocra_selected_maritime_location')
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  })

  const selectMaritimeLocation = useCallback((point) => {
    _setSelectedMaritimeLocation(point)
    try {
      if (point) {
        localStorage.setItem(LS_SELECTED_MARITIME, JSON.stringify(point))
      } else {
        localStorage.removeItem(LS_SELECTED_MARITIME)
      }
    } catch {}
  }, [])

  const updateLocation = useCallback((loc, isUserWish = true) => {
    const updated = { ...loc, isManual: isUserWish }
    _setLocation(updated)
    try {
      localStorage.setItem(LS_ACTIVE_LOCATION, JSON.stringify(updated))
      if (isUserWish) {
        localStorage.setItem(LS_MANUAL_LOCATION_SET, 'true')
        setHasManualSelection(true)
      }
    } catch {}
  }, [])

  const setAutoSelectNearest = useCallback((enabled, target = autoTarget) => {
    setAutoSelectNearestState(enabled)
    setAutoTargetState(target)
    try {
      localStorage.setItem(LS_AUTO_SELECT_NEAREST, enabled ? 'true' : 'false')
      localStorage.setItem(LS_AUTO_TARGET, target)
    } catch {}
  }, [autoTarget])

  // snapToNearest sets the separate maritime location — NEVER changes current location!
  const snapToNearest = useCallback(async (targetType = autoTarget) => {
    try {
      const currentLat = location.lat ?? 13.0827
      const currentLon = location.lon ?? 80.2707
      const res = await endpoints.nearestMaritime(currentLat, currentLon)
      const data = res.data

      if (targetType === 'fishing' && data?.nearest_fishing_point) {
        const p = data.nearest_fishing_point
        selectMaritimeLocation({
          type: 'fishing',
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          distance_km: p.distance_km,
          direction: p.direction,
          depth_fathom: p.depth_fathom,
        })
      } else if (data?.nearest_coast) {
        const p = data.nearest_coast
        selectMaritimeLocation({
          type: 'coast',
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          distance_km: p.distance_km,
          direction: p.direction,
        })
      }
    } catch (e) {
      console.warn('Failed to set nearest maritime location:', e)
    }
  }, [autoTarget, location.lat, location.lon, selectMaritimeLocation])

  const clearManualChoice = useCallback(() => {
    setHasManualSelection(false)
    try { localStorage.removeItem(LS_MANUAL_LOCATION_SET) } catch {}
  }, [])

  // ── Auto-GPS on first mount ──────────────────────────────────
  useEffect(() => {
    if (gpsAttempted.current) return
    gpsAttempted.current = true
    if (!navigator.geolocation) { setGpsStatus('error'); return }
    setGpsStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setGpsStatus('success')

        // If user already specified their preferred home location, preserve it
        const userHasManual = localStorage.getItem(LS_MANUAL_LOCATION_SET) === 'true'
        let baseLat = lat
        let baseLon = lon

        if (!userHasManual) {
          const name = await reverseGeocode(lat, lon)
          updateLocation({ lat, lon, name, source: 'gps', isManual: false }, false)
        } else {
          baseLat = location.lat ?? lat
          baseLon = location.lon ?? lon
        }

        // Auto-populate the separate nearest maritime location from current position
        try {
          const res = await endpoints.nearestMaritime(baseLat, baseLon)
          const data = res.data
          const savedTarget = localStorage.getItem(LS_AUTO_TARGET) || 'coast'
          if (savedTarget === 'fishing' && data?.nearest_fishing_point) {
            const p = data.nearest_fishing_point
            selectMaritimeLocation({
              type: 'fishing',
              name: p.name,
              lat: p.lat,
              lon: p.lon,
              distance_km: p.distance_km,
              direction: p.direction,
              depth_fathom: p.depth_fathom,
            })
          } else if (data?.nearest_coast) {
            const p = data.nearest_coast
            selectMaritimeLocation({
              type: 'coast',
              name: p.name,
              lat: p.lat,
              lon: p.lon,
              distance_km: p.distance_km,
              direction: p.direction,
            })
          }
        } catch {}
      },
      () => setGpsStatus('denied'),
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [location.lat, location.lon, selectMaritimeLocation, updateLocation])

  // ── Persist language ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LS_LANGUAGE, language)
  }, [language])

  const saveCurrentLocation = useCallback(() => {
    const existing = loadSavedLocations()
    const already = existing.some(l => Math.abs(l.lat - location.lat) < 0.01)
    if (already) return
    const updated = [{ ...location, savedAt: Date.now() }, ...existing]
    saveSavedLocations(updated)
    setSavedLocations(updated)
  }, [location])

  const removeSavedLocation = useCallback((idx) => {
    const updated = loadSavedLocations().filter((_, i) => i !== idx)
    saveSavedLocations(updated)
    setSavedLocations(updated)
  }, [])

  // ── In-memory Chat State (Preserved across page navigation, reset on page refresh) ──
  const [chatMessages, setChatMessages] = useState(null)

  const resetChat = useCallback(() => {
    setChatMessages(null)
  }, [])

  // Explicitly clear any legacy localStorage key so refresh always starts fresh
  useEffect(() => {
    try {
      localStorage.removeItem('orca_chat_messages')
      localStorage.removeItem('ocra_chat_messages')
    } catch (e) {}
  }, [])

  const t = useCallback((key, fallback) => {
    return getTranslation(key, language, fallback)
  }, [language])

  return (
    <GlobalContext.Provider value={{
      // location
      location, updateLocation, gpsStatus,
      savedLocations, saveCurrentLocation, removeSavedLocation,
      hasManualSelection, autoSelectNearest, autoTarget,
      setAutoSelectNearest, snapToNearest, clearManualChoice,
      selectedMaritimeLocation, selectMaritimeLocation,
      // time
      timeOffset, setTimeOffset,
      // vessel
      vessel, setVessel,
      // ui & i18n
      language, setLanguage,
      t, LANGUAGES,
      sidebarOpen, setSidebarOpen,
      alertCount, setAlertCount,
      // alert seen & dismissed tracking
      seenAlertIds, dismissedAlertIds,
      markAlertsAsSeen, markAlertAsUnseen, dismissAlert,
      // chat (in-memory SPA session)
      chatMessages, setChatMessages, resetChat,
      // spatial reasoning map overlay
      activeSpatialOverlay, setActiveSpatialOverlay,
    }}>
      {children}
    </GlobalContext.Provider>
  )
}

export function useGlobal() {
  const ctx = useContext(GlobalContext)
  if (!ctx) throw new Error('useGlobal must be used inside GlobalProvider')
  return ctx
}
