import React, { useState } from 'react'
import {
  BellRing,
  AlertTriangle,
  ShieldAlert,
  Wind,
  CloudLightning,
  Waves,
  Compass,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Zap,
  Sparkles,
  Info,
  Radio,
  Clock,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function ActiveMarineAlertsCard({ className = '' }) {
  const navigate = useNavigate()
  const { location, vessel, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  const [activeTab, setActiveTab] = useState('ALL_ACTIVE') // 'ALL_ACTIVE', 'ALL_10', 'MET', 'OCEAN', 'LEGAL', 'FISH'
  const [isSimulating, setIsSimulating] = useState(false)
  const [simMessage, setSimMessage] = useState(null)

  // Fetch proactive alerts data
  const {
    data: alertsData,
    isLoading,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['proactive-alerts', lat, lon, vessel],
    queryFn: async () => {
      const res = await endpoints.alertsProactive(lat, lon, vessel)
      return res.data
    },
    refetchInterval: 30000, // 30s live polling
  })

  const summary = alertsData?.summary || {
    total_monitored: 10,
    total_active: 0,
    critical_count: 0,
    warning_count: 0,
    advisory_count: 0,
    opportunity_count: 0,
    overall_status: 'NOMINAL NAVIGATION'
  }

  const domains = alertsData?.domains || {}
  const allItems = [
    ...(domains.meteorological?.items || []),
    ...(domains.ocean_state?.items || []),
    ...(domains.geofence_regulatory?.items || []),
    ...(domains.fisheries_operations?.items || []),
  ]

  const activeItems = allItems.filter(item => item.triggered)

  const handleSimulate = async (ruleId) => {
    setIsSimulating(true)
    try {
      const res = await endpoints.notificationsSimulate({ rule_id: ruleId, state: true })
      if (ruleId === 'reset_all') {
        setSimMessage('✓ Reverted to live sensors')
      } else {
        setSimMessage(`⚡ Simulated ${res.data.rule_name || ruleId}`)
      }
      await refetchAlerts()
      setTimeout(() => setSimMessage(null), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSimulating(false)
    }
  }

  // Filter items based on active tab
  let displayedItems = []
  if (activeTab === 'ALL_ACTIVE') {
    displayedItems = activeItems.length > 0 ? activeItems : allItems.slice(0, 4)
  } else if (activeTab === 'ALL_10' || activeTab === 'ALL_14') {
    displayedItems = allItems
  } else if (activeTab === 'MET') {
    displayedItems = domains.meteorological?.items || []
  } else if (activeTab === 'OCEAN') {
    displayedItems = domains.ocean_state?.items || []
  } else if (activeTab === 'LEGAL') {
    displayedItems = domains.geofence_regulatory?.items || []
  } else if (activeTab === 'FISH') {
    displayedItems = domains.fisheries_operations?.items || []
  }

  const getStatusColor = (item) => {
    if (!item.triggered) return 'bg-emerald-50 text-safeGreen border-emerald-200'
    if (item.severity === 'CRITICAL') return 'bg-red-500 text-white border-red-600 animate-pulse'
    if (item.severity === 'WARNING') return 'bg-amber-500 text-white border-amber-600'
    if (item.severity === 'OPPORTUNITY') return 'bg-emerald-600 text-white border-emerald-700'
    return 'bg-blue-500 text-white border-blue-600'
  }

  return (
    <div className={`p-5 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4 ${className}`}>
      {/* ── Card Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-borderLight/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-dangerRed flex items-center justify-center flex-shrink-0 shadow-2xs">
            <BellRing size={20} className={summary.total_active > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-navy tracking-tight">
                {t('ACTIVE MARINE ALERTS')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 text-dangerRed border border-red-200">
                {t('PROACTIVE SAFETY SYSTEM')}
              </span>
            </div>
            <p className="text-xs text-textMuted mt-0.5 flex items-center gap-1.5">
              <Radio size={12} className="text-oceanBlue animate-pulse" />
              <span>{t('Continuous Surveillance across 10 Autonomous Maritime Domains')}</span>
              <span>•</span>
              <strong className="text-navy">{location.name}</strong> ({lat.toFixed(3)}°N, {lon.toFixed(3)}°E)
            </p>
          </div>
        </div>

        {/* Global Alert Status Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-2xl text-xs font-black border flex items-center gap-2 ${
            summary.critical_count > 0
              ? 'bg-red-50 text-dangerRed border-dangerRed/40 animate-pulse'
              : summary.warning_count > 0
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-emerald-50 text-safeGreen border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              summary.critical_count > 0 ? 'bg-dangerRed' : summary.warning_count > 0 ? 'bg-amber-500' : 'bg-safeGreen'
            }`} />
            <span>
              {summary.total_active > 0
                ? `${summary.total_active} ${t('Active Hazard(s) Flagged')}`
                : t('All 10 Systems Nominal')}
            </span>
          </div>

          <button
            onClick={() => refetchAlerts()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface hover:bg-slate-100 text-textMuted hover:text-navy border border-borderLight transition-all cursor-pointer"
            title={t('Refresh Proactive Alerts')}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-oceanBlue' : ''} />
          </button>
        </div>
      </div>

      {/* ── Quick Simulator Ribbon for Judges ─────────────────────── */}
      {/* <div className="p-3 rounded-2xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-bold">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          <span>{t('Condition Simulator (Judge Testing):')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <button
            onClick={() => handleSimulate('high_wave')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-amber-600/30 text-slate-200 hover:text-amber-300 border border-slate-700 transition-colors font-medium cursor-pointer"
          >
            {t('Wave > 2.8m')}
          </button>
          <button
            onClick={() => handleSimulate('imbl_proximity')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-red-600/30 text-slate-200 hover:text-red-300 border border-slate-700 transition-colors font-medium cursor-pointer"
          >
            {t('IMBL < 1.5 NM')}
          </button>
          <button
            onClick={() => handleSimulate('cyclone_warning')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-red-600/30 text-slate-200 hover:text-red-300 border border-slate-700 transition-colors font-medium cursor-pointer"
          >
            {t('Cyclone 988 hPa')}
          </button>
          <button
            onClick={() => handleSimulate('lightning_convection')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-yellow-600/30 text-slate-200 hover:text-yellow-300 border border-slate-700 transition-colors font-medium cursor-pointer"
          >
            {t('Lightning CAPE')}
          </button>
          <button
            onClick={() => handleSimulate('reset_all')}
            disabled={isSimulating}
            className="px-2 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={10} />
            <span>{t('Reset')}</span>
          </button>
        </div>
      </div> */}

      {simMessage && (
        <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <Sparkles size={13} className="text-amber-500 animate-spin" />
          <span>{simMessage}</span>
        </div>
      )}

      {/* ── Category Filter Tabs ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 text-xs font-bold pt-1">
        <button
          onClick={() => setActiveTab('ALL_ACTIVE')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ALL_ACTIVE'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('Active Hazards')} ({activeItems.length})
        </button>
        <button
          onClick={() => setActiveTab('ALL_10')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ALL_10' || activeTab === 'ALL_14'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('All 10 Monitored Rules')}
        </button>
        <button
          onClick={() => setActiveTab('MET')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'MET'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('Meteorological')} ({domains.meteorological?.items?.length || 4})
        </button>
        <button
          onClick={() => setActiveTab('OCEAN')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'OCEAN'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('Sea State & Waves')} ({domains.ocean_state?.items?.length || 4})
        </button>
        <button
          onClick={() => setActiveTab('LEGAL')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'LEGAL'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('Boundaries & Legal')} ({domains.geofence_regulatory?.items?.length || 1})
        </button>
        <button
          onClick={() => setActiveTab('FISH')}
          className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'FISH'
              ? 'bg-navy text-white border-navy shadow-xs'
              : 'bg-surface text-textSecond border-borderLight hover:bg-slate-100'
          }`}
        >
          {t('Fisheries & Operations')} ({domains.fisheries_operations?.items?.length || 1})
        </button>
      </div>

      {/* ── Active Marine Alerts Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {displayedItems.map((item, idx) => (
          <div
            key={item.rule_id || idx}
            className={`p-4 rounded-2xl border transition-all ${
              item.triggered
                ? item.severity === 'CRITICAL'
                ? 'bg-red-50/60 border-red-300 shadow-xs ring-1 ring-red-200'
                : item.severity === 'WARNING'
                ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-200'
                : item.severity === 'OPPORTUNITY'
                ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                : 'bg-blue-50/60 border-blue-300 shadow-xs'
              : 'bg-surface/50 border-borderLight/80 opacity-90'
            }`}
          >
            {/* Item Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">{item.icon || '⚠️'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-navy leading-tight">
                      {t(item.name)}
                    </h3>
                    {item.is_simulated && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {t('SIMULATED')}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-textMuted font-mono uppercase">
                    {t(item.domain?.replace('_', ' '))}
                  </span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(item)}`}>
                {item.triggered ? t(item.severity) : t('NOMINAL')}
              </span>
            </div>

            {/* Condition Formula */}
            <div className="mt-2.5 p-2 rounded-xl bg-white/80 border border-borderLight text-[10.5px] font-mono text-navy leading-relaxed flex items-center gap-1.5">
              <span className="text-oceanBlue font-bold flex-shrink-0">{t('RULE:')}</span>
              <span className="text-textSecond truncate">{t(item.condition_text)}</span>
            </div>

            {/* Directive */}
            <p className="text-xs text-navy mt-2 leading-relaxed font-semibold">
              {t(item.directive)}
            </p>

            {/* Live Metric & Source */}
            <div className="mt-3 pt-2 border-t border-borderLight/60 flex flex-wrap items-center justify-between gap-1 text-[10px] text-textMuted">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-navy">{t(item.live_value)}</span>
                <span>•</span>
                <span>{t(item.source)}</span>
              </div>
              <span className="font-mono text-textMuted">{item.timestamp_ist}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer Directive Strip ─────────────────────────────────── */}
      <div className="pt-2 border-t border-borderLight/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-textMuted">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-safeGreen" />
          <span>{t('Official Data Sources: IMD, INCOIS, ISRO MOSDAC, Indian Coast Guard, GEBCO & GFW')}</span>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="text-xs font-bold text-oceanBlue hover:text-navy flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{t('Open Full Tactical Alerts Center')}</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
