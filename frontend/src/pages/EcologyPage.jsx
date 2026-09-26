import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Leaf, MapPin, RefreshCw, ShieldCheck, Compass, Layers, ExternalLink, Check } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import EcoStatusBanner from '../components/ecology/EcoStatusBanner'
import BhuvanEcologyCard from '../components/ecology/BhuvanEcologyCard'
import CoralBleachingGauge from '../components/ecology/CoralBleachingGauge'
import EndangeredSpeciesRegistry from '../components/ecology/EndangeredSpeciesRegistry'
import MarineSanctuariesDirectory from '../components/ecology/MarineSanctuariesDirectory'
import OceanBiochemistryCard from '../components/ocean/OceanBiochemistryCard'
import MapCanvas from '../components/map/MapCanvas'

export default function EcologyPage() {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // 1. Query Geofence & Eco-restriction API
  const { data: geofenceData, isLoading: geofenceLoading, refetch: refetchGeofence } = useQuery({
    queryKey: ['geofence-eco', lat, lon],
    queryFn: async () => {
      const res = await endpoints.geofence(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  // 2. Query Oceanographic Data for Coral Bleaching SST
  const { data: oceanData, isLoading: oceanLoading } = useQuery({
    queryKey: ['ocean-eco', lat, lon],
    queryFn: async () => {
      const res = await endpoints.ocean(lat, lon, 'all')
      return res.data
    },
    staleTime: 300000,
  })

  // 3. Query ISRO Bhuvan LULC Coastal Ecology API
  const { data: bhuvanData, isLoading: bhuvanLoading, refetch: refetchBhuvan } = useQuery({
    queryKey: ['bhuvan-eco', lat, lon],
    queryFn: async () => {
      const res = await endpoints.bhuvanEcology(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  const sst = oceanData?.isro?.sst_c ?? 28.9

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-safeGreen flex items-center justify-center shadow-xs flex-shrink-0">
            <Leaf size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.ecology_title', 'Marine Ecology & Marine Protected Areas (MPA) Surveillance') : 'Marine Ecology & Marine Protected Areas (MPA) Surveillance'}
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
                await Promise.allSettled([refetchGeofence(), refetchBhuvan()])
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
            title="Refresh ecological zoning models"
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
                : (t ? t('common.sync_live', 'Refresh Eco Audit') : 'Refresh Eco Audit')}
            </span>
          </button>
        </div>
      </div>

      {/* ── 1. Full-Width Interactive Ecological GIS Map ───────────── */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-safeGreen flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">
                {t('Ecological GIS Layer Engine (MPA • Wetlands • Ramsar • Coral • Biodiversity)')}
              </h3>
              <p className="text-[11px] text-textMuted">
                {t('UNESCO-IOC OBIS Species Points • UNEP-WCMC Coral Occurrences • Ramsar Sites • WDPA Sanctuaries')}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            {t('WCMC / WDPA Integrated')}
          </span>
        </div>

        <div className="h-[520px] min-h-[420px] w-full rounded-2xl overflow-hidden border border-borderLight relative shadow-inner">
          <MapCanvas
            className="h-full w-full"
            showControls={true}
            initialZoom={7}
            pageContext="ecology"
            defaultBaseMap="satellite"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-textMuted pt-1 px-1">
          <span>{t('Use the Layer Switcher to toggle Coral Occurrences, Ramsar Wetlands, and Marine Sanctuaries')}</span>
          <span className="font-semibold text-safeGreen flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-safeGreen animate-pulse inline-block" />
            {t('Real-Time Surveillance Active')}
          </span>
        </div>
      </div>

      {/* ── 2. Eco Status & Permitted Activity Matrix ──────────────── */}
      <EcoStatusBanner geofenceData={geofenceData} />

      {/* ── 3. ISRO Bhuvan Coastal Ecology & LULC ──────────────────── */}
      <BhuvanEcologyCard bhuvanData={bhuvanData} isLoading={bhuvanLoading} />

      {/* ── 4. Marine Biogeochemistry & Hydrodynamic Telemetry ──────── */}
      <OceanBiochemistryCard oceanData={oceanData} />

      {/* ── 5. Operational Split: Megafauna, Coral Stress, Sanctuaries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Endangered Marine Megafauna Registry */}
        <div className="lg:col-span-7 space-y-6">
          <EndangeredSpeciesRegistry locationName={location.name} />
        </div>

        {/* Right Column (5 cols): Coral Bleaching & Sanctuaries Directory */}
        <div className="lg:col-span-5 space-y-6">
          {/* Coral Reef Thermal Stress Monitor */}
          <CoralBleachingGauge sst={sst} />

          {/* Marine Protected Areas Directory */}
          <MarineSanctuariesDirectory userLat={lat} userLon={lon} />
        </div>
      </div>
    </div>
  )
}
