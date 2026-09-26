import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Anchor,
  Clock,
  Waves,
  Wind,
  Zap,
  Gauge,
  Eye,
  Shield,
  Compass,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Landmark,
  Radio,
  FileCheck
} from 'lucide-react'

export default function DeterministicSafetyCard({ safetyData }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!safetyData) return null

  const {
    verdict = 'CAUTION',
    risk_score = 50,
    reasons = [],
    sources = [],
    hazard_breakdown = {},
    vessel_class = 'small_boat',
    vessel_profile = {},
    evaluated_time_ist = 'Current / Forecast Window',
    hard_stop_triggered = false
  } = safetyData

  // Classify verdict colors & badges
  const isNoGo = verdict === 'NO-GO' || hard_stop_triggered
  const isDangerous = verdict === 'DANGEROUS'
  const isCaution = verdict === 'CAUTION'
  const isSafe = verdict === 'SAFE'

  const verdictColorConfig = isNoGo
    ? {
        border: 'border-rose-300',
        bg: 'from-rose-50/80 via-white to-rose-50/30',
        badgeBg: 'bg-rose-600 text-white shadow-rose-200',
        textColor: 'text-rose-800',
        icon: AlertOctagon,
        label: 'NO-GO ⛔',
        sublabel: 'Mandatory Non-Negotiable Prohibition'
      }
    : isDangerous
    ? {
        border: 'border-red-300',
        bg: 'from-red-50/80 via-white to-red-50/30',
        badgeBg: 'bg-red-500 text-white shadow-red-200',
        textColor: 'text-red-800',
        icon: ShieldAlert,
        label: 'DANGEROUS 🔴',
        sublabel: 'Severe Maritime Hazards Exceed Seaworthiness'
      }
    : isCaution
    ? {
        border: 'border-amber-300',
        bg: 'from-amber-50/80 via-white to-amber-50/30',
        badgeBg: 'bg-amber-500 text-white shadow-amber-200',
        textColor: 'text-amber-800',
        icon: AlertTriangle,
        label: 'CAUTION 🟡',
        sublabel: 'Advisory Limits Approached - Venturing Restricted'
      }
    : {
        border: 'border-emerald-300',
        bg: 'from-emerald-50/80 via-white to-emerald-50/30',
        badgeBg: 'bg-emerald-600 text-white shadow-emerald-200',
        textColor: 'text-emerald-800',
        icon: ShieldCheck,
        label: 'SAFE 🟢',
        sublabel: 'All 8 Hazard Dimensions Within Operating Envelope'
      }

  const VerdictIcon = verdictColorConfig.icon

  // Helper for individual hazard tile states
  const getHazardBadge = (state) => {
    switch (state) {
      case 'NO-GO':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: '⛔' }
      case 'DANGEROUS':
        return { bg: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' }
      case 'CAUTION':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: '🟡' }
      case 'SAFE':
      default:
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '🟢' }
    }
  }

  // Hazard dimension icon resolver
  const getHazardIcon = (key) => {
    switch (key) {
      case 'wave_height':
        return Waves
      case 'wind_speed':
        return Wind
      case 'current_speed':
        return Gauge
      case 'lightning':
        return Zap
      case 'cyclone':
        return AlertOctagon
      case 'rain_visibility':
        return Eye
      case 'restricted_zones':
        return Shield
      case 'bathymetry':
        return Anchor
      default:
        return Compass
    }
  }

  const vName = vessel_profile.display_name || vessel_class.replace('_', ' ').toUpperCase()
  const vDraft = vessel_profile.design_draft_m ? `${vessel_profile.design_draft_m} m` : '0.6 m'
  const vLength = vessel_profile.typical_length_m || '< 10 m'

  return (
    <div
      className={`my-3 rounded-2xl border ${verdictColorConfig.border} bg-gradient-to-b ${verdictColorConfig.bg} p-4 shadow-sm text-navy transition-all duration-300`}
      id="deterministic-safety-card"
    >
      {/* ── 1. HEADER & IMMUTABLE GOVERNANCE BANNER ──────────────── */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/5 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-900 text-white shadow-sm">
              <Shield size={13} className="text-sky-300" />
              <span>Deterministic Safety Decision (#10)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/80 text-navy border border-black/10 flex items-center gap-1">
              <Anchor size={12} className="text-oceanBlue" />
              <span>{vName} ({vLength}, Draft: {vDraft})</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <FileCheck size={11} className="text-purple-600" />
              <span>Immutable Safety Rules Enforced</span>
            </span>
          </div>
          <div className="text-xs text-textSecond flex items-center gap-1.5 pt-0.5">
            <Clock size={12} className="text-textMuted" />
            <span>Evaluated Forecast Time: <strong>{evaluated_time_ist}</strong></span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-textMuted uppercase tracking-wider block">Decision Protocol</span>
          <span className="text-xs font-semibold text-oceanBlue">Deterministic Rule Engine v10.4</span>
        </div>
      </div>

      {/* ── 2. AUTHORITATIVE VERDICT & RISK SCORE HERO ───────────── */}
      <div className="my-4 rounded-xl bg-white/90 p-4 border border-black/5 shadow-xs flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${verdictColorConfig.badgeBg} shadow-md flex items-center justify-center`}>
            <VerdictIcon size={32} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-textMuted">Operational Decision</div>
            <div className="text-2xl font-black tracking-tight text-navy flex items-center gap-2">
              <span>{verdictColorConfig.label}</span>
            </div>
            <p className="text-xs font-medium text-textSecond">{verdictColorConfig.sublabel}</p>
          </div>
        </div>

        {/* Risk score gauge */}
        <div className="w-full sm:w-48 bg-navy/5 rounded-xl p-3 border border-black/5 flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-textMuted">Risk Score</span>
            <span className={`font-mono text-sm font-extrabold ${risk_score >= 70 ? 'text-rose-600' : risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {risk_score} / 100
            </span>
          </div>
          <div className="w-full bg-black/10 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                risk_score >= 70 ? 'bg-rose-500' : risk_score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, risk_score))}%` }}
            />
          </div>
          <div className="text-[10px] text-textMuted text-right mt-1 font-medium">
            {risk_score <= 28 ? 'Safe Envelope' : risk_score <= 65 ? 'Elevated Hazard' : 'Severe Operating Hazard'}
          </div>
        </div>
      </div>

      {/* ── 3. CLEAR ATOMIC REASONS (MANDATORY REQUIREMENT) ──────── */}
      {reasons && reasons.length > 0 && (
        <div className="my-3 rounded-xl bg-white/70 p-3.5 border border-black/5">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-navy">
            <AlertTriangle size={13} className="text-amber-600" />
            <span>Clear Deterministic Reasons</span>
          </div>
          <ul className="space-y-1.5 text-xs text-navy/90 font-medium">
            {reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-rose-500 font-bold leading-none mt-0.5">•</span>
                <span className="leading-snug">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 4. 8 HAZARD DIMENSIONS BREAKDOWN GRID ────────────────── */}
      {hazard_breakdown && Object.keys(hazard_breakdown).length > 0 && (
        <div className="my-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-textMuted mb-2 flex items-center justify-between">
            <span>Evaluated Hazard Dimensions (8 Parameters)</span>
            <span className="text-[10px] font-normal text-textMuted">Vessel-Specific Limits Applied</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(hazard_breakdown).map(([hazardKey, h]) => {
              const IconComp = getHazardIcon(hazardKey)
              const badge = getHazardBadge(h.state)
              return (
                <div
                  key={hazardKey}
                  className="rounded-xl border border-black/5 bg-white/80 p-2.5 flex flex-col justify-between hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-navy truncate">
                      <IconComp size={12} className="text-oceanBlue shrink-0" />
                      <span className="truncate">{h.label || hazardKey}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${badge.bg}`}>
                      {badge.icon} {h.state}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    <div className="text-[11px] font-semibold text-navy truncate">
                      Observed: <span className="font-mono text-textPrimary">{h.observed}</span>
                    </div>
                    <div className="text-[10px] text-textMuted truncate">
                      Safe Limit: <span className="font-mono">{h.safe_limit}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 5. AUTHORITATIVE INSTITUTIONAL SOURCES ───────────────── */}
      {sources && sources.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-black/5 flex items-start gap-2 text-[11px] text-textSecond flex-wrap">
          <span className="font-bold text-navy flex items-center gap-1 shrink-0">
            <Landmark size={12} className="text-indigo-600" />
            <span>Sources:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-white/90 border border-black/5 text-[10px] font-medium text-navy/80"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. ACCORDION: VESSEL THRESHOLDS & SPECIFICATION ──────── */}
      <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-oceanBlue hover:text-navy font-semibold flex items-center gap-1 transition-colors"
          type="button"
        >
          <span>{showDetails ? 'Hide Vessel Operating Envelope' : 'View Vessel Thresholds & Envelope'}</span>
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <span className="text-[10px] text-textMuted">Deterministic Rule ID: #10-DSE</span>
      </div>

      {showDetails && (
        <div className="mt-3 p-3 rounded-xl bg-white/95 border border-black/5 text-xs space-y-2">
          <div className="font-bold text-navy">{vName} Operating Envelope</div>
          <p className="text-[11px] text-textSecond">{vessel_profile.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded bg-navy/5">
              <span className="text-[10px] text-textMuted block">Typical Length</span>
              <span className="font-semibold">{vLength}</span>
            </div>
            <div className="p-2 rounded bg-navy/5">
              <span className="text-[10px] text-textMuted block">Design Draft</span>
              <span className="font-semibold">{vDraft}</span>
            </div>
            <div className="p-2 rounded bg-navy/5">
              <span className="text-[10px] text-textMuted block">Max Safe Wave</span>
              <span className="font-semibold">{vessel_profile.thresholds?.wave_height_m?.safe_max ?? 1.0} m</span>
            </div>
            <div className="p-2 rounded bg-navy/5">
              <span className="text-[10px] text-textMuted block">Max Safe Wind</span>
              <span className="font-semibold">{vessel_profile.thresholds?.wind_speed_kmh?.safe_max ?? 20} km/h</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
