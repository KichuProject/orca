import React, { useState } from 'react'
import {
  ShieldAlert,
  Anchor,
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Waves,
  Wind,
  Zap,
  ArrowRight,
  Fish,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertOctagon,
  LifeBuoy,
  HelpCircle,
  Sparkles,
  Gauge
} from 'lucide-react'

export default function ContextualReasoningCard({ contextualData }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!contextualData) return null

  const {
    reasoning_mode = 'composite_seaworthiness',
    context = {},
    decision = 'CAUTION',
    verdict = 'CAUTION ADVISED 🟡',
    headline = '',
    summary = '',
    actionable_advice = '',
    advice = '',
    risk_analysis = {},
    round_trip_analysis = null,
    round_trip = null,
    safe_targets = null,
    filtered_pfz = null,
    unsuitable_diagnostic = null,
    diagnostic = null,
    source = 'ORCA Contextual Reasoning Engine #9'
  } = contextualData

  // Resolve sub-objects from aliases
  const rtData = round_trip_analysis || round_trip
  const pfzData = safe_targets || filtered_pfz
  const diagData = unsuitable_diagnostic || diagnostic

  const vesselType = context.vessel_type || 'small_boat'
  const vesselName = context.vessel_name || (context.vessel_envelope ? context.vessel_envelope.name : 'Small Craft')
  const originLoc = context.origin_location || 'Coastal Base'
  const evalTimeIst = context.departure_time?.formatted_ist || contextualData.evaluated_time_ist || 'Evaluated Window (IST)'

  const riskScore = risk_analysis?.compound_risk_score ?? 65
  const compoundingMult = risk_analysis?.compounding_multiplier ?? 1.0
  const isDelayRecommended = contextualData.delay_recommended || riskScore >= 70

  // Decision style helpers
  const isDangerous = decision === 'DANGEROUS' || verdict.includes('DANGEROUS') || verdict.includes('🚫') || verdict.includes('HOLD')
  const isCaution = !isDangerous && (decision === 'CAUTION' || verdict.includes('CAUTION') || verdict.includes('🟡'))
  const isSafe = !isDangerous && !isCaution

  const badgeBg = isDangerous
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : isCaution
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-800'

  const scoreBarColor = riskScore >= 70 ? 'bg-rose-500' : riskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'

  // Extract telemetry from threshold_eval if available
  const thresholdEval = contextualData.threshold_eval || contextualData.composite?.threshold_eval
  const telemetryList = thresholdEval?.telemetry || []

  return (
    <div className="my-3 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/20 p-4 shadow-sm text-navy">
      {/* ── 1. HEADER & MULTI-TURN CONTEXT BANNER ────────────────────── */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-indigo-100/70 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100/80 text-indigo-900 border border-indigo-200">
              <Anchor size={13} className="text-indigo-600 animate-pulse" />
              <span>Contextual Reasoning Engine (#9)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/5 text-navy border border-navy/10 flex items-center gap-1">
              <Compass size={11} className="text-oceanBlue" />
              <span>Vessel: {vesselName}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
              <MapPin size={11} className="text-sky-600" />
              <span>Port: {originLoc}</span>
            </span>
          </div>
          <div className="text-xs text-textSecond flex items-center gap-1.5 pt-0.5">
            <Clock size={12} className="text-textMuted" />
            <span>Operational Horizon:</span>
            <span className="font-semibold text-navy bg-white px-2 py-0.5 rounded border border-indigo-100 font-mono text-[11px]">
              {evalTimeIst}
            </span>
          </div>
        </div>

        {/* Compound Verdict Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${badgeBg}`}>
          {isDangerous ? (
            <XCircle size={15} className="text-rose-600" />
          ) : isCaution ? (
            <AlertTriangle size={15} className="text-amber-600" />
          ) : (
            <CheckCircle2 size={15} className="text-emerald-600" />
          )}
          <span>{verdict}</span>
        </div>
      </div>

      {/* ── 2. COMPOUND RISK METER & HEADLINE CALLOUT ───────────────── */}
      <div className="mt-3 p-3 rounded-xl bg-white border border-indigo-100/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <span className="font-bold text-navy flex items-center gap-1.5">
            <Gauge size={13} className="text-indigo-600" />
            Compound Seaworthiness Risk Index
          </span>
          <div className="flex items-center gap-2">
            {compoundingMult > 1.0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {compoundingMult}x Multi-Hazard Penalty
              </span>
            )}
            <span className="font-extrabold text-xs font-mono text-navy">
              {riskScore}/100
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
            style={{ width: `${Math.min(100, Math.max(8, riskScore))}%` }}
          />
        </div>

        {/* Headline reasoning */}
        <div className="text-xs leading-relaxed text-slate-700 pt-1 border-t border-slate-100">
          <span className="font-bold text-navy mr-1">Compound Factor Synthesis:</span>
          {headline || summary || 'Evaluated live metocean conditions against craft seaworthiness envelopes.'}
        </div>

        {/* Actionable Advice Box */}
        {(actionable_advice || advice) && (
          <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs font-semibold text-indigo-900 flex items-start gap-1.5">
            <LifeBuoy size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-950">Actionable Operational Decision:</span>{' '}
              {actionable_advice || advice}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. LIVE VESSEL THRESHOLD COMPARISON GAUGES ───────────────── */}
      {telemetryList.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-bold text-textSecond uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span>Craft Limits vs Live Sea State</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {telemetryList.slice(0, 4).map((item, idx) => {
              const isBreached = item.status === 'DANGEROUS'
              const isItemCaution = item.status === 'CAUTION'
              const itemBorder = isBreached
                ? 'border-rose-200 bg-rose-50/40'
                : isItemCaution
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-100 bg-white'

              return (
                <div key={idx} className={`p-2.5 rounded-xl border shadow-2xs ${itemBorder}`}>
                  <div className="text-[10px] text-textMuted font-medium truncate mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm font-extrabold text-navy">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-textSecond flex items-center justify-between mt-1">
                    <span>Limit: {item.limit}</span>
                    <span className={`font-bold ${isBreached ? 'text-rose-600' : isItemCaution ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 4. ASYMMETRIC ROUND-TRIP VOYAGE PANEL (IF APPLICABLE) ───── */}
      {rtData && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-sky-200 shadow-2xs text-xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="font-bold text-navy flex items-center gap-1.5">
              <Clock size={13} className="text-oceanBlue" />
              Asymmetric Round-Trip Voyage Analysis
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-oceanBlue border border-sky-200">
              {rtData.round_trip_status || rtData.round_trip_verdict || 'EVALUATED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Outbound leg */}
            <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between mb-1">
                <span>Outbound Leg ({rtData.outbound_leg?.time_ist || 'Morning'})</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                  {rtData.outbound_leg?.status || 'SAFE 🟢'}
                </span>
              </div>
              <div className="text-xs text-emerald-950 font-semibold space-y-0.5">
                <div>Wave Height: {rtData.outbound_leg?.wave_m ?? 0.8} m</div>
                <div>Sustained Wind: {rtData.outbound_leg?.wind_kmh ?? 12} km/h</div>
              </div>
            </div>

            {/* Return leg */}
            <div className={`p-2.5 rounded-xl ${rtData.outbound_leg?.status === 'SAFE' && rtData.return_leg?.status !== 'SAFE' ? 'bg-amber-50/60 border border-amber-300' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="text-[11px] font-bold text-navy flex items-center justify-between mb-1">
                <span>Return Voyage ({rtData.return_leg?.time_ist || 'Evening / 5 PM'})</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${rtData.return_leg?.status === 'DANGEROUS' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {rtData.return_leg?.status || 'CAUTION 🟡'}
                </span>
              </div>
              <div className="text-xs text-slate-800 font-semibold space-y-0.5">
                <div>Wave Height: {rtData.return_leg?.wave_m ?? 1.4} m</div>
                <div>Sustained Wind: {rtData.return_leg?.wind_kmh ?? 24} km/h</div>
              </div>
            </div>
          </div>

          {/* Asymmetry advice */}
          <div className="p-2 rounded-lg bg-sky-50 text-[11px] text-sky-950 border border-sky-100">
            <span className="font-bold">Voyage Advisory:</span> {rtData.recommendation || rtData.advisory}
          </div>
        </div>
      )}

      {/* ── 5. SAFE PFZ FILTERING PANEL (IF APPLICABLE) ──────────────── */}
      {pfzData && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-emerald-100 shadow-2xs text-xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="font-bold text-navy flex items-center gap-1.5">
              <Fish size={13} className="text-emerald-600" />
              Seaworthiness & Range Filtered PFZs ({vesselName})
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {pfzData.safe_count || pfzData.safe_targets?.length || 0} Safe / {pfzData.total_evaluated || 3} Evaluated
            </span>
          </div>

          <div className="text-[11px] text-textSecond">
            {pfzData.summary}
          </div>

          {/* Safe PFZ List */}
          <div className="space-y-1.5 pt-1">
            {(pfzData.safe_targets || pfzData.safe_pfzs || []).map((zone, i) => (
              <div key={i} className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-950">{zone.name || `PFZ Zone #${i+1}`}</span>
                  <div className="text-[10px] text-emerald-800">
                    Distance: {zone.distance_km} km · Wave: {zone.wave_height_m}m
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                  SAFE TO VENTURE 🟢
                </span>
              </div>
            ))}

            {/* Excluded PFZ List summary */}
            {(pfzData.excluded_targets || pfzData.excluded_pfzs || []).slice(0, 2).map((zone, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs opacity-75">
                <div>
                  <span className="font-bold text-slate-700">{zone.name || `Offshore Zone #${i+1}`}</span>
                  <div className="text-[10px] text-slate-500">
                    {zone.exclusion_reason || (zone.exclusion_reasons ? zone.exclusion_reasons[0] : 'Exceeds craft safe range / wave limits')}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  EXCLUDED ❌
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. UNSUITABILITY DIAGNOSTIC PANEL (IF APPLICABLE) ─────────── */}
      {diagData && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-rose-200 shadow-2xs text-xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="font-bold text-navy flex items-center gap-1.5">
              <HelpCircle size={13} className="text-rose-600" />
              Operational Unsuitability Root-Cause Diagnostics
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              {diagData.verdict || 'UNSUITABLE'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100 text-xs text-rose-950 font-semibold">
            <span className="font-bold">Primary Limitation:</span> {diagData.primary_cause || diagData.summary}
          </div>

          {/* Diagnostic factors */}
          <div className="space-y-1.5 pt-1">
            {(diagData.limiting_factors || diagData.diagnostic_factors || []).map((factor, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                <div className="flex items-center justify-between font-bold text-navy text-[11px]">
                  <span>{factor.dimension || factor.factor}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${factor.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {factor.severity || 'MODERATE'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700">
                  {factor.message || factor.causal_explanation}
                </div>
                {(factor.observed_value || factor.observation) && (
                  <div className="text-[10px] text-textMuted font-mono">
                    Observed: {factor.observed_value || factor.observation} | Limit: {factor.threshold_limit || factor.vessel_tolerance}
                  </div>
                )}
              </div>
            ))}
          </div>

          {diagData.mitigation_advice && (
            <div className="text-[11px] text-slate-700 bg-sky-50 p-2 rounded border border-sky-100">
              <span className="font-bold text-navy">Mitigation / Stand-Down Window:</span> {diagData.mitigation_advice}
            </div>
          )}
        </div>
      )}

      {/* ── 7. PROVENANCE FOOTER ─────────────────────────────────────── */}
      <div className="mt-3 pt-2.5 border-t border-indigo-100/70 flex items-center justify-between text-[10px] text-textMuted flex-wrap gap-2">
        <span className="flex items-center gap-1 font-medium">
          <Sparkles size={11} className="text-indigo-600" />
          Verified via INCOIS High Wave & PFZ · Open-Meteo IFS Marine · DG Shipping Seaworthiness Matrix
        </span>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-oceanBlue hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
        >
          <span>{showDetails ? 'Hide JSON Telemetry' : 'View Seaworthiness Details'}</span>
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showDetails && (
        <pre className="mt-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-48">
          {JSON.stringify(contextualData, null, 2)}
        </pre>
      )}
    </div>
  )
}
