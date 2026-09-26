import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, Award, RefreshCw, MapPin, Check, TrendingUp } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import VesselLimitGauges from '../components/safety/VesselLimitGauges'
import IMDAlertBulletin from '../components/safety/IMDAlertBulletin'
import SeasonalBanCard from '../components/safety/SeasonalBanCard'
import DepartureWindowPlanner from '../components/safety/DepartureWindowPlanner'
import SafetyCertificateModal from '../components/safety/SafetyCertificateModal'
import HazardsAlertBanner from '../components/dashboard/HazardsAlertBanner'
import ForecastTrendChart from '../components/dashboard/ForecastTrendChart'

export default function SafetyAdvisoryPage() {
  const { location, vessel, timeOffset, t } = useGlobal()
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // Query live safety assessment
  const { data: safetyData, isLoading: safetyLoading, refetch: refetchSafety } = useQuery({
    queryKey: ['safety-page', lat, lon, vessel, timeOffset],
    queryFn: async () => {
      const res = await endpoints.safety(lat, lon)
      return res.data
    },
    refetchInterval: 60000,
  })

  // Query live hazards (cyclone, lightning, INSAT-3DS convection)
  const { data: hazardsData, refetch: refetchHazards } = useQuery({
    queryKey: ['hazards-page', lat, lon],
    queryFn: async () => {
      const res = await endpoints.hazards(lat, lon)
      return res.data
    },
    refetchInterval: 60000,
  })

  // Query live 24h wave, wind and CAPE charts forecast
  const { data: chartsData, isLoading: chartsLoading, refetch: refetchCharts } = useQuery({
    queryKey: ['charts-safety', lat, lon],
    queryFn: async () => {
      const res = await endpoints.charts(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  const conditions = safetyData?.conditions || {}

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-dangerRed/10 text-dangerRed flex items-center justify-center shadow-xs flex-shrink-0">
            <ShieldAlert size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t('Maritime Safety & Vessel Limits Advisory')}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1">
              <MapPin size={11} className="text-oceanBlue" />
              <span>{t('Monitoring')}: <strong className="text-navy">{location.name}</strong> ({lat.toFixed(4)}°N, {lon.toFixed(4)}°E)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={async () => {
              setIsSyncing(true)
              setJustSynced(false)
              try {
                await Promise.allSettled([refetchSafety(), refetchHazards(), refetchCharts()])
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
            title="Refresh live safety models, hazards, and marine bulletins"
          >
            {justSynced ? (
              <Check size={13} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <RefreshCw size={13} className={`flex-shrink-0 ${isSyncing ? 'animate-spin text-oceanBlue' : 'text-textMuted'}`} />
            )}
            <span>
              {justSynced
                ? t('✓ Synced 100%!')
                : isSyncing
                ? t('Refreshing...')
                : t('Live Sync with Satellite')}
            </span>
          </button>

          <button
            id="generate-clearance-cert-btn"
            onClick={() => setCertModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-navy hover:bg-navyLight text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Award size={14} className="text-saffron" />
            <span>{t('Safety Certificate')}</span>
          </button>
        </div>
      </div>

      {/* ── 1. Live Marine Hazards & Surveillance Banner ─────────── */}
      <HazardsAlertBanner hazardsData={hazardsData} safetyData={safetyData} />

      {/* ── 2. Vessel Operating Limits vs Actual Gauges ────────────── */}
      <VesselLimitGauges safetyData={safetyData} />

      {/* ── 3. Forecasting Section (24h Trend Chart & What-If Slots) ─ */}
      <div className="space-y-4">
        {/* Continuous 24-Hour Wave, Wind, Tide & CAPE Forecast Trend */}
        <ForecastTrendChart
          baseWave={conditions.wave_m ?? 0.9}
          baseWind={conditions.wind_kmh ?? 11.2}
          hourlyWaves={chartsData?.wave_next_24h}
          hourlyWinds={chartsData?.wind_next_24h}
          hourlyTides={chartsData?.tide_hourly}
          hourlyCape={chartsData?.cape_next_12h}
          isLoading={chartsLoading}
        />

        {/* Departure Window "What-If" Slot Planner */}
        <DepartureWindowPlanner
          baseWave={conditions.wave_m ?? 0.9}
          baseWind={conditions.wind_kmh ?? 11.2}
          hourlyWaves={chartsData?.wave_next_24h}
          hourlyWinds={chartsData?.wind_next_24h}
        />
      </div>

      {/* ── 4. Two-Column Split: IMD Alerts & Seasonal Ban ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Official IMD Fishermen Bulletin */}
          <IMDAlertBulletin safetyData={safetyData} />
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Seasonal Monsoon Fishing Ban Calendar */}
          <SeasonalBanCard />
        </div>
      </div>

      {/* Printable Certificate Modal */}
      {certModalOpen && (
        <SafetyCertificateModal
          safetyData={safetyData}
          onClose={() => setCertModalOpen(false)}
        />
      )}
    </div>
  )
}
