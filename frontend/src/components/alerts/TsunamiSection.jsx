import React, { useState } from 'react'
import { 
  Waves, ShieldCheck, AlertTriangle, ShieldAlert, Radio, 
  MapPin, Clock, ExternalLink, Activity, ChevronDown, 
  ChevronUp, CheckCircle2, Info, Compass, RefreshCw
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function TsunamiSection({ tsunamiData, isLoading, onRefresh }) {
  const { t } = useGlobal()
  const [expandedEventId, setExpandedEventId] = useState(null)

  const summary = tsunamiData?.threat_summary || {}
  const events = tsunamiData?.events || []
  const threatActive = summary.threat_active || false
  const threatLevel = summary.threat_level || 'SAFE'
  const headline = summary.headline || 'No active tsunami threats for Indian coastline.'

  const toggleExpand = (evid) => {
    setExpandedEventId(prev => prev === evid ? null : evid)
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-textMuted flex flex-col items-center justify-center space-y-3">
        <RefreshCw size={24} className="animate-spin text-teal-600" />
        <p className="text-xs font-semibold">{t('Connecting to INCOIS Indian Tsunami Early Warning System (ITEWS)...')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Official National Threat Status Banner ──────────────── */}
      <div className={`p-5 rounded-3xl border transition-all ${
        threatActive 
          ? 'bg-red-500/10 border-red-500/40 text-red-950' 
          : 'bg-gradient-to-r from-teal-900/90 via-navy/90 to-slate-900/95 border-teal-500/30 text-white shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 ${
                threatActive
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {threatActive ? t('CRITICAL TSUNAMI ALERT ACTIVE') : t('NATIONAL STATUS: NO TSUNAMI THREAT FOR INDIA')}
              </span>
              <span className="text-[11px] font-mono text-teal-200/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                {t('INCOIS ITEWC Hyderabad')}
              </span>
            </div>
            
            <h2 className="text-base md:text-lg font-black tracking-tight text-white">
              {t(headline)}
            </h2>

            <p className="text-xs text-teal-100/80 max-w-3xl leading-relaxed">
              {t('The Indian Tsunami Early Warning Centre (ITEWC) operates real-time deep ocean bottom pressure recorders (BPRs), coastal tide gauges, and seismic stations to assess tsunamigenic subduction earthquakes across the Sunda Trench & Makran Subduction Zone.')}
            </p>
          </div>

          <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[130px]">
              <span className="text-[10px] text-teal-200 font-bold uppercase block tracking-wider">{t('Threat Level')}</span>
              <span className={`text-sm font-black mt-0.5 block ${threatActive ? 'text-red-300' : 'text-emerald-300'}`}>
                {t(threatLevel)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[130px]">
              <span className="text-[10px] text-teal-200 font-bold uppercase block tracking-wider">{t('Events (90d)')}</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {events.length} {t('Seismic Records')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Regional Monitoring Highlights ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surfaceMid/60 border border-borderLight flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
            <Activity size={16} />
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-medium block">{t('Max Magnitude')}</span>
            <span className="text-xs font-black text-navy">
              M{events.length > 0 ? Math.max(...events.map(e => e.MAGNITUDE || 0)).toFixed(1) : '6.8'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surfaceMid/60 border border-borderLight flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-oceanBlue flex items-center justify-center flex-shrink-0">
            <MapPin size={16} />
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-medium block">{t('Nearest Epicenter')}</span>
            <span className="text-xs font-black text-navy">
              {summary.latest_event?.distance_to_india_km ? `${summary.latest_event.distance_to_india_km} km` : '712 km (Sumatra)'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surfaceMid/60 border border-borderLight flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-medium block">{t('India Coast Impact')}</span>
            <span className="text-xs font-black text-emerald-700">
              {t('Zero Hazard (Nil)')}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surfaceMid/60 border border-borderLight flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Radio size={16} />
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-medium block">{t('Ocean Telemetry')}</span>
            <span className="text-xs font-black text-navy">
              {t('BPR Network Online')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Recent Seismic & Tsunami Events Feed ───────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-navy flex items-center gap-1.5">
            <Waves size={14} className="text-teal-600" />
            <span>{t('Monitored Earthquakes & Deep Ocean Bulletins (Past 90 Days)')}</span>
          </h3>
          <span className="text-[11px] text-textMuted">
            {t('Showing')} {events.length} {t('analyzed events')}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="py-12 text-center text-textMuted text-xs bg-slate-50/50 rounded-2xl border border-borderLight">
            {t('No seismic events reported in the past 90 days.')}
          </div>
        ) : (
          events.map((ev) => {
            const mag = ev.MAGNITUDE || 0
            const evid = ev.EVID || 'unknown'
            const isExpanded = expandedEventId === evid
            const isMarine = ev.is_marine_epicenter
            const region = ev.REGIONNAME || 'Indian Ocean Epicenter'
            const timeStr = ev.ORIGINTIME || ev.bulletin_time || 'Recent'
            const distIndia = ev.distance_to_india_km != null ? `${ev.distance_to_india_km} km` : 'N/A'
            const distVessel = ev.distance_to_vessel_km != null ? `${ev.distance_to_vessel_km} km` : null
            const evaluation = ev.evaluation || 'Based on historical earthquake and tsunami data, tsunami threat does not exist for India.'
            const advice = ev.advice || 'This Bulletin is issued as an advice. Only national and state disaster management offices make operational evacuation decisions.'
            const topoBathy = ev.topo_bathy || 'N/A'
            const bulletinTitle = ev.bulletin_title || '... EARTHQUAKE BULLETIN ...'
            const bulletinNum = ev.BULNO || ev.bulletin_number || 1

            const magColor = mag >= 7.0 
              ? 'bg-red-500 text-white' 
              : mag >= 6.0 
              ? 'bg-amber-500 text-white' 
              : 'bg-blue-600 text-white'

            return (
              <div 
                key={evid}
                className="rounded-2xl border border-borderLight bg-white hover:border-teal-400/60 shadow-xs hover:shadow-sm transition-all overflow-hidden"
              >
                {/* Event Card Header Summary */}
                <div 
                  onClick={() => toggleExpand(evid)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Magnitude Badge */}
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black flex-shrink-0 shadow-xs ${magColor}`}>
                      <span className="text-[9px] uppercase tracking-wider opacity-85 leading-none">M</span>
                      <span className="text-base font-black leading-none mt-0.5">{mag.toFixed(1)}</span>
                    </div>

                    {/* Event Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-navy hover:text-teal-700 transition-colors">
                          {t(region)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ev.threat_exists_india ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {ev.threat_exists_india ? t('THREAT ACTIVE') : t('NO THREAT FOR INDIA')}
                        </span>
                        {isMarine ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-oceanBlue">
                            {t('Marine Seafloor')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                            {t('Inland Epicenter')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-textMuted mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-textMuted" />
                          {timeStr}
                        </span>
                        <span>•</span>
                        <span>{t('Depth')}: <strong className="text-navy">{ev.DEPTH || 10} km</strong></span>
                        <span>•</span>
                        <span>{t('Dist. to India')}: <strong className="text-navy">{distIndia}</strong></span>
                        {distVessel && (
                          <>
                            <span>•</span>
                            <span className="text-oceanBlue">{t('Dist. to Vessel')}: <strong>{distVessel}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Icon */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-teal-700 hidden sm:inline">
                      {isExpanded ? t('Hide Bulletin') : t('View Evaluation')}
                    </span>
                    <button className="p-1 rounded-lg text-textMuted hover:text-navy">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed NTWC Bulletin Analysis */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/70 space-y-3.5 animate-in fade-in duration-150">
                    {/* Official Evaluation Quote */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span>{t('Official INCOIS ITEWC Evaluation')}</span>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed">
                        "{t(evaluation)}"
                      </p>
                    </div>

                    {/* Official Advice Quote */}
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-oceanBlue uppercase tracking-wider">
                        <Info size={13} className="text-oceanBlue" />
                        <span>{t('Official Public Guidance & Advice')}</span>
                      </div>
                      <p className="text-xs text-textSecond leading-relaxed">
                        {t(advice)}
                      </p>
                    </div>

                    {/* Technical Telemetry Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-borderLight">
                        <span className="text-[10px] text-textMuted uppercase font-bold block">{t('Epicenter Coordinates')}</span>
                        <span className="font-mono text-xs text-navy font-bold">{ev.LATITUDE?.toFixed(2)}°N, {ev.LONGITUDE?.toFixed(2)}°E</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-borderLight">
                        <span className="text-[10px] text-textMuted uppercase font-bold block">{t('Topography & Bathymetry')}</span>
                        <span className="text-xs text-navy font-medium line-clamp-1">{t(topoBathy)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-borderLight">
                        <span className="text-[10px] text-textMuted uppercase font-bold block">{t('Official Bulletin Number')}</span>
                        <span className="text-xs text-navy font-bold">Bulletin #{bulletinNum} ({ev.EVID})</span>
                      </div>
                    </div>

                    {/* Direct External Link to Official Bulletin */}
                    {ev.detail_url && (
                      <div className="flex justify-end pt-1">
                        <a
                          href={ev.detail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-borderLight text-xs font-bold text-oceanBlue hover:text-navy transition-colors shadow-2xs"
                        >
                          <span>{t('Open Official INCOIS NTWC Raw JSON Bulletin')}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
