import React, { useMemo } from 'react'
import {
  Loader2, CheckCircle2, Activity, Zap, Compass, Radio,
  Fish, AlertTriangle, ShieldCheck
} from 'lucide-react'
import Orca3DMascot from '../mascot/Orca3DMascot'

// Fallback category configs if backend hasn't finished planning yet
const INTENT_PREVIEWS = {
  navigation: { badge: 'Passage Routing Swarm', icon: Compass },
  pfz: { badge: 'Fisheries & Chlorophyll Swarm', icon: Fish },
  hazard: { badge: 'Severe Hazard Alert Swarm', icon: AlertTriangle },
  safety: { badge: 'Vessel Safety Multi-Agent Swarm', icon: ShieldCheck }
}

export default function AgentLiveLoading({
  queryText = '',
  plannedAgents = [],
  activeAction = '',
  progressPct = 0
}) {
  // Determine intent category for initial styling
  const intentConfig = useMemo(() => {
    const q = (queryText || '').toLowerCase()
    if (q.includes('route') || q.includes('navigate') || q.includes('sail') || q.includes('path')) {
      return INTENT_PREVIEWS.navigation
    }
    if (q.includes('pfz') || q.includes('fish') || q.includes('tuna')) {
      return INTENT_PREVIEWS.pfz
    }
    if (q.includes('cyclone') || q.includes('lightning') || q.includes('storm')) {
      return INTENT_PREVIEWS.hazard
    }
    return INTENT_PREVIEWS.safety
  }, [queryText])

  // Normalise agents from planned list or defaults
  const normalizedAgents = useMemo(() => {
    if (Array.isArray(plannedAgents) && plannedAgents.length > 0) {
      return plannedAgents.map((ag) => {
        if (typeof ag === 'string') {
          return { tool: ag, name: ag.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), category: 'Specialized Agent', status: 'planned' }
        }
        return {
          tool: ag.tool || ag.name || 'agent',
          name: ag.name || (ag.tool || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          category: ag.category || 'Specialized Agent',
          status: ag.status || 'planned',
          summary: ag.summary || ''
        }
      })
    }
    // Initial placeholder while planner runs (under 500ms)
    return [
      { tool: 'planner_agent', name: 'Intent Planner', category: 'Reasoning', status: 'running' },
      { tool: 'weather_agent', name: 'Weather Agent', category: 'Meteorology', status: 'planned' },
      { tool: 'ocean_agent', name: 'Ocean State Agent', category: 'Metocean', status: 'planned' },
      { tool: 'safety_agent', name: 'Safety Rule Guard', category: 'Safety Limits', status: 'planned' },
      { tool: 'fusion_agent', name: 'Telemetry Fusion', category: 'Reconciler', status: 'planned' },
    ]
  }, [plannedAgents])

  // Compute stats
  const completedCount = normalizedAgents.filter(a => a.status === 'completed').length
  const runningCount = normalizedAgents.filter(a => a.status === 'running').length
  const totalCount = normalizedAgents.length

  // Real or interpolated progress
  const computedPct = useMemo(() => {
    if (progressPct > 0) return Math.min(98, Math.max(10, progressPct))
    if (totalCount === 0) return 15
    if (completedCount === 0) return runningCount > 0 ? 25 : 15
    const ratio = completedCount / totalCount
    return Math.min(96, Math.round(15 + ratio * 80))
  }, [progressPct, completedCount, runningCount, totalCount])

  // Current active display text
  const displayAction = useMemo(() => {
    if (activeAction) return activeAction
    const running = normalizedAgents.find(a => a.status === 'running')
    if (running) return `Executing ${running.name}...`
    if (completedCount > 0 && completedCount === totalCount) return 'Fusing multi-agent telemetry...'
    return 'Analyzing query & dispatching parallel agents...'
  }, [activeAction, normalizedAgents, completedCount, totalCount])

  return (
    <div className="w-full max-w-2xl bg-white/95 backdrop-blur-sm rounded-2xl p-3 sm:p-3.5 border border-sky-200 shadow-sm space-y-2.5 animate-in fade-in duration-200 relative overflow-hidden">
      
      {/* Top micro shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-oceanBlue via-cyan-400 to-emerald-400 animate-pulse" />

      {/* ── HEADER ROW (Compact Mascot + Status + Progress) ─────────────────── */}
      <div className="flex items-center gap-3 pt-0.5">
        
        {/* Compact 3D Dolphin Mascot */}
        <div className="relative flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-sky-50 border border-sky-200/80 shadow-2xs">
          <div className="animate-dolphin-swim">
            <Orca3DMascot size={32} isListening={true} showAura={false} interactive={false} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-white animate-ping" />
        </div>

        {/* Center Live Status & Micro Progress */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-oceanBlue/10 text-oceanBlue border border-oceanBlue/20 truncate max-w-[260px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping flex-shrink-0" />
              <span className="truncate">17. Agent Activity Stream · {intentConfig.badge}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {completedCount}/{totalCount} Agents
              </span>
              <span className="text-[11px] font-mono font-black text-oceanBlue">
                {computedPct}%
              </span>
            </div>
          </div>

          {/* Current Real Activity Text */}
          <div className="text-xs font-bold text-navy truncate flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin text-oceanBlue flex-shrink-0" />
            <span className="truncate">{displayAction}</span>
          </div>

          {/* Slim Glowing Progress Bar */}
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-oceanBlue to-emerald-400 transition-all duration-300 relative shadow-2xs"
              style={{ width: `${computedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── CONCURRENT LIVE AGENT ACTIVITY CHIPS (Real Telemetry) ─────────── */}
      <div className="pt-1.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5">
          <span className="flex items-center gap-1">
            <Activity size={10} className="text-emerald-500 animate-pulse" /> 17. Live Swarm Telemetry
          </span>
          <span className="text-[9px] font-mono font-medium text-emerald-600 lowercase bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
            ● live SSE streaming
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
          {normalizedAgents.map((ag) => {
            const isCompleted = ag.status === 'completed'
            const isRunning = ag.status === 'running'

            return (
              <div
                key={ag.tool}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all border ${
                  isCompleted
                    ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200/90 shadow-2xs'
                    : isRunning
                    ? 'bg-sky-50 text-oceanBlue border-sky-400 shadow-2xs ring-1 ring-sky-300 animate-pulse font-bold'
                    : 'bg-slate-50/70 text-slate-400 border-slate-200/60'
                }`}
                title={ag.summary ? `${ag.name}: ${ag.summary}` : ag.name}
              >
                {isCompleted ? (
                  <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                ) : isRunning ? (
                  <Loader2 size={11} className="animate-spin text-oceanBlue flex-shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                )}
                <span className="font-semibold truncate max-w-[140px]">{ag.name}</span>
                {isCompleted && ag.summary && (
                  <span className="hidden sm:inline text-[9px] font-mono text-emerald-700 font-normal px-1 py-0.2 bg-emerald-100/70 rounded-xs truncate max-w-[90px]">
                    {ag.summary}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
