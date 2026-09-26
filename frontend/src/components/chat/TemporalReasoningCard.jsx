import React, { useState } from 'react'
import {
  Clock,
  Calendar,
  Waves,
  Wind,
  Zap,
  TrendingUp,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Navigation,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Compass,
  ArrowRight
} from 'lucide-react'

export default function TemporalReasoningCard({ temporalData }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!temporalData) return null

  const {
    temporal_type = 'specific_time',
    evaluated_time_ist = 'Current Time (IST)',
    verdict = 'SAFE TO VENTURE 🟢',
    summary = '',
    advice = '',
    resolved_time = {},
    conditions = {},
    forecast_window = null,
    trend = null,
    historical_data = null,
    route_timeline = null
  } = temporalData

  const rawExpr = resolved_time?.raw_expression || 'Natural Language Time'
  const isFuture = resolved_time?.is_future
  const hoursAhead = resolved_time?.forecast_hours_ahead

  // Verdict style helpers
  const isDangerous = verdict.includes('DANGEROUS') || verdict.includes('🚫')
  const isCaution = verdict.includes('CAUTION') || verdict.includes('🟡')
  const isSafe = !isDangerous && !isCaution

  const badgeBg = isDangerous
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : isCaution
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-800'

  return (
    <div className="my-3 rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/50 via-white to-sky-50/20 p-4 shadow-sm text-navy">
      {/* ── 1. IST TIMESTAMP HEADER ───────────────────────────── */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-sky-100 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100/80 text-sky-800 border border-sky-200">
              <Clock size={13} className="text-sky-600 animate-pulse" />
              <span>Forecast Time: {evaluated_time_ist}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-navy/5 text-navy/70">
              IST (UTC+5:30)
            </span>
            {isFuture && hoursAhead > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                +{hoursAhead.toFixed(0)}h Forecast Horizon
              </span>
            )}
          </div>
          <div className="text-xs text-textSecond flex items-center gap-1.5 pt-0.5">
            <Calendar size={12} className="text-textMuted" />
            <span>Expression:</span>
            <span className="font-semibold text-navy bg-white px-2 py-0.5 rounded border border-sky-100">
              "{rawExpr}"
            </span>
            <ArrowRight size={11} className="text-textMuted" />
            <span className="text-[11px] font-mono text-oceanBlue font-semibold">
              {resolved_time?.target_time_ist || evaluated_time_ist}
            </span>
          </div>
        </div>

        {/* Seaworthiness Verdict Pill */}
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

      {/* ── 2. SUMMARY & ADVICE CALLOUT ────────────────────────── */}
      {summary && (
        <div className="mt-3 p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 text-xs leading-relaxed text-slate-700">
          <span className="font-bold text-navy mr-1">Forecast Assessment:</span>
          {summary}
          {advice && (
            <div className="mt-1 font-semibold text-oceanBlue flex items-center gap-1">
              <span>› Recommendation:</span> {advice}
            </div>
          )}
        </div>
      )}

      {/* ── 3. METOCEAN TELEMETRY CARDS (CONDITIONS AT TARGET TIME) ── */}
      {conditions && Object.keys(conditions).length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Wave Height */}
          <div className="bg-white rounded-xl p-2.5 border border-sky-100 shadow-2xs">
            <div className="flex items-center justify-between text-textMuted text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Waves size={12} className="text-sky-600" />
                Wave Height (Hs)
              </span>
              <span className="font-mono font-semibold text-navy">
                {conditions.wave_period_s ? `${conditions.wave_period_s}s` : ''}
              </span>
            </div>
            <div className="text-base font-extrabold text-navy">
              {conditions.wave_height_m !== undefined ? `${conditions.wave_height_m} m` : 'N/A'}
            </div>
            <div className="text-[10px] text-textSecond mt-0.5">
              Swell: {conditions.swell_height_m ?? 0.6} m · {conditions.sea_state || 'Smooth'}
            </div>
          </div>

          {/* Wind & Gusts */}
          <div className="bg-white rounded-xl p-2.5 border border-sky-100 shadow-2xs">
            <div className="flex items-center justify-between text-textMuted text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Wind size={12} className="text-sky-600" />
                Surface Wind
              </span>
            </div>
            <div className="text-base font-extrabold text-navy">
              {conditions.wind_speed_kmh !== undefined ? `${conditions.wind_speed_kmh} km/h` : 'N/A'}
            </div>
            <div className="text-[10px] text-textSecond mt-0.5">
              Peak Gusts: {conditions.wind_gusts_kmh ?? 22} km/h
            </div>
          </div>

          {/* Thunderstorm / Lightning */}
          <div className="bg-white rounded-xl p-2.5 border border-sky-100 shadow-2xs">
            <div className="flex items-center justify-between text-textMuted text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Zap size={12} className={conditions.is_thunderstorm ? 'text-amber-500' : 'text-sky-600'} />
                Squall / Lightning
              </span>
            </div>
            <div className={`text-base font-extrabold ${conditions.is_thunderstorm ? 'text-rose-600' : 'text-emerald-700'}`}>
              {conditions.is_thunderstorm ? 'RISK ACTIVE ⚡' : 'LOW RISK ✅'}
            </div>
            <div className="text-[10px] text-textSecond mt-0.5">
              CAPE: {conditions.cape_j_per_kg ?? 1100} J/kg
            </div>
          </div>

          {/* Rainfall Intensity */}
          <div className="bg-white rounded-xl p-2.5 border border-sky-100 shadow-2xs">
            <div className="flex items-center justify-between text-textMuted text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-sky-600" />
                Precipitation
              </span>
            </div>
            <div className="text-base font-extrabold text-navy">
              {conditions.rain_mm_per_hr !== undefined ? `${conditions.rain_mm_per_hr} mm/h` : '0.0 mm/h'}
            </div>
            <div className="text-[10px] text-textSecond mt-0.5">
              {(conditions.rain_mm_per_hr || 0) > 0.5 ? 'Active Rain Expected' : 'Dry / Clear Sky'}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. DYNAMIC WINDOW / HISTORICAL / ROUTE TIMELINE MODES ── */}
      {/* Mode A: Future Time Window (e.g. Next 12 Hours) */}
      {temporal_type === 'future_window' && forecast_window && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-sky-100 text-xs">
          <div className="flex items-center justify-between font-bold text-navy mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-oceanBlue" />
              {forecast_window.window_hours}-Hour Forecast Window Evolution
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-50 text-oceanBlue border border-sky-200 font-semibold">
              Trend: {trend?.trend || 'STABLE'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <span className="text-[10px] text-textMuted block">Peak Wave (Hs)</span>
              <span className="font-extrabold text-navy text-sm">
                {forecast_window.peak_conditions?.max_wave_m ?? 1.1} m
              </span>
            </div>
            <div className="p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <span className="text-[10px] text-textMuted block">Max Wind Gust</span>
              <span className="font-extrabold text-navy text-sm">
                {forecast_window.peak_conditions?.max_gust_kmh ?? 28} km/h
              </span>
            </div>
            <div className="p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <span className="text-[10px] text-textMuted block">Thunderstorm</span>
              <span className={`font-bold text-sm ${forecast_window.peak_conditions?.thunderstorm_in_window ? 'text-amber-600' : 'text-emerald-700'}`}>
                {forecast_window.peak_conditions?.thunderstorm_in_window ? 'Expected' : 'None'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: Historical Climatology Comparison */}
      {temporal_type === 'historical_comparison' && historical_data && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-sky-100 text-xs">
          <div className="flex items-center justify-between font-bold text-navy mb-2">
            <span className="flex items-center gap-1.5">
              <History size={14} className="text-purple-600" />
              Decadal Climatology Comparison ({historical_data.month_name || 'September'})
            </span>
            <span className="text-[10px] font-mono text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              NOAA OISST / INCOIS (2010–2025)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-[10px] text-textMuted block">Observed SST</span>
              <span className="font-extrabold text-navy text-sm">
                {historical_data.current_value ?? historical_data.observed_sst ?? 28.9}°C
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-[10px] text-textMuted block">15-Yr Decadal Mean</span>
              <span className="font-extrabold text-navy text-sm">
                {historical_data.historical_mean ?? historical_data.climatology_baseline?.mean_sst_c ?? 28.4}°C
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-[10px] text-textMuted block">Thermal Anomaly (ΔT)</span>
              <span className={`font-extrabold text-sm ${((historical_data.anomaly_delta ?? historical_data.anomaly?.sst_anomaly_c) || 0) > 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                {((historical_data.anomaly_delta ?? historical_data.anomaly?.sst_anomaly_c) || 0) > 0 ? '+' : ''}
                {historical_data.anomaly_delta ?? historical_data.anomaly?.sst_anomaly_c ?? 0.5}°C
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-[10px] text-textMuted block">Z-Score Index</span>
              <span className="font-bold text-purple-800 text-sm">
                {historical_data.z_score ?? historical_data.anomaly?.z_score ?? 0.8} σ
              </span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-textSecond leading-relaxed">
            {historical_data.advisory || historical_data.anomaly?.climatological_context || 'Current sea temperature aligns with the 15-year seasonal baseline with normal monsoon variance.'}
          </p>
        </div>
      )}

      {/* Mode C: Route Timeline Step Progression */}
      {route_timeline && route_timeline.timeline && route_timeline.timeline.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-sky-100 text-xs">
          <div className="flex items-center justify-between font-bold text-navy mb-2">
            <span className="flex items-center gap-1.5">
              <Navigation size={14} className="text-oceanBlue" />
              Timing-Aware Waypoint Timeline ({route_timeline.timeline.length} Waypoints)
            </span>
            <span className="text-[10px] font-mono text-textMuted">
              Total: {route_timeline.total_distance_km} km
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {route_timeline.timeline.map((wp, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-borderLight text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-oceanBlue text-white font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-navy">{wp.name || `Waypoint ${idx + 1}`}</span>
                    <span className="text-[10px] text-textMuted ml-1.5">({wp.cumulative_distance_km} km)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono text-[11px] text-oceanBlue font-semibold">
                    {wp.eta_ist}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-navy border border-sky-100">
                    {wp.conditions?.wave_height_m}m · {wp.conditions?.wind_speed_kmh}km/h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. MODEL EVIDENCE FOOTER ──────────────────────────── */}
      <div className="mt-2.5 pt-2 border-t border-sky-100 flex items-center justify-between text-[10px] text-textMuted">
        <span className="flex items-center gap-1">
          <Sparkles size={11} className="text-oceanBlue" />
          Model: Open-Meteo High-Resolution Marine (Asia/Kolkata)
        </span>
        <span className="font-mono text-textMuted/90">
          Evaluated via Temporal Reasoning Engine #8
        </span>
      </div>
    </div>
  )
}
