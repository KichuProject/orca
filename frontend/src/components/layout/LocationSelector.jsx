import React, { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal, REGION_PRESETS, searchPlaces } from '../../context/GlobalContext'
import { endpoints } from '../../api'
import {
  MapPin, Navigation, Search, Bookmark, BookmarkCheck,
  X, Loader2, Crosshair, Clock, Check, Anchor, Fish, Zap, Sparkles, Lock, Unlock, ChevronDown
} from 'lucide-react'
import { resolvePortName } from '../../i18n/translations'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export default function LocationSelector() {
  const {
    location, updateLocation, gpsStatus,
    savedLocations, saveCurrentLocation, removeSavedLocation,
    hasManualSelection, autoSelectNearest, autoTarget,
    setAutoSelectNearest, snapToNearest, clearManualChoice,
    selectedMaritimeLocation, selectMaritimeLocation, language, t
  } = useGlobal()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('search') // search | manual | saved | presets
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLon, setManualLon] = useState('')
  const [manualErr, setManualErr] = useState('')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)
  const debouncedQuery = useDebounce(query, 400)

  // Focus input on open
  useEffect(() => {
    if (open && tab === 'search') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, tab])

  // Nominatim search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return }
    setSearching(true)
    searchPlaces(debouncedQuery).then(r => { setResults(r); setSearching(false) })
  }, [debouncedQuery])

  // Fetch nearest coast and fishing point for active location
  const { data: nearestData, isLoading: nearestLoading } = useQuery({
    queryKey: ['nearest-maritime-navbar', location.lat, location.lon],
    queryFn: async () => {
      const res = await endpoints.nearestMaritime(location.lat, location.lon)
      return res.data
    },
    staleTime: 30000,
  })

  function requestGPS() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        let name = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'Accept-Language': 'en' }
          })
          const data = await res.json()
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.village || addr.county || ''
          const state = addr.state || ''
          if (city) name = `${city}, ${state}`
        } catch { /* ignore */ }
        updateLocation({ lat, lon, name, source: 'gps' }, true)
        setOpen(false)
      },
      () => {},
      { timeout: 8000 }
    )
  }

  function selectResult(r) {
    updateLocation({ lat: r.lat, lon: r.lon, name: r.name, source: 'search' }, true)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function applyManual() {
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (isNaN(lat) || lat < -90 || lat > 90) { setManualErr('Latitude must be −90 to 90'); return }
    if (isNaN(lon) || lon < -180 || lon > 180) { setManualErr('Longitude must be −180 to 180'); return }
    setManualErr('')
    updateLocation({ lat, lon, name: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`, source: 'manual' }, true)
    setOpen(false)
  }

  function handleSave() {
    saveCurrentLocation()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isAutoCoast = location.source === 'auto_coast'
  const isAutoFishing = location.source === 'auto_fishing'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Compact TopNav Location Pill ────────────────────────── */}
      <button
        id="location-dropdown-trigger"
        onClick={() => setDropdownOpen(prev => !prev)}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer select-none group shadow-2xs ${
          dropdownOpen
            ? 'bg-blue-50 border-oceanBlue text-oceanBlue ring-2 ring-blue-100 shadow-xs'
            : 'bg-surface/80 hover:bg-surface border-borderLight text-navy hover:text-oceanBlue'
        }`}
        title="Current Location & Maritime Targets — Click to view details"
        aria-haspopup="dialog"
        aria-expanded={dropdownOpen}
      >
        <div className="relative flex items-center justify-center flex-shrink-0 text-oceanBlue">
          <MapPin size={15} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-safeGreen ring-1 ring-white animate-pulse" />
        </div>
        <div className="text-left flex flex-col justify-center min-w-0">
          <span className="truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px] font-bold leading-tight">
            {resolvePortName(location.name, language)}
          </span>
          <span className="text-[9px] text-textMuted font-mono font-normal leading-none mt-0.5 hidden sm:inline">
            {location.lat?.toFixed(2)}°N, {location.lon?.toFixed(2)}°E
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-textMuted transition-transform duration-150 flex-shrink-0 ${
            dropdownOpen ? 'rotate-180 text-oceanBlue' : 'group-hover:text-navy'
          }`}
        />
      </button>

      {/* ── Dropdown Popover (Embedded Maritime Details) ─────────── */}
      {dropdownOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-11 w-84 sm:w-96 bg-white/98 backdrop-blur-md rounded-3xl shadow-2xl border border-borderLight p-4 z-50 animate-slideIn space-y-3.5">
          {/* Header / Active Location Card */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-borderLight">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-oceanBlue flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                  {t('Current Location')}
                </div>
                <h4 className="text-sm font-bold text-navy truncate leading-snug">
                  {resolvePortName(location.name, language)}
                </h4>
                <div className="text-[10px] text-oceanBlue font-mono font-semibold mt-0.5">
                  {location.lat?.toFixed(4)}°N, {location.lon?.toFixed(4)}°E
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={requestGPS}
                className="p-1.5 rounded-xl bg-oceanBlue/10 hover:bg-oceanBlue/20 text-oceanBlue transition-colors cursor-pointer"
                title="Refresh GPS location"
              >
                <Navigation size={13} />
              </button>
              <button
                onClick={handleSave}
                className="p-1.5 rounded-xl bg-surface hover:bg-surfaceMid text-textSecond transition-colors cursor-pointer"
                title="Save current location"
              >
                {saved ? <Check size={13} className="text-safeGreen" /> : <Bookmark size={13} />}
              </button>
            </div>
          </div>

          {/* Nearest Maritime Target Cards */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider flex items-center justify-between">
              <span>{t('Nearest Maritime Targets')}</span>
              {selectedMaritimeLocation && (
                <span className="text-[9.5px] text-teal-700 font-semibold lowercase">
                  ({t('Active')}: {selectedMaritimeLocation.type})
                </span>
              )}
            </div>

            {nearestLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-textMuted bg-slate-50 rounded-2xl">
                <Loader2 size={14} className="animate-spin text-oceanBlue" />
                <span>{t('Scanning coastal telemetry...')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {/* Nearest Coast Card */}
                {nearestData?.nearest_coast && (
                  <div
                    onClick={() => {
                      selectMaritimeLocation({
                        type: 'coast',
                        name: nearestData.nearest_coast.name,
                        lat: nearestData.nearest_coast.lat,
                        lon: nearestData.nearest_coast.lon,
                        distance_km: nearestData.nearest_coast.distance_km,
                        direction: nearestData.nearest_coast.direction,
                      })
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      selectedMaritimeLocation?.type === 'coast'
                        ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-300 shadow-xs'
                        : 'bg-teal-50/40 hover:bg-teal-50/80 border-teal-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center flex-shrink-0">
                        <Anchor size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9.5px] font-bold text-teal-800 uppercase flex items-center gap-1 leading-none">
                          <span>{t('Nearest Coast')}</span>
                          {selectedMaritimeLocation?.type === 'coast' && (
                            <span className="text-[8px] bg-teal-600 text-white px-1 rounded-full font-bold">✓</span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-navy truncate mt-0.5">
                          {resolvePortName(nearestData.nearest_coast.name, language)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-[11px] font-mono font-extrabold text-teal-900 bg-teal-200/60 px-1.5 py-0.5 rounded-md">
                        {nearestData.nearest_coast.distance_km} km
                      </span>
                      {nearestData.nearest_coast.direction && (
                        <span className="text-[9px] text-teal-700 font-semibold mt-0.5 font-mono">
                          {nearestData.nearest_coast.direction}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Nearest PFZ Card */}
                {nearestData?.nearest_fishing_point && (
                  <div
                    onClick={() => {
                      selectMaritimeLocation({
                        type: 'fishing',
                        name: nearestData.nearest_fishing_point.name,
                        lat: nearestData.nearest_fishing_point.lat,
                        lon: nearestData.nearest_fishing_point.lon,
                        distance_km: nearestData.nearest_fishing_point.distance_km,
                        direction: nearestData.nearest_fishing_point.direction,
                        depth_fathom: nearestData.nearest_fishing_point.depth_fathom,
                      })
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      selectedMaritimeLocation?.type === 'fishing'
                        ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300 shadow-xs'
                        : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <Fish size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9.5px] font-bold text-amber-800 uppercase flex items-center gap-1 leading-none">
                          <span>{t('Nearest PFZ')}</span>
                          {selectedMaritimeLocation?.type === 'fishing' && (
                            <span className="text-[8px] bg-amber-600 text-white px-1 rounded-full font-bold">✓</span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-navy truncate mt-0.5">
                          {resolvePortName(nearestData.nearest_fishing_point.name, language)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-[11px] font-mono font-extrabold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded-md">
                        {nearestData.nearest_fishing_point.distance_km} km
                      </span>
                      {nearestData.nearest_fishing_point.depth_fathom && (
                        <span className="text-[9px] text-amber-700 font-semibold mt-0.5 font-mono">
                          {nearestData.nearest_fishing_point.depth_fathom} fathoms
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-borderLight flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setDropdownOpen(false)
                setOpen(true)
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-oceanBlue hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Search size={13} />
              <span>{t('Change Location / Search Ports')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Dialog with Backdrop (never clipped!) ──────── */}
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm fade-in">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-borderLight overflow-hidden flex flex-col max-h-[90vh] animate-slideIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-borderLight">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-oceanBlue/10 flex items-center justify-center text-oceanBlue">
                  <MapPin size={15} />
                </div>
                <h3 className="text-base font-bold text-navy">{t('Set Your Maritime Location')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* GPS button */}
                <button
                  onClick={requestGPS}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-oceanBlue/10 text-oceanBlue hover:bg-oceanBlue/20 transition-colors"
                  title="Detect GPS location"
                >
                  <Navigation size={12} />
                  {t('GPS')}
                </button>
                {/* Save current */}
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-surface hover:bg-surfaceMid text-textSecond transition-colors"
                  title="Save current location"
                >
                  {saved ? <Check size={12} className="text-safeGreen" /> : <Bookmark size={12} />}
                  {saved ? t('Saved') : t('Save')}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-surfaceMid text-textMuted hover:text-navy transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Nearest Maritime Point (Separate Target Location) ── */}
            <div className="bg-slate-50/80 border-b border-borderLight p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                  <Zap size={14} className="text-oceanBlue" />
                  <span>{t('Nearest Maritime Point (Separate Location)')}</span>
                </div>
                {selectedMaritimeLocation ? (
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 flex items-center gap-1">
                    <Check size={9} /> {t('Selected')}: {selectedMaritimeLocation.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                    {t('Live Distance')}
                  </span>
                )}
              </div>

              {/* Selection Buttons for Coast & Fishing (Does NOT overwrite Current Location) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Nearest Coast Button */}
                <button
                  onClick={() => {
                    if (nearestData?.nearest_coast) {
                      selectMaritimeLocation({
                        type: 'coast',
                        name: nearestData.nearest_coast.name,
                        lat: nearestData.nearest_coast.lat,
                        lon: nearestData.nearest_coast.lon,
                        distance_km: nearestData.nearest_coast.distance_km,
                        direction: nearestData.nearest_coast.direction,
                      })
                    }
                    setOpen(false)
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer group shadow-2xs ${
                    selectedMaritimeLocation?.type === 'coast'
                      ? 'border-teal-400 bg-teal-100/70 ring-1 ring-teal-400'
                      : 'border-teal-200 bg-teal-50/60 hover:bg-teal-100/70'
                  }`}
                  title="Click to select nearest coast as separate target destination"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-teal-800">
                    <span className="flex items-center gap-1">⚓ {t('Nearest Coast')}</span>
                    <span className="font-mono text-[9px]">
                      {nearestData?.nearest_coast ? `${nearestData.nearest_coast.distance_km} km` : '...'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-navy truncate mt-1">
                    {nearestData?.nearest_coast?.name ? resolvePortName(nearestData.nearest_coast.name, language) : t('Detecting port...')}
                  </div>
                  <div className="text-[9px] text-teal-700 font-semibold mt-1 flex items-center justify-between">
                    <span>{t('Select Coast Target')}</span>
                    {selectedMaritimeLocation?.type === 'coast' && (
                      <span className="bg-teal-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">{t('Active')}</span>
                    )}
                  </div>
                </button>

                {/* Nearest Fishing Point Button */}
                <button
                  onClick={() => {
                    if (nearestData?.nearest_fishing_point) {
                      selectMaritimeLocation({
                        type: 'fishing',
                        name: nearestData.nearest_fishing_point.name,
                        lat: nearestData.nearest_fishing_point.lat,
                        lon: nearestData.nearest_fishing_point.lon,
                        distance_km: nearestData.nearest_fishing_point.distance_km,
                        direction: nearestData.nearest_fishing_point.direction,
                        depth_fathom: nearestData.nearest_fishing_point.depth_fathom,
                      })
                    }
                    setOpen(false)
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer group shadow-2xs ${
                    selectedMaritimeLocation?.type === 'fishing'
                      ? 'border-amber-400 bg-amber-100/70 ring-1 ring-amber-400'
                      : 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/70'
                  }`}
                  title="Click to select nearest INCOIS PFZ as separate target destination"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                    <span className="flex items-center gap-1">🐟 {t('Nearest PFZ')}</span>
                    <span className="font-mono text-[9px]">
                      {nearestData?.nearest_fishing_point ? `${nearestData.nearest_fishing_point.distance_km} km` : '...'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-navy truncate mt-1">
                    {nearestData?.nearest_fishing_point?.name ? resolvePortName(nearestData.nearest_fishing_point.name, language) : t('Detecting PFZ...')}
                  </div>
                  <div className="text-[9px] text-amber-700 font-semibold mt-1 flex items-center justify-between">
                    <span>{t('Select PFZ Target')}</span>
                    {selectedMaritimeLocation?.type === 'fishing' && (
                      <span className="bg-amber-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">{t('Active')}</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Behavior subtext */}
              <div className="text-[10px] text-textMuted pt-0.5">
                {t('Current Location remains your base position. Selecting a coast or PFZ sets it as a separate target location.')}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-borderLight bg-surface px-2">
              {[
                { id: 'search',  label: 'Search Place' },
                { id: 'manual',  label: 'Coordinates' },
                { id: 'presets', label: 'Indian Ports' },
                { id: 'saved',   label: 'Saved', count: savedLocations.length },
              ].map(tabItem => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 text-center ${
                    tab === tabItem.id
                      ? 'text-oceanBlue border-oceanBlue bg-white rounded-t-lg'
                      : 'text-textMuted border-transparent hover:text-navy'
                  }`}
                >
                  {t(tabItem.label)}{tabItem.count ? ` (${tabItem.count})` : ''}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="p-4 overflow-y-auto max-h-72 flex-1">
              {/* SEARCH TAB */}
              {tab === 'search' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={t('Search port, beach, city or coastal region...')}
                      className="w-full pl-9 pr-8 py-2.5 text-sm rounded-2xl border border-borderLight bg-surface focus:outline-none focus:border-oceanBlue focus:bg-white transition-colors shadow-inner"
                    />
                    {searching && (
                      <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-oceanBlue animate-spin" />
                    )}
                  </div>

                  {results.length > 0 && (
                    <div className="space-y-1 divide-y divide-borderLight/60">
                      {results.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => selectResult(r)}
                          className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-blue-50/60 transition-colors group cursor-pointer"
                        >
                          <MapPin size={14} className="text-textMuted group-hover:text-oceanBlue mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-navy group-hover:text-oceanBlue truncate">{resolvePortName(r.name, language)}</div>
                            <div className="text-[11px] text-textMuted truncate">{t(r.full)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {query.length >= 2 && !searching && results.length === 0 && (
                    <div className="py-8 text-center text-xs text-textMuted">
                      {t('No matching coastal locations found. Try entering coordinates directly.')}
                    </div>
                  )}

                  {!query && (
                    <div className="py-4 text-center text-xs text-textMuted">
                      {t('Type at least 2 characters to search Indian coastal locations and ports.')}
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL COORD TAB */}
              {tab === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">{t('Latitude (°N)')}</label>
                    <input
                      value={manualLat}
                      onChange={e => setManualLat(e.target.value)}
                      placeholder="e.g. 13.0827"
                      type="number"
                      step="0.0001"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-borderLight bg-surface focus:outline-none focus:border-oceanBlue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">{t('Longitude (°E)')}</label>
                    <input
                      value={manualLon}
                      onChange={e => setManualLon(e.target.value)}
                      placeholder="e.g. 80.2707"
                      type="number"
                      step="0.0001"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-borderLight bg-surface focus:outline-none focus:border-oceanBlue"
                    />
                  </div>
                  {manualErr && <p className="text-xs text-dangerRed font-medium">{manualErr}</p>}
                  <button
                    onClick={applyManual}
                    className="w-full py-2.5 rounded-xl bg-oceanBlue text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    {t('Apply Coordinates')}
                  </button>
                </div>
              )}

              {/* PORTS PRESETS TAB */}
              {tab === 'presets' && (
                <div className="grid grid-cols-2 gap-2">
                  {REGION_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => {
                        updateLocation({ lat: p.lat, lon: p.lon, name: `${p.label}, ${p.state}`, source: 'preset' }, true)
                        setOpen(false)
                      }}
                      className="flex items-start gap-2 p-2.5 rounded-xl border border-borderLight bg-surface hover:bg-blue-50/70 hover:border-oceanBlue/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-lg bg-oceanBlue/10 flex items-center justify-center flex-shrink-0 text-oceanBlue mt-0.5">
                        <MapPin size={11} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-navy group-hover:text-oceanBlue">{resolvePortName(p.label, language)}</div>
                        <div className="text-[10px] text-textMuted truncate">{t(p.state)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* SAVED TAB */}
              {tab === 'saved' && (
                savedLocations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-textMuted">
                    {t('No saved locations yet. Click "Save" in the top-right to bookmark locations.')}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {savedLocations.map((loc, i) => (
                      <div key={i} className="flex items-center gap-2 group p-1 hover:bg-surfaceMid rounded-xl transition-colors">
                        <button
                          onClick={() => { updateLocation(loc, true); setOpen(false) }}
                          className="flex-1 flex items-start gap-2 text-left cursor-pointer p-1"
                        >
                          <MapPin size={13} className="text-oceanBlue mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-navy truncate">{resolvePortName(loc.name, language)}</div>
                            <div className="text-[10px] text-textMuted font-mono">{loc.lat?.toFixed(4)}° N, {loc.lon?.toFixed(4)}° E</div>
                          </div>
                        </button>
                        <button
                          onClick={() => removeSavedLocation(i)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-textMuted hover:text-dangerRed hover:bg-dangerLight transition-all cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-borderLight bg-surface flex items-center justify-between text-[11px] text-textMuted">
              <span>{t('Active:')} <strong className="text-navy">{resolvePortName(location.name, language)}</strong></span>
              <span className="capitalize font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                {t('Mode:')} {hasManualSelection ? t('User Fixed') : t('Auto Nearest')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
