import React, { useState, useEffect } from 'react'
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Wind,
  CloudLightning,
  Waves,
  MapPin,
  Compass,
  CheckCircle2,
  CheckCheck,
  X,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Zap,
  RotateCcw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  isLoading = false,
  refetchNotifications,
  activeOverridesCount = 0
}) {
  const navigate = useNavigate()
  const {
    t,
    location,
    seenAlertIds,
    dismissedAlertIds,
    markAlertsAsSeen,
    markAlertAsUnseen,
    dismissAlert
  } = useGlobal()
  const [filter, setFilter] = useState('ALL') // 'ALL', 'CRITICAL', 'WARNING', 'SIMULATED'
  const [isSimulating, setIsSimulating] = useState(false)
  const [simMessage, setSimMessage] = useState(null)

  // Mark all active notifications as seen when the notification panel is opened
  useEffect(() => {
    if (isOpen && notifications.length > 0 && markAlertsAsSeen) {
      markAlertsAsSeen(notifications.map(n => n.id))
    }
  }, [isOpen, notifications, markAlertsAsSeen])

  if (!isOpen) return null

  const handleSimulate = async (ruleId, state = true) => {
    setIsSimulating(true)
    setSimMessage(null)
    try {
      const res = await endpoints.notificationsSimulate({ rule_id: ruleId, state })
      if (ruleId === 'reset_all') {
        setSimMessage('✓ Reverted to 100% live sensor telemetry')
      } else {
        setSimMessage(`⚡ Simulated condition triggered: ${res.data?.rule_name || ruleId}`)
        if (markAlertAsUnseen) {
          markAlertAsUnseen(ruleId)
          if (res.data?.id) markAlertAsUnseen(res.data.id)
        }
      }
      if (refetchNotifications) {
        await refetchNotifications()
      }
      setTimeout(() => setSimMessage(null), 3500)
    } catch (e) {
      console.error('Simulation error:', e)
      setSimMessage('⚠️ Simulation call failed')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleDismiss = (id) => {
    if (dismissAlert) {
      dismissAlert(id)
    }
  }

  const visibleNotifications = notifications
    .filter(n => !dismissedAlertIds?.has(n.id))
    .filter(n => {
      if (filter === 'CRITICAL') return n.severity === 'CRITICAL'
      if (filter === 'WARNING') return n.severity === 'WARNING'
      if (filter === 'SIMULATED') return n.is_simulated
      return true
    })

  const unreadCount = visibleNotifications.filter(n => !seenAlertIds?.has(n.id)).length
  const criticalCount = visibleNotifications.filter(n => n.severity === 'CRITICAL').length
  const warningCount = visibleNotifications.filter(n => n.severity === 'WARNING').length

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            🔴 CRITICAL
          </span>
        )
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            🟠 WARNING
          </span>
        )
      case 'OPPORTUNITY':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            🟢 OPPORTUNITY
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
            🟡 ADVISORY
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-navy/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-slate-900/95 border border-slate-700/70 text-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl animate-in slide-in-from-top-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top Header Strip ─────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 via-amber-500/20 to-blue-500/20 border border-slate-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400 animate-swing" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-md border-2 border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  In-Dashboard Notification Engine
                </h3>
                {activeOverridesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeOverridesCount} Simulated
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluates 10 continuous maritime condition rules across {location.name || 'active sector'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Notification Center"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Hackathon Judge Simulator Strip ───────────────────────── */}
        <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border-b border-slate-800/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
              <Zap size={13} className="text-amber-400 animate-pulse" />
              <span>⚡ Condition Engine Simulator (Judge Demonstration):</span>
            </div>
            {activeOverridesCount > 0 && (
              <button
                onClick={() => handleSimulate('reset_all')}
                disabled={isSimulating}
                className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw size={10} />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              onClick={() => handleSimulate('high_wave')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 transition-all font-medium cursor-pointer"
            >
              🌊 Wave Exceeded (&gt; 2.8m)
            </button>
            <button
              onClick={() => handleSimulate('cyclone_warning')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-red-600/30 border border-slate-700 hover:border-red-500/50 text-slate-200 hover:text-red-300 transition-all font-medium cursor-pointer"
            >
              🌀 Cyclone (988 hPa)
            </button>
            <button
              onClick={() => handleSimulate('lightning_convection')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-yellow-600/30 border border-slate-700 hover:border-yellow-500/50 text-slate-200 hover:text-yellow-300 transition-all font-medium cursor-pointer"
            >
              ⚡ Lightning CAPE
            </button>
            <button
              onClick={() => handleSimulate('swell_surge')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-cyan-600/30 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all font-medium cursor-pointer"
            >
              〰️ Kallakkadal Surge
            </button>
            <button
              onClick={() => handleSimulate('pfz_opportunity')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 transition-all font-medium cursor-pointer"
            >
              🐟 PFZ Discovery
            </button>
          </div>

          {simMessage && (
            <div className="mt-2 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-in fade-in duration-150">
              <Sparkles size={12} className="text-amber-400 animate-spin" />
              <span>{simMessage}</span>
            </div>
          )}
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold">Filter:</span>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All ({visibleNotifications.length})
            </button>
            <button
              onClick={() => setFilter('CRITICAL')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                filter === 'CRITICAL'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilter('WARNING')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                filter === 'WARNING'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {visibleNotifications.length > 0 && (
              <button
                onClick={() => markAlertsAsSeen(visibleNotifications.map(n => n.id))}
                className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Mark all active alerts as read"
              >
                <CheckCheck size={11} className="text-emerald-400" />
                <span>Mark seen</span>
              </button>
            )}
            <button
              onClick={refetchNotifications}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
              title="Refresh Notification State"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* ── Notifications Scrollable List ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/60 custom-scrollbar">
          {visibleNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">All Clear — No Hazardous Triggers</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  The condition engine is continuously evaluating 10 maritime safety parameters. Use the simulator above to test condition triggers.
                </p>
              </div>
            </div>
          ) : (
            visibleNotifications.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`pt-3 first:pt-0 p-3.5 rounded-2xl border transition-all ${
                  item.severity === 'CRITICAL'
                    ? 'bg-red-950/20 border-red-500/30'
                    : item.severity === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : item.severity === 'OPPORTUNITY'
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{item.icon || '⚠️'}</span>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getSeverityBadge(item.severity)}
                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="text-slate-500 hover:text-slate-300 p-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Dismiss notification"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Condition Rule Box */}
                <div className="mt-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono text-[10.5px] text-amber-200/90 leading-relaxed flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">CONDITION:</span>
                  <span className="truncate">{item.condition}</span>
                </div>

                {/* Directive & Value */}
                <div className="mt-2 text-xs text-slate-200 leading-relaxed font-medium">
                  {item.directive}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">{item.live_reading}</span>
                    <span>•</span>
                    <span className="text-slate-400">{item.source}</span>
                  </div>
                  <span className="font-mono text-slate-400">{item.timestamp_ist}</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose()
                      navigate('/alerts')
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>View in Alerts Panel</span>
                    <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => {
                      onClose()
                      navigate('/ocean')
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Map View</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Bottom Summary Footer ─────────────────────────────────── */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-safeGreen animate-ping" />
            <span className="text-[11px] font-semibold text-slate-300">
              ORCA Proactive Engine: 10 Rules Online
            </span>
          </div>
          <button
            onClick={() => {
              onClose()
              navigate('/alerts')
            }}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            Full Hazard Surveillance &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
