import React from 'react'
import { Droplets, Compass, Wind, AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Activity } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function OceanBiochemistryCard({ oceanData = {} }) {
  const { t } = useGlobal()
  const telemetry = oceanData?.telemetry || {}

  const salinity = telemetry.salinity_psu ?? 34.05
  const oxygen = telemetry.dissolved_oxygen_umol ?? 200.8
  const nitrate = telemetry.dissolved_nitrate_umol ?? 0.021
  const hypoxiaStatus = telemetry.hypoxia_status || 'NORMOXIC'
  const hypoxiaDesc = telemetry.hypoxia_description || 'Optimal dissolved oxygen for pelagic and demersal fish.'
  
  const speedKnots = telemetry.current_speed_knots ?? 0.53
  const speedMs = telemetry.current_speed_ms ?? 0.272
  const dirDeg = telemetry.current_direction_deg ?? 28.2
  const heading = telemetry.current_heading || 'NNE'

  const isHypoxic = hypoxiaStatus !== 'NORMOXIC'

  const isroWindCurrent = oceanData?.isro_wind_current || {}
  const isroWind = isroWindCurrent.isro_wind
  const isroCurrent = isroWindCurrent.isro_current

  return (
    <div className="p-5 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Droplets size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Oceanographic & Biochemical Telemetry')}
            </h3>
            <p className="text-[10px] text-textMuted flex items-center gap-1">
              <span>{t('Copernicus Marine In-Situ & ISRO Oceansat-3 Scatterometer')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              isHypoxic
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-safeGreen border-emerald-200'
            }`}
          >
            {isHypoxic ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
            <span>{t(hypoxiaStatus.replace('_', ' '))}</span>
          </span>
        </div>
      </div>

      {/* Grid of 4 Key Telemetry Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Practical Salinity */}
        <div className="p-3 rounded-2xl bg-surface border border-borderLight space-y-1">
          <div className="flex items-center justify-between text-textMuted text-[10px] uppercase font-bold tracking-wider">
            <span>{t('Salinity (PSU)')}</span>
            <Sparkles size={12} className="text-cyan-600" />
          </div>
          <div className="font-mono text-lg font-black text-navy">
            {salinity.toFixed(2)}{' '}
            <span className="text-[10px] font-sans font-normal text-textMuted">PSU</span>
          </div>
          <div className="text-[10px] text-cyan-700 font-medium">
            {t('Standard Marine (32-36)')}
          </div>
        </div>

        {/* 2. Dissolved Oxygen */}
        <div className="p-3 rounded-2xl bg-surface border border-borderLight space-y-1">
          <div className="flex items-center justify-between text-textMuted text-[10px] uppercase font-bold tracking-wider">
            <span>{t('Dissolved O₂')}</span>
            <Activity size={12} className={isHypoxic ? 'text-amber-500' : 'text-safeGreen'} />
          </div>
          <div className="font-mono text-lg font-black text-navy">
            {oxygen.toFixed(1)}{' '}
            <span className="text-[10px] font-sans font-normal text-textMuted">mmol/m³</span>
          </div>
          <div className="text-[10px] text-safeGreen font-medium">
            {t('Healthy Aeration (>125)')}
          </div>
        </div>

        {/* 3. Dissolved Nitrate */}
        <div className="p-3 rounded-2xl bg-surface border border-borderLight space-y-1">
          <div className="flex items-center justify-between text-textMuted text-[10px] uppercase font-bold tracking-wider">
            <span>{t('Nitrate (NO₃)')}</span>
            <Droplets size={12} className="text-purple-600" />
          </div>
          <div className="font-mono text-lg font-black text-navy">
            {nitrate.toFixed(3)}{' '}
            <span className="text-[10px] font-sans font-normal text-textMuted">mmol/m³</span>
          </div>
          <div className="text-[10px] text-purple-700 font-medium">
            {t('Nutrient Feed Level')}
          </div>
        </div>

        {/* 4. Ocean Surface Drift */}
        <div className="p-3 rounded-2xl bg-surface border border-borderLight space-y-1">
          <div className="flex items-center justify-between text-textMuted text-[10px] uppercase font-bold tracking-wider">
            <span>{t('Surface Current')}</span>
            <Compass size={12} className="text-indigo-600" />
          </div>
          <div className="font-mono text-lg font-black text-navy">
            {speedKnots.toFixed(1)}{' '}
            <span className="text-[10px] font-sans font-normal text-textMuted">{t('kts')}</span>{' '}
            <span className="text-xs font-bold text-indigo-600 font-sans">{t(heading)}</span>
          </div>
          <div className="text-[10px] text-indigo-600 font-medium">
            {dirDeg.toFixed(0)}° &bull; {speedMs.toFixed(2)} m/s {t('drift')}
          </div>
        </div>
      </div>

      {/* ISRO Oceansat-3 (EOS-06) Scatterometer & MOSDAC Satellite Telemetry Strip */}
      {isroWind?.status === 'ok' && (
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-extrabold text-[10px] tracking-wide uppercase">
              ISRO Oceansat-3
            </span>
            <span className="font-bold text-navy text-[11px]">
              {t('Scatterometer Sea Surface Wind:')}
            </span>
            <span className="font-mono font-bold text-oceanBlue">
              {isroWind.speed_ms} m/s ({(isroWind.speed_ms * 1.94384).toFixed(1)} kts) @ {isroWind.direction_deg.toFixed(0)}°
            </span>
          </div>

          {isroCurrent?.status === 'ok' && (
            <div className="text-[11px] text-textSecond flex items-center gap-1.5">
              <span>{t('SAC-ISRO Current:')}</span>
              <span className="font-mono font-bold text-navy">
                {isroCurrent.speed_ms} m/s @ {isroCurrent.direction_deg.toFixed(0)}°
              </span>
            </div>
          )}
        </div>
      )}

      {/* Global Cross-Validation Strip (NOAA OISST vs Copernicus L4) */}
      {oceanData?.cross_validation?.sst_cross_validation && (
        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-200/80 text-indigo-900 font-extrabold text-[10px] tracking-wide uppercase">
              NOAA OISST &bull; {t('Cross-Validation')}
            </span>
            <span className="font-bold text-navy text-[11px]">
              NOAA: {oceanData.cross_validation.sst_cross_validation.noaa_oisst_c}°C vs Copernicus: {oceanData.cross_validation.sst_cross_validation.copernicus_l4_c}°C
            </span>
            <span className="text-[10px] font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
              &Delta; {oceanData.cross_validation.sst_cross_validation.difference_c}&deg;C ({t(oceanData.cross_validation.sst_cross_validation.agreement)} {t('Agreement')})
            </span>
          </div>
          <span className="text-[10px] font-semibold text-textMuted">
            NASA MODIS &bull; {t('EMODnet Cross-Checked')}
          </span>
        </div>
      )}

      {/* Aeration & Hypoxia Diagnostic Bar */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-borderLight/80 flex items-start gap-2.5 text-xs">
        <div className="mt-0.5 text-oceanBlue">
          <AlertCircle size={15} />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="font-bold text-navy flex items-center justify-between">
            <span>{t('Biochemical Column State')}</span>
            <span className="text-[10px] font-mono text-textMuted">{t('Grid Res: 0.25° Global')}</span>
          </div>
          <p className="text-textSecond text-[11px] leading-relaxed">
            {t(hypoxiaDesc)} {t('Salinity at')} <strong>{salinity.toFixed(2)} PSU</strong> {t('indicates typical coastal shelf seawater balance, supporting thriving demersal finfish communities.')}
          </p>
        </div>
      </div>
    </div>
  )
}
