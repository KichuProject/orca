import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, MapPin, RefreshCw, Layers, Compass, Radio, Check } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import MaritimeZoneHierarchyCard from '../components/geofence/MaritimeZoneHierarchyCard'
import GeofenceMapCanvas from '../components/geofence/GeofenceMapCanvas'
import BreachSimulatorCard from '../components/geofence/BreachSimulatorCard'
import RestrictedZonesList from '../components/geofence/RestrictedZonesList'

export default function GeofencingPage() {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // Query live geofence status
  const { data: geofenceData, isLoading, refetch } = useQuery({
    queryKey: ['geofence-master', lat, lon],
    queryFn: async () => {
      const res = await endpoints.geofence(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  const coastDistKm = geofenceData?.coastline_distance?.distance_to_coast_km ?? 2.2

  // Determine label for current zone using live GIS zones first, then coastline distance
  let activeZoneLabel = 'Territorial Sea (12 nm)'
  const zones = geofenceData?.zones || []
  if (zones.includes('internal_waters')) {
    activeZoneLabel = 'Internal Waters'
  } else if (zones.includes('territorial_sea_12nm')) {
    activeZoneLabel = 'Territorial Sea (12 nm)'
  } else if (zones.includes('contiguous_zone_24nm')) {
    activeZoneLabel = 'Contiguous Zone (24 nm)'
  } else if (zones.includes('india_eez')) {
    activeZoneLabel = 'Exclusive Economic Zone (200 nm)'
  } else if (zones.includes('high_seas')) {
    activeZoneLabel = 'High Seas'
  } else if (coastDistKm <= 2.0) {
    activeZoneLabel = 'Internal Waters'
  } else if (coastDistKm <= 22.2) {
    activeZoneLabel = 'Territorial Sea (12 nm)'
  } else if (coastDistKm <= 44.4) {
    activeZoneLabel = 'Contiguous Zone (24 nm)'
  } else if (coastDistKm <= 370.4) {
    activeZoneLabel = 'Exclusive Economic Zone (200 nm)'
  } else {
    activeZoneLabel = 'High Seas'
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs flex-shrink-0">
            <Shield size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.geofence_title', 'Maritime Geofencing & Sovereign Boundaries') : 'Maritime Geofencing & Sovereign Boundaries'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1">
              <MapPin size={11} className="text-oceanBlue" />
              {t ? t('common.coordinates', 'Monitoring Sector') : 'Monitoring Sector'}: <strong className="text-navy">{t(location.name)}</strong> ({lat.toFixed(4)}°N, {lon.toFixed(4)}°E)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={async () => {
              setIsSyncing(true)
              setJustSynced(false)
              try {
                await refetch()
                setJustSynced(true)
                setTimeout(() => setJustSynced(false), 2500)
              } finally {
                setIsSyncing(false)
              }
            }}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold shadow-2xs transition-all cursor-pointer ${
              justSynced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : isSyncing
                ? 'bg-sky-50 text-oceanBlue border-sky-300 shadow-xs animate-pulse'
                : 'bg-white hover:bg-surface text-navy border-borderLight hover:border-oceanBlue/30'
            }`}
            title="Refresh maritime geofence borders"
          >
            {justSynced ? (
              <Check size={13} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <RefreshCw size={13} className={`flex-shrink-0 ${isSyncing ? 'animate-spin text-oceanBlue' : 'text-textMuted'}`} />
            )}
            <span>
              {justSynced
                ? (t ? t('common.synced', '✓ Synced 100%!') : '✓ Synced 100%!')
                : isSyncing
                ? (t ? t('common.syncing', 'Refreshing...') : 'Refreshing...')
                : (t ? t('common.sync_live', 'Refresh Boundaries') : 'Refresh Boundaries')}
            </span>
          </button>
        </div>
      </div>

      {/* ── 1. UNCLOS 1982 Hierarchy & Active Vessel Fix ──────────── */}
      <MaritimeZoneHierarchyCard
        distanceToCoastKm={coastDistKm}
        activeZone={activeZoneLabel}
        geofenceData={geofenceData}
      />

      {/* ── 2. Boundary Proximity & Breach Simulator ──────────────── */}
      {/* <BreachSimulatorCard
        liveImbl={geofenceData?.imbl_proximity}
        locationName={location.name}
        lat={lat}
        lon={lon}
      /> */}

      {/* ── 3. Interactive Maritime GIS Map & Restricted Sectors ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Boundary GIS Map Canvas */}
        <div className="lg:col-span-7 h-[540px]">
          <GeofenceMapCanvas
            userLat={lat}
            userLon={lon}
            activeZone={activeZoneLabel}
          />
        </div>

        {/* Right (5 cols): Critical Restricted Sectors */}
        <div className="lg:col-span-5">
          <RestrictedZonesList
            userLat={lat}
            userLon={lon}
            locationName={location.name}
          />
        </div>
      </div>
    </div>
  )
}
