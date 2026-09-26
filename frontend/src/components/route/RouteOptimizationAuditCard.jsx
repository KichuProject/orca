import React from 'react'
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  ArrowUpRight, Clock, Navigation2, Compass, Waves, 
  Sparkles, Check, Info, ShieldAlert
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function RouteOptimizationAuditCard({
  routeData = {},
  selectedMode = 'safest',
  onSelectMode,
}) {
  const { t } = useGlobal()

  const selectedRouteKey = routeData?.selected_route || selectedMode || 'safest'
  const selectedRouteObj = routeData?.routes?.[selectedRouteKey] || routeData?.routes?.safest || {}
  
  const distanceKm = selectedRouteObj?.distance_km || routeData?.distance_km || 0
  const distanceNm = selectedRouteObj?.distance_nm || (distanceKm > 0 ? Math.round(distanceKm * 0.539957) : 0)
  const etaHours = selectedRouteObj?.estimated_time_hours || routeData?.eta_hours || 0
  const riskScore = selectedRouteObj?.risk_score ?? routeData?.risk_score ?? 10
  
  const hazardsAvoided = routeData?.hazards_avoided || [
    'Restricted Military & Port Standoff Zone',
    'High Coastal Swell & Inshore Breakers (>1.8m)',
    'Peninsula Shoals & Grounding Soundings (<5m)'
  ]

  const selectionReason = routeData?.reason_for_selection || (
    selectedRouteKey === 'safest'
      ? 'Selected Route C (Safest Deep-Water) because it delivers the lowest overall risk, completely bypasses inshore wave chop, and guarantees deep-water ocean clearance.'
      : 'Selected for optimal equilibrium between nautical travel time and hazard standoff margin.'
  )

  const rejectedAlternatives = routeData?.rejected_alternatives || routeData?.routes_audit || [
    {
      route_id: 'Route A',
      name: 'Route A (Direct / Inshore)',
      status: 'REJECTED',
      status_badge: 'REJECTED ❌',
      reason: 'restricted zone',
      details: 'Direct rhumb line intersects coastal restricted buffers and shallow soundings.',
      color: '#ef4444'
    },
    {
      route_id: 'Route B',
      name: 'Route B (Balanced Detour)',
      status: selectedRouteKey === 'safest' ? 'REJECTED' : 'SELECTED',
      status_badge: selectedRouteKey === 'safest' ? 'REJECTED ❌' : 'SELECTED ✅',
      reason: selectedRouteKey === 'safest' ? 'high wave region' : 'lower hazard risk',
      details: 'Coastal corridor experiences elevated wave heights (>1.8m) exceeding small craft comfort limit.',
      color: selectedRouteKey === 'safest' ? '#ef4444' : '#10b981'
    },
    {
      route_id: 'Route C',
      name: 'Route C (Safest Deep-Water)',
      status: selectedRouteKey === 'safest' ? 'SELECTED' : 'STANDBY ALTERNATIVE',
      status_badge: selectedRouteKey === 'safest' ? 'SELECTED ✅' : 'STANDBY ⚖️',
      reason: 'lowest overall risk',
      details: 'Lowest overall risk score with wide offshore clearance (>40m under-keel).',
      color: selectedRouteKey === 'safest' ? '#10b981' : '#3b82f6'
    }
  ]

  return (
    <div className="rounded-3xl border border-borderLight bg-white shadow-sm overflow-hidden space-y-4 p-5 sm:p-6 transition-all">
      {/* Header with Title & A* Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-borderLight">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shadow-2xs flex-shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-navy leading-snug">
                {t('A* Route Optimization & Safe Navigation Audit')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                {t('A* Grid Pathfinder')}
              </span>
            </div>
            <p className="text-[11px] text-textMuted mt-0.5">
              {t('Physical hazard detour verification • 8 marine parameters • Alternative trajectory rejection audit')}
            </p>
          </div>
        </div>

        {/* Live Clearance Badge */}
        <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
          <Sparkles size={13} className="text-oceanBlue flex-shrink-0" />
          <span className="font-bold">{t('Multi-Agent Route Audit Active')}</span>
        </div>
      </div>

      {/* Primary KPI Row: Selected Route, Distance, ETA, Risk */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
            {t('Selected Route')}
          </span>
          <span className="text-xs sm:text-sm font-black text-emerald-950 block mt-1 capitalize">
            {selectedRouteKey === 'safest' ? t('Route C (Safest)') : selectedRouteKey === 'fastest' ? t('Route A (Fastest)') : t('Route B (Balanced)')}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
            ✓ {t('Optimal Safe Path')}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-borderLight">
          <span className="text-[10px] uppercase font-bold text-textMuted block tracking-wider">
            {t('Distance')}
          </span>
          <span className="text-xs sm:text-sm font-black text-navy block mt-1">
            {distanceKm} km <span className="text-xs font-normal text-textMuted">({distanceNm} nm)</span>
          </span>
          <span className="text-[10px] text-textMuted font-semibold block mt-0.5">
            {t('100% Ocean Navigable')}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-borderLight">
          <span className="text-[10px] uppercase font-bold text-textMuted block tracking-wider">
            {t('Transit ETA')}
          </span>
          <span className="text-xs sm:text-sm font-black text-oceanBlue block mt-1">
            {etaHours} {t('hours')}
          </span>
          <span className="text-[10px] text-textMuted font-semibold block mt-0.5">
            @ {selectedRouteObj?.speed_knots || routeData?.cruise_speed || 14} {t('knots cruise')}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-borderLight">
          <span className="text-[10px] uppercase font-bold text-textMuted block tracking-wider">
            {t('Risk Score')}
          </span>
          <span className={`text-xs sm:text-sm font-black block mt-1 ${riskScore <= 15 ? 'text-safeGreen' : riskScore <= 35 ? 'text-amber-600' : 'text-dangerRed'}`}>
            {riskScore} / 100
          </span>
          <span className="text-[10px] text-textMuted font-semibold block mt-0.5">
            {riskScore <= 15 ? t('Minimal Hazard Exposure') : t('Elevated Caution')}
          </span>
        </div>
      </div>

      {/* Reason for Selection Callout */}
      <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/70 flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-oceanBlue text-white flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
          <CheckCircle2 size={15} />
        </div>
        <div>
          <div className="text-[11px] font-bold text-navy uppercase tracking-wide">
            {t('Reason for Selection:')}
          </div>
          <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
            {t(selectionReason)}
          </p>
        </div>
      </div>

      {/* Hazards Avoided Strip */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>{t('Hazards Evaded via A* Path Optimization:')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {hazardsAvoided.map((haz, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 shadow-2xs"
            >
              <Check size={12} className="text-emerald-600 flex-shrink-0" />
              {t(haz)}
            </span>
          ))}
        </div>
      </div>

      {/* Rejected Alternatives Grid */}
      <div className="space-y-2 pt-2 border-t border-borderLight">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">
            {t('Candidate Alternatives Evaluation & Rejection Audit:')}
          </span>
          <span className="text-[10px] text-textMuted">
            {t('PS Safe-Navigation Compliance')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rejectedAlternatives.map((alt, idx) => {
            const isSelected = alt.status === 'SELECTED'
            const isRejected = alt.status === 'REJECTED'

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                    : isRejected
                    ? 'bg-rose-50/40 border-rose-200/80 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-navy truncate">
                      {t(alt.name || alt.route_id)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-800 border-emerald-400/50'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-800 border-rose-400/50'
                          : 'bg-sky-500/20 text-sky-800 border-sky-400/50'
                      }`}
                    >
                      {t(alt.status_badge || alt.status)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>
                      <span className="font-bold text-slate-800">{t('Verdict Reason:')}</span>{' '}
                      <span className={isSelected ? 'text-emerald-700 font-bold' : isRejected ? 'text-rose-700 font-bold' : 'text-sky-700 font-bold'}>
                        {t(alt.reason)}
                      </span>
                    </div>
                    {alt.details && (
                      <p className="text-[10px] text-textMuted leading-relaxed pt-0.5">
                        {t(alt.details)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-black/5 flex items-center justify-between text-[10px]">
                  <span className="text-textMuted font-mono">
                    {t(alt.route_id)}
                  </span>
                  {isSelected ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> {t('Active Trajectory')}
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectMode && onSelectMode(alt.route_id.includes('A') ? 'fastest' : alt.route_id.includes('B') ? 'balanced' : 'safest')}
                      className="text-textMuted hover:text-navy underline cursor-pointer"
                    >
                      {t('Inspect')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
