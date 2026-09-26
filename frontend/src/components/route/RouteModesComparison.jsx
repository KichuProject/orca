import React from 'react'
import { Zap, ShieldCheck, Scale, Clock, Fuel, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function RouteModesComparison({
  routes = {},
  selectedMode = 'balanced',
  onSelectMode,
}) {
  const { t } = useGlobal()
  const fastest = routes.fastest || {
    distNm: 325,
    distKm: 601,
    etaHours: 21.7,
    fuelLiters: 1450,
    riskScore: 68,
    riskLevel: 'ELEVATED',
    color: '#f59e0b',
    label: 'Fastest Route',
    sub: 'Direct rhumb-line corridor',
  }

  const safest = routes.safest || {
    distNm: 358,
    distKm: 663,
    etaHours: 23.9,
    fuelLiters: 1590,
    riskScore: 12,
    riskLevel: 'MINIMAL RISK',
    color: '#00c853',
    label: 'Safest Route',
    sub: 'Offshore detour avoiding shallow buffers',
  }

  const balanced = routes.balanced || {
    distNm: 338,
    distKm: 626,
    etaHours: 22.5,
    fuelLiters: 1505,
    riskScore: 24,
    riskLevel: 'OPTIMAL SAFE',
    color: '#1e60d5',
    label: 'Balanced Route',
    sub: 'Recommended fuel & safety equilibrium',
  }

  const modeCards = [
    { id: 'fastest', data: fastest, icon: Zap, border: 'border-amber-400', badge: 'Minimum Time' },
    { id: 'balanced', data: balanced, icon: Scale, border: 'border-oceanBlue', badge: 'Recommended Choice' },
    { id: 'safest', data: safest, icon: ShieldCheck, border: 'border-safeGreen', badge: 'Maximum Buffer' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
          {t ? t('Multi-Criteria Route Evaluation (3 Profiles)', 'Multi-Criteria Route Evaluation (3 Profiles)') : 'Multi-Criteria Route Evaluation (3 Profiles)'}
        </h3>
        <span className="text-[10px] text-textMuted font-semibold">
          {t ? t('Click any card to inspect waypoints on map', 'Click any card to inspect waypoints on map') : 'Click any card to inspect waypoints on map'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modeCards.map(c => {
          const isSelected = selectedMode === c.id
          const Icon = c.icon
          const d = c.data

          return (
            <div
              key={c.id}
              onClick={() => onSelectMode(c.id)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                isSelected
                  ? `bg-white shadow-lg ${c.border} ring-2 ring-offset-1 ring-oceanBlue/30`
                  : 'bg-white/80 hover:bg-white border-borderLight shadow-2xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: d.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-navy">{t ? t(d.label, d.label) : d.label}</h4>
                    <p className="text-[10px] text-textMuted leading-tight">{t ? t(d.sub, d.sub) : d.sub}</p>
                  </div>
                </div>

                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-2xs"
                  style={{ backgroundColor: d.color }}
                >
                  {t ? t(c.badge, c.badge) : c.badge}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-surface border border-borderLight/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-textMuted font-sans block">{t ? t('Distance:', 'Distance:') : 'Distance:'}</span>
                  <span className="font-bold text-navy">{d.distNm} nm</span>
                  <span className="text-[10px] text-textMuted block">({d.distKm} km)</span>
                </div>
                <div>
                  <span className="text-[10px] text-textMuted font-sans block">{t ? t('Transit ETA:', 'Transit ETA:') : 'Transit ETA:'}</span>
                  <span className="font-bold text-oceanBlue flex items-center gap-1">
                    <Clock size={11} /> {d.etaHours} hrs
                  </span>
                </div>
                <div className="pt-1.5 border-t border-borderLight/60">
                  <span className="text-[10px] text-textMuted font-sans block">{t ? t('Fuel Est:', 'Fuel Est:') : 'Fuel Est:'}</span>
                  <span className="font-bold text-navy flex items-center gap-1">
                    <Fuel size={11} /> {d.fuelLiters} L
                  </span>
                </div>
                <div className="pt-1.5 border-t border-borderLight/60">
                  <span className="text-[10px] text-textMuted font-sans block">{t ? t('Risk & Keel:', 'Risk & Keel:') : 'Risk & Keel:'}</span>
                  <span className={`font-bold ${d.riskScore > 30 ? 'text-warnAmber' : 'text-safeGreen'}`}>
                    {d.riskScore}/100 {d.min_depth_m ? `(>${d.min_depth_m}m)` : ''}
                  </span>
                </div>
              </div>

              {/* Status footer */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-borderLight/50">
                <span className="font-semibold text-textSecond">{t ? t(d.riskLevel, d.riskLevel) : d.riskLevel}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-oceanBlue underline' : 'text-textMuted'}`}>
                  {isSelected ? (t ? t('Active Selection', 'Active Selection') : 'Active Selection') : (t ? t('Select', 'Select') : 'Select')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
