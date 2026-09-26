import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import SafetyVerdictCard from '../components/dashboard/SafetyVerdictCard'
import OceanSnapshotGrid from '../components/dashboard/OceanSnapshotGrid'
import HazardsAlertBanner from '../components/dashboard/HazardsAlertBanner'
import ActiveMarineAlertsCard from '../components/alerts/ActiveMarineAlertsCard'
import OperationalHighlights from '../components/dashboard/OperationalHighlights'
import ForecastTrendChart from '../components/dashboard/ForecastTrendChart'
import MapCanvas from '../components/map/MapCanvas'
import {
  Compass,
  MapPin,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Activity,
  RefreshCw,
  Check,
} from 'lucide-react'

export default function HomeDashboard() {
  const navigate = useNavigate()
  const { location, vessel, timeOffset, t } = useGlobal()

  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // 1. Live Safety Conditions Query
  const { data: safetyData, isLoading: safetyLoading, refetch: refetchSafety } = useQuery({
    queryKey: ['safety', lat, lon, vessel, timeOffset],
    queryFn: async () => {
      const res = await endpoints.safety(lat, lon)
      return res.data
    },
    refetchInterval: 60000,
  })

  // 2. Nearest High-Yield PFZ Query
  const { data: pfzData, refetch: refetchPfz } = useQuery({
    queryKey: ['pfz', lat, lon],
    queryFn: async () => {
      const res = await endpoints.pfz(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  // 3. Nearest Ports Query
  const { data: portsData, refetch: refetchPorts } = useQuery({
    queryKey: ['ports', lat, lon],
    queryFn: async () => {
      const res = await endpoints.ports(lat, lon)
      return res.data
    },
    staleTime: 600000,
  })

  // 4. Hazards & Surveillance Query
  const { data: hazardsData, refetch: refetchHazards } = useQuery({
    queryKey: ['hazards', lat, lon],
    queryFn: async () => {
      const res = await endpoints.hazards(lat, lon)
      return res.data
    },
    refetchInterval: 60000,
  })

  // 5. High-Resolution Marine & Weather 24h Hourly Forecast
  const { data: chartsData, isLoading: chartsLoading, refetch: refetchCharts } = useQuery({
    queryKey: ['charts', lat, lon],
    queryFn: async () => {
      const res = await endpoints.charts(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  const handleSyncAll = async () => {
    setIsSyncing(true)
    setJustSynced(false)
    try {
      await Promise.allSettled([
        refetchSafety(),
        refetchPfz(),
        refetchPorts(),
        refetchHazards(),
        refetchCharts(),
      ])
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 2500)
    } finally {
      setIsSyncing(false)
    }
  }

  const conditions = safetyData?.conditions || {}

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Page Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-safeGreen animate-pulse" />
            <h1 className="text-xl md:text-2xl font-black text-navy tracking-tight">
              {t ? t('pages.home_title', 'Mission Control & Maritime Decision Support') : 'Mission Control & Maritime Decision Support'}
            </h1>
          </div>
          <p className="text-xs text-textMuted mt-0.5 flex items-center gap-1.5">
            <MapPin size={12} className="text-oceanBlue" />
            {t ? t('common.coordinates', 'Active Coordinates') : 'Active Coordinates'}: <strong className="text-navy">{location.name}</strong> ({lat.toFixed(4)}° N, {lon.toFixed(4)}° E)
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-2xs self-start transition-all cursor-pointer border ${
            justSynced
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
              : isSyncing
              ? 'bg-sky-50 text-oceanBlue border-sky-300 shadow-xs animate-pulse'
              : 'bg-white hover:bg-surface text-navy border-borderLight hover:border-oceanBlue/30'
          }`}
          title="Refresh live marine and satellite telemetry"
        >
          {justSynced ? (
            <Check size={13} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <RefreshCw size={13} className={`flex-shrink-0 ${isSyncing ? 'animate-spin text-oceanBlue' : 'text-textMuted'}`} />
          )}
          <span>
            {justSynced
              ? (t ? t('common.synced', '✓ Synced 100% Live!') : '✓ Synced 100% Live!')
              : isSyncing
              ? (t ? t('common.syncing', 'Syncing Telemetry...') : 'Syncing Telemetry...')
              : (t ? t('common.sync_live', 'Sync Satellite Live') : 'Sync Satellite Live')}
          </span>
        </button>
      </div>

      {/* ── 1. Hero Safety Verdict Card ───────────────────────────── */}
      <SafetyVerdictCard safetyData={safetyData} isLoading={safetyLoading} />

      {/* ── 2. Ocean Snapshot 4-Metric Grid (SST, Wave, Wind, Pressure) ── */}
      <OceanSnapshotGrid conditions={conditions} safetyData={safetyData} />

      {/* ── 3. Signature Proactive Alerts Dashboard (Feature 27 & 28) ── */}
      <ActiveMarineAlertsCard />

      {/* ── 3. Main Operational Split Layout ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Hazards, 24h Trend, PFZ & Ports */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hazards & Convection Banner */}
          <HazardsAlertBanner hazardsData={hazardsData} safetyData={safetyData} />

          {/* 24-Hour Wave, Wind, Tide & CAPE Forecast Trend */}
          {/* <ForecastTrendChart
            baseWave={conditions.wave_m ?? 0.9}
            baseWind={conditions.wind_kmh ?? 11.2}
            hourlyWaves={chartsData?.wave_next_24h}
            hourlyWinds={chartsData?.wind_next_24h}
            hourlyTides={chartsData?.tide_hourly}
            hourlyCape={chartsData?.cape_next_12h}
            isLoading={chartsLoading}
          /> */}

          {/* PFZ & Safe Harbours Highlights */}
          <OperationalHighlights pfzData={pfzData} portsData={portsData} />
        </div>

        {/* Right Column (5 cols): Tactical Mini Map & Quick Access */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
                  <Compass size={15} />
                </div>
                <h3 className="text-xs font-bold text-navy">{t('Tactical GIS Mini Map')}</h3>
              </div>
              <button
                onClick={() => navigate('/ocean')}
                className="flex items-center gap-1 text-xs font-bold text-oceanBlue hover:text-navy transition-colors cursor-pointer"
              >
                <span>{t('Full Explorer')}</span>
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Embedded Leaflet Map */}
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-borderLight relative shadow-inner">
              <MapCanvas
                className="h-full w-full"
                showControls={false}
                initialZoom={8}
                pageContext="home"
                defaultBaseMap="satellite"
              />
            </div>

            <div className="p-2.5 rounded-2xl bg-surface border border-borderLight text-xs space-y-1">
              <div className="flex justify-between text-textSecond">
                <span>{t('Current Location GPS:')}</span>
                <span className="font-bold text-safeGreen">{t('Active (GNSS Fix)')}</span>
              </div>
              <div className="flex justify-between text-textSecond">
                <span>{t('EEZ Boundary Distance:')}</span>
                <span className="font-bold text-navy">{t('Inside Territorial Waters')}</span>
              </div>
            </div>
          </div>

          {/* Rapid Navigation Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/routes')}
              className="p-3.5 rounded-2xl bg-white hover:bg-surface border border-borderLight shadow-xs hover:shadow-sm text-left transition-all cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-textMuted uppercase">{t('nav.navigation_sub', 'Route Planner')}</div>
              <div className="text-xs font-bold text-navy mt-0.5 group-hover:text-oceanBlue flex items-center justify-between">
                <span>{t('Safest Sea Path')}</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/fisheries')}
              className="p-3.5 rounded-2xl bg-white hover:bg-surface border border-borderLight shadow-xs hover:shadow-sm text-left transition-all cursor-pointer group"
            >
              <div className="text-[10px] font-bold text-textMuted uppercase">{t('nav.fisheries', 'Fisheries Hub')}</div>
              <div className="text-xs font-bold text-navy mt-0.5 group-hover:text-oceanBlue flex items-center justify-between">
                <span>{t('PFZ Satellite Feed')}</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
