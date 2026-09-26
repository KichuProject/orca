import React from 'react'
import { Sparkles, Thermometer, Droplets, Activity, Waves, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function FishingSuitabilityGauge({ oceanData = {}, safetyData = {} }) {
  const { t } = useGlobal()
  const isro = oceanData?.isro || {}
  const copernicus = oceanData?.copernicus || {}
  const conditions = safetyData?.conditions || {}

  // Robust parsing to prevent NaN or undefined from breaking SVG math
  const rawSst = isro.sst_c ?? copernicus.sst_c_at_point ?? conditions.temp_c
  const sst = typeof rawSst === 'number' && !isNaN(rawSst) ? rawSst : 28.9

  const rawChl = isro.chlorophyll ?? copernicus.chlorophyll_at_point
  const chl = typeof rawChl === 'number' && !isNaN(rawChl) ? rawChl : 0.093

  const rawWave = conditions.wave_m
  const wave = typeof rawWave === 'number' && !isNaN(rawWave) ? rawWave : 0.9

  const rawUpw = isro.upwelling_index
  const upwelling = typeof rawUpw === 'number' && !isNaN(rawUpw) ? rawUpw : -0.001

  // Multi-factor scientific suitability model (0-100)
  // 1. SST component (27.5 to 30.0 °C is optimal for Indian tropical pelagics)
  let sstScore = 85
  if (sst >= 28.0 && sst <= 29.5) sstScore = 95
  else if (sst >= 27.0 && sst <= 30.5) sstScore = 80
  else sstScore = 60

  // 2. Chlorophyll-a component (0.08 to 1.5 mg/m3 indicates active phytoplankton bloom)
  let chlScore = 80
  if (chl >= 0.15 && chl <= 1.2) chlScore = 95
  else if (chl >= 0.08) chlScore = 82
  else chlScore = 65

  // 3. Upwelling / current shear component
  let upwellingScore = upwelling >= 0 ? 90 : 75

  // 4. Sea state operability component (wave < 1.2m is ideal for fishing nets)
  let seaScore = wave <= 1.0 ? 95 : wave <= 1.5 ? 75 : 45

  const rawTotal = Math.round(
    sstScore * 0.35 + chlScore * 0.30 + upwellingScore * 0.20 + seaScore * 0.15
  )
  const totalScore = Math.max(0, Math.min(100, isNaN(rawTotal) ? 75 : rawTotal))

  // Deterministic styling configuration with rock-solid hex codes
  let rating = {
    label: 'HIGH FISHING POTENTIAL',
    textColor: 'text-safeGreen',
    badgeClass: 'bg-emerald-50 text-safeGreen border-emerald-200/80',
    hexColor: '#00c853',
    glowColor: 'rgba(0, 200, 83, 0.25)',
    icon: CheckCircle2,
    sub: 'Active thermal-chlorophyll gradient with favorable wave action',
  }

  if (totalScore < 60) {
    rating = {
      label: 'LOW FISHING POTENTIAL',
      textColor: 'text-dangerRed',
      badgeClass: 'bg-rose-50 text-dangerRed border-rose-200',
      hexColor: '#e53935',
      glowColor: 'rgba(229, 57, 53, 0.25)',
      icon: AlertCircle,
      sub: 'Sub-optimal oceanographic conditions or rough sea state',
    }
  } else if (totalScore < 75) {
    rating = {
      label: 'MODERATE POTENTIAL',
      textColor: 'text-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      hexColor: '#ffb300',
      glowColor: 'rgba(255, 179, 0, 0.25)',
      icon: AlertTriangle,
      sub: 'Moderate pelagic aggregation detected along frontal edge',
    }
  }

  const RatingIcon = rating.icon

  // Helper for dynamic sub-factor score styling
  const getFactorColorClass = (score) => {
    if (score >= 85) return 'text-safeGreen'
    if (score >= 70) return 'text-amber-600'
    return 'text-dangerRed'
  }

  const getFactorBarColor = (score) => {
    if (score >= 85) return '#00c853'
    if (score >= 70) return '#ffb300'
    return '#e53935'
  }

  // Circular gauge calculations (SVG radius 42, circumference ~263.89)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (totalScore / 100) * circumference

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Sparkles size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Autonomous Fishing Suitability & Sustainability Index')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Multi-sensor fusion (Oceansat-3 OCM-3 • EOS-06 • Copernicus L4)')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 self-start sm:self-auto border ${rating.badgeClass}`}>
          <RatingIcon size={12} />
          <span>{t(rating.label)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Circular Dial (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-surface rounded-2xl border border-borderLight/80 text-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Track Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#dce6f0"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Foreground Animated Value Ring with Guaranteed Hex Stroke */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={rating.hexColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  stroke: rating.hexColor,
                  filter: `drop-shadow(0 0 6px ${rating.glowColor})`,
                  transition: 'stroke-dashoffset 1s ease-out, stroke 0.4s ease-out',
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span
                className="text-3xl font-black font-mono tracking-tight transition-colors duration-300"
                style={{ color: rating.hexColor }}
              >
                {totalScore}
              </span>
              <span className="text-[9px] font-bold text-textMuted uppercase">{t('out of 100')}</span>
            </div>
          </div>

          <div className="mt-2 text-xs font-bold text-navy">{t('Suitability Score')}</div>
          <p className="text-[10px] text-textMuted mt-0.5 leading-tight max-w-[180px]">
            {t(rating.sub)}
          </p>
        </div>

        {/* Right: 4 Contributing Oceanographic Factors (8 cols) */}
        <div className="md:col-span-8 space-y-3">
          {/* Factor 1: SST Thermal Gradient */}
          <div className="p-2.5 px-3.5 rounded-xl bg-surface/70 border border-borderLight flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Thermometer size={15} className="text-isroOrange" />
              <div>
                <span className="font-bold text-navy">{t('SST Front Match')}</span>
                <span className="text-[10px] text-textMuted block font-mono">
                  {sst.toFixed(1)}°C ({t('Optimal: 28.0–29.5°C')})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-mono font-bold ${getFactorColorClass(sstScore)}`}>
                {sstScore}%
              </span>
              <div className="w-20 bg-surfaceMid h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${sstScore}%`, backgroundColor: getFactorBarColor(sstScore) }}
                />
              </div>
            </div>
          </div>

          {/* Factor 2: Chlorophyll-a Front */}
          <div className="p-2.5 px-3.5 rounded-xl bg-surface/70 border border-borderLight flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Droplets size={15} className="text-emerald-600" />
              <div>
                <span className="font-bold text-navy">{t('Chlorophyll-a Plume')}</span>
                <span className="text-[10px] text-textMuted block font-mono">
                  {chl.toFixed(3)} mg/m³ ({t('Phytoplankton Bloom')})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-mono font-bold ${getFactorColorClass(chlScore)}`}>
                {chlScore}%
              </span>
              <div className="w-20 bg-surfaceMid h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${chlScore}%`, backgroundColor: getFactorBarColor(chlScore) }}
                />
              </div>
            </div>
          </div>

          {/* Factor 3: Coastal Upwelling & Scatterometer Shear */}
          <div className="p-2.5 px-3.5 rounded-xl bg-surface/70 border border-borderLight flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-purple-600" />
              <div>
                <span className="font-bold text-navy">{t('Upwelling Dynamic Shear')}</span>
                <span className="text-[10px] text-textMuted block font-mono">
                  {t('Index')}: {upwelling.toFixed(3)} ({t('EOS-06 Scatterometer')})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-mono font-bold ${getFactorColorClass(upwellingScore)}`}>
                {upwellingScore}%
              </span>
              <div className="w-20 bg-surfaceMid h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${upwellingScore}%`, backgroundColor: getFactorBarColor(upwellingScore) }}
                />
              </div>
            </div>
          </div>

          {/* Factor 4: Sea State Operability */}
          <div className="p-2.5 px-3.5 rounded-xl bg-surface/70 border border-borderLight flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Waves size={15} className="text-oceanBlue" />
              <div>
                <span className="font-bold text-navy">{t('Net Deployment Operability')}</span>
                <span className="text-[10px] text-textMuted block font-mono">
                  {t('Wave')}: {wave.toFixed(1)}m ({t('Safe Limit')}: 1.5m)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-mono font-bold ${getFactorColorClass(seaScore)}`}>
                {seaScore}%
              </span>
              <div className="w-20 bg-surfaceMid h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${seaScore}%`, backgroundColor: getFactorBarColor(seaScore) }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

