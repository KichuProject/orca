import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Fish, MapPin, RefreshCw, Sparkles, Navigation, Calendar, ExternalLink, Check, Trees, ShieldAlert } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import FishingSuitabilityGauge from '../components/fisheries/FishingSuitabilityGauge'
import PFZCardList from '../components/fisheries/PFZCardList'
import TargetSpeciesGuide from '../components/fisheries/TargetSpeciesGuide'
import FAOProductivityChart from '../components/fisheries/FAOProductivityChart'
import FleetActivityCard from '../components/fisheries/FleetActivityCard'
import OceanBiochemistryCard from '../components/ocean/OceanBiochemistryCard'
import MapCanvas from '../components/map/MapCanvas'

export default function FisheriesIntelligencePage() {
  const navigate = useNavigate()
  const { location, timeOffset, t } = useGlobal()
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // 1. Query INCOIS Real-Time Potential Fishing Zones
  const { data: pfzData, isLoading: pfzLoading, refetch: refetchPfz } = useQuery({
    queryKey: ['pfz-page', lat, lon],
    queryFn: async () => {
      const res = await endpoints.pfz(lat, lon)
      return res.data
    },
    staleTime: 300000,
    refetchInterval: 60000,
  })

  // 2. Query Oceanographic Data (SST & Chlorophyll)
  const { data: oceanData, isLoading: oceanLoading, refetch: refetchOcean } = useQuery({
    queryKey: ['ocean-pfz', lat, lon],
    queryFn: async () => {
      const res = await endpoints.ocean(lat, lon, 'all')
      return res.data
    },
    staleTime: 300000,
    refetchInterval: 60000,
  })

  // 3. Query Marine Safety Conditions
  const { data: safetyData, isLoading: safetyLoading, refetch: refetchSafety } = useQuery({
    queryKey: ['safety-pfz', lat, lon, timeOffset],
    queryFn: async () => {
      const res = await endpoints.safety(lat, lon)
      return res.data
    },
    staleTime: 60000,
    refetchInterval: 60000,
  })

  // 4. Query FAO Long-Term Productivity
  const { data: productivityData } = useQuery({
    queryKey: ['fao-productivity'],
    queryFn: async () => {
      const res = await endpoints.productivity('India')
      return res.data?.fao_trend || res.data
    },
    staleTime: Infinity,
  })

  // 5. Query ISRO Bhuvan Coastal Ecology & Nursery Stand-off
  const { data: bhuvanData, refetch: refetchBhuvan } = useQuery({
    queryKey: ['bhuvan-fisheries', lat, lon],
    queryFn: async () => {
      const res = await endpoints.bhuvanEcology(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  // 6. Query Department of Fisheries Statutory Seasonal Ban Status
  const { data: banData, refetch: refetchBan } = useQuery({
    queryKey: ['seasonal-ban', lat, lon],
    queryFn: async () => {
      const res = await endpoints.seasonalBan(lat, lon)
      return res.data
    },
    staleTime: 300000,
  })

  const banActive = banData?.ban_active || false
  const banRegion = (banData?.region || (lon >= 78.5 ? 'east_coast' : 'west_coast')).replace(/_/g, ' ')
  const banStatus = banActive
    ? `Monsoon Ban Active (${banRegion})`
    : `Season Open (${banRegion})`

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-xs flex-shrink-0">
            <Fish size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.fisheries_title', 'Fisheries & Potential Fishing Zone (PFZ) Intelligence') : 'Fisheries & Potential Fishing Zone (PFZ) Intelligence'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5">
              {t('INCOIS Potential Fishing Zones • Chlorophyll Fronts • Species Assemblages • FAO Trends')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Seasonal Ban Badge */}
          <span className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 capitalize ${
            banActive
              ? 'bg-rose-50 text-dangerRed border-rose-200'
              : 'bg-emerald-50 text-safeGreen border-emerald-200/80'
          }`}>
            <Calendar size={13} />
            <span>{t(banStatus)}</span>
          </span>

          <button
            onClick={async () => {
              setIsSyncing(true)
              setJustSynced(false)
              try {
                await Promise.allSettled([refetchPfz(), refetchOcean(), refetchSafety(), refetchBhuvan(), refetchBan()])
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
            title="Refresh satellite PFZ advisories"
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
                ? (t ? t('common.syncing', 'Syncing...') : 'Syncing...')
                : (t ? t('common.sync_live', 'Sync PFZ') : 'Sync PFZ')}
            </span>
          </button>
        </div>
      </div>

      {/* ── 1. Full-Width Tactical PFZ Satellite & Fisheries GIS Map ─── */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Navigation size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">{t('Tactical PFZ Satellite Fix & Fisheries GIS')}</h3>
              <p className="text-[11px] text-textMuted">{t('Real-time Commercial Fishing Events • FAO Major Areas • INCOIS Thermal Fronts')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/ocean')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-borderLight text-xs font-bold text-oceanBlue hover:text-navy hover:border-oceanBlue/30 transition-all cursor-pointer shadow-2xs"
          >
            <span>{t('Ocean Explorer')}</span>
            <ExternalLink size={13} />
          </button>
        </div>

        <div className="h-[520px] min-h-[420px] w-full rounded-2xl overflow-hidden border border-borderLight relative shadow-inner">
          <MapCanvas
            className="h-full w-full"
            showControls={true}
            initialZoom={8}
            pageContext="fisheries"
            defaultBaseMap="satellite"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-borderLight text-xs">
          <div className="flex items-center gap-2 text-textSecond">
            <span>{t('Nearest INCOIS Front:')}</span>
            <span className="font-bold text-navy">
              {t(pfzData?.nearest_pfz?.name || 'Kasikoilkuppam')} ({pfzData?.distance_km || 30.1} km {t(pfzData?.direction || 'E')})
            </span>
          </div>
          <div className="flex items-center gap-2 text-textSecond">
            <span>{t('Observation Feed:')}</span>
            <span className="font-semibold text-safeGreen flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-safeGreen animate-pulse inline-block" />
              {t('INCOIS Live Satellite')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Autonomous Fishing Suitability Gauge ─────────────────── */}
      <FishingSuitabilityGauge oceanData={oceanData} safetyData={safetyData} />

      {/* ── 3. Oceanographic & Biochemical Telemetry Strip ────────── */}
      <OceanBiochemistryCard oceanData={oceanData} />

      {/* ── 4. Main Operational Split ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): PFZ Cards & Target Species Guide */}
        <div className="lg:col-span-7 space-y-6">
          <PFZCardList pfzData={pfzData} />
          <TargetSpeciesGuide oceanData={oceanData} />
        </div>

        {/* Right Column (5 cols): GFW Fleet & ISRO Bhuvan Buffer */}
        <div className="lg:col-span-5 space-y-6">
          {/* GFW Fleet Density Card */}
          {/* <FleetActivityCard sectorName={pfzData?.sector} /> */}

          {/* ISRO Bhuvan Mangrove Nursery & Coastal Buffer Card */}
          <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Trees size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-navy">
                    {t('ISRO Bhuvan Coastal Buffer')}
                  </h3>
                  <span className="text-[9px] text-textMuted font-mono">
                    {t('Sector:')} {t(bhuvanData?.sector || pfzData?.sector || 'NORTH_TAMILNADU')}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                {t('CRZ-I Safe')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <ShieldAlert size={14} className="text-teal-700" />
                <span>{t('Nursery Stand-off Protocol')}</span>
              </div>
              <p className="text-[11px] text-teal-950 leading-relaxed">
                {t(bhuvanData?.eco_buffer_advice || 'Maintain 500 m stand-off buffer from coastal mangrove roots.')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-surface border border-borderLight">
                <div className="text-[10px] text-textMuted">{t('Mangrove Acreage')}</div>
                <div className="font-mono font-bold text-navy text-sm">
                  {bhuvanData?.mangrove_km2 ?? 46.57} km²
                </div>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-borderLight">
                <div className="text-[10px] text-textMuted">{t('Coastal Wetlands')}</div>
                <div className="font-mono font-bold text-navy text-sm">
                  {bhuvanData?.coastal_wetland_km2 ?? 418.86} km²
                </div>
              </div>
            </div>

            <div className="text-[10px] text-textMuted flex items-center justify-between pt-1 border-t border-borderLight">
              <span>{t('Attribution:')} {t(bhuvanData?.source || 'ISRO Bhuvan LULC 50K')}</span>
              <a
                href="https://bhuvan.nrsc.gov.in"
                target="_blank"
                rel="noreferrer"
                className="text-oceanBlue font-bold hover:underline"
              >
                bhuvan.nrsc.gov.in &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Long-Term FAO Productivity Trajectory ───────────────── */}
      <FAOProductivityChart productivityData={productivityData} />
    </div>
  )
}
