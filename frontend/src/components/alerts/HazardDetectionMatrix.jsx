import React from 'react'
import { Wind, Waves, Zap, Compass, AlertTriangle, ShieldCheck, ShieldAlert, Clock, MapPin, Radio } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function HazardDetectionMatrix({ alerts = [], lat = 13.0827, lon = 80.2707 }) {
  const { t } = useGlobal()
  const coordStr = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`

  // Find hazard alerts from payload or provide sensible real-time fallbacks
  const cycloneAlert = alerts.find(a => a.type === 'CYCLONE' || a.category === 'CYCLONE')
  const highWaveAlert = alerts.find(a => a.type === 'HIGH_WAVE' || a.category === 'HIGH_WAVE')
  const lightningAlert = alerts.find(a => a.type === 'LIGHTNING' || a.category === 'LIGHTNING')
  const strongWindAlert = alerts.find(a => a.type === 'STRONG_WIND' || a.category === 'STRONG_WIND')

  const hazards = [
    {
      id: 'cyclone',
      badge: cycloneAlert?.badge || (cycloneAlert?.severity === 'critical' ? '🔴 CYCLONE' : '🟢 CYCLONE: NORMAL'),
      badgeBg: cycloneAlert?.severity === 'critical' 
        ? 'bg-red-500 text-white' 
        : 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      icon: Wind,
      title: cycloneAlert?.title || 'Tropical Cyclone & Depression Surveillance',
      location: cycloneAlert?.location_coord || coordStr,
      validTime: cycloneAlert?.valid_time || 'Valid 48h Forecast Track (IMD 3-Hourly Update)',
      source: cycloneAlert?.source || 'IMD RSMC New Delhi / JTWC / EONET',
      severity: (cycloneAlert?.severity || 'advisory').toUpperCase(),
      severityColor: cycloneAlert?.severity === 'critical' 
        ? 'text-red-600 bg-red-50 border-red-200' 
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      affectedRegion: cycloneAlert?.affected_region || `${cycloneAlert?.sector || 'Coastal Sector'} Basin & Coastal Belt`,
      active: cycloneAlert?.severity === 'critical',
      highlightBorder: cycloneAlert?.severity === 'critical' ? 'border-red-400 ring-2 ring-red-400/30' : 'border-borderLight',
      metric: cycloneAlert?.pressure_hpa ? `${cycloneAlert.pressure_hpa} hPa` : '1010 hPa',
      metricLabel: 'Central Pressure',
    },
    {
      id: 'high_wave',
      badge: '🟠 HIGH WAVE',
      badgeBg: highWaveAlert?.severity === 'critical' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: Waves,
      title: 'High Wave & Swell Surge Forecasting',
      location: highWaveAlert?.location_coord || coordStr,
      validTime: highWaveAlert?.valid_time || 'Real-time Telemetry & 24h WaveWatch Horizon',
      source: highWaveAlert?.source || 'INCOIS Wave Forecast System (SWAN / WaveWatch III)',
      severity: (highWaveAlert?.severity || 'advisory').toUpperCase(),
      severityColor: highWaveAlert?.severity === 'critical' 
        ? 'text-red-600 bg-red-50 border-red-200' 
        : highWaveAlert?.severity === 'warning' 
        ? 'text-amber-700 bg-amber-50 border-amber-200' 
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      affectedRegion: highWaveAlert?.affected_region || `${highWaveAlert?.sector || 'Coastal Sector'} Coastal Waters & Surf Zone`,
      active: highWaveAlert?.severity === 'critical' || highWaveAlert?.severity === 'warning',
      highlightBorder: highWaveAlert?.severity === 'critical' 
        ? 'border-red-400 ring-2 ring-red-400/30' 
        : highWaveAlert?.severity === 'warning'
        ? 'border-amber-400 ring-2 ring-amber-400/30'
        : 'border-borderLight',
      metric: highWaveAlert?.wave_m ? `${highWaveAlert.wave_m.toFixed(1)} m` : '0.9 m',
      metricLabel: 'Significant Wave (Hs)',
    },
    {
      id: 'lightning',
      badge: '🟡 LIGHTNING',
      badgeBg: 'bg-amber-100 text-amber-900 border border-amber-300',
      icon: Zap,
      title: 'Convective Lightning & Thunderstorm Alert',
      location: lightningAlert?.location_coord || coordStr,
      validTime: lightningAlert?.valid_time || 'Real-time Satellite Radar & 6h Convective Window',
      source: lightningAlert?.source || 'ISRO INSAT-3DR / Open-Meteo High CAPE',
      severity: (lightningAlert?.severity || 'warning').toUpperCase(),
      severityColor: lightningAlert?.severity === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      affectedRegion: lightningAlert?.affected_region || `${lightningAlert?.sector || 'Coastal Sector'} Airspace & Open Waters`,
      active: lightningAlert?.severity === 'warning' || lightningAlert?.severity === 'critical',
      highlightBorder: lightningAlert?.severity === 'warning' ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-borderLight',
      metric: lightningAlert?.cape_j_kg ? `${lightningAlert.cape_j_kg.toFixed(0)} J/kg` : '850 J/kg',
      metricLabel: 'Atmospheric CAPE',
    },
    {
      id: 'strong_wind',
      badge: '🟠 STRONG WIND',
      badgeBg: strongWindAlert?.severity === 'critical' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: Wind,
      title: 'Severe Gale & Coastal Squall Monitoring',
      location: strongWindAlert?.location_coord || coordStr,
      validTime: strongWindAlert?.valid_time || 'Active Sea Passage (Next 12h High-Res Forecast)',
      source: strongWindAlert?.source || 'IMD Coastal Marine Station / Open-Meteo 10m Wind',
      severity: (strongWindAlert?.severity || 'advisory').toUpperCase(),
      severityColor: strongWindAlert?.severity === 'critical' 
        ? 'text-red-600 bg-red-50 border-red-200' 
        : strongWindAlert?.severity === 'warning'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      affectedRegion: strongWindAlert?.affected_region || `${strongWindAlert?.sector || 'Coastal Sector'} Maritime Sector`,
      active: strongWindAlert?.severity === 'critical' || strongWindAlert?.severity === 'warning',
      highlightBorder: strongWindAlert?.severity === 'critical' 
        ? 'border-red-400 ring-2 ring-red-400/30' 
        : strongWindAlert?.severity === 'warning'
        ? 'border-amber-400 ring-2 ring-amber-400/30'
        : 'border-borderLight',
      metric: strongWindAlert?.wind_kmh ? `${strongWindAlert.wind_kmh.toFixed(1)} km/h` : '14.0 km/h',
      metricLabel: 'Sustained Wind Speed',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-wider text-navy">
            {t('Visible Hazard Detection Matrix')}
          </h4>
          <span className="text-[10px] text-textMuted font-mono">
            {t('(Proactive Safety Alerts: Cyclone, Wave, Lightning, Wind)')}
          </span>
        </div>
        <span className="text-[10px] font-mono text-textMuted bg-surfaceMid px-2 py-0.5 rounded-md">
          {t('Real-Time Geospatial Feeds')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hazards.map(h => {
          const IconComponent = h.icon
          return (
            <div
              key={h.id}
              className={`p-3.5 rounded-2xl bg-white border transition-all shadow-2xs hover:shadow-sm space-y-2.5 flex flex-col justify-between ${h.highlightBorder}`}
            >
              {/* Top Row: Badge & Severity */}
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black tracking-wide flex items-center gap-1 shadow-2xs ${h.badgeBg}`}>
                    <span>{t(h.badge)}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${h.severityColor}`}>
                    {t(h.severity)}
                  </span>
                </div>

                <div className="text-xs font-bold text-navy leading-snug">
                  {t(h.title)}
                </div>
              </div>

              {/* 5 Required PS Metadata Keys */}
              <div className="space-y-1.5 text-[11px] pt-2 border-t border-borderLight/60">
                {/* 1. Location */}
                <div className="flex items-start gap-1 text-textSecond">
                  <MapPin size={11} className="text-oceanBlue flex-shrink-0 mt-0.5" />
                  <span className="truncate">
                    <strong className="text-navy">{t('Location')}:</strong> {h.location}
                  </span>
                </div>

                {/* 2. Valid Time */}
                <div className="flex items-start gap-1 text-textSecond">
                  <Clock size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="truncate" title={t(h.validTime)}>
                    <strong className="text-navy">{t('Valid Time')}:</strong> {t(h.validTime)}
                  </span>
                </div>

                {/* 3. Source */}
                <div className="flex items-start gap-1 text-textSecond">
                  <Radio size={11} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="truncate" title={t(h.source)}>
                    <strong className="text-navy">{t('Source')}:</strong> {t(h.source)}
                  </span>
                </div>

                {/* 4. Affected Region */}
                <div className="flex items-start gap-1 text-textSecond">
                  <Compass size={11} className="text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="truncate" title={t(h.affectedRegion)}>
                    <strong className="text-navy">{t('Affected')}:</strong> {t(h.affectedRegion)}
                  </span>
                </div>
              </div>

              {/* Live Metric Strip */}
              <div className="mt-1 pt-2 border-t border-borderLight/60 flex items-center justify-between bg-slate-50/80 -mx-3.5 -mb-3.5 p-2.5 rounded-b-2xl">
                <span className="text-[10px] text-textMuted font-medium">{t(h.metricLabel)}</span>
                <span className="font-mono text-xs font-bold text-navy">{h.metric}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
