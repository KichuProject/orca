import React from 'react'
import { Thermometer, Waves, Wind, Activity, Droplets, Compass } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function OceanSensorRibbon({ oceanData, safetyData, isLoading }) {
  const { t, timeOffset } = useGlobal()
  const isro = oceanData?.isro || {}
  const conditions = safetyData?.conditions || {}
  const telemetry = oceanData?.telemetry || {}

  const isForecast = timeOffset > 0 || conditions.is_forecast
  const sst = isForecast ? (conditions.temp_c ?? isro.sst_c ?? 28.9) : (isro.sst_c ?? conditions.temp_c ?? 28.9)
  const chl = isro.chlorophyll ?? 0.093
  const wave = conditions.wave_m ?? 0.9
  const swell = conditions.swell_m ?? (wave * 0.7)
  const wind = conditions.wind_kmh ?? 11.2
  const upwelling = isro.upwelling_index ?? -0.001
  const fishingPotential = wave >= 2.5 || wind >= 40 ? 'POOR / HIGH RISK' : (isro.fishing_potential || 'MODERATE')
  const salinity = telemetry.salinity_psu ?? 34.05
  const currentSpeed = conditions.current_speed_knots ?? telemetry.current_speed_knots ?? 0.53
  const currentHeading = conditions.current_heading ?? telemetry.current_heading ?? 'NNE'

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-borderLight shadow-sm p-2.5 px-4 flex items-center justify-between gap-4 overflow-x-auto text-xs text-navy relative">
      {/* Forecast Status Badge */}
      {isForecast && (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-mono text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span>+{timeOffset}h FORECAST</span>
        </div>
      )}

      {/* 1. SST */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-orange-50 text-isroOrange flex items-center justify-center">
          <Thermometer size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
            {isForecast ? t('SST Forecast') : t('SST (OCM-3)')}
          </div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {sst.toFixed(1)} <span className="text-[10px] font-sans font-normal text-textMuted">°C</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 2. Chlorophyll-a */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Droplets size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">{t('Chlorophyll-a')}</div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {chl.toFixed(3)} <span className="text-[10px] font-sans font-normal text-textMuted">mg/m³</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 3. Salinity */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
          <Droplets size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">{t('Salinity (PSU)')}</div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {salinity.toFixed(1)} <span className="text-[10px] font-sans font-normal text-textMuted">PSU</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 4. Surface Currents */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Compass size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">{t('Surface Drift')}</div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {currentSpeed.toFixed(1)} <span className="text-[10px] font-sans font-normal text-textMuted">kts</span>{' '}
            <span className="text-[10px] font-bold text-indigo-600 font-sans">{currentHeading}</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 5. Wave Swell */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-blue-50 text-oceanBlue flex items-center justify-center">
          <Waves size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
            {isForecast ? t('Wave Forecast') : t('Significant Wave')}
          </div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {wave.toFixed(1)} <span className="text-[10px] font-sans font-normal text-textMuted">m</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 6. Wind Speed */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Wind size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
            {isForecast ? t('Wind Forecast') : t('Wind Speed')}
          </div>
          <div className="font-bold font-mono text-sm leading-tight text-navy">
            {wind.toFixed(1)} <span className="text-[10px] font-sans font-normal text-textMuted">km/h</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-borderLight flex-shrink-0" />

      {/* 7. Fisheries Potential */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <Activity size={15} />
        </div>
        <div>
          <div className="text-[10px] text-textMuted uppercase font-bold tracking-wider">{t('Fisheries Potential')}</div>
          <div className="font-bold text-xs leading-tight text-safeGreen">
            {t(fishingPotential)}
          </div>
        </div>
      </div>
    </div>
  )
}
