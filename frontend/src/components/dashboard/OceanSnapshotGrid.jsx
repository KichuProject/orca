import React from 'react'
import { Thermometer, Waves, Wind, Compass, Eye, CloudRain, Gauge } from 'lucide-react'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import { resolvePortName } from '../../i18n/translations'

// Dynamic Beaufort scale calculation from live wind speed (km/h)
function getBeaufortScale(kmh) {
  if (kmh < 2) return { scale: 0, label: 'Calm' }
  if (kmh <= 5) return { scale: 1, label: 'Light Air' }
  if (kmh <= 11) return { scale: 2, label: 'Light Breeze' }
  if (kmh <= 19) return { scale: 3, label: 'Gentle Breeze' }
  if (kmh <= 28) return { scale: 4, label: 'Moderate Breeze' }
  if (kmh <= 38) return { scale: 5, label: 'Fresh Breeze' }
  if (kmh <= 49) return { scale: 6, label: 'Strong Breeze' }
  if (kmh <= 61) return { scale: 7, label: 'Near Gale' }
  if (kmh <= 74) return { scale: 8, label: 'Gale' }
  if (kmh <= 88) return { scale: 9, label: 'Strong Gale' }
  return { scale: 10, label: 'Storm Force' }
}

// Dynamic compass direction calculation from degrees (0-360)
function getCompassHeading(deg) {
  if (deg == null || isNaN(deg)) return 'Variable'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.floor(((deg % 360) / 22.5) + 0.5) % 16
  return `${directions[index]} (${Math.round(deg)}°)`
}

export default function OceanSnapshotGrid({ conditions = {}, safetyData = {} }) {
  const { language, vessel, t } = useGlobal()
  const activeProfile = VESSEL_PROFILES[vessel] || VESSEL_PROFILES.fishing_trawler
  const waveLimit = activeProfile.limits?.wave || 1.5

  const wave = conditions.wave_m != null ? Number(conditions.wave_m) : 0.8
  const swell = conditions.swell_m != null ? Number(conditions.swell_m) : 0.6
  const wind = conditions.wind_kmh != null ? Number(conditions.wind_kmh) : 12.0
  const gusts = conditions.gusts_kmh != null ? Number(conditions.gusts_kmh) : 25.0
  const temp = conditions.temp_c != null ? Number(conditions.temp_c) : 29.5
  const pressure = conditions.pressure_hpa != null ? Number(conditions.pressure_hpa) : 1011.0
  const visibility = conditions.visibility_m != null ? (Number(conditions.visibility_m) / 1000).toFixed(1) : '20.0'
  const rain = conditions.rain_mm != null ? Number(conditions.rain_mm).toFixed(1) : '0.0'

  const rawDeg = conditions.wind_direction ?? conditions.wind_direction_10m ?? conditions.wind_deg
  const windDirLabel = getCompassHeading(rawDeg)
  const beaufort = getBeaufortScale(wind)

  const isWaveSafe = wave <= waveLimit
  const isOptimalSst = temp >= 27.0 && temp <= 30.5

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Sea Surface Temperature */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
            {t('Sea Surface Temp')}
          </span>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-isroOrange flex items-center justify-center">
            <Thermometer size={16} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-black text-navy font-mono">
            {temp.toFixed(1)} <span className="text-sm font-sans font-semibold text-textMuted">°C</span>
          </div>
          <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-semibold ${isOptimalSst ? 'text-safeGreen' : 'text-amber-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOptimalSst ? 'bg-safeGreen' : 'bg-amber-500'}`} />
            <span>
              {isOptimalSst ? t('Optimal Pelagic Range (27–30.5°C)') : t('Sub-optimal Pelagic Range')}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-borderLight/60 text-[10px] text-textMuted flex justify-between">
          <span>{t('Source: INCOIS / OCM-3')}</span>
          <span className="font-semibold text-navy">
            {temp > 30.5 ? `+${(temp - 29.5).toFixed(1)}°C Anomaly` : t('Normal Range')}
          </span>
        </div>
      </div>

      {/* 2. Wave & Swell Height */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
            {t('Wave & Swell Height')}
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-oceanBlue flex items-center justify-center">
            <Waves size={16} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-black text-navy font-mono">
            {wave.toFixed(1)} <span className="text-sm font-sans font-semibold text-textMuted">m</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-oceanBlue">
            <span>{t('Swell')}: {swell.toFixed(1)} m</span>
            <span className="text-textMuted">·</span>
            <span className="text-textSecond">
              {wave < 1.0 ? t('Calm Sea State') : wave <= 1.5 ? t('Moderate Wave Action') : t('Rough Sea State')}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-borderLight/60 text-[10px] text-textMuted flex justify-between">
          <span>{t('Vessel Limit')}: {waveLimit} m</span>
          <span className={`font-bold ${isWaveSafe ? 'text-safeGreen' : 'text-dangerRed'}`}>
            {isWaveSafe ? t('Within Limits') : t('Exceeds Limit')}
          </span>
        </div>
      </div>

      {/* 3. Wind Speed & Gusts */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
            {t('Wind Speed & Gusts')}
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wind size={16} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-black text-navy font-mono">
            {wind.toFixed(1)} <span className="text-sm font-sans font-semibold text-textMuted">km/h</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-textSecond">
            <span className="text-warnAmber font-bold">{t('Gusts')}: {gusts.toFixed(0)} km/h</span>
            <span className="text-textMuted">·</span>
            <span className="font-mono">{pressure.toFixed(0)} hPa</span>
          </div>
        </div>
        <div className="pt-2 border-t border-borderLight/60 text-[10px] text-textMuted flex justify-between">
          <span>{t('Direction')}: {t(windDirLabel)}</span>
          <span className="font-semibold text-navy">
            {t(`Beaufort ${beaufort.scale}`)} ({t(beaufort.label)})
          </span>
        </div>
      </div>

      {/* 4. Atmospheric Visibility */}
      <div className="p-4 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
            {t('Visibility & Atmosphere')}
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Eye size={16} />
          </div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-black text-navy font-mono">
            {visibility} <span className="text-sm font-sans font-semibold text-textMuted">km</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-safeGreen">
            <span className="w-1.5 h-1.5 rounded-full bg-safeGreen" />
            <span>
              {Number(visibility) >= 10 ? t('Clear Horizon') : t('Reduced Visibility')} · {t('Rain')}: {rain} mm
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-borderLight/60 text-[10px] text-textMuted flex justify-between">
          <span>{t('Coast')}: {resolvePortName(safetyData.observation_coast || 'Chennai', language)}</span>
          <span className="font-semibold text-navy">
            {Number(rain) > 0 ? t('Precipitation Active') : t('No Fog / Good Line of Sight')}
          </span>
        </div>
      </div>
    </div>
  )
}
