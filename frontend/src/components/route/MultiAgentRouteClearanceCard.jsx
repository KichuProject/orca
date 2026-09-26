import React, { useState } from 'react'
import { 
  CheckCircle2, AlertTriangle, ShieldAlert, ArrowUpRight, 
  Wind, Zap, ShieldCheck, Anchor, Leaf, Compass, CloudSun,
  LifeBuoy, ChevronDown, ChevronUp, ExternalLink, Sparkles, AlertOctagon
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function MultiAgentRouteClearanceCard({
  clearanceData = {},
  selectedMode = 'balanced',
  onSelectMode,
  vessel = {}
}) {
  const { t } = useGlobal()
  const [showAllAgents, setShowAllAgents] = useState(true)

  const status = clearanceData?.clearance_status || 'CLEAR'
  const headline = clearanceData?.clearance_headline || (
    status === 'NO_GO' 
      ? '🔴 HARBOUR HOLD ADVISORY — SEVERE CONDITIONS (EMERGENCY EVASION ROUTE DISPLAYED BELOW)'
      : status === 'ALTERNATIVE_REQUIRED'
      ? '🟡 ALTERNATIVE ROUTE ACTIVE — HAZARD DETOUR CALCULATED & APPROVED'
      : '🟢 ROUTE IS 100% CLEAR — DIRECT SEA PASSAGE PERMITTED'
  )
  const narrative = clearanceData?.clearance_narrative || (
    status === 'NO_GO'
      ? 'Severe weather or regulatory closure in effect. Departure not advised by port authorities. For emergency transit or vessels underway, an emergency evasive passage is plotted below.'
      : status === 'ALTERNATIVE_REQUIRED'
      ? 'Direct straight vector is obstructed by localized hazards or sea swell. An approved deep-water detour has been calculated and is fully navigable below.'
      : 'All maritime agents report calm seas, safe under-keel clearance, and zero regulatory or weather hazards along track.'
  )

  const blockingFactors = clearanceData?.blocking_factors || []
  const detourReasons = clearanceData?.detour_reasons || []
  const agentEvaluations = clearanceData?.agent_evaluations || []
  const refugePorts = clearanceData?.safe_refuge_ports || []
  const recommendedMode = clearanceData?.recommended_mode || 'balanced'

  const getAgentIcon = (agentId) => {
    switch (agentId) {
      case 'metocean': return <CloudSun size={17} className="text-amber-400" />
      case 'cyclone': return <Wind size={17} className="text-red-400" />
      case 'lightning': return <Zap size={17} className="text-yellow-400" />
      case 'geofence': return <ShieldCheck size={17} className="text-emerald-400" />
      case 'bathymetry': return <Anchor size={17} className="text-sky-400" />
      case 'ecology': return <Leaf size={17} className="text-teal-400" />
      case 'seasonal_ban': return <ShieldAlert size={17} className="text-orange-400" />
      case 'currents': return <Compass size={17} className="text-purple-400" />
      default: return <LifeBuoy size={17} className="text-cyan-400" />
    }
  }

  // Visual Theme mapping based on the 3 states
  const theme = {
    CLEAR: {
      bg: 'from-emerald-950/90 via-slate-900 to-teal-950/90',
      border: 'border-emerald-500/40',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.15)]',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
      icon: <CheckCircle2 size={28} className="animate-pulse" />,
      tag: t('DIRECT PASSAGE APPROVED'),
    },
    ALTERNATIVE_REQUIRED: {
      bg: 'from-amber-950/90 via-slate-900 to-slate-950',
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.2)]',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-400/40',
      icon: <ArrowUpRight size={28} className="animate-bounce" />,
      tag: t('SAFE DETOUR ROUTE APPROVED'),
    },
    NO_GO: {
      bg: 'from-rose-950 via-slate-950 to-red-950',
      border: 'border-rose-500/70',
      glow: 'shadow-[0_0_40px_rgba(244,63,94,0.3)]',
      badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-500/50',
      iconBg: 'bg-rose-500/25 text-rose-400 border-rose-500/50 animate-pulse',
      icon: <AlertOctagon size={28} />,
      tag: t('HARBOUR HOLD — EMERGENCY TRACK ONLY'),
    }
  }[status] || {
    bg: 'from-slate-900 to-navy',
    border: 'border-borderLight',
    glow: '',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    iconBg: 'bg-sky-500/20 text-sky-400 border-sky-400/40',
    icon: <CheckCircle2 size={28} />,
    tag: t('ROUTE EVALUATED'),
  }

  return (
    <div className={`rounded-3xl border ${theme.border} ${theme.glow} bg-gradient-to-br ${theme.bg} text-white p-5 md:p-6 shadow-xl relative overflow-hidden transition-all duration-300`}>
      {/* Background Decorative Radar Sweep */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/5 pointer-events-none blur-2xl" />

      {/* Top Banner Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} border flex items-center justify-center flex-shrink-0 shadow-lg mt-0.5`}>
            {theme.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${theme.badgeBg} flex items-center gap-1.5`}>
                <Sparkles size={11} /> {t(theme.tag)}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                {t('8 Maritime AI Agents Consensus')}
              </span>
              {vessel?.name && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300 border border-white/10">
                  {t('Craft')}: {vessel.name}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white leading-snug">
              {t(headline)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {t(narrative)}
            </p>

            {/* Explanatory status pill to resolve any confusion */}
            {status === 'ALTERNATIVE_REQUIRED' && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-bold">
                <CheckCircle2 size={13} className="text-amber-400 flex-shrink-0" />
                <span>{t('Safe Alternative Routes Available & Plotted Below — Inspect Fastest, Balanced, and Safest profiles.')}</span>
              </div>
            )}
            {status === 'NO_GO' && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
                <AlertTriangle size={13} className="text-rose-400 flex-shrink-0" />
                <span>{t('Departure Hold Advised — The corridors below represent emergency standoff routes with maximum hazard avoidance.')}</span>
              </div>
            )}
            {status === 'CLEAR' && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span>{t('Direct Transit Approved — All 3 route corridors are verified safe and navigable.')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Quick Action / Mode Pill */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 flex-shrink-0 self-start lg:self-auto">
          {status === 'ALTERNATIVE_REQUIRED' && (
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl px-3.5 py-2 flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] font-bold text-amber-300 uppercase">{t('Recommended Detour')}</div>
                <div className="text-xs font-black text-white capitalize">{t(`${recommendedMode} Route`)}</div>
              </div>
              <button
                onClick={() => onSelectMode && onSelectMode(recommendedMode)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {t('Apply Detour')}
              </button>
            </div>
          )}

          {status === 'NO_GO' && (
            <div className="bg-rose-500/15 border border-rose-400/40 rounded-2xl px-3.5 py-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-400 animate-bounce" />
              <div className="text-left lg:text-right">
                <div className="text-[10px] font-black text-rose-300 uppercase">{t('Action Required')}</div>
                <div className="text-xs font-black text-white">{t('Hold In Harbour')}</div>
              </div>
            </div>
          )}

          {status === 'CLEAR' && (
            <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl px-3.5 py-2 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <div className="text-left lg:text-right">
                <div className="text-[10px] font-bold text-emerald-300 uppercase">{t('Navigation Envelope')}</div>
                <div className="text-xs font-black text-white">{t('Direct Sea Transit Clear')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Critical Blocker Notice (if NO_GO) */}
      {blockingFactors.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 shadow-inner">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-2">
            <AlertTriangle size={15} className="text-rose-400" />
            <span>{t('CRITICAL BLOCKING FACTORS (WHY VOYAGE IS PROHIBITED):')}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-rose-100 pl-5 list-disc">
            {blockingFactors.map((bf, idx) => (
              <li key={idx} className="font-medium">{t(bf)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detour Highlights (if ALTERNATIVE_REQUIRED) */}
      {detourReasons.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 shadow-inner">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1.5">
            <ArrowUpRight size={15} className="text-amber-400" />
            <span>{t('SAFETY DETOUR DETAILS & HAZARD BYPASS:')}</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-100 pl-5 list-disc">
            {detourReasons.map((dr, idx) => (
              <li key={idx}>{t(dr)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Safe Refuge Harbours Callout */}
      {refugePorts.length > 0 && (
        <div className="mt-4 pt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
            <Anchor size={13} className="text-cyan-400" />
            {t('Designated Safe Shelter Harbours:')}
          </span>
          <div className="flex flex-wrap gap-2">
            {refugePorts.map((port, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-cyan-200 flex items-center gap-1.5 transition-all shadow-2xs"
              >
                ⚓ {t(port.name)}
                {port.distance_km != null && (
                  <span className="text-[10px] text-slate-400 font-normal">({port.distance_km}km)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Agent Consensus Grid */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={() => setShowAllAgents(!showAllAgents)}
          className="flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
        >
          <span>{t('All 8 Specialized Navigation Agent Evaluations')}</span>
          {showAllAgents ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-emerald-400 font-bold">
            {clearanceData?.agents_passed_count ?? agentEvaluations.filter(a => a.status === 'PASSED').length} {t('Passed')}
          </span>
          &bull;
          <span className="text-amber-400 font-bold">
            {clearanceData?.agents_warning_count ?? agentEvaluations.filter(a => a.status === 'WARNING').length} {t('Caution/Detour')}
          </span>
          {((clearanceData?.agents_blocker_count ?? agentEvaluations.filter(a => a.status === 'CRITICAL_BLOCKER').length) > 0) && (
            <>
              &bull;
              <span className="text-rose-400 font-bold">
                {clearanceData?.agents_blocker_count ?? agentEvaluations.filter(a => a.status === 'CRITICAL_BLOCKER').length} {t('Blocked')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 8-Agent Grid Cards */}
      {showAllAgents && agentEvaluations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 animate-fadeIn">
          {agentEvaluations.map((agent, idx) => {
            const isPassed = agent.status === 'PASSED'
            const isBlocker = agent.status === 'CRITICAL_BLOCKER'
            const isWarning = agent.status === 'WARNING'

            const statusBadge = isBlocker
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isWarning
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'

            return (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        {getAgentIcon(agent.agent_id)}
                      </div>
                      <span className="text-xs font-bold text-white truncate" title={agent.name}>
                        {t(agent.name.replace(' Agent', ''))}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadge}`}>
                      {t(agent.status.replace('_', ' '))}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                    {t(agent.summary)}
                  </p>
                </div>

                {/* Key Metrics Pills */}
                {agent.metrics && Object.keys(agent.metrics).length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap gap-1.5">
                    {Object.entries(agent.metrics).slice(0, 2).map(([key, val], mIdx) => (
                      <span 
                        key={mIdx} 
                        className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-semibold text-slate-300"
                      >
                        {t(key.replace(/_/g, ' '))}: <strong className="text-white">{t(String(val))}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
